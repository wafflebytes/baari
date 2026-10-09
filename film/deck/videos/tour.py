"""Builds film/deck/videos/tour.mp4 and tour-poster.png from tour.json.

Run from the repo root:
  python3 film/deck/videos/tour.py            the file and its poster
  python3 film/deck/videos/tour.py --plan     each part's source range and frame count
  python3 film/deck/videos/tour.py --draft    a fast, smaller encode for checking cuts
Each part plays a source range [in, out] at its speed, hard cuts between parts and
chapters. A chapter is exactly round(chapter x fps) frames: every part but the last
keeps its range, and the last part ends on its out point (the poster side) and starts
wherever the chapter's remaining frames put it. Scale 2x with lanczos to 786 x 1704.
H.264 High, yuv420p, constant 30 fps, +faststart, no audio.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.normpath(os.path.join(HERE, "..", ".."))
T = json.load(open(os.path.join(HERE, "tour.json")))
W, H = T["size"]; FPS = T["fps"]; CH = round(T["chapter"] * FPS)

def plan():
    out, t = [], 0
    for ci, c in enumerate(T["chapters"]):
        parts = c["parts"]
        n_fixed = [round((p["out"] - p["in"]) / p["speed"] * FPS) for p in parts[:-1]]
        last = parts[-1]
        n_last = CH - sum(n_fixed)
        if n_last <= 0:
            sys.exit(f"chapter {ci + 1} ({c['name']}): its fixed parts already fill {sum(n_fixed)} of {CH} frames")
        for p, n in zip(parts, n_fixed + [n_last]):
            a, b = p["in"], p["out"]
            if p is last:
                a = b - n / FPS * p["speed"]
            out.append({"chapter": ci + 1, "name": c["name"], "src": p["src"], "in": round(a, 3),
                        "out": round(b, 3), "speed": p["speed"], "frames": n, "at": round(t / FPS, 3),
                        "crop": p.get("crop")})
            t += n
    return out

def build(out, draft=False):
    ins, fil = [], []
    P = plan()
    for i, p in enumerate(P):
        span = p["out"] - p["in"] + 0.2
        ins += ["-ss", f"{p['in']:.3f}", "-t", f"{span:.3f}", "-i", os.path.join(FILM, p["src"])]
        c = f"crop={p['crop']}," if p["crop"] else ""
        fil.append(f"[{i}:v]{c}setpts=(PTS-STARTPTS)/{p['speed']},fps={FPS}:round=down,"
                   f"scale={W}:{H}:flags=lanczos,setsar=1,trim=end_frame={p['frames']},setpts=N/{FPS}/TB[v{i}]")
    k = len(fil)
    fil.append("".join(f"[v{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0[out]")
    q = ["-crf", "26", "-preset", "veryfast"] if draft else ["-crf", "16", "-preset", "slow"]
    cmd = ["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "[out]",
           "-c:v", "libx264", "-profile:v", "high", *q, "-pix_fmt", "yuv420p",
           "-r", str(FPS), "-fps_mode", "cfr", "-an", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    if "--plan" in sys.argv:
        for p in plan():
            print(f"{p['at']:6.2f}s  ch{p['chapter']} {p['name']:<28} {os.path.basename(p['src']):<30} "
                  f"{p['in']:7.3f} to {p['out']:7.3f} at {p['speed']}x  {p['frames']} frames")
        sys.exit()
    draft = "--draft" in sys.argv
    out = os.path.join(HERE, "tour", "tour-draft.mp4") if draft else os.path.join(HERE, "tour.mp4")
    build(out, draft)
    if not draft:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-frames:v", "1", os.path.join(HERE, "tour-poster.png")], check=True)
    d = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries", "stream=nb_read_frames,width,height,r_frame_rate,profile,pix_fmt", "-of", "json", out], capture_output=True, text=True).stdout
    print(d)
