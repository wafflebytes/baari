# Ranks narration takes by how much they sound like the approved narrator lines, so a new line
# doesn't change the voice mid-film (ElevenLabs v3 drifts take to take). Each file becomes a timbre
# vector (MFCC means and spreads, median pitch, brightness) over its voiced frames; features are
# z-scored across every file and a take's score is its distance to the reference lines' centroid.
# Lower is closer. The references' own distances show the normal spread.
# Usage, from film/: python3 scripts/voice-match.py "public/vo/e/E0*.wav public/vo/e/E11.wav" public/vo/c/takes/C0*.wav
import sys, glob, subprocess, numpy as np
SR, N, HOP = 16000, 512, 160
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def mel_fb(n_mels=40):
    hz = lambda m: 700 * (10 ** (m / 2595) - 1); mel = lambda h: 2595 * np.log10(1 + h / 700)
    pts = hz(np.linspace(mel(60), mel(7600), n_mels + 2)); bins = np.floor((N + 1) * pts / SR).astype(int)
    fb = np.zeros((n_mels, N // 2 + 1))
    for i in range(1, n_mels + 1):
        a, b, c = bins[i - 1], bins[i], bins[i + 1]
        fb[i - 1, a:b] = (np.arange(a, b) - a) / max(1, b - a); fb[i - 1, b:c] = (c - np.arange(b, c)) / max(1, c - b)
    return fb
FB = mel_fb()
DCT = np.cos(np.pi / 40 * (np.arange(40) + 0.5)[None, :] * np.arange(20)[:, None])
def feats(p):
    x = load(p); fr = np.lib.stride_tricks.sliding_window_view(x, N)[::HOP] * np.hanning(N)
    e = np.sqrt((fr ** 2).mean(1)); v = fr[e > np.percentile(e, 60) * 0.5 + 1e-4]
    spec = np.abs(np.fft.rfft(v, axis=1)) ** 2
    mf = (DCT @ np.log(spec @ FB.T + 1e-9).T).T[:, 1:]
    freqs = np.fft.rfftfreq(N, 1 / SR); cen = (spec * freqs).sum(1) / (spec.sum(1) + 1e-9)
    f0 = []
    for w in v[::3]:
        ac = np.correlate(w, w, "full")[N - 1:]; lo, hi = SR // 400, SR // 75
        k = lo + np.argmax(ac[lo:hi]); f0.append(SR / k if ac[k] > 0.3 * ac[0] else np.nan)
    return np.concatenate([mf.mean(0), mf.std(0), [np.nanmedian(f0), np.median(cen)]])
refs = sorted(set(sum((glob.glob(g) for g in sys.argv[1].split()), [])))
cands = sorted(set(sys.argv[2:]) - set(refs))
F = {p: feats(p) for p in refs + cands}
M = np.array(list(F.values())); mu, sd = M.mean(0), M.std(0) + 1e-9
Z = {p: (F[p] - mu) / sd for p in F}
c = np.mean([Z[p] for p in refs], 0)
d = lambda p: float(np.linalg.norm(Z[p] - c))
print("references:", " ".join(f"{p.split('/')[-1]}={d(p):.2f}" for p in refs))
print("reference spread: max", round(max(d(p) for p in refs), 2))
for p in sorted(cands, key=d): print(f"{d(p):6.2f}  {p}  f0={F[p][-2]:.0f}Hz")
