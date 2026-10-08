#!/usr/bin/env bash
# Builds every mix for the screens group (Khata, Saamaan, Sunita, Diary,
# settings) from the takes in film/clips/, from scratch.
#
#   bash film/mixes/screens-mix.sh            # from the repo root
#   CLIPS=/other/dir bash film/mixes/screens-mix.sh
#
# Needs ffmpeg and python3 with Pillow and numpy. Writes film/mixes/<name>.mp4, .json, .png.
#
# Timing: puppeteer-core 24.43.1's screencast writes 30 frames per real second
# but passes -framerate after -i, so ffmpeg reads them at 25 fps and every
# .webm plays at 25/30 speed (1.2x slow). Each source goes through
# setpts=PTS*25/30 first, which puts it back on real time, so a tap's t_ms in
# .taps.json is its time in the corrected video.
#
# Glitch frames: while page.screenshot() takes a still, the screencast sends
# frames at device resolution (1179 px wide) and ffmpeg crops them to 393x852,
# so the take shows the page's top-left third at 3x for a few seconds. Each
# source is cleaned first: a frame that matches a 3x blow-up of the last good
# frame's top-left corner better than the good frame itself is dropped, and
# the gap is filled with the previous good frame (timing unchanged). Cleaned
# copies live in $MIXCACHE, outside the repo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export CLIPS="${CLIPS:-$ROOT/film/clips}" OUT="$ROOT/film/mixes" MIXCACHE="${MIXCACHE:-${TMPDIR:-/tmp}/screens-mix-cache}"
mkdir -p "$MIXCACHE"
mkdir -p "$OUT"
python3 - <<'PY'
import json, os, subprocess, glob
import numpy as np
from PIL import Image

CLIPS, OUT = os.environ["CLIPS"], os.environ["OUT"]
FIX = "setpts=PTS*25/30"          # back to real time (see header)
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]
CREAM, LIGHT_BG, DARK_BG = "#F6F1E7", "#F6F1E7", "#141210"

def run(args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)

CACHE = os.environ["MIXCACHE"]
_bad = {}
def glitches(take):
    """Spans [a, b] of screenshot-glitch frames in a take (see header)."""
    if take in _bad: return _bad[take]
    W, H = 132, 285
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"{CLIPS}/{take}.webm", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"])
    f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
    zoom = lambda g: np.asarray(Image.fromarray(g[:H // 3, :W // 3].astype(np.uint8)).resize((W, H), Image.BILINEAR), np.float32)
    bad = np.zeros(len(f), bool)
    G, Z = f[0], zoom(f[0])
    for i, F in enumerate(f):                       # rule 1: looks like a 3x corner of the last good frame
        en, ez = np.abs(F - G).mean(), np.abs(F - Z).mean()
        if ez < en * 0.6 and ez < 14: bad[i] = True
        else: G, Z = F, zoom(F)
    # rule 2: a run that jumps far from the frame before it (> 30 of 255),
    # stays away (> 5) and then snaps back to that exact frame (< 3) within
    # 8 s. Screenshot glitches do this, whatever their zoom; real changes
    # (scrolls, sheets, theme) don't return to an identical frame.
    # It must also sit inside a still's window (its triggering event to 5 s
    # after the still, or the next tap if sooner; frame index = t * 30, the recorder's real frame rate):
    # glitches only happen while a still is taken, and a real revert (dark,
    # light, dark) can look like a snap back.
    ev, wins = taps(take), []
    for k, x in enumerate(ev):
        if x["kind"] != "still": continue
        prev = max([y["t_ms"] for y in ev[:k] if y["kind"] != "still"], default=0)
        nxt = min([y["t_ms"] for y in ev[k + 1:] if y["kind"] != "still"], default=x["t_ms"] + 5000)
        wins.append((int(prev / 1000 * 30), int(min(x["t_ms"] + 5000, nxt) / 1000 * 30)))
    # rule 3: a still frame run (< 3 apart) of 3 to 60 frames that starts
    # with a jump (> 30) within 1.5 s of a still and ends with another jump:
    # a glitch that ends on a page that moved underneath it (scroll, poll).
    for x in ev:
        if x["kind"] != "still": continue
        s0 = int(x["t_ms"] / 1000 * 30)
        for i in range(max(s0, 1), min(s0 + 45, len(f) - 1)):
            if bad[i] or np.abs(f[i] - f[i - 1]).mean() <= 30: continue
            j = i + 1
            while j < len(f) and np.abs(f[j] - f[i]).mean() < 3: j += 1
            if 3 <= j - i <= 60 and j < len(f) and np.abs(f[j] - f[j - 1]).mean() > 30:
                bad[i:j] = True
            break
    i = 1
    while i < len(f):
        if not bad[i - 1] and np.abs(f[i] - f[i - 1]).mean() > 30:
            ref, j = f[i - 1], i
            while j < len(f) and j < i + 240 and np.abs(f[j] - ref).mean() >= 3: j += 1
            far = j > i and min(np.abs(f[k] - ref).mean() for k in range(i, j)) > 5      # zoom levels may change inside the run
            snap = far and (j == len(f) and j - i <= 60 or j < len(f) and j < i + 240)   # or a short run the take ends inside
            if j > i and snap and any(lo <= i and j <= hi for lo, hi in wins):
                bad[i:j] = True; i = j; continue
        i += 1
    spans = []
    for i in np.flatnonzero(bad):
        if spans and spans[-1][1] == i - 1: spans[-1][1] = int(i)
        else: spans.append([int(i), int(i)])
    _bad[take] = spans
    return spans

def src(take):
    """The take with its glitch frames replaced by the previous good frame."""
    out = f"{CACHE}/{take}.mkv"
    if not os.path.exists(out):
        sp = glitches(take)
        keep = f"select='not({'+'.join(f'between(n\\,{a}\\,{b})' for a, b in sp)})'," if sp else ""
        run(["-i", f"{CLIPS}/{take}.webm", "-vf", f"{keep}fps=25", "-c:v", "ffv1", out])
    return out

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
    json.dump({"name": name, "fps_fix": "setpts=PTS*25/30 (puppeteer screencast plays 1.2x slow)",
               "glitch_frames_frozen": {k: v for k, v in _bad.items()}, **kw},
              open(f"{OUT}/{name}.json", "w"), indent=2)

def probe_len(path):
    return round(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode()), 2)

# ---- 1. theme splits, 50/50 ------------------------------------------------
def split(row, label, poster_still, until=None):
    L, D = f"{row}-01-app-light-t1", f"{row}-01-app-dark-t1"
    if not (os.path.exists(f"{CLIPS}/{L}.webm") and os.path.exists(f"{CLIPS}/{D}.webm")):
        print("skip split", row); return
    # Sync on every event, not just the first: stills take different times in
    # the two takes, so they drift. The light take runs as it is; the dark one
    # is cut at each matching event and each piece trimmed or held on its last
    # frame to the light piece's length, so animations keep real speed.
    ev = lambda t: [x["t_ms"] / 1000 for x in taps(t) if x["kind"] in ("tap", "swipe", "scroll", "type", "still", "long_press")]
    el, ed = ev(L), ev(D)
    if len(el) != len(ed): raise SystemExit(f"split {row}: event lists differ")
    if until:   # stop this long after the named still (the takes' states part after it)
        j = next(i for i, x in enumerate(taps(L)) if x["kind"] == "still" and x["name"] == until[0])
        j = [x for x in taps(L) if x["kind"] in ("tap", "swipe", "scroll", "type", "still", "long_press")].index(taps(L)[j])
        el, ed = el[:j + 1], ed[:j + 1]
    fl, fd = el[0], ed[0]
    tl, td = max(0, fl - fd), max(0, fd - fl)
    tail = 0.04 if until else min(dur(L) - el[-1], dur(D) - ed[-1])
    hold = until[1] if until else 0     # end on the still's frame, held
    n = el[-1] + tail - tl
    cuts = [(td, ed[0], el[0] - tl)] + [(ed[i], ed[i + 1], el[i + 1] - el[i]) for i in range(len(ed) - 1)] + [(ed[-1], ed[-1] + tail, tail)]
    k = len(cuts)
    dark = f"[1:v]{FIX},scale=786:1704:flags=lanczos,crop=392:1704:394:0,split={k}" + "".join(f"[d{i}]" for i in range(k)) + ";"
    for i, (a, b, want) in enumerate(cuts):
        got = min(b - a, want)
        dark += f"[d{i}]trim=start={a:.3f}:duration={got:.3f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={max(0, want - got):.3f}[e{i}];"
    dark += "".join(f"[e{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0[r];"
    name = f"split-{row}-{label}"
    fc = (f"[0:v]{FIX},trim=start={tl:.3f},setpts=PTS-STARTPTS,scale=786:1704:flags=lanczos,crop=392:1704:0:0[l];" + dark +
          f"color=c={CREAM}:s=2x1704:r=30[bar];[l]fps=30[l2];[r]fps=30[r2];[l2][bar][r2]hstack=3,trim=duration={n:.3f},tpad=stop_mode=clone:stop_duration={hold}[v]")
    run(["-i", src(L), "-i", src(D), "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
    # poster: the two full-res stills, halved the same way
    a = Image.open(f"{CLIPS}/{L}.{poster_still}.png").convert("RGB").resize((786, 1704), Image.LANCZOS)
    b = Image.open(f"{CLIPS}/{D}.{poster_still}.png").convert("RGB").resize((786, 1704), Image.LANCZOS)
    p = Image.new("RGB", (786, 1704), CREAM); p.paste(a.crop((0, 0, 392, 1704)), (0, 0)); p.paste(b.crop((394, 0, 786, 1704)), (394, 0))
    p.save(f"{OUT}/{name}.png")
    meta(name, kind="theme split", sources=[{"file": f"{L}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "sync": "every event in taps.json", "events_s": el, "trim_s": round(tl, 3)},
                                           {"file": f"{D}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "sync": "cut at each event, held or trimmed to the light piece", "events_s": ed, "trim_s": round(td, 3)}],
         length_s=probe_len(f"{OUT}/{name}.mp4"), poster={"file": f"{name}.png", "from_stills": f"{poster_still}.png of both takes",
                                                           "t_s": round(moment(L, "still", name=poster_still) - tl, 2)})

split("CA50", "dawn", "poster")
split("CA51", "kirana", "kirana")
split("CA56", "bade-akshar", "poster", until=("poster", 1.5))   # after it, the scroll lands differently in the two takes

# ---- 2. pairs, 16:9 ---------------------------------------------------------
W, H, PW, PH, GAP = 1920, 1080, 452, 980, 120
X0, Y0 = (W - 2 * PW - GAP) // 2, (H - PH) // 2

def pair(name, a, ka, b, kb, poster_a, poster_b, story, bg=LIGHT_BG, lead=1.2, tail=None):
    """a, b: takes; ka, kb: key moment (s) in each. The key lands at the same second."""
    T = lead                         # the key lands at `lead` s in both
    sa, sb = ka - T, kb - T          # negative start means pad with the first frame
    def leg(i, s):
        pad = f",tpad=start_duration={-s:.3f}:start_mode=clone" if s < 0 else ""
        cut = f",trim=start={s:.3f},setpts=PTS-STARTPTS" if s > 0 else ""
        return f"[{i}:v]{FIX}{cut}{pad},scale={PW}:{PH}:flags=lanczos"
    n = min(dur(a) - sa, dur(b) - sb)
    if tail: n = min(n, T + tail)
    fc = (f"color=c={bg}:s={W}x{H}:r=30:d={n:.3f}[bg];{leg(0, sa)}[a];{leg(1, sb)}[b];"
          f"[bg][a]overlay={X0}:{Y0}:shortest=1[t];[t][b]overlay={X0 + PW + GAP}:{Y0}:shortest=1,trim=duration={n:.3f}[v]")
    run(["-i", src(a), "-i", src(b), "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/{name}.mp4"])
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
A, B = "CA71-01-app-light-t1", "CA55-01-app-light-t1"
pair("pair-CA42-CA55", A, moment(A, "still", name="poster"), B, moment(B, "tap", "[data-receipt]") + 1.6,
     f"{A}.poster2.png", f"{B}.poster.png", "Asked on Pine Labs, printed on the slip: the waiting Rs 520 ask beside the day's receipt", lead=3, tail=6)
A, B = "CA56-01-app-light-t1", "CA58-01-app-light-t1"
pair("pair-CA56-CA58", A, moment(A, "tap", ".pop-big .tg"), B, moment(B, "tap", "[data-lang=\"hi\"]"),
     f"{A}.poster.png", f"{B}.hi.png", "Mummy Papa ke liye: bade akshar on one phone, Hindi on the other", lead=2.5, tail=3.6)

# ---- 3. montage ---------------------------------------------------------------
# (take, tap target or still name, seconds after the tap)
CUTS = [("CA71-01-app-light-t1", ("tap", "[data-bahi]"), 2.4),
        ("CA71-01-app-light-t1", ("tap", "[data-stqr=\"Mummy\"]"), 1.6),
        ("CA70-01-app-light-t2", ("tap", "[data-nudges]"), 2.6),
        ("CA50-01-app-light-t1", ("tap", ".nav a[data-tab=\"delivery\"]"), 2.6),
        ("CA55-01-app-light-t1", ("tap", "[data-receipt]"), 2.8),
        ("CA77-01-app-light-t1", ("tap", "[data-theme-set=\"dark\"]"), 2.0)]
parts, inputs, used = [], [], []
for i, (take, (k, tgt), after) in enumerate(CUTS):
    t = moment(take, k, tgt)
    s, e = t - 0.3, t + after
    inputs += ["-i", src(take)]
    # idle frames out per moment, then its settled last frame held so it reads
    parts.append(f"[{i}:v]{FIX},trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS,scale=786:1704:flags=lanczos,fps=30,"
                 f"mpdecimate,setpts=N/30/TB,tpad=stop_mode=clone:stop_duration=1.3,format=yuv420p[p{i}]")
    used.append({"file": f"{take}.webm", "branch": "claude/vibrant-clarke-9vqgz1", "tap": tgt, "tap_s": t, "in_s": round(s, 3), "out_s": round(e, 3)})
fc = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(len(CUTS))) + f"concat=n={len(CUTS)}:v=1:a=0[v]"
run([*inputs, "-filter_complex", fc, "-map", "[v]", *ENC, f"{OUT}/montage-screens.mp4"])
Image.open(f"{CLIPS}/CA71-01-app-light-t1.qr.png").convert("RGB").resize((786, 1704), Image.LANCZOS).save(f"{OUT}/montage-screens.png")
meta("montage-screens", kind="montage 786x1704", cuts=used, length_s=probe_len(f"{OUT}/montage-screens.mp4"),
     poster={"file": "montage-screens.png", "from_still": "CA71-01-app-light-t1.qr.png (the settle-up QR)"})
print("done")
PY
