#!/usr/bin/env bash
# Builds every mix for the screens group (Khata, Saamaan, Sunita, Diary,
# settings) from the takes in film/clips/, from scratch.
#
#   bash film/mixes/screens-mix.sh            # from the repo root
#   CLIPS=/other/dir bash film/mixes/screens-mix.sh
#
# Needs ffmpeg and python3 with Pillow. Writes film/mixes/<name>.mp4, .json, .png.
#
# Timing: puppeteer-core 24.43.1's screencast writes 30 frames per real second
# but passes -framerate after -i, so ffmpeg reads them at 25 fps and every
# .webm plays at 25/30 speed (1.2x slow). Each source goes through
# setpts=PTS*25/30 first, which puts it back on real time, so a tap's t_ms in
# .taps.json is its time in the corrected video.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export CLIPS="${CLIPS:-$ROOT/film/clips}" OUT="$ROOT/film/mixes"
mkdir -p "$OUT"
python3 - <<'PY'
import json, os, subprocess, glob
from PIL import Image

CLIPS, OUT = os.environ["CLIPS"], os.environ["OUT"]
FIX = "setpts=PTS*25/30"          # back to real time (see header)
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]
CREAM, LIGHT_BG, DARK_BG = "#F6F1E7", "#F6F1E7", "#141210"

def run(args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)

def taps(take):
    return json.load(open(f"{CLIPS}/{take}.taps.json"))["taps"]

def dur(take):
    """Length of the take on real time, in seconds."""
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-count_packets", "-show_entries", "stream=nb_read_packets",
                                       "-of", "csv=p=0", f"{CLIPS}/{take}.webm"]).decode().strip()) / 25
    return d * 25 / 30

def moment(take, kind=None, target=None, name=None, nth=0):
    """t (s) of a tap or still from taps.json."""
    hits = [t for t in taps(take) if (kind is None or t["kind"] == kind) and (target is None or (t.get("target") or "") == target)
            and (name is None or t.get("name") == name)]
    return hits[nth]["t_ms"] / 1000

def first_tap(take):
    return next(t["t_ms"] for t in taps(take) if t["kind"] in ("tap", "swipe")) / 1000

def meta(name, **kw):
    json.dump({"name": name, "fps_fix": "setpts=PTS*25/30 (puppeteer screencast plays 1.2x slow)", **kw},
              open(f"{OUT}/{name}.json", "w"), indent=2)

def probe_len(path):
    return round(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode()), 2)

# ---- 1. theme splits, 50/50 ------------------------------------------------
def split(row, label, poster_still):
    L, D = f"{row}-01-app-light-t1", f"{row}-01-app-dark-t1"
    if not (os.path.exists(f"{CLIPS}/{L}.webm") and os.path.exists(f"{CLIPS}/{D}.webm")):
        print("skip split", row); return
    fl, fd = first_tap(L), first_tap(D)
    tl, td = max(0, fl - fd), max(0, fd - fl)       # trim the later one
    n = min(dur(L) - tl, dur(D) - td)
    name = f"split-{row}-{label}"
    fc = (f"[0:v]{FIX},trim=start={tl:.3f},setpts=PTS-STARTPTS,scale=786:1704:flags=lanczos,crop=392:1704:0:0[l];"
          f"[1:v]{FIX},trim=start={td:.3f},setpts=PTS-STARTPTS,scale=786:1704:flags=lanczos,crop=392:1704:394:0[r];"
          f"color=c={CREAM}:s=2x1704:r=30[bar];[l][bar][r]hstack=3,trim=duration={n:.3f}[v]")
    run(["-i", f"{CLIPS}/{L}.webm", "-i", f"{CLIPS}/{D}.webm", "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    # poster: the two full-res stills, halved the same way
    a = Image.open(f"{CLIPS}/{L}.{poster_still}.png").convert("RGB").resize((786, 1704), Image.LANCZOS)
    b = Image.open(f"{CLIPS}/{D}.{poster_still}.png").convert("RGB").resize((786, 1704), Image.LANCZOS)
    p = Image.new("RGB", (786, 1704), CREAM); p.paste(a.crop((0, 0, 392, 1704)), (0, 0)); p.paste(b.crop((394, 0, 786, 1704)), (394, 0))
    p.save(f"{OUT}/{name}.png")
    meta(name, kind="theme split", sources=[{"file": f"{L}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "sync_first_tap_s": fl, "trim_s": round(tl, 3)},
                                           {"file": f"{D}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "sync_first_tap_s": fd, "trim_s": round(td, 3)}],
         length_s=probe_len(f"{OUT}/{name}.mp4"), poster={"file": f"{name}.png", "from_stills": f"{poster_still}.png of both takes",
                                                           "t_s": round(moment(L, "still", name=poster_still) - tl, 2)})

split("CA50", "dawn", "poster")
split("CA51", "kirana", "kirana")
split("CA56", "bade-akshar", "poster")

# ---- 2. pairs, 16:9 ---------------------------------------------------------
W, H, PW, PH, GAP = 1920, 1080, 452, 980, 120
X0, Y0 = (W - 2 * PW - GAP) // 2, (H - PH) // 2

def pair(name, a, ka, b, kb, poster_a, poster_b, story, bg=LIGHT_BG, lead=1.2, tail=None):
    """a, b: takes; ka, kb: key moment (s) in each. The key lands at the same second."""
    T = max(ka, kb, lead)
    sa, sb = ka - T, kb - T          # negative start means pad with the first frame
    def src(i, s):
        pad = f",tpad=start_duration={-s:.3f}:start_mode=clone" if s < 0 else ""
        cut = f",trim=start={s:.3f},setpts=PTS-STARTPTS" if s > 0 else ""
        return f"[{i}:v]{FIX}{cut}{pad},scale={PW}:{PH}:flags=lanczos"
    n = min(dur(a) - sa, dur(b) - sb)
    if tail: n = min(n, T + tail)
    fc = (f"color=c={bg}:s={W}x{H}:r=30:d={n:.3f}[bg];{src(0, sa)}[a];{src(1, sb)}[b];"
          f"[bg][a]overlay={X0}:{Y0}:shortest=1[t];[t][b]overlay={X0 + PW + GAP}:{Y0}:shortest=1,trim=duration={n:.3f}[v]")
    run(["-i", f"{CLIPS}/{a}.webm", "-i", f"{CLIPS}/{b}.webm", "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    p = Image.new("RGB", (W, H), bg)
    for i, f in enumerate((poster_a, poster_b)):
        p.paste(Image.open(f"{CLIPS}/{f}").convert("RGB").resize((PW, PH), Image.LANCZOS), (X0 + i * (PW + GAP), Y0))
    p.save(f"{OUT}/{name}.png")
    meta(name, kind="pair 16:9", story=story,
         sources=[{"file": f"{a}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "key_s": ka, "start_s": round(sa, 3)},
                  {"file": f"{b}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "key_s": kb, "start_s": round(sb, 3)}],
         key_at_s=round(T, 3), length_s=probe_len(f"{OUT}/{name}.mp4"), poster={"file": f"{name}.png", "from_stills": [poster_a, poster_b]})

A, B = "CA50-01-app-light-t1", "CA51-01-app-light-t1"
pair("pair-CA50-CA51", A, moment(A, "tap", ".nav a[data-tab=\"delivery\"]"), B, moment(B, "tap", ".nav a[data-tab=\"delivery\"]"),
     f"{A}.poster.png", f"{B}.kirana.png", "The parcel overnight and the kirana pickup: two ways the same dinner's saamaan arrives", tail=16)
A, B = "CA71-01-app-light-t1", "CA55-01-app-light-t2"
pair("pair-CA42-CA55", A, moment(A, "still", name="poster"), B, moment(B, "tap", "[data-receipt]") + 1.6,
     f"{A}.poster2.png", f"{B}.poster.png", "Asked on Pine Labs, printed on the slip: the waiting Rs 520 ask beside the day's receipt", lead=3, tail=6)
A, B = "CA56-01-app-light-t1", "CA58-01-app-light-t1"
pair("pair-CA56-CA58", A, moment(A, "tap", ".pop-big .tg"), B, moment(B, "tap", "[data-lang=\"hi\"]"),
     f"{A}.poster.png", f"{B}.hi.png", "Mummy Papa ke liye: bade akshar on one phone, Hindi on the other", lead=2.5, tail=7)

# ---- 3. montage ---------------------------------------------------------------
# (take, tap target or still name, seconds after the tap)
CUTS = [("CA71-01-app-light-t1", ("tap", "[data-bahi]"), 2.4),
        ("CA71-01-app-light-t1", ("tap", "[data-stqr=\"Mummy\"]"), 1.6),
        ("CA70-01-app-light-t2", ("tap", "[data-nudges]"), 2.6),
        ("CA50-01-app-light-t1", ("tap", ".nav a[data-tab=\"delivery\"]"), 2.6),
        ("CA55-01-app-light-t2", ("tap", "[data-receipt]"), 2.8),
        ("CA77-01-app-light-t1", ("tap", "[data-theme-set=\"dark\"]"), 2.0)]
parts, inputs, used = [], [], []
for i, (take, (k, tgt), after) in enumerate(CUTS):
    t = moment(take, k, tgt)
    s, e = t - 0.3, t + after
    inputs += ["-i", f"{CLIPS}/{take}.webm"]
    parts.append(f"[{i}:v]{FIX},trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS,scale=786:1704:flags=lanczos,fps=30,format=yuv420p[p{i}]")
    used.append({"file": f"{take}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "tap": tgt, "tap_s": t, "in_s": round(s, 3), "out_s": round(e, 3)})
fc = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(len(CUTS))) + f"concat=n={len(CUTS)}:v=1:a=0,mpdecimate,setpts=N/30/TB[v]"
run([*inputs, "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/montage-screens.mp4"])
Image.open(f"{CLIPS}/CA71-01-app-light-t1.qr.png").convert("RGB").resize((786, 1704), Image.LANCZOS).save(f"{OUT}/montage-screens.png")
meta("montage-screens", kind="montage 786x1704", cuts=used, length_s=probe_len(f"{OUT}/montage-screens.mp4"),
     poster={"file": "montage-screens.png", "from_still": "CA71-01-app-light-t1.qr.png (the settle-up QR)"})
print("done")
PY
