"""Cuts and retimes the source ranges in timing.json "prep" into assets/.
Run from film/deck/videos/night: python3 -I scripts/prep.py
Each part: trim, retime by its speed, 30 fps constant, exact frame count;
parts concat with hard cuts. App takes scale 2x with lanczos to 786 x 1704 (393 is odd, and H.264 needs even sizes).
"""
import json, os, subprocess
T = json.load(open("timing.json")); FPS = T["fps"]
os.makedirs("assets", exist_ok=True)
for job in T["prep"]:
    ins, fil = [], []
    for i, p in enumerate(job["parts"]):
        n = round(p["dur"] * FPS)
        ins += ["-ss", str(p["in"]), "-t", f"{p['dur'] * p['speed'] + 0.5:.3f}", "-i", p["src"]]
        crop = f"crop={p['crop']}," if p.get("crop") else ""
        scale = f",scale={p.get('scale', '786:1704')}:flags=lanczos"
        fil.append(f"[{i}:v]{crop}setpts=(PTS-STARTPTS)/{p['speed']},fps={FPS}{scale},setsar=1,trim=end_frame={n},setpts=N/{FPS}/TB[v{i}]")
    k = len(fil)
    fil.append("".join(f"[v{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "[out]",
                    "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an", job["out"]], check=True)
    print(job["out"])
