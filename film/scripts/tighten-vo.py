# Tightens the narration takes: any pause inside a line longer than KEEP is cut down to KEEP
# (the middle of the pause goes, with a 10 ms crossfade), so the comic pauses stay but the dead
# air doesn't. Reads public/vo/e/raw/<id>.wav, writes public/vo/e/<id>.wav.
import sys, subprocess, numpy as np
KEEP, THRESH_DB, SR = 0.36, -38, 48000
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def save(p, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", p], input=x.astype(np.float32).tobytes(), check=True)
for id_ in sys.argv[1:]:
    x = load(f"public/vo/e/raw/{id_}.wav")
    hop = int(0.01 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12) for i in range(0, len(x), hop)])
    quiet = 20 * np.log10(rms) < THRESH_DB
    out, last, i, n = [], 0, 0, len(quiet)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]: j += 1
            a, b = i * hop, min(len(x), j * hop)
            if a > 0 and b < len(x) and (b - a) / SR > KEEP:
                half = int(KEEP / 2 * SR); fade = int(0.01 * SR)
                seg = x[last:a + half].copy()
                seg[-fade:] *= np.linspace(1, 0, fade)
                out.append(seg)
                last = b - half
                tail = x[last:last + fade]; x[last:last + fade] = tail * np.linspace(0, 1, len(tail))
            i = j
        else:
            i += 1
    out.append(x[last:])
    y = np.concatenate(out)
    save(f"public/vo/e/{id_}.wav", y)
    print(id_, round(len(x) / SR, 2), "->", round(len(y) / SR, 2))
