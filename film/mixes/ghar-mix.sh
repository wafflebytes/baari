#!/usr/bin/env bash
# Builds every Ghar mix from scratch: the theme split, the pairs and the
# montage. Re-run it on the final takes:
#
#   bash film/mixes/ghar-mix.sh            # from the repo root
#
# Needs ffmpeg and python3. Reads film/clips/<take>.webm, .taps.json and
# .png; writes film/mixes/<name>.mp4, .json and .png. Work files go in
# $MIX_TMP (default /tmp/ghar-mix), never in the repo.
#
# Two things about the takes this works around (both in clip.mjs, which this
# lane doesn't edit):
#  1. While clip.mjs takes a still, the screencast records the 3x screenshot
#     frame, so about a second of video shows a zoomed top-left crop. Those
#     frames are found by matching them against the still's own top-left
#     crop, and replaced with the last clean frame.
#  2. The video runs slower than the tap log around every still, by a
#     different amount each time, so t_ms can't be read as video seconds.
#     Each still's bad frames end when its t_ms is logged, which anchors the
#     log to the video; a tap's video time is then the first visual change
#     near its interpolated time.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export ROOT MIX_TMP="${MIX_TMP:-/tmp/ghar-mix}"
mkdir -p "$MIX_TMP" "$ROOT/film/mixes"
python3 - "$@" <<'PY'
import json, os, subprocess, sys, glob

ROOT = os.environ["ROOT"]; TMP = os.environ["MIX_TMP"]
CLIPS = f"{ROOT}/film/clips"; OUT = f"{ROOT}/film/mixes"
BRANCH = subprocess.run(["git", "-C", ROOT, "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True).stdout.strip()
W, H, FPS = 393, 852, 25          # the screencast: CSS pixels, 25 fps
TW, TH = 49, 106                  # thumbnails for matching and change detection
CREAM, BG_LIGHT, BG_DARK = "#F3EAD3", "#F6F1E7", "#141210"
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]

def run(cmd): subprocess.run(cmd, check=True)
def ff(*a): run(["ffmpeg", "-v", "error", "-y", *a])
def thumbs(src, crop=None):
    vf = (f"crop={crop}," if crop else "") + f"scale={TW}:{TH}:flags=area,format=gray"
    d = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", vf, "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    n = TW * TH
    return [d[i:i + n] for i in range(0, len(d), n)]
def mad(a, b): return sum(abs(x - y) for x, y in zip(a, b)) / len(a)

TAKES = {}
def take(name):
    """Analyse one take once: bad frames, still anchors, each event's video time."""
    if name in TAKES: return TAKES[name]
    webm = f"{CLIPS}/{name}.webm"
    if not os.path.exists(webm): raise SystemExit(f"missing take {webm}")
    log = json.load(open(f"{CLIPS}/{name}.taps.json"))["taps"]
    fr = thumbs(webm)
    stills = {}
    for p in sorted(glob.glob(f"{CLIPS}/{name}.*.png")):
        s = p[len(CLIPS) + len(name) + 2:-4]
        stills[s] = thumbs(p, f"{W}:{H}:0:0")[0]
    # Walk the log in order. The video only ever runs slower than the log,
    # so each event is searched for just after the previous one: a still is
    # the run of frames that match its own top-left crop, a tap or swipe the
    # first visible change.
    diff = [0.0] + [mad(fr[i], fr[i - 1]) for i in range(1, len(fr))]
    bad, anchors = set(), [(0.0, 0.15)]
    cur_t, cur_v = 0.0, 0.15
    for e in log:
        t = e["t_ms"] / 1000
        lb = cur_v + (t - cur_t) * 0.97
        if e["kind"] == "still":
            if e["name"] not in stills: continue
            ref = stills[e["name"]]
            # the screenshot starts when the previous step ends: look back a
            # little from the lower bound, and up to 4 s past it
            lo, hi = max(0, int((lb - 1.6) * FPS)), min(len(fr), int((lb + 4) * FPS))
            hits = [i for i in range(lo, hi) if mad(fr[i], ref) < 12 and i / FPS > cur_v]
            if not hits: continue
            r = [hits[0]]
            for i in hits[1:]:
                if i - r[-1] > 3: break
                r.append(i)
            bad.update(range(r[0], r[-1] + 1))
            e["v_start"], e["v_end"] = r[0] / FPS, (r[-1] + 1) / FPS
            anchors.append((t, e["v_end"])); cur_t, cur_v = t, e["v_end"]
        else:
            lo, hi = max(1, int((lb - 0.1) * FPS)), min(len(fr), int((lb + 2.5) * FPS))
            on = None
            for i in range(lo, hi):
                base = sorted(diff[max(1, i - 12):i])[len(diff[max(1, i - 12):i]) // 2] if i > 2 else 0
                if i not in bad and (i - 1) not in bad and diff[i] > max(1.2, 3 * base):
                    on = i; break
            e["v"] = round((on / FPS - 0.08) if on is not None else lb, 3)
            e["v_from"] = "onset" if on is not None else "log"
            cur_t, cur_v = t, max(cur_v, e["v"])
    # The clean copy: every bad frame replaced by the last clean one.
    clean = f"{TMP}/{name}.clean.mp4"
    if True:  # always rebuilt: the bad-frame set depends on this analysis
        dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", webm, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                "-c:v", "libx264", "-crf", "10", "-preset", "fast", "-pix_fmt", "yuv444p", clean], stdin=subprocess.PIPE)
        n, i, last = W * H * 3, 0, None
        while True:
            b = dec.stdout.read(n)
            if len(b) < n: break
            if i in bad and last is not None: b = last
            else: last = b
            enc.stdin.write(b); i += 1
        enc.stdin.close(); enc.wait(); dec.wait()
    T = {"name": name, "file": f"film/clips/{name}.webm", "clean": clean, "diff": diff, "badset": bad, "frames": len(fr), "dur": len(fr) / FPS,
         "bad_frames": len(bad), "anchors": anchors, "log": log}
    TAKES[name] = T
    return T

def ev(T, kind=None, target=None, name=None, nth=0):
    hits = [e for e in T["log"] if (kind is None or e["kind"] == kind) and (target is None or e.get("target") == target) and (name is None or e.get("name") == name)]
    return hits[nth]
def vt(e): return e["v"] if "v" in e else e["v_start"]

def frames_check(mp4, times, tag):
    for k, t in enumerate(times):
        ff("-ss", f"{t:.2f}", "-i", mp4, "-frames:v", "1", f"{TMP}/check-{tag}-{k}.png")

def meta(name, d):
    json.dump(d, open(f"{OUT}/{name}.json", "w"), indent=1)
    print(f"{name}.mp4 {d['length_s']} s")

def length(mp4):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout)

# ---- 1. Theme split: light left, dark right. Synced on the first tap, then
# held in sync: the two takes stretch differently around their stills, so
# the dark take is warped piece by piece onto the light one between the
# same events (every tap, swipe and still edge, matched by order).
def points(T):
    out = []
    for e in T["log"]:
        if e["kind"] == "still":
            if "v_start" in e: out += [(e["kind"] + ":" + e["name"] + ":in", e["v_start"]), (e["kind"] + ":" + e["name"] + ":out", e["v_end"])]
        else: out.append((e["kind"] + ":" + str(e.get("target")), e["v"]))
    return out
def split(name, light, dark, poster_still):
    L, D = take(light), take(dark)
    pl, pd = points(L), points(D)
    if [k for k, _ in pl] != [k for k, _ in pd]: raise SystemExit(f"{name}: the takes' events differ")
    first = next(i for i, (k, _) in enumerate(pl) if k.startswith("tap:"))
    pre = min(pl[first][1], pd[first][1], 2.0)
    pts = [(pl[first][1] - pre, pd[first][1] - pre)] + [(a, b) for (_, a), (_, b) in zip(pl[first:], pd[first:])]
    tail = min(L["dur"] - pts[-1][0], D["dur"] - pts[-1][1]) - 0.2
    pts.append((pts[-1][0] + tail, pts[-1][1] + tail))
    dur = round(pts[-1][0] - pts[0][0], 2)
    segs, fc = [], []
    for k, ((a0, b0), (a1, b1)) in enumerate(zip(pts, pts[1:])):
        if a1 - a0 < 0.02: continue
        r = (a1 - a0) / max(0.02, b1 - b0)
        fc.append(f"[d{k}]trim=start={b0:.3f}:end={b1:.3f},setpts=(PTS-STARTPTS)*{r:.5f}[w{k}]")
        segs.append({"light_s": [round(a0, 3), round(a1, 3)], "dark_s": [round(b0, 3), round(b1, 3)], "speed": round(1 / r, 3)})
    n = len(fc)
    mp4 = f"{OUT}/{name}.mp4"
    graph = (f"[0]trim=start={pts[0][0]:.3f}:duration={dur},setpts=PTS-STARTPTS,fps=30,scale=786:1704:flags=lanczos,crop=392:1704:0:0[l];"
             f"[1]split={n}" + "".join(f"[d{k}]" for k in range(len(pts) - 1) if f"[d{k}]trim" in "".join(fc)) + ";"
             + ";".join(fc) + ";" + "".join(f"[w{k}]" for k in range(len(pts) - 1) if f"[w{k}]" in "".join(fc))
             + f"concat=n={n}:v=1:a=0,fps=30,scale=786:1704:flags=lanczos,crop=392:1704:394:0,trim=duration={dur}[r];[l][2][r]hstack=3,setsar=1[v]")
    ff("-i", L["clean"], "-i", D["clean"], "-f", "lavfi", "-i", f"color=c={CREAM}:s=2x1704:r=30:d={dur}", "-filter_complex", graph, "-map", "[v]", *ENC, "-t", str(dur), mp4)
    pL, pD = f"{CLIPS}/{light}.{poster_still}.png", f"{CLIPS}/{dark}.{poster_still}.png"
    ff("-i", pL, "-i", pD, "-f", "lavfi", "-i", f"color=c={CREAM}:s=2x1704", "-filter_complex",
       "[0]scale=786:1704:flags=lanczos,crop=392:1704:0:0[l];[1]scale=786:1704:flags=lanczos,crop=392:1704:394:0[r];[l][2][r]hstack=3", "-frames:v", "1", f"{OUT}/{name}.png")
    ps = ev(L, kind="still", name=poster_still)
    eL, eD = L["log"][first], D["log"][first]
    meta(name, {"kind": "theme split", "size": "786x1704", "sources": [
        {"file": L["file"], "branch": BRANCH, "theme": "light", "sync": {"event": "first tap", "target": eL.get("target"), "t_ms": eL["t_ms"], "video_s": eL["v"]}, "trim_start_s": round(pts[0][0], 3)},
        {"file": D["file"], "branch": BRANCH, "theme": "dark", "sync": {"event": "first tap", "target": eD.get("target"), "t_ms": eD["t_ms"], "video_s": eD["v"]}, "trim_start_s": round(pts[0][1], 3),
         "warp": segs}],
        "length_s": round(length(mp4), 2), "poster": f"film/mixes/{name}.png", "poster_from": [f"film/clips/{light}.{poster_still}.png", f"film/clips/{dark}.{poster_still}.png"],
        "poster_time_s": round(ps["v_start"] - pts[0][0], 2), "stills_repaired_frames": [L["bad_frames"], D["bad_frames"]]})
    frames_check(mp4, [0.05, pl[first + 3][1] - pts[0][0] + 0.6, pl[first + 6][1] - pts[0][0] + 0.8, dur - 0.1], name)

# ---- 2. Pairs: two phones on 1920x1080, key moments at the same second.
def pair(name, left, right, story, bg=BG_LIGHT, pre=1.6, post=4.0, posters=None, shift=(0.0, 0.0)):
    # shift: seconds after the logged event where that side's moment lands
    # (a scroll's card arrives a beat after the scroll starts)
    (lt, le), (rt, re_) = left, right
    A, B = take(lt), take(rt)
    kA, kB = vt(le(A)) + shift[0], vt(re_(B)) + shift[1]
    pre = min(pre, kA, kB)
    post = min(post, A["dur"] - kA - 0.1, B["dur"] - kB - 0.1)
    dur = round(pre + post, 2)
    sA, sB = kA - pre, kB - pre
    mp4 = f"{OUT}/{name}.mp4"
    ph = lambda s: f"trim=start={s:.3f}:duration={dur},setpts=PTS-STARTPTS,fps=30,scale=452:980:flags=lanczos,setsar=1"
    ff("-i", A["clean"], "-i", B["clean"], "-f", "lavfi", "-i", f"color=c={bg}:s=1920x1080:r=30:d={dur}", "-filter_complex",
       f"[0]{ph(sA)}[a];[1]{ph(sB)}[b];[2][a]overlay=448:50[t];[t][b]overlay=1020:50[v]", "-map", "[v]", *ENC, "-t", str(dur), mp4)
    pa, pb = posters
    ff("-i", f"{CLIPS}/{lt}.{pa}.png", "-i", f"{CLIPS}/{rt}.{pb}.png", "-f", "lavfi", "-i", f"color=c={bg}:s=1920x1080", "-filter_complex",
       "[0]scale=452:980:flags=lanczos[a];[1]scale=452:980:flags=lanczos[b];[2][a]overlay=448:50[t];[t][b]overlay=1020:50", "-frames:v", "1", f"{OUT}/{name}.png")
    eA, eB = le(A), re_(B)
    meta(name, {"kind": "pair", "story": story, "size": "1920x1080", "sources": [
        {"file": A["file"], "branch": BRANCH, "side": "left", "sync": {"event": eA["kind"], "target": eA.get("target") or eA.get("name"), "t_ms": eA["t_ms"], "video_s": kA}, "trim_start_s": round(sA, 3)},
        {"file": B["file"], "branch": BRANCH, "side": "right", "sync": {"event": eB["kind"], "target": eB.get("target") or eB.get("name"), "t_ms": eB["t_ms"], "video_s": kB}, "trim_start_s": round(sB, 3)}], "shift_s": list(shift),
        "key_at_s": round(pre, 2), "length_s": round(length(mp4), 2), "poster": f"film/mixes/{name}.png",
        "poster_from": [f"film/clips/{lt}.{pa}.png", f"film/clips/{rt}.{pb}.png"], "poster_time_s": None})
    frames_check(mp4, [0.05, pre, pre + post * 0.5, dur - 0.1], name)

# ---- 3. Montage: hard cuts, each starting 300 ms before a tap and ending
# once its animation settles (0.6 s without change, and no sooner than 1.3 s
# in), then a 0.5 s hold so it reads; at least 1.9 s a moment. mpdecimate drops the frozen frames inside.
def settled(T, v, cap):
    d, f0 = T["diff"], int(v * FPS)
    quiet = 0
    for i in range(f0 + int(1.0 * FPS), min(len(d), int((v + cap) * FPS))):
        quiet = quiet + 1 if d[i] < 0.6 or i in T["badset"] else 0
        if quiet >= 15: return (i - 14) / FPS
    return v + cap
def montage(name, moments, poster):
    parts, segs, t = [], [], 0.0
    for k, (tk, pick, cap) in enumerate(moments):
        T = take(tk); e = pick(T); s = max(0, vt(e) - 0.3)
        end = settled(T, vt(e), cap)
        seg = f"{TMP}/{name}-{k}.mp4"
        ff("-i", T["clean"], "-vf", f"trim=start={s:.3f}:end={end:.3f},setpts=PTS-STARTPTS,mpdecimate,setpts=N/{FPS}/TB", "-c:v", "libx264", "-crf", "10", "-preset", "fast", "-pix_fmt", "yuv444p", "-an", f"{seg}.raw.mp4")
        hold = max(0.5, 1.9 - length(f"{seg}.raw.mp4"))
        ff("-i", f"{seg}.raw.mp4", "-vf", f"tpad=stop_mode=clone:stop_duration={hold:.2f},fps=30,scale=786:1704:flags=lanczos,setsar=1",
           "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", seg)
        L = length(seg)
        segs.append({"file": T["file"], "branch": BRANCH, "cut_on": {"event": e["kind"], "target": e.get("target"), "t_ms": e["t_ms"], "video_s": vt(e)},
                     "in_s": round(s, 3), "out_s": round(end, 3), "hold_s": round(hold, 2), "length_s": round(L, 2), "at_s": round(t, 2)})
        parts.append(seg); t += L
    lst = f"{TMP}/{name}.txt"
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    mp4 = f"{OUT}/{name}.mp4"
    ff("-f", "concat", "-safe", "0", "-i", lst, *ENC, mp4)
    pt, ps_, at = poster
    ff("-i", f"{CLIPS}/{pt}.{ps_}.png", "-vf", "scale=786:1704:flags=lanczos", "-frames:v", "1", f"{OUT}/{name}.png")
    meta(name, {"kind": "montage", "size": "786x1704", "moments": segs, "length_s": round(length(mp4), 2),
                "poster": f"film/mixes/{name}.png", "poster_from": f"film/clips/{pt}.{ps_}.png", "poster_time_s": at})
    frames_check(mp4, [x["at_s"] + x["length_s"] - 0.2 for x in segs], name)

tap = lambda target, nth=0: (lambda T: ev(T, kind="tap", target=target, nth=nth))
swipe = lambda nth: (lambda T: ev(T, kind="swipe", nth=nth))
scroll = lambda nth: (lambda T: ev(T, kind="scroll", nth=nth))
still = lambda n: (lambda T: ev(T, kind="still", name=n))

only = set(sys.argv[1:])
want = lambda n: not only or n in only

if want("split-CA20-reel"):
    split("split-CA20-reel", "CA20-01-app-light-t1", "CA20-01-app-dark-t1", "poster")

if want("pair-CA69-done-missed"):
    pair("pair-CA69-done-missed", ("CA69-01-app-light-t1", tap("[data-task]")), ("CA69-02-app-light-t1", scroll(0)),
         "Raat ka kaam, both endings: Bhigo diya on time, or Reh gaya and the cook gets plan B",
         pre=1.4, post=4.2, posters=("poster", "missed"), shift=(0.0, 1.0))
if want("pair-CA24-CA23"):
    pair("pair-CA24-CA23", ("CA24-01-app-light-t1", tap(".isa .isa-in")), ("CA23-01-app-light-t1", tap(".sheet [data-go]")),
         "Sunita ji is off tomorrow: find a cook nearby, or make it a treat night",
         pre=1.4, post=5.2, posters=("poster", "poster"))
if want("pair-CA15-vote-pakka"):
    pair("pair-CA15-vote-pakka", ("CA15-01-app-light-t1", tap(".hx-seg [data-hxi=\"1\"]")), ("CA15-02-app-light-t1", still("pakka")),
         "8:30 pm, two plates on the vote; 9:30 pm, the plate that won",
         pre=1.2, post=2.6, posters=("vote", "pakka"))

if want("montage-ghar"):
    montage("montage-ghar", [
        ("CA20-01-app-light-t1", tap("[data-shuffle]", 2), 2.6),
        ("CA25-01-app-light-t1", swipe(1), 2.0),
        ("CA26-01-app-light-t1", swipe(1), 2.2),
        ("CA69-01-app-light-t1", tap("[data-task]"), 2.0),
        ("CA73-01-app-light-t1", tap("[data-pass]"), 2.0),
        ("CA23-01-app-light-t1", tap(".sheet [data-go]"), 2.7),
        ("CA24-01-app-light-t1", tap(".isa .isa-in"), 3.0),
    ], poster=("CA20-01-app-light-t1", "poster", 2.2))
PY
