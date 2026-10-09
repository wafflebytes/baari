# Paper sounds for the paper cut trailer, synthesised (no outside audio):
# tap (a cut-out landing), slide (a sheet pushed in), flip (a card turned), pin (a note pinned).
import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf, subprocess, os
SR = 44100
rng = np.random.default_rng(7)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def band(x, lo, hi): b, a = sg.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band"); return sg.lfilter(b, a, x)
def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
    wf.write(f"/tmp/{name}.wav", SR, (x * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"/tmp/{name}.wav", "-b:a", "160k", f"public/sfx/{name}.mp3"], check=True)
n = int(0.12 * SR)
tap = band(rng.standard_normal(n), 400, 5000) * env(n, 0.001, 0.018) + 0.6 * np.sin(2 * np.pi * 140 * np.arange(n) / SR) * env(n, 0.001, 0.025)
save("paper-tap", tap)
n = int(0.32 * SR); t = np.arange(n) / SR
slide = band(rng.standard_normal(n), 900, 7000) * np.sin(np.pi * t / t[-1]) ** 1.5 * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
save("paper-slide", slide)
n = int(0.18 * SR)
flip = np.concatenate([band(rng.standard_normal(n // 2), 1200, 8000) * env(n // 2, 0.002, 0.03), band(rng.standard_normal(n - n // 2), 600, 6000) * env(n - n // 2, 0.001, 0.02) * 0.8])
save("paper-flip", flip)
n = int(0.2 * SR)
pin = band(rng.standard_normal(n), 2000, 9000) * env(n, 0.0005, 0.006) + 0.5 * np.sin(2 * np.pi * 1800 * np.arange(n) / SR) * env(n, 0.0005, 0.04)
save("paper-pin", pin)
print("ok")
