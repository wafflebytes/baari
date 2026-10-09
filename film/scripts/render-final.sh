#!/usr/bin/env bash
# Renders the paper cut trailer: the 1080p master, a 720p, and email-sized copies of both
# (under 20 MB each), all at -14 LUFS. Uses every CPU core. Run from film/:
#   bash scripts/render-final.sh
# Needs node 18+ and ffmpeg (brew install ffmpeg). Remotion fetches its own headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
[ -d node_modules/remotion ] || npm ci
T0=$(date +%s)

# 1. The master, rendered in parallel: bundle once, split the frames into chunks, render every
#    chunk at the same time (each with its own share of the cores, video only), render the
#    sound once on its own, then join the chunks without re-encoding and lay the sound under.
CORES=$( (sysctl -n hw.ncpu 2>/dev/null || nproc) )
CHUNKS=${CHUNKS:-$(( CORES >= 8 ? 4 : 2 ))}
PER=$(( (CORES + CHUNKS - 1) / CHUNKS + 1 ))
echo "Rendering on $CORES cores: $CHUNKS chunks x $PER frames at a time"
rm -rf out/bundle out/part-*.mp4 out/parts.txt
npx remotion bundle src/index.ts --out-dir=out/bundle --log=error >/dev/null 2>&1
TOTAL=${TOTAL:-}; [ -n "$TOTAL" ] || TOTAL=$(npx remotion compositions out/bundle ${RFLAGS:-} 2>/dev/null | awk '/PaperTrailer/ {for (i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/) n=$i} END {print n}')
[ -n "$TOTAL" ] || { echo "could not read the frame count"; exit 1; }
STEP=$(( (TOTAL + CHUNKS - 1) / CHUNKS ))
for i in $(seq 0 $(( CHUNKS - 1 ))); do
  A=$(( i * STEP )); B=$(( A + STEP - 1 )); [ $B -ge $TOTAL ] && B=$(( TOTAL - 1 ))
  npx remotion render out/bundle PaperTrailer "out/part-$i.mp4" --frames=$A-$B --muted \
    --codec=h264 --crf=16 --x264-preset=faster --concurrency=$PER --image-format=jpeg --jpeg-quality=95 --log=error ${RFLAGS:-} &
  echo "file 'part-$i.mp4'" >> out/parts.txt
done
npx remotion render out/bundle PaperTrailer out/sound.wav --codec=wav --concurrency=2 --log=error ${RFLAGS:-} &
wait
ffmpeg -v error -y -f concat -safe 0 -i out/parts.txt -i out/sound.wav -map 0:v -map 1:a -c:v copy -c:a pcm_s16le out/raw-1080p.mov
rm -rf out/part-*.mp4 out/parts.txt out/sound.wav out/bundle

# 2. Loudness to -14 LUFS (two-stage loudnorm), video copied untouched.
ffmpeg -v error -y -i out/raw-1080p.mov -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 256k out/baari-paper-1080p.mp4

# 3. The 720p and the two email copies, encoded in parallel from the master.
ffmpeg -v error -y -i out/baari-paper-1080p.mp4 -vf scale=1280:720:flags=lanczos \
  -c:v libx264 -preset slow -crf 20 -c:a copy out/baari-paper-720p.mp4 &
email() { # $1 scale, $2 video kbps, $3 output
  local log="out/2pass-$3"
  ffmpeg -v error -y -i out/baari-paper-1080p.mp4 -vf "scale=$1:flags=lanczos" -c:v libx264 -preset slow \
    -b:v "$2k" -pass 1 -passlogfile "$log" -an -f mp4 /dev/null
  ffmpeg -v error -y -i out/baari-paper-1080p.mp4 -vf "scale=$1:flags=lanczos" -c:v libx264 -preset slow \
    -b:v "$2k" -pass 2 -passlogfile "$log" -c:a aac -b:a 128k -movflags +faststart "out/$3"
  rm -f "$log"*
}
email 1920:1080 1650 baari-paper-1080p-email.mp4 &
email 1280:720 950 baari-paper-720p-email.mp4 &
wait
rm -f out/raw-1080p.mov

echo "Done in $(( $(date +%s) - T0 )) s:"
ls -lh out/baari-paper-*.mp4
