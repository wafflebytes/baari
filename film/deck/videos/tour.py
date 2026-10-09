"""Builds film/deck/videos/tour.mp4 and tour-poster.png from tour.json.

Run from the repo root: python3 film/deck/videos/tour.py [--frame N out.png]
Each part: trim the source, retime by its speed, scale 2x with lanczos to
786 x 1704, cut to an exact frame count; parts concat with hard cuts.
H.264 High, yuv420p, constant 30 fps, +faststart, no audio.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.normpath(os.path.join(HERE, "..", ".."))
T = json.load(open(os.path.join(HERE, "tour.json")))
W, H = T["size"]; FPS = T["fps"]

def parts():
    for c in T["chapters"]:
        for p in c["parts"]:
            yield c["name"], p

def build(out):
    ins, fil = [], []
    for i, (_, p) in enumerate(parts()):
        n = round(p["dur"] * FPS)
        span = p["dur"] * p["speed"] + 0.5
        ins += ["-ss", str(p["in"]), "-t", f"{span:.3f}", "-i", os.path.join(FILM, p["src"])]
        crop = p.get("crop")  # x:y:w:h in source pixels, for split mixes
        c = f"crop={crop}," if crop else ""
        fil.append(f"[{i}:v]{c}setpts=(PTS-STARTPTS)/{p['speed']},fps={FPS},scale={W}:{H}:flags=lanczos,setsar=1,trim=end_frame={n},setpts=N/{FPS}/TB[v{i}]")
    k = len(fil)
    fil.append("".join(f"[v{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0[out]")
    cmd = ["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "[out]",
           "-c:v", "libx264", "-profile:v", "high", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
           "-r", str(FPS), "-fps_mode", "cfr", "-an", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    out = os.path.join(HERE, "tour.mp4")
    build(out)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-frames:v", "1", os.path.join(HERE, "tour-poster.png")], check=True)
    d = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries", "stream=nb_read_frames,width,height,r_frame_rate,profile,pix_fmt", "-of", "json", out], capture_output=True, text=True).stdout
    print(d)
