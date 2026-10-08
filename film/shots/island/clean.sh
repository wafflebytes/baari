#!/usr/bin/env bash
# Records a "clean" video take of island shot files: the same steps with every
# { "shot": ... } still removed. clip.mjs burns about 2 s of zoomed
# frames into the webm around each still (page.screenshot at scale 3 resizes
# the screencast), so the mixes cut from these takes and take their posters
# from the stills takes. Output: <id>-clean-app-<theme>-t<take>.webm.
#
#   bash film/shots/island/clean.sh 3 CA17 CA17:dark CA21-CA22 ...   # take 3, three at a time
set -euo pipefail
cd "$(dirname "$0")/../.."
take=$1; shift
tmp=$(mktemp -d)
for j in "$@"; do
  f=${j%%:*}
  python3 -c "
import json, sys
s = json.load(open('shots/island/$f.json'))
s['shot'] = 'clean'
s['steps'] = [x for x in s['steps'] if 'shot' not in x]
json.dump(s, open('$tmp/$f.json', 'w'))"
done
printf '%s\n' "$@" | xargs -P 3 -I{} sh -c 'j="{}"; f=${j%%:*}; th=""; [ "$j" != "$f" ] && th="--theme ${j#*:}"; node scripts/clip.mjs '"$tmp"'/$f.json --base "${BASE:-http://localhost:4174}" --take '"$take"' $th 2>&1 | tail -1'
