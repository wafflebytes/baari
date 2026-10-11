#!/usr/bin/env bash
# The 60 s case study cut's hook: RN01c is the trailer's RN01 with its 0.9 s pause after "No ji"
# cut to 0.42 s (public/vo/c). The cut's new lines (C02, C07, C09) are voiced by eleven-film.mjs,
# ranked by voice-match.py and tightened by tighten-vo.py; manifest.json says which take. Run from film/.
set -euo pipefail
mkdir -p public/vo/c
ffmpeg -v error -y -i public/vo/e/RN01.wav -filter_complex \
  "[0]atrim=0:3.52,afade=t=out:st=3.50:d=0.02[a];[0]atrim=start=3.98,asetpts=PTS-STARTPTS,afade=t=in:d=0.02[b];[a][b]concat=n=2:v=0:a=1" public/vo/c/RN01c.wav
for f in public/vo/c/*.wav; do echo "$f $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"; done
