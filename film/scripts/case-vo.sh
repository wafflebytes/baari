#!/usr/bin/env bash
# The 60 s case study cut reuses the trailer's picked takes, trimmed (public/vo/c):
# RN01c is the hook with its 0.9 s pause after "No ji" cut to 0.42 s; C09 is E09 ending on
# "meri bhasha mein" (it drops "aur main?", which led into E09b). Run from film/.
set -euo pipefail
mkdir -p public/vo/c
ffmpeg -v error -y -i public/vo/e/RN01.wav -filter_complex \
  "[0]atrim=0:3.52,afade=t=out:st=3.50:d=0.02[a];[0]atrim=start=3.98,asetpts=PTS-STARTPTS,afade=t=in:d=0.02[b];[a][b]concat=n=2:v=0:a=1" public/vo/c/RN01c.wav
ffmpeg -v error -y -i public/vo/e/E09.wav -af "atrim=0:3.16,afade=t=out:st=3.04:d=0.12" public/vo/c/C09.wav
for f in public/vo/c/*.wav; do echo "$f $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"; done
