#!/usr/bin/env bash
# Builds every onboard-tv mix from the takes in film/clips/, from scratch:
#
#   bash film/mixes/onboard-tv-mix.sh            # from the repo root or anywhere
#
# Re-run it on the final takes: it reads each take's .taps.json for every
# sync point and cut, so nothing here is a guessed time. Takes are picked by
# name below (TAKE_*); change the t1 to t2 when a retake wins.
#
# Every video out: h264, crf 18, yuv420p, 30 fps, no audio (the takes have
# none). Each mix also gets <name>.json (sources, sync points, trims, length,
# poster time) and <name>.png (the poster, built from the takes' own 3x
# stills wherever one exists at that moment, else a frame of the mix).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIPS="${CLIPS:-$HERE/../clips}"
OUT="$HERE"
BRANCH="$(git -C "$HERE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo local)"
CREAM="0xF6F1E7"; INK="0x141210"
ENC=(-c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -an -movflags +faststart)
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# t <take base> <kind|name> [nth]: seconds of the nth (1-based) tap / still /
# swipe whose kind, still name or target contains the given text.
t() { python3 - "$CLIPS/$1.taps.json" "$2" "${3:-1}" <<'PY'
import json, sys
taps = json.load(open(sys.argv[1]))["taps"]; key = sys.argv[2]; n = int(sys.argv[3])
hits = [x for x in taps if key == (x.get("name") or "") or key == x.get("kind") or key in (x.get("target") or "")]
print(f"{hits[n-1]['t_ms']/1000:.3f}")
PY
}
len() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" 2>/dev/null | grep -E '^[0-9.]+$' || ffmpeg -i "$1" -f null - 2>&1 | grep -o 'time=[0-9:.]*' | tail -1 | awk -F'[=:]' '{print $2*3600+$3*60+$4}'; }
calc() { python3 -c "print(f'{($1):.3f}')"; }
json() { python3 -c "import json,sys; json.dump(json.loads(sys.argv[1]), open(sys.argv[2],'w'), indent=1, ensure_ascii=False)" "$1" "$OUT/$2.json"; }

TAKE_CA76=CA76-01-app-light-t2
TAKE_CA74L=CA74-01-app-light-t1; TAKE_CA74D=CA74-01-app-dark-t1
TAKE_CA75L=CA75-01-app-light-t1; TAKE_CA75D=CA75-01-app-dark-t1
TAKE_CA60L=CA60-01-app-light-t1; TAKE_CA60D=CA60-01-app-dark-t1
TAKE_CA59L=CA59-01-app-light-t1; TAKE_CA59D=CA59-01-app-dark-t1
TAKE_CV02=CV02-01-tv-light-t1; TAKE_HERO=CV02-02-app-light-t1

# ---- 1. theme splits: light left, dark right, 2 px cream divider, synced on
# each take's first tap (first still when a take has no tap).
split() { # name lightTake darkTake syncKey posterStill
  local name=$1 L=$2 D=$3 key=$4 still=$5
  local tl td sl sd ll ld dur
  tl=$(t "$L" "$key"); td=$(t "$D" "$key")
  sl=$(calc "max(0,$tl-$td)"); sd=$(calc "max(0,$td-$tl)")
  ll=$(len "$CLIPS/$L.webm"); ld=$(len "$CLIPS/$D.webm")
  dur=$(calc "min($ll-$sl,$ld-$sd)")
  ff -ss "$sl" -t "$dur" -i "$CLIPS/$L.webm" -ss "$sd" -t "$dur" -i "$CLIPS/$D.webm" -filter_complex \
    "[0:v]scale=786:1704:flags=lanczos,format=rgb24,crop=393:1704:0:0,setpts=PTS-STARTPTS[a];[1:v]scale=786:1704:flags=lanczos,format=rgb24,crop=393:1704:393:0,setpts=PTS-STARTPTS[b];[a][b]hstack,drawbox=x=392:y=0:w=2:h=1704:color=$CREAM:t=fill,format=yuv420p[v]" \
    -map "[v]" "${ENC[@]}" "$OUT/$name.mp4"
  # poster from the two 3x stills of the same moment
  ff -i "$CLIPS/$L.$still.png" -i "$CLIPS/$D.$still.png" -filter_complex \
    "[0:v]scale=786:1704:flags=lanczos,format=rgb24,crop=393:1704:0:0[a];[1:v]scale=786:1704:flags=lanczos,format=rgb24,crop=393:1704:393:0[b];[a][b]hstack,drawbox=x=392:y=0:w=2:h=1704:color=$CREAM:t=fill" "$OUT/$name.png"
  local pt; pt=$(calc "$(t "$L" "$still")-$sl")
  json "{\"name\":\"$name\",\"kind\":\"split\",\"sources\":[{\"file\":\"film/clips/$L.webm\",\"branch\":\"$BRANCH\",\"side\":\"left\",\"sync\":\"$key\",\"sync_s\":$tl,\"trim_start_s\":$sl},{\"file\":\"film/clips/$D.webm\",\"branch\":\"$BRANCH\",\"side\":\"right\",\"sync\":\"$key\",\"sync_s\":$td,\"trim_start_s\":$sd}],\"size\":\"786x1704\",\"length_s\":$dur,\"poster_s\":$pt,\"poster\":\"$name.png (from the $still stills)\"}" "$name"
}
split split-CA74-roti   "$TAKE_CA74L" "$TAKE_CA74D" pulled poster
split split-CA75-steam  "$TAKE_CA75L" "$TAKE_CA75D" tap    poster2
split split-CA60-undo   "$TAKE_CA60L" "$TAKE_CA60D" tap    poster
split split-CA59-offline "$TAKE_CA59L" "$TAKE_CA59D" poster poster

# ---- 2. pairs: two phones at 980 px tall on 1920x1080, 120 px gap, centred,
# each synced so its key moment lands on the same second.
pair() { # name bg takeA keyA nthA takeB keyB nthB stillA stillB maxlen [lead]
  local name=$1 bg=$2 A=$3 ka=$4 na=$5 B=$6 kb=$7 nb=$8 pa=$9 pb=${10} cap=${11} lead=${12:-2.0}
  local ta tb m sa sb la lb dur
  ta=$(t "$A" "$ka" "$na"); tb=$(t "$B" "$kb" "$nb")
  m=$(calc "min($ta,$tb,$lead)")
  sa=$(calc "$ta-$m"); sb=$(calc "$tb-$m")
  la=$(len "$CLIPS/$A.webm"); lb=$(len "$CLIPS/$B.webm")
  dur=$(calc "min($la-$sa,$lb-$sb,$cap)")
  ff -f lavfi -i "color=c=$bg:s=1920x1080:r=30:d=$dur" -ss "$sa" -t "$dur" -i "$CLIPS/$A.webm" -ss "$sb" -t "$dur" -i "$CLIPS/$B.webm" -filter_complex \
    "[1:v]scale=-2:980:flags=lanczos,setpts=PTS-STARTPTS[a];[2:v]scale=-2:980:flags=lanczos,setpts=PTS-STARTPTS[b];[0:v][a]overlay=x=448:y=50:eof_action=repeat[t];[t][b]overlay=x=1020:y=50:eof_action=repeat[v]" \
    -map "[v]" -t "$dur" "${ENC[@]}" "$OUT/$name.mp4"
  ff -f lavfi -i "color=c=$bg:s=1920x1080:d=1" -i "$CLIPS/$A.$pa.png" -i "$CLIPS/$B.$pb.png" -filter_complex \
    "[1:v]scale=-2:980:flags=lanczos[a];[2:v]scale=-2:980:flags=lanczos[b];[0:v][a]overlay=448:50[t];[t][b]overlay=1020:50" -frames:v 1 "$OUT/$name.png"
  json "{\"name\":\"$name\",\"kind\":\"pair\",\"sources\":[{\"file\":\"film/clips/$A.webm\",\"branch\":\"$BRANCH\",\"side\":\"left\",\"sync\":\"$ka #$na\",\"sync_s\":$ta,\"trim_start_s\":$sa},{\"file\":\"film/clips/$B.webm\",\"branch\":\"$BRANCH\",\"side\":\"right\",\"sync\":\"$kb #$nb\",\"sync_s\":$tb,\"trim_start_s\":$sb}],\"sync_lands_s\":$m,\"size\":\"1920x1080\",\"background\":\"$bg\",\"length_s\":$dur,\"poster\":\"$name.png (stills $pa | $pb)\"}" "$name"
}
pair pair-CA74-CA75 "$CREAM" "$TAKE_CA74L" pulled 1 "$TAKE_CA75L" tap 1 poster3 poster2 8
pair pair-CA60-CA59 "$CREAM" "$TAKE_CA60L" tap 1 "$TAKE_CA59L" poster 1 poster poster 8
# One brief, two languages: the karaoke starting in Hindi (0.5 s after the tap into page 8)
# and in Tamil (0.5 s after the Tamil chip), from the same take; a negative lead starts after the cue.
pair pair-CA12-hindi-tamil "$CREAM" "$TAKE_CA76" '[data-next]' 7 "$TAKE_CA76" Tamil 1 poster3 k-tamil 4.5 -0.5

# ---- 4. TV pair: the TV stamp with the app's locked hero beside it. TV at
# 1440x810 on the left, phone at 900 px tall on the right, ink background.
tvpair() {
  local name=pair-CV02-tv-hero A=$TAKE_CV02 B=$TAKE_HERO
  local ta tb m sa sb la lb dur
  ta=$(t "$A" poster); tb=$(t "$B" poster)
  m=$(calc "min($ta,$tb,6.0)"); sa=$(calc "$ta-$m"); sb=$(calc "$tb-$m")
  la=$(len "$CLIPS/$A.webm"); lb=$(len "$CLIPS/$B.webm")
  dur=$(calc "min($la-$sa,10)")
  ff -f lavfi -i "color=c=$INK:s=1920x1080:r=30:d=$dur" -ss "$sa" -t "$dur" -i "$CLIPS/$A.webm" -ss "$sb" -i "$CLIPS/$B.webm" -filter_complex \
    "[1:v]scale=1440:810:flags=lanczos,setpts=PTS-STARTPTS[a];[2:v]scale=-2:900:flags=lanczos,setpts=PTS-STARTPTS[b];[0:v][a]overlay=x=40:y=135:eof_action=repeat[t];[t][b]overlay=x=1484+(396-overlay_w)/2:y=90:eof_action=repeat[v]" \
    -map "[v]" -t "$dur" "${ENC[@]}" "$OUT/$name.mp4"
  ff -f lavfi -i "color=c=$INK:s=1920x1080:d=1" -i "$CLIPS/$A.locked.png" -i "$CLIPS/$B.poster.png" -filter_complex \
    "[1:v]scale=1440:810:flags=lanczos[a];[2:v]scale=-2:900:flags=lanczos[b];[0:v][a]overlay=40:135[t];[t][b]overlay=1484+(396-overlay_w)/2:90" -frames:v 1 "$OUT/$name.png"
  json "{\"name\":\"$name\",\"kind\":\"tv-pair\",\"sources\":[{\"file\":\"film/clips/$A.webm\",\"branch\":\"$BRANCH\",\"side\":\"left\",\"sync\":\"stamp lands (still poster)\",\"sync_s\":$ta,\"trim_start_s\":$sa},{\"file\":\"film/clips/$B.webm\",\"branch\":\"$BRANCH\",\"side\":\"right\",\"sync\":\"hero settled (still poster)\",\"sync_s\":$tb,\"trim_start_s\":$sb}],\"sync_lands_s\":$m,\"size\":\"1920x1080\",\"length_s\":$dur,\"poster\":\"$name.png (TV locked still | hero poster still)\"}" "$name"
}
tvpair

# ---- 3. montages: hard cuts, each starting 300 ms before a tap from the
# taps.json (lead 0.3). Moments with no tap of their own (the pull, which is
# a synthetic touch eval; the offline flip; the burst, which follows the dry
# run by itself) cut on the still that follows them, with a longer lead
# measured from the shot file's step times, idle frames thinned with mpdecimate (at most 1 frame in 3, so
# never faster than 1.5x), 786x1704.
montage() { # name posterSeg posterStill  then: take key nth lead dur ...
  local name=$1 pseg=$2 pstill=$3; shift 3
  local inputs=() fc="" i=0 segs="[" total=0
  while [ $# -gt 0 ]; do
    local T=$1 k=$2 n=$3 lead=$4 d=$5; shift 5
    local at s; at=$(t "$T" "$k" "$n"); s=$(calc "max(0,$at-$lead)")
    inputs+=(-ss "$s" -t "$d" -i "$CLIPS/$T.webm")
    fc+="[$i:v]scale=786:1704:flags=lanczos,mpdecimate=max=-3,setpts=N/25/TB,fps=30,format=yuv420p[s$i];"
    segs+="{\"file\":\"film/clips/$T.webm\",\"branch\":\"$BRANCH\",\"cut_on\":\"${k//\"/\\\"} #$n\",\"cue_s\":$at,\"lead_s\":$lead,\"in_s\":$s,\"source_len_s\":$d},"
    i=$((i+1))
  done
  for j in $(seq 0 $((i-1))); do fc+="[s$j]"; done
  fc+="concat=n=$i:v=1:a=0[v]"
  ff "${inputs[@]}" -filter_complex "$fc" -map "[v]" "${ENC[@]}" "$OUT/$name.mp4"
  total=$(len "$OUT/$name.mp4")
  ff -i "$CLIPS/$pstill.png" -vf scale=786:1704:flags=lanczos "$OUT/$name.png"
  json "{\"name\":\"$name\",\"kind\":\"montage\",\"segments\":${segs%,}],\"size\":\"786x1704\",\"length_s\":$total,\"poster\":\"$name.png (from $pstill, segment $pseg)\"}" "$name"
}
montage montage-onboard 5 "$TAKE_CA76.poster3" \
  "$TAKE_CA76" 'data-m="didi"' 1 0.3 2.4 \
  "$TAKE_CA76" '[data-fe-dice]' 1 0.3 2.2 \
  "$TAKE_CA76" '[data-spin]' 1 0.3 3.0 \
  "$TAKE_CA76" '[data-food="tel"]' 2 0.3 2.2 \
  "$TAKE_CA76" '[data-next]' 7 0.3 3.0 \
  "$TAKE_CA76" burst 1 1.0 3.0
# CA74's pull starts 1.9 s before its "pulled" still (24 moves of 40 ms, then
# 900 ms); CA59 flips offline about 1.5 s before its poster still.
montage montage-small 1 "$TAKE_CA74L.poster3" \
  "$TAKE_CA74L" pulled 1 2.2 5.0 \
  "$TAKE_CA75L" tap 1 0.3 3.0 \
  "$TAKE_CA60L" tap 1 0.3 3.2 \
  "$TAKE_CA60L" tap 2 0.3 2.6 \
  "$TAKE_CA59L" poster 1 2.0 3.0
# ---- flows: the same montage rules, longer. A1 "Ghar set up by talking"
# (45 to 60 s): every onboarding scene except scene 9, whose dry-run rows are
# blank in the app at 2988bb7 (app.css:3930 restyles .ag-rx). A6 "Chhoti
# cheezein" (30 to 45 s): the small touches end to end, ending on offline.
montage flow-A1-ghar 9 "$TAKE_CA76.poster3" \
  "$TAKE_CA76" '[data-next]' 1 5.4 5.6 \
  "$TAKE_CA76" 'data-m="didi"' 1 0.3 5.0 \
  "$TAKE_CA76" '[data-fe-dice]' 1 0.3 4.8 \
  "$TAKE_CA76" '[data-mode="vote"]' 1 0.3 4.2 \
  "$TAKE_CA76" '[data-spin]' 1 0.3 4.6 \
  "$TAKE_CA76" '[data-scope="papa"]' 1 0.3 5.5 \
  "$TAKE_CA76" '[data-owntext]' 1 0.3 5.0 \
  "$TAKE_CA76" '[data-t="7:30"]' 1 0.3 4.5 \
  "$TAKE_CA76" '[data-next]' 7 0.3 9.5 \
  "$TAKE_CA76" Marathi 1 0.1 2.3 \
  "$TAKE_CA76" Tamil 1 0.1 2.3 \
  "$TAKE_CA76" Telugu 1 0.1 2.3 \
  "$TAKE_CA76" burst 1 0.8 4.0
# CA74's pull starts 1.6 s before its first held still; CA59 flips offline
# about 1.5 s before its poster still.
montage flow-A6-chhoti 1 "$TAKE_CA74L.poster3" \
  "$TAKE_CA74L" poster 1 1.6 11.2 \
  "$TAKE_CA75L" tap 1 0.3 9.5 \
  CA13-01-app-light-t1 long_press 1 0.3 11.0 \
  "$TAKE_CA60L" tap 1 0.3 7.0 \
  "$TAKE_CA59L" poster 1 3.3 6.5
echo "mixes in $OUT"
