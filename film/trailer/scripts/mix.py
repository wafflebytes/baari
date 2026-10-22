"""The trailer's temp mix: voices from timing.json, a kitchen-kit bed, UI sounds, loudness.

    uv run --with numpy --with scipy --with pyloudnorm python scripts/mix.py

Writes assets/mix.wav (git-ignored, 48 kHz stereo) and prints which outside sounds
it used, for SOURCES.md. Everything else comes from scripts/kit.py, seeded, so the
same timing gives the same mix.

The rules (TRAILER_PLAN section 10, film/handoff/lanes/README.md, "Sound"):
- every L line as cast, placed at timing.json's vo times;
- the bed (music and kit) ducks 8 dB under every line;
- the call's lines get telephone EQ, Sunita's voice note a phone band and a little room;
- -14 LUFS integrated, -1 dBTP.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pyloudnorm
from scipy import signal

sys.path.insert(0, str(Path(__file__).parent))
import kit  # noqa: E402
from kit import SR, BEAT  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT.parent / "public" / "sfx"
TIMING = json.loads((ROOT / "timing.json").read_text())

STARTS = {s["id"]: s["beat"] * BEAT for s in TIMING["shots"]}
LENGTH = {s["id"]: s["beats"] * BEAT for s in TIMING["shots"]}
END = max(STARTS[k] + LENGTH[k] for k in STARTS)
N = int(np.ceil(END * SR))

CALL = {"L10a", "L10b", "L10c", "L10d", "L11b-papa", "L11b-behen", "L11b-mummy", "L11b-vinay"}
NOTE = {"L17"}
DUCK_DB = -8.0
used = set()


def db(x):
    return 10 ** (x / 20)


def read(path):
    """Any audio file as mono float at SR, through ffmpeg."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def sfx(name):
    used.add(name)
    return read(SFX / name)


def at(track, t, x, gain=1.0):
    i = int(round(t * SR))
    if i >= len(track):
        return
    j = min(len(track), i + len(x))
    track[i:j] += x[: j - i] * gain


def shot(sid, beats=0.0):
    return STARTS[sid] + beats * BEAT


# ---- voices

def voices():
    vo = np.zeros(N)
    spans = []
    for v in TIMING["vo"]:
        x = read(ROOT / "assets" / "vo" / f"{v['line']}.wav")
        if "trim" in v:
            x = x[: int(v["trim"] * SR)]
            fade = int(0.03 * SR)
            x[-fade:] *= np.linspace(1, 0, fade)
        if v["line"] in CALL:
            x = kit.bp(x, 300, 3400, 3)
            x = np.tanh(x * 1.6) / 1.6
        elif v["line"] in NOTE:
            x = kit.bp(x, 300, 3400, 2)
            room = np.zeros(len(x) + int(0.06 * SR))
            room[: len(x)] += x
            room[int(0.023 * SR): int(0.023 * SR) + len(x)] += x * 0.18
            room[int(0.051 * SR): int(0.051 * SR) + len(x)] += x * 0.09
            x = room
        x = x / (np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) or 1) * 0.16
        t = shot(v["shot"]) + v["at"]
        at(vo, t, x)
        spans.append((t, t + len(x) / SR))
    return vo, spans


def duck_curve(spans):
    """Gain for the bed: 0 dB, down 8 dB under every line, 60 ms in, 250 ms out."""
    g = np.zeros(N)
    for a, b in spans:
        g[max(0, int((a - 0.06) * SR)): int((b + 0.05) * SR)] = 1
    att, rel = int(0.06 * SR), int(0.25 * SR)
    up = np.convolve(g, np.ones(att) / att, mode="full")[: N]
    g = np.maximum(g, up)
    out = np.empty(N)
    level = 0.0
    k = 1 / rel
    for i in range(N):  # one-pole release so the bed comes back smoothly
        level = g[i] if g[i] > level else max(g[i], level - k)
        out[i] = level
    return db(DUCK_DB * out)


# ---- the bed: D major, 128 BPM, built from the kitchen

PROG = [(50, [62, 66, 69]), (47, [59, 62, 66]), (43, [55, 59, 62]), (45, [57, 61, 64])]  # D Bm G A
ARP = [0, 2, 1, 2, 0, 2, 1, 2]


def groove(track, t0, t1, level=1.0, hats=True, kick=True, snare=True, bassline=True, pads=True, plucks=True, seed=0):
    """Bars of the bed from t0 to t1 (both on the grid)."""
    b = 0
    t = t0
    while t < t1 - 1e-6:
        root, chord = PROG[(b // 4) % 4]
        for s in range(16):
            ts = t + s * kit.S16
            if ts >= t1 - 1e-6:
                break
            beat = s // 4
            if kick and s % 4 == 0:
                at(track, ts, kit.kick(0.9), level)
            if snare and s in (4, 12):
                at(track, ts, kit.belan(0.8, seed=seed + b), level)
            if hats and s % 2 == 1:
                at(track, ts, kit.katori(0.5 if s % 4 == 3 else 0.32, seed=s + b), level)
            if hats and s % 4 == 2:
                at(track, ts, kit.shaker(0.6, seed=s), level)
            if bassline and s in (0, 6, 10):
                at(track, ts, kit.bass(root - 12, BEAT * 1.3, 0.7), level)
            if plucks and s % 2 == 0:
                note = chord[ARP[(s // 2) % 8]] + 12
                at(track, ts, kit.kalimba(note, 0.4, 0.55 if beat % 2 == 0 else 0.4), level)
        if pads:
            at(track, t, kit.pad(chord, kit.BAR + 0.2, 1.0, 0.45, seed=b), level)
        b += 1
        t += kit.BAR


def bed():
    x = np.zeros(N)
    # act 1: lock screen silent, the horror, then light comes on
    groove(x, shot("s03"), shot("s04"), 0.55, kick=False, snare=False, bassline=False, pads=False)
    groove(x, shot("s04"), shot("s05"), 0.45, hats=False, kick=False, snare=False, plucks=False)
    groove(x, shot("s05"), shot("s14"), 0.9, seed=10)
    # the call: the beat steps back under the family
    groove(x, shot("s14"), shot("s15"), 0.5, kick=False, snare=False, seed=20)
    # the drop after Pakka
    drop = shot("s15", 3)
    groove(x, drop, shot("s20"), 1.0, seed=30)
    # the night: pads and plucks only, then morning
    groove(x, shot("s20"), shot("s21"), 0.45, kick=False, snare=False, hats=False, seed=40)
    groove(x, shot("s21"), shot("s27"), 0.85, seed=50)
    # Mummy: soft, then the end card
    groove(x, shot("s27"), shot("s28"), 0.4, kick=False, snare=False, seed=60)
    groove(x, shot("s28"), END - 4 * BEAT, 0.9, seed=70)
    at(x, END - 4 * BEAT, kit.pad(PROG[0][1], 4 * BEAT, 1.2, 0.3, seed=99), 0.9)
    return x


# ---- sound design and UI, on the cuts the lanes build to

def fx():
    x = np.zeros(N)
    at(x, shot("s01", 0.1), kit.ding(), 0.8)                       # the lock-screen nudge
    at(x, shot("s02"), kit.boom(), 0.9)                            # the horror
    at(x, shot("s02", 0.5), kit.spoon_screech(1.4), 0.9)
    at(x, shot("s02"), kit.drone(LENGTH["s02"]), 0.7)
    at(x, shot("s03", 2), kit.pop(1.0), 0.8)                       # the thumb on Rajma
    at(x, shot("s04"), kit.katori(1.0, 0.3, seed=3, pitch=0.8), 0.9)  # the ब lands
    at(x, shot("s07"), kit.whoosh(0.4, up=True), 0.5)              # the thoughts gather
    for k in range(int(LENGTH["s13"] / BEAT)):                    # Raat 1: a verb a beat
        at(x, shot("s13", k), kit.pop(1.0 + 0.06 * (k % 4), 0.7), 0.6)
    roll = shot("s15", 3) - 1.4                                    # TV mode's drumroll into Pakka
    at(x, roll, kit.drumroll(1.4), 0.9)
    at(x, shot("s15", 3), kit.stamp(1.0), 1.0)
    at(x, shot("s16", 5), kit.tadka(1.2), 0.5)                     # the soak, done
    at(x, shot("s17"), kit.pop(1.2), 0.9)                          # the click
    at(x, shot("s17", 1), kit.whoosh(0.6, up=True, seed=2), 0.6)   # the portal
    at(x, shot("s18", 4), kit.till(), 0.8)                         # ₹520
    cr = sfx("crickets.mp3")                                       # the night
    span = int((STARTS["s21"] - STARTS["s20"]) * SR)
    cr = np.resize(cr, span) * np.minimum(1, np.linspace(0, 6, span)) * np.minimum(1, np.linspace(6, 0, span))
    at(x, shot("s20"), cr, 0.5)
    bi = sfx("birds.mp3")[: int(3.5 * SR)]
    bi = bi * np.minimum(1, np.linspace(4, 0, len(bi)))
    at(x, shot("s21") - 0.5, bi, 0.5)
    at(x, shot("s21"), kit.doorbell(), 0.8)                        # saamaan aa gaya
    msg = sfx("msg.mp3")
    for k in range(6):                                             # a greeting a beat
        at(x, shot("s22", k), msg, 0.35)
    at(x, shot("s25"), kit.ding(), 0.6)                            # the lock screen again
    at(x, shot("s26", 0.5), kit.printer(1.6), 0.8)                 # the receipt
    for k, t in enumerate((0.94, 0.94 + BEAT, 0.94 + 2 * BEAT)):   # sonic logo: three stamps
        at(x, shot("s28") + t + 1.0, kit.stamp(0.7 + 0.1 * k), 0.7)
    return x


def true_peak(x):
    return np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))


def limit(x, ceiling):
    """Lookahead peak limiter driven by the 4x-oversampled peak, 5 ms ahead, 80 ms release."""
    over = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)
    peak = over[: len(x) * 4].reshape(-1, 4).max(axis=1)
    need = np.minimum(1, ceiling / np.maximum(peak, 1e-9))
    look = int(0.005 * SR)
    blocks = np.array([need[i: i + 2 * look].min() for i in range(0, len(x), look)])
    blocks = np.minimum(blocks, np.r_[1.0, blocks[:-1]])  # start reducing a block early
    target = np.repeat(blocks, look)[: len(x)]
    g = np.empty(len(x))
    level = 1.0
    rel = 1 / (0.08 * SR)
    for i in range(len(x)):
        level = target[i] if target[i] < level else min(target[i], level + rel)
        g[i] = level
    return x * g[:, None]


def main():
    vo, spans = voices()
    bed_ = bed() * duck_curve(spans)
    fx_ = fx()
    mono = vo * 1.0 + bed_ * 0.32 + fx_ * 0.4
    # a little width: the bed and fx slightly apart, the voice centred
    d = int(0.011 * SR)
    side = np.r_[np.zeros(d), (bed_ * 0.32 + fx_ * 0.4)[:-d]] * 0.25
    mix = np.stack([mono + side, mono - side], axis=1)
    meter = pyloudnorm.Meter(SR)
    ceiling = db(-1.2)
    for _ in range(4):
        mix = pyloudnorm.normalize.loudness(mix, meter.integrated_loudness(mix), -14.0)
        if true_peak(mix) <= ceiling:
            break
        mix = limit(mix, ceiling)
    lufs = meter.integrated_loudness(mix)
    tp = 20 * np.log10(true_peak(mix))
    out = ROOT / "assets" / "mix.wav"
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    import wave
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"mix.wav: {END:.3f} s, {lufs:.2f} LUFS, {tp:.2f} dBTP")
    print("outside sounds used:", ", ".join(sorted(used)))
    if abs(lufs + 14) > 0.5 or tp > -1.0:
        sys.exit("loudness out of spec")


if __name__ == "__main__":
    main()
