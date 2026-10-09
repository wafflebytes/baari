"""Finds the zoomed frames a still burns into a clip.mjs take, by matching each
frame against the still itself. A still is shot at 3x, so while it is taken the
screencast shows the page zoomed 3x from the top-left: the still's top-left
393 x 852 region. A frame closer to that crop than to the frame 1 s earlier is
zoomed. Complements film/checks/trailer/glitch.py, which also flags opened
sheets (their header row differs from the take's first frames).

Run from the repo root: python3 -I film/deck/videos/tour/stills.py <take>.webm
Needs numpy and pillow (uv run --with numpy --with pillow python -I ...)."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

W, H = 98, 213  # the take at a quarter size

def frames(src):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"scale={W}:{H},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)

def zoomed(src):
    base = src[:-5]
    taps = json.load(open(base + ".taps.json"))
    ev = taps if isinstance(taps, list) else taps.get("taps", [])
    stills = [e["name"] for e in ev if e.get("kind") == "still"]
    fr = frames(src)
    hit = np.zeros(len(fr), bool)
    for name in stills:
        png = f"{base}.{name}.png"
        if not os.path.exists(png):
            continue
        crop = Image.open(png).convert("L").crop((0, 0, 393, 852)).resize((W, H), Image.BILINEAR)
        ref = np.asarray(crop, np.int16)
        d = np.abs(fr - ref).mean(axis=(1, 2))
        hit |= d < 14
    out, i = [], 0
    while i < len(hit):
        if hit[i]:
            j = i
            while j < len(hit) and hit[j]:
                j += 1
            out.append((round(i / 25, 2), round(j / 25, 2)))
            i = j
        else:
            i += 1
    return stills, out

if __name__ == "__main__":
    for src in sys.argv[1:]:
        s, r = zoomed(src)
        print(os.path.basename(src), "stills:", s, "zoomed ranges (s):", r)
