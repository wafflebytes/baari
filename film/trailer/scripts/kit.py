"""The kitchen kit: every sound in the trailer that isn't a voice, made from code.

Katori tinks for hats, a belan on a chakla for the snare, a tadka sizzle for
risers, a steel spoon on a thali for the horror screech, plus a soft kalimba
pluck, bass and pad in D. Deterministic: every random source is seeded.
"""
import numpy as np
from scipy import signal

SR = 48000
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4
S16 = BEAT / 4


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def rng(seed):
    return np.random.default_rng(seed)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---- drums from the kitchen

def kick(vel=1.0):
    t = t_(0.42)
    f = 46 + 120 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng(1).standard_normal(len(t)), 2500) * np.exp(-t * 420) * 0.35
    return np.tanh((body + click) * 1.6) * 0.8 * vel


def katori(vel=1.0, length=0.07, seed=0, pitch=1.0):
    """A small steel bowl struck with a spoon: inharmonic partials, a bright tick."""
    t = t_(max(length * 6, 0.12))
    r = rng(100 + seed)
    f0 = 2350 * pitch * (1 + r.uniform(-0.006, 0.006))
    parts = [(1.0, 1.0), (2.32, 0.55), (4.25, 0.35), (6.63, 0.2)]
    x = np.zeros_like(t)
    for ratio, a in parts:
        d = 1 / (length * (1.4 - ratio / 10))
        x += a * np.sin(2 * np.pi * f0 * ratio * t + r.uniform(0, 6)) * np.exp(-t * d)
        x += a * 0.3 * np.sin(2 * np.pi * (f0 * ratio + 3.1) * t) * np.exp(-t * d)
    tick = hp(r.standard_normal(len(t)), 7000) * np.exp(-t * 900) * 0.5
    return (x * 0.5 + tick) * vel * 0.5


def belan(vel=1.0, seed=0):
    """A rolling pin slapped on a chakla: a woody knock with a little air."""
    t = t_(0.3)
    r = rng(200 + seed)
    knock = np.sin(2 * np.pi * (175 + 60 * np.exp(-t * 60)) * t) * np.exp(-t * 32)
    wood = bp(r.standard_normal(len(t)), 700, 2600) * np.exp(-t * 26) * 0.9
    snap = hp(r.standard_normal(len(t)), 3500) * np.exp(-t * 55) * 0.35
    return np.tanh((knock * 0.9 + wood + snap) * 1.3) * 0.62 * vel


def clap(vel=1.0, seed=0):
    t = t_(0.25)
    r = rng(300 + seed)
    n = bp(r.standard_normal(len(t)), 900, 5000)
    env = np.zeros_like(t)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        env[i:] += np.exp(-(t[: len(t) - i]) * (180 if k < 2 else 22))
    return n * env * 0.32 * vel


def shaker(vel=1.0, seed=0):
    t = t_(0.09)
    r = rng(400 + seed)
    return hp(r.standard_normal(len(t)), 6000) * np.sin(np.pi * t / t[-1]) ** 2 * 0.22 * vel


def tadka(dur, seed=0):
    """Hot oil taking the jeera: a rising sizzle with crackles, peaking at the end."""
    t = t_(dur)
    r = rng(500 + seed)
    noise = r.standard_normal(len(t))
    ramp = (t / dur) ** 2.2
    sizzle = hp(noise, 3000) * (0.05 + ramp * 0.6)
    crack = np.zeros_like(t)
    n = int(dur * 40)
    for i in np.sort(r.integers(0, len(t) - 400, n)):
        if r.random() < (0.25 + 0.75 * i / len(t)):
            crack[i : i + 400] += r.standard_normal(400) * np.exp(-np.arange(400) / 40) * r.uniform(0.3, 1)
    crack = hp(crack, 1500) * (0.2 + ramp)
    sweep = np.zeros_like(t)
    seg = 2400
    for i in range(0, len(t) - seg, seg):
        lo = 600 + 7000 * (i / len(t)) ** 1.5
        sweep[i : i + seg] = bp(noise[i : i + seg], lo, lo * 1.8, 1)
    return (sizzle + crack * 0.6 + sweep * ramp * 0.5) * 0.45


def drumroll(dur=1.4, seed=0):
    """TV mode's drumroll: belan hits accelerating into the stamp."""
    out = np.zeros(int((dur + 0.4) * SR))
    t = 0.0
    k = 0
    while t < dur:
        p = t / dur
        rate = 9 + 30 * p ** 1.6
        h = belan(0.25 + 0.75 * p ** 1.3, seed=seed + k) * 0.8
        k_ = katori(0.12 * p, 0.03, seed=k)
        h[: len(k_)] += k_[: len(h)]
        i = int(t * SR)
        out[i : i + len(h)] += h[: len(out) - i]
        t += 1 / rate
        k += 1
    return out


def stamp(vel=1.0):
    """The 'Pakka' stamp: a rubber stamp on a steel table, big."""
    t = t_(0.9)
    r = rng(600)
    thud = np.sin(2 * np.pi * (52 + 90 * np.exp(-t * 40)) * t) * np.exp(-t * 9)
    slap = bp(r.standard_normal(len(t)), 400, 3200) * np.exp(-t * 40)
    ring = katori(0.6, 0.35, seed=7, pitch=0.62)
    x = np.tanh((thud * 1.2 + slap * 0.9) * 1.4)
    x[: len(ring)] += ring[: len(x)] * 0.6
    return x * 0.8 * vel


# ---- tonal

def kalimba(note, dur=0.6, vel=1.0):
    f = midi(note)
    t = t_(dur + 0.6)
    idx = 2.4 * np.exp(-t * 26)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * idx
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 4.2)
    x += 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 9)
    att = np.minimum(1, t / 0.003)
    return x * att * 0.34 * vel


def santoor(note, dur=0.5, vel=1.0, seed=0):
    """Karplus-Strong string with a metallic doubling, struck lightly."""
    f = midi(note)
    n = int((dur + 0.8) * SR)
    period = int(SR / f)
    r = rng(700 + seed + note)
    buf = r.uniform(-1, 1, period)
    buf = lp(buf, 6000, 1)
    out = np.zeros(n)
    d = 0.4985
    for i in range(0, n, period):
        out[i : i + period] = buf[: min(period, n - i)]
        buf = d * (buf + np.roll(buf, 1))
    x = out + 0.35 * np.roll(out, int(SR * 0.0007))
    return hp(x, 120) * 0.42 * vel


def bass(note, dur, vel=1.0):
    f = midi(note)
    t = t_(dur + 0.1)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 8)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 2.2)
    env[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
    return np.tanh(x * env * 1.4) * 0.5 * vel


def pad(notes, dur, vel=1.0, bright=0.5, seed=0):
    t = t_(dur)
    x = np.zeros_like(t)
    r = rng(800 + seed)
    for nn in notes:
        f = midi(nn)
        for det in (-0.09, 0.0, 0.08):
            fd = f * 2 ** (det / 12)
            ph = r.uniform(0, 6)
            for h in range(1, 9):
                x += np.sin(2 * np.pi * fd * h * t + ph * h) / h * np.exp(-h / (2 + 6 * bright))
    att = np.minimum(1, t / min(0.6, dur / 3))
    rel = np.minimum(1, (dur - t) / min(0.8, dur / 3))
    x = lp(x, 1200 + 3000 * bright)
    return x * att * rel * 0.05 * vel / max(1, len(notes) ** 0.5)


# ---- sound design

def boom():
    t = t_(2.6)
    r = rng(900)
    sub = np.sin(2 * np.pi * (31 + 30 * np.exp(-t * 6)) * t) * np.exp(-t * 1.4)
    rumble = lp(r.standard_normal(len(t)), 180) * np.exp(-t * 1.8) * 1.6
    hit = bp(r.standard_normal(len(t)), 80, 900) * np.exp(-t * 20)
    return np.tanh((sub * 1.3 + rumble + hit) * 1.2) * 0.85


def spoon_screech(dur=1.6):
    """A steel spoon dragged slowly across a thali."""
    t = t_(dur)
    r = rng(901)
    f = 2900 + 900 * (t / dur) + 120 * np.sin(2 * np.pi * 7 * t)
    jitter = np.cumsum(r.standard_normal(len(t))) / SR * 40
    ph = 2 * np.pi * np.cumsum(f + jitter) / SR
    stick = (np.abs(np.sin(2 * np.pi * 43 * t + 3 * np.sin(2 * np.pi * 5 * t))) ** 3)
    x = (np.sin(ph) + 0.6 * np.sin(ph * 1.51) + 0.4 * np.sin(ph * 2.07)) * stick
    grit = bp(r.standard_normal(len(t)), 2500, 6000) * stick * 0.6
    env = np.minimum(1, t / 0.35) * np.minimum(1, (dur - t) / 0.3)
    return (x * 0.35 + grit) * env * 0.33


def drone(dur):
    t = t_(dur)
    x = np.zeros_like(t)
    for nn, a in ((38, 1), (39, 0.7), (50, 0.4), (45, 0.25)):
        f = midi(nn)
        x += a * np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.3 * t))
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.15)
    return np.tanh(x * 0.6) * env * 0.35


def ding():
    t = t_(1.6)
    x = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 3.2) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) * np.exp(-t * 5) + 0.2 * np.sin(2 * np.pi * 2637 * t) * np.exp(-t * 7)
    return x * np.minimum(1, t / 0.002) * 0.22


def pop(pitch=1.0, vel=1.0):
    t = t_(0.12)
    f = (900 + 700 * np.exp(-t * 60)) * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)
    return x * 0.32 * vel


def tick(vel=1.0):
    t = t_(0.03)
    return hp(rng(902).standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.25 * vel


def whoosh(dur=0.45, up=True, seed=0):
    t = t_(dur)
    r = rng(903 + seed)
    n = r.standard_normal(len(t))
    out = np.zeros_like(t)
    seg = 960
    for i in range(0, len(t) - seg, seg):
        p = i / len(t)
        p = p if up else 1 - p
        c = 400 + 5000 * p ** 1.5
        out[i : i + seg] = bp(n[i : i + seg], c * 0.7, c * 1.4, 1)
    env = np.sin(np.pi * t / dur) ** 1.5
    return out * env * 0.5


def till():
    """A soft till chime with a coin on steel."""
    t = t_(1.2)
    x = np.sin(2 * np.pi * 2093 * t) * np.exp(-t * 4) + 0.6 * np.sin(2 * np.pi * 2637 * t) * np.exp(-t * 4.5)
    coin = katori(0.5, 0.15, seed=31, pitch=1.6)
    x[: len(coin)] += coin[: len(x)]
    return x * 0.2


def printer(dur=1.6):
    out = np.zeros(int((dur + 0.1) * SR))
    r = rng(904)
    t = 0.0
    while t < dur:
        h = hp(r.standard_normal(600), 1800) * np.exp(-np.arange(600) / 90) * r.uniform(0.15, 0.3)
        i = int(t * SR)
        out[i : i + 600] += h
        t += r.uniform(0.018, 0.03)
    return lp(out, 7000)


def doorbell():
    t = t_(1.8)
    a = np.sin(2 * np.pi * 659.3 * t) * np.exp(-t * 2.5) + 0.3 * np.sin(2 * np.pi * 1318.6 * t) * np.exp(-t * 5)
    b = np.zeros_like(t)
    i = int(0.42 * SR)
    tb = t[: len(t) - i]
    b[i:] = np.sin(2 * np.pi * 523.3 * tb) * np.exp(-tb * 2.2) + 0.3 * np.sin(2 * np.pi * 1046.5 * tb) * np.exp(-tb * 5)
    return (a + b) * 0.18


def heartbeat_tick(vel=1.0):
    t = t_(0.06)
    return np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * 0.12 * vel
