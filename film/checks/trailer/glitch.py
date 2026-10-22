# film/checks/trailer/glitch.py: run from film/clips, python3 -I ../checks/trailer/glitch.py <take>.webm
"""Finds the zoomed 'still' frames a clip.mjs take burns in: frames whose
top-left avatar region scales up. Heuristic: the app header row (y 0..60 at
393 wide) changes a lot versus the take's first frame. Prints ranges."""
import subprocess, sys, numpy as np
src = sys.argv[1]
raw = subprocess.run(["ffmpeg","-v","error","-i",src,"-vf","scale=98:213,format=gray","-f","rawvideo","-"],capture_output=True,check=True).stdout
fr = np.frombuffer(raw,np.uint8).reshape(-1,213,98).astype(int)
ref = np.median(fr[:10],axis=0)
# the zoom pushes the header pill off: compare the header strip
d = np.abs(fr[:, 0:16, :] - ref[0:16, :]).mean(axis=(1,2))
z = d > 25
out=[]; i=0
while i < len(z):
    if z[i]:
        j=i
        while j<len(z) and z[j]: j+=1
        out.append((round(i/25,2), round(j/25,2))); i=j
    else: i+=1
print(src, 'zoomed ranges (s):', out)
