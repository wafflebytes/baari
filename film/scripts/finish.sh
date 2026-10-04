#!/bin/bash
# Print finish for the paper cut: fine grain, soft vignette, a hair of gate weave, loudness.
# usage: scripts/finish.sh in.mp4 out.mp4
set -e
ffmpeg -y -loglevel error -i "$1" -vf "noise=alls=7:allf=t,vignette=angle=PI/6,crop=1912:1076:'4+random(1)*1.5':'2+random(2)*1.5',scale=1920:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -crf 17 -preset medium -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1:LRA=11 "$2"
