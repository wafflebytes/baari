"""Checks tour.json against the takes and tour.mp4 against itself.

Run from the repo root (needs numpy and pillow):
  uv run --with numpy --with pillow python -I film/deck/videos/tour/check.py [video]
1. Each part's source range against film/checks/trailer/glitch.py's zoomed ranges and
   tour/stills.py's. glitch.py also flags opened sheets (the header row changes), so a
   part it flags passes only when stills.py, which matches the still images, is clear.
2. The video: frame count, chapter cuts on 147-frame boundaries, and runs of frozen
   frames (mean difference under 0.3 of 255) longer than 0.5 s, which would be idle
   frames the cut should have dropped."""
import json, os, re, subprocess, sys
sys.dont_write_bytecode = True
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEOS = os.path.dirname(HERE)
FILM = os.path.dirname(os.path.dirname(VIDEOS))
sys.path.insert(0, VIDEOS); sys.path.insert(0, HERE)
import tour, stills

def glitch(src):
    out = subprocess.run([sys.executable, "-I", os.path.join(FILM, "checks", "trailer", "glitch.py"), src],
                         capture_output=True, text=True, check=True).stdout
    return [tuple(map(float, m)) for m in re.findall(r"\(([\d.]+), ([\d.]+)\)", out)]

def overlaps(a, b, ranges):
    return [r for r in ranges if r[0] < b and r[1] > a]

def main():
    ok, cache, rows = True, {}, []
    for p in tour.plan():
        src = os.path.join(FILM, p["src"])
        if src not in cache:
            cache[src] = (glitch(src), stills.zoomed(src)[1])
        g, s = cache[src]
        go, so = overlaps(p["in"], p["out"], g), overlaps(p["in"], p["out"], s)
        verdict = "fail" if so else ("pass (glitch.py flags an opened sheet; no still)" if go else "pass")
        ok &= not so
        rows.append({**{k: p[k] for k in ("chapter", "name", "src", "in", "out", "frames")},
                     "glitch_py": go, "stills_py": so, "verdict": verdict})
        print(f"ch{p['chapter']} {os.path.basename(p['src']):<30} {p['in']:7.3f}-{p['out']:7.3f}  glitch.py {go or '[]'}  stills.py {so or '[]'}  {verdict}")
    video = sys.argv[1] if len(sys.argv) > 1 else os.path.join(VIDEOS, "tour.mp4")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", "scale=98:213,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 213, 98).astype(np.int16)
    n = len(fr); want = len(tour.T["chapters"]) * tour.CH
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    frozen, i = [], 0
    while i < len(d):
        if d[i] < 0.3:
            j = i
            while j < len(d) and d[j] < 0.3:
                j += 1
            if (j - i + 1) / tour.FPS > 0.5:
                frozen.append((round(i / tour.FPS, 2), round((j + 1) / tour.FPS, 2)))
            i = j
        else:
            i += 1
    black = [round(k / tour.FPS, 2) for k in range(n) if fr[k].mean() < 8]
    print(f"frames {n} (want {want}); frozen runs over 0.5 s: {frozen}; black frames: {black}")
    ok &= n == want and not black
    json.dump({"parts": rows, "frames": n, "want": want, "frozen_over_half_s": frozen, "black": black, "ok": bool(ok)},
              open(os.path.join(HERE, "checks.json"), "w"), indent=1)
    print("ok" if ok else "FAIL")
    sys.exit(0 if ok else 1)

main()
