#!/bin/sh
# Shoots README mockups from the live app's fixtures into docs/img/.
# One phone per Chrome run (several iframes at once sometimes stall on the
# skeleton), then compose.py lays them out side by side.
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p .shots
for s in vote locked khata delivery sunita why receipt; do
  "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size=530,1050 --virtual-time-budget=45000 \
    --screenshot=".shots/$s.png" "file://$PWD/phones.html?s=$s" >/dev/null 2>&1
  echo "shot $s"
done
python3 compose.py
