#!/usr/bin/env bash
# Builds every island mix from scratch out of the takes in film/clips/.
#
#   bash film/mixes/island-mix.sh            # all mixes
#   bash film/mixes/island-mix.sh split-CA17-island   # one mix
#
# Needs ffmpeg/ffprobe and python3 with Pillow (posters). Sync points come
# from each take's .taps.json (t_ms from the start of the video), never from
# guesses. Takes are 393x852 at 25 fps; everything is scaled up with lanczos.
# Stills for posters come from the 1179x2556 .png stills, not video frames.
#
# To re-run on final takes, change the take names in TAKES below.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - "$@" <<'PY'
import json, os, subprocess, sys
from PIL import Image

CLIPS, OUT = "clips", "mixes"
BRANCH = "claude/gallant-johnson-pzjo4q"
# Video comes from the clean takes (no stills burned in, see
# shots/island/clean.sh); posters come from the stills takes' .png files.
TAKES = {
    "CA17L": "CA17-clean-app-light-t3", "CA17D": "CA17-clean-app-dark-t3",
    "CA21": "CA21-clean-app-light-t3", "CA35": "CA35-clean-app-light-t3",
    "CA17b": "CA17b-clean-app-light-t3", "CA63": "CA63-clean-app-light-t3",
    "CA64": "CA64-clean-app-dark-t3", "CA67": "CA67-clean-app-light-t3",
}
STILLS = {k: v.replace("-clean-", "-01-") for k, v in TAKES.items()}
CREAM, LIGHT_BG, DARK_BG = "0xF6F1E7", "0xF6F1E7", "0x141210"
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]

def taps_raw(k): return json.load(open(f"{CLIPS}/{TAKES[k]}.taps.json"))["taps"]
# clip.mjs's video doesn't run on the taps.json clock: it starts before t0
# and stretches 1.2 to 1.4x as it goes, unevenly. So every logged tap, swipe
# and scroll is anchored to the frame where the app visibly answers it (the
# first big change after a calm spell, inside a window predicted from the
# previous anchor), and times in between are interpolated between anchors.
import numpy as np
_MAP = {}
def anchors(k):
    if k in _MAP: return _MAP[k]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video(k), "-vf", "scale=40:86,format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 86, 40).astype(int)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    on = [(i + 1) / 25 for i in range(3, len(d)) if d[i] > 2.0 and max(d[i - 3:i]) <= 2.0]
    ev = [t["t_ms"] / 1000 for t in taps_raw(k) if t["kind"] in ("tap", "swipe", "scroll")]
    pts, pt, pv = [], None, None
    for t in ev:
        lo, hi = (t, t + 4.0) if pt is None else (pv + (t - pt) * 0.8, pv + (t - pt) * 1.8 + 1.0)
        hit = next((o for o in on if lo <= o <= hi), None)
        v = hit if hit is not None else (lo if pt is None else pv + (t - pt) * 1.25)
        pts.append((t, round(v, 3), hit is not None)); pt, pv = t, v
    _MAP[k] = pts
    return pts
def vt(k, t):
    """Video time of a taps.json time t (seconds)."""
    a = anchors(k)
    if t <= a[0][0]: return a[0][1] - (a[0][0] - t)
    for (t1, v1, _), (t2, v2, _) in zip(a, a[1:]):
        if t <= t2: return v1 + (t - t1) * (v2 - v1) / (t2 - t1)
    return a[-1][1] + (t - a[-1][0]) * 1.25
def offset(k): return [{"t_ms_s": t, "video_s": v, "seen": h} for t, v, h in anchors(k)]
def taps(k): return [t | {"t_ms": vt(k, t["t_ms"] / 1000) * 1000} for t in taps_raw(k)]
def video(k): return f"{CLIPS}/{TAKES[k]}.webm"
def dur(path):
    # The screencast webm has no duration in its header; count packets at 25 fps.
    n = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout.strip()
    return int(n) / 25.0
def t_of(k, kind, nth=0, name=None, target=None, plus=0.0):
    """Video time of the nth logged event (plus some taps.json seconds after it)."""
    hits = [t for t in taps_raw(k) if t["kind"] == kind and (name is None or t.get("name") == name) and (target is None or target in str(t.get("target")))]
    return vt(k, hits[nth]["t_ms"] / 1000 + plus)
def ff(args): subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)
def meta(name, d): json.dump(d, open(f"{OUT}/{name}.json", "w"), indent=2); print(f"{name}: {d['length_s']} s")
def src(k): return {"file": f"film/clips/{TAKES[k]}.webm", "branch": BRANCH, "anchors": offset(k)}

# 1. Theme split: left half of the light take, right half of the dark take,
# 2 px cream divider. The light take is the master clock. Two takes of the
# same shot drift apart between taps (clip.mjs's video doesn't keep the
# taps.json clock), so the dark take is matched to the light one frame by
# frame on content: edge maps (theme-blind) aligned with dynamic time
# warping. Each light frame gets the dark frame showing the same state.
def edges(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", "scale=60:130,format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, 130, 60).astype(float)
    g = np.abs(np.diff(f, axis=1))[:, :, :-1] + np.abs(np.diff(f, axis=2))[:, :-1, :]
    g = g.reshape(len(f), -1)
    return g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-6)
def dtw_map(A, B):
    C = 1 - A @ B.T  # cosine distance, light x dark
    n, m = C.shape
    D = np.full((n + 1, m + 1), np.inf); D[0, :] = 0  # dark may start anywhere
    for i in range(1, n + 1):
        row = C[i - 1]
        prev = D[i - 1]
        best = np.minimum(prev[1:], prev[:-1])  # (i-1, j) or (i-1, j-1)
        cur = np.full(m + 1, np.inf)
        for j in range(1, m + 1):
            cur[j] = row[j - 1] + min(best[j - 1], cur[j - 1])
        D[i] = cur
    j = int(np.argmin(D[n, 1:])) + 1; path = [0] * n
    for i in range(n, 0, -1):
        path[i - 1] = j - 1
        opts = [(D[i - 1, j], j), (D[i - 1, j - 1], j - 1), (D[i, j - 1] if j > 1 else np.inf, -1)]
        v, nj = min(opts)
        while nj == -1:  # walk left along the row
            j -= 1; opts = [(D[i - 1, j], j), (D[i - 1, j - 1], j - 1), (D[i, j - 1] if j > 1 else np.inf, -1)]; v, nj = min(opts)
        j = nj if nj > 0 else 1
    return path
def split(name, kl, kd, poster_still):
    import tempfile
    A, B = edges(video(kl)), edges(video(kd))
    path = dtw_map(A, B)
    with tempfile.TemporaryDirectory() as tmp:
        ff(["-i", video(kd), "-start_number", "0", f"{tmp}/d%05d.png"])
        with open(f"{tmp}/list.txt", "w") as fh:
            for j in path: fh.write(f"file '{tmp}/d{j:05d}.png'\nduration 0.04\n")
            fh.write(f"file '{tmp}/d{path[-1]:05d}.png'\n")
        length = round(len(path) / 25, 2)
        fc = (f"[0:v]fps=30,scale=786:1704:flags=lanczos,format=rgb24,crop=393:1704:0:0[l];"
              f"[1:v]fps=30,scale=786:1704:flags=lanczos,format=rgb24,crop=393:1704:393:0[r];"
              f"[l][r]hstack=shortest=1,drawbox=x=392:y=0:w=2:h=1704:color={CREAM}:t=fill,trim=duration={length}[v]")
        ff(["-i", video(kl), "-f", "concat", "-safe", "0", "-i", f"{tmp}/list.txt", "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    L = Image.open(f"{CLIPS}/{STILLS[kl]}.{poster_still}.png").resize((786, 1704), Image.LANCZOS)
    D = Image.open(f"{CLIPS}/{STILLS[kd]}.{poster_still}.png").resize((786, 1704), Image.LANCZOS)
    P = Image.new("RGB", (786, 1704)); P.paste(L.crop((0, 0, 393, 1704)), (0, 0)); P.paste(D.crop((393, 0, 786, 1704)), (393, 0))
    P.paste(Image.new("RGB", (2, 1704), "#F6F1E7"), (392, 0)); P.save(f"{OUT}/{name}.png")
    held = sum(1 for a, b in zip(path, path[1:]) if a == b); skipped = sum(b - a - 1 for a, b in zip(path, path[1:]) if b > a + 1)
    meta(name, {"what": "Theme split: light take left, dark take right, the dark take matched to the light one frame by frame",
                "sources": [src(kl) | {"sync": "master clock, untrimmed"}, src(kd) | {"sync": "content-matched (edge maps, DTW) to the light take", "first_dark_frame_s": round(path[0] / 25, 2), "frames_held": held, "frames_skipped": skipped}],
                "length_s": length, "poster": f"{name}.png", "poster_time_s": round(t_of(kl, "tap", plus=2.0), 2), "poster_from": f"{poster_still}.png stills of both takes, left half light, right half dark"})

# 2. Pair: two phones on 1920x1080, each 980 px tall (452 wide), 120 px gap,
# centred; both key moments land on the same second.
def pair(name, what, ka, kb, key_a, key_b, bg, pre=6.0, post=4.0, still_a=None, still_b=None):
    ta, tb = key_a, key_b
    pre = min(pre, ta, tb)
    post = min(post, dur(video(ka)) - ta, dur(video(kb)) - tb)
    length = round(pre + post, 2)
    sa, sb = ta - pre, tb - pre
    W, H, w, gap = 1920, 1080, 452, 120
    x0 = (W - (2 * w + gap)) // 2; y0 = (H - 980) // 2
    fc = (f"color=c={bg}:s={W}x{H}:r=30:d={length}[bg];"
          f"[0:v]trim=start={sa:.3f}:duration={length},setpts=PTS-STARTPTS,fps=30,scale={w}:980:flags=lanczos[a];"
          f"[1:v]trim=start={sb:.3f}:duration={length},setpts=PTS-STARTPTS,fps=30,scale={w}:980:flags=lanczos[b];"
          f"[bg][a]overlay={x0}:{y0}:eof_action=repeat[t];[t][b]overlay={x0 + w + gap}:{y0}:eof_action=repeat,trim=duration={length}[v]")
    ff(["-i", video(ka), "-i", video(kb), "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    P = Image.new("RGB", (W, H), "#" + bg[2:])
    P.paste(Image.open(f"{CLIPS}/{STILLS[ka]}.{still_a}.png").resize((w, 980), Image.LANCZOS), (x0, y0))
    P.paste(Image.open(f"{CLIPS}/{STILLS[kb]}.{still_b}.png").resize((w, 980), Image.LANCZOS), (x0 + w + gap, y0))
    P.save(f"{OUT}/{name}.png")
    meta(name, {"what": what, "sources": [src(ka) | {"sync": f"key moment at {ta:.3f} s", "trim_start_s": round(sa, 3)}, src(kb) | {"sync": f"key moment at {tb:.3f} s", "trim_start_s": round(sb, 3)}],
                "length_s": length, "key_at_s": round(pre, 2), "poster": f"{name}.png", "poster_time_s": round(pre, 2), "poster_from": f"{still_a}.png | {still_b}.png"})

# 3. Montage: hard cuts, each starting 300 ms before a real tap. mpdecimate
# drops repeated (idle) frames, but at most one in three (max=-3), so nothing
# plays faster than 1.5x.
def montage(name, cuts, poster):
    parts, inputs, fc = [], [], ""
    for i, (k, t, d, why) in enumerate(cuts):
        s = t - 0.3
        inputs += ["-i", video(k)]
        fc += (f"[{i}:v]trim=start={s:.3f}:duration={d},setpts=PTS-STARTPTS,fps=30,scale=786:1704:flags=lanczos,"
               f"mpdecimate=max=-3,setpts=N/30/TB[c{i}];")
        parts.append(src(k) | {"cut_in_s": round(s, 3), "duration_s": d, "tap_at_s": round(t, 3), "moment": why})
    fc += "".join(f"[c{i}]" for i in range(len(cuts))) + f"concat=n={len(cuts)}:v=1:a=0[v]"
    ff([*inputs, "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    length = round(dur_mp4(f"{OUT}/{name}.mp4"), 2)
    k, still = poster
    Image.open(f"{CLIPS}/{STILLS[k]}.{still}.png").resize((786, 1704), Image.LANCZOS).save(f"{OUT}/{name}.png")
    meta(name, {"what": "Island montage, hard cuts on real taps", "sources": parts, "length_s": length, "poster": f"{name}.png", "poster_from": f"{STILLS[k]}.{still}.png"})
def dur_mp4(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True, check=True).stdout)

MIXES = {
    "split-CA17-island": lambda: split("split-CA17-island", "CA17L", "CA17D", "poster"),
    "pair-CA35-CA67": lambda: pair("pair-CA35-CA67", "Baari asks once (the Rs 340 kirana card) | the quiet log marks that line as the one time it told anyone",
                                   "CA35", "CA67", t_of("CA35", "swipe", plus=2.2), t_of("CA67", "tap", plus=2.6), LIGHT_BG, pre=6.0, post=4.0, still_a="haan", still_b="sheet"),
    "pair-CA63-CA64": lambda: pair("pair-CA63-CA64", "Two ways to talk to Baari: type it in the island | call her",
                                   "CA63", "CA64", t_of("CA63", "tap", target="it-go", plus=3.4), t_of("CA64", "tap", target="data-call", plus=4.2), DARK_BG, pre=5.0, post=4.0, still_a="reply", still_b="poster"),
    "montage-island": lambda: montage("montage-island", [
        ("CA17L", t_of("CA17L", "tap", 0), 3.0, "tap the pill, it grows into Aaj raat"),
        ("CA17L", t_of("CA17L", "swipe", 0), 2.4, "fling the Payment card"),
        ("CA21", vt("CA21", [t for t in taps_raw("CA21") if t["kind"] == "swipe" and t["x"] == 112][1]["t_ms"] / 1000), 3.0, "a finger along the roti row, each one bops"),
        ("CA35", t_of("CA35", "tap", target="ac-no"), 3.0, "Nahi on the kirana card: check, fold, count drops"),
        ("CA17b", t_of("CA17b", "tap", target="data-ans"), 3.0, "answer the question, the next slides in"),
        ("CA64", t_of("CA64", "tap", target="data-call"), 3.0, "Ya 2 min call: the orb"),
    ], ("CA17L", "poster")),
}
os.makedirs(OUT, exist_ok=True)
for n in (sys.argv[1:] or MIXES):
    MIXES[n]()
PY
