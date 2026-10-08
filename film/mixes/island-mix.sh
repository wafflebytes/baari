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
TAKES = {
    "CA17L": "CA17-01-app-light-t2", "CA17D": "CA17-01-app-dark-t2",
    "CA21": "CA21-01-app-light-t1", "CA35": "CA35-01-app-light-t1",
    "CA17b": "CA17b-01-app-light-t1", "CA63": "CA63-01-app-light-t1",
    "CA64": "CA64-01-app-dark-t2", "CA67": "CA67-01-app-light-t1",
}
CREAM, LIGHT_BG, DARK_BG = "0xF6F1E7", "0xF6F1E7", "0x141210"
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]

def taps(k): return json.load(open(f"{CLIPS}/{TAKES[k]}.taps.json"))["taps"]
def video(k): return f"{CLIPS}/{TAKES[k]}.webm"
def dur(path):
    # The screencast webm has no duration in its header; count packets at 25 fps.
    n = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout.strip()
    return int(n) / 25.0
def t_of(k, kind, nth=0, name=None, target=None):
    hits = [t for t in taps(k) if t["kind"] == kind and (name is None or t.get("name") == name) and (target is None or target in str(t.get("target")))]
    return hits[nth]["t_ms"] / 1000.0
def ff(args): subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)
def meta(name, d): json.dump(d, open(f"{OUT}/{name}.json", "w"), indent=2); print(f"{name}: {d['length_s']} s")
def src(k): return {"file": f"film/clips/{TAKES[k]}.webm", "branch": BRANCH}

# 1. Theme split: left half of the light take, right half of the dark take,
# 2 px cream divider, synced on each take's first tap.
def split(name, kl, kd, poster_still):
    tl, td = t_of(kl, "tap"), t_of(kd, "tap")
    off = tl - td  # >0: light tap is later, trim light by off
    sl, sd = max(0, off), max(0, -off)
    length = round(min(dur(video(kl)) - sl, dur(video(kd)) - sd), 2)
    fc = (f"[0:v]trim=start={sl:.3f},setpts=PTS-STARTPTS,fps=30,scale=786:1704:flags=lanczos,crop=393:1704:0:0[l];"
          f"[1:v]trim=start={sd:.3f},setpts=PTS-STARTPTS,fps=30,scale=786:1704:flags=lanczos,crop=393:1704:393:0[r];"
          f"[l][r]hstack,drawbox=x=392:y=0:w=2:h=1704:color={CREAM}:t=fill,trim=duration={length}[v]")
    ff(["-i", video(kl), "-i", video(kd), "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    L = Image.open(f"{CLIPS}/{TAKES[kl]}.{poster_still}.png").resize((786, 1704), Image.LANCZOS)
    D = Image.open(f"{CLIPS}/{TAKES[kd]}.{poster_still}.png").resize((786, 1704), Image.LANCZOS)
    P = Image.new("RGB", (786, 1704)); P.paste(L.crop((0, 0, 393, 1704)), (0, 0)); P.paste(D.crop((393, 0, 786, 1704)), (393, 0))
    P.paste(Image.new("RGB", (2, 1704), "#F6F1E7"), (392, 0)); P.save(f"{OUT}/{name}.png")
    meta(name, {"what": "Theme split: light take left, dark take right", "sources": [src(kl) | {"sync": f"first tap at {tl:.3f} s", "trim_start_s": round(sl, 3)}, src(kd) | {"sync": f"first tap at {td:.3f} s", "trim_start_s": round(sd, 3)}],
                "length_s": length, "poster": f"{name}.png", "poster_time_s": round(t_of(kl, "still", name=poster_still) - sl, 2), "poster_from": f"{poster_still}.png stills of both takes"})

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
    P.paste(Image.open(f"{CLIPS}/{TAKES[ka]}.{still_a}.png").resize((w, 980), Image.LANCZOS), (x0, y0))
    P.paste(Image.open(f"{CLIPS}/{TAKES[kb]}.{still_b}.png").resize((w, 980), Image.LANCZOS), (x0 + w + gap, y0))
    P.save(f"{OUT}/{name}.png")
    meta(name, {"what": what, "sources": [src(ka) | {"sync": f"key moment at {ta:.3f} s", "trim_start_s": round(sa, 3)}, src(kb) | {"sync": f"key moment at {tb:.3f} s", "trim_start_s": round(sb, 3)}],
                "length_s": length, "key_at_s": round(pre, 2), "poster": f"{name}.png", "poster_time_s": round(pre, 2), "poster_from": f"{still_a}.png | {still_b}.png"})

# 3. Montage: hard cuts, each starting 300 ms before a real tap, idle frames
# dropped with mpdecimate (max 12 in a row, so a settled state still holds).
def montage(name, cuts, poster):
    parts, inputs, fc = [], [], ""
    for i, (k, t, d, why) in enumerate(cuts):
        s = t - 0.3
        inputs += ["-i", video(k)]
        fc += (f"[{i}:v]trim=start={s:.3f}:duration={d},setpts=PTS-STARTPTS,fps=30,scale=786:1704:flags=lanczos,"
               f"mpdecimate=max=12,setpts=N/30/TB[c{i}];")
        parts.append(src(k) | {"cut_in_s": round(s, 3), "duration_s": d, "tap_at_s": round(t, 3), "moment": why})
    fc += "".join(f"[c{i}]" for i in range(len(cuts))) + f"concat=n={len(cuts)}:v=1:a=0[v]"
    ff([*inputs, "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    length = round(dur_mp4(f"{OUT}/{name}.mp4"), 2)
    k, still = poster
    Image.open(f"{CLIPS}/{TAKES[k]}.{still}.png").resize((786, 1704), Image.LANCZOS).save(f"{OUT}/{name}.png")
    meta(name, {"what": "Island montage, hard cuts on real taps", "sources": parts, "length_s": length, "poster": f"{name}.png", "poster_from": f"{TAKES[k]}.{still}.png"})
def dur_mp4(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True, check=True).stdout)

MIXES = {
    "split-CA17-island": lambda: split("split-CA17-island", "CA17L", "CA17D", "poster"),
    "pair-CA35-CA67": lambda: pair("pair-CA35-CA67", "Baari asks once (the Rs 340 kirana card) | the quiet log marks that line as the one time it told anyone",
                                   "CA35", "CA67", t_of("CA35", "still", name="haan"), t_of("CA67", "still", name="sheet"), LIGHT_BG, pre=6.0, post=4.0, still_a="haan", still_b="sheet"),
    "pair-CA63-CA64": lambda: pair("pair-CA63-CA64", "Two ways to talk to Baari: type it in the island | call her",
                                   "CA63", "CA64", t_of("CA63", "still", name="reply"), t_of("CA64", "still", name="poster"), DARK_BG, pre=5.0, post=4.0, still_a="reply", still_b="poster"),
    "montage-island": lambda: montage("montage-island", [
        ("CA17L", t_of("CA17L", "tap", 0), 2.4, "tap the pill, it grows into Aaj raat"),
        ("CA17L", t_of("CA17L", "swipe", 0), 1.8, "fling the Payment card"),
        ("CA21", [t for t in taps("CA21") if t["kind"] == "swipe" and t["x"] == 112][1]["t_ms"] / 1000, 2.4, "a finger along the roti row, each one bops"),
        ("CA35", t_of("CA35", "tap", target="ac-no"), 2.6, "Nahi on the kirana card: check, fold, count drops"),
        ("CA17b", t_of("CA17b", "tap", target="data-ans"), 2.2, "answer the question, the next slides in"),
        ("CA64", t_of("CA64", "tap", target="data-call"), 3.0, "Ya 2 min call: the orb"),
    ], ("CA17L", "poster")),
}
os.makedirs(OUT, exist_ok=True)
for n in (sys.argv[1:] or MIXES):
    MIXES[n]()
PY
