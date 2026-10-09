"""Builds assets/phone.mp4: the phone screen for the whole night, 786 x 1704, 30 fps,
from timing.json "phone" (video parts retimed by speed, or 3x stills held), hard cuts.
Run from film/deck/videos/night: python3 scripts/phone.py"""
import json, subprocess
T = json.load(open("timing.json")); FPS = 30; W, H = 786, 1704
ins, fil = [], []
for i, p in enumerate(T["phone"]):
    n = round(p["dur"] * FPS)
    if "img" in p:
        ins += ["-loop", "1", "-t", f"{p['dur'] + 0.2:.3f}", "-i", p["img"]]
        fil.append(f"[{i}:v]scale={W}:{H}:flags=lanczos,setsar=1,fps={FPS},trim=end_frame={n},setpts=N/{FPS}/TB[v{i}]")
    else:
        ins += ["-ss", str(p["in"]), "-t", f"{p['dur'] * p['speed'] + 0.5:.3f}", "-i", p["src"]]
        fil.append(f"[{i}:v]setpts=(PTS-STARTPTS)/{p['speed']},fps={FPS},scale={W}:{H}:flags=lanczos,setsar=1,trim=end_frame={n},setpts=N/{FPS}/TB[v{i}]")
k = len(fil)
fil.append("".join(f"[v{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0,format=yuv420p[out]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "[out]", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-r", str(FPS), "-an", "-movflags", "+faststart", "assets/phone.mp4"], check=True)
print(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", "assets/phone.mp4"], capture_output=True, text=True).stdout)
