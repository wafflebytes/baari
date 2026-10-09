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

# 1. The master: every core renders frames in parallel; JPEG frames are quicker to hand to the encoder.
npx remotion render PaperTrailer out/raw-1080p.mp4 \
  --codec=h264 --crf=16 --concurrency=100% --image-format=jpeg --jpeg-quality=95 \
  --x264-preset=faster --log=error

# 2. Loudness to -14 LUFS (two-stage loudnorm), video copied untouched.
ffmpeg -v error -y -i out/raw-1080p.mp4 -c:v copy \
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
rm -f out/raw-1080p.mp4

echo "Done in $(( $(date +%s) - T0 )) s:"
ls -lh out/baari-paper-*.mp4
