"""Moves the tour's and the night's source ranges onto the iOS takes.

The iOS takes (film/scripts/clip.mjs --ios: README status bar, safe areas, no stills
burned in) replay the same shot files as the old takes, so every tap lands in both.
Each old range is mapped through the two tap logs, piecewise linear between taps, in
take seconds (clip.mjs takes run 1.25x slow, the same for both). Stills are left out
of the anchors: the old takes paused for them, the iOS takes don't.

    python3 film/deck/videos/ios_remap.py          rewrites tour.json and night/timing.json
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.abspath(os.path.join(HERE, "..", ".."))
SLOW = 1.25

TOUR = {
    "CA17-clean-app-light-t3": "CA17-01-ios-light-t1",
    "CA35-clean-app-light-t3": "CA35-01-ios-light-t1",
    "CA20-01-app-light-t1": "CA20-01-ios-light-t1",
    "CA25-01-app-light-t1": "CA25-01-ios-light-t1",
    "CA26-01-app-light-t1": "CA26-01-ios-light-t1",
    "CA71-01-app-light-t1": "CA71-01-ios-light-t1",
    "CA68-01-app-light-t3": "CA68-01-ios-light-t1",
    "CA70-01-app-light-t2": "CA70-01-ios-light-t1",
}
NIGHT = {
    "CA15-01-app-light-t1": "CA15-01-ios-light-t1",
    "CA15-02-app-light-t1": "CA15-02-ios-light-t1",
    "CA17-clean-app-light-t3": "CA17-01-ios-light-t2",
    "CA51-01-app-light-t1": "CA51-01-ios-light-t1",
    "CA50-01-app-light-t1": "CA50-01-ios-light-t1",
    "CA52-01-app-light-t1": "CA52-01-ios-light-t1",
    "CA55-01-app-light-t1": "CA55-01-ios-light-t1",
}


def events(name):
    taps = json.load(open(os.path.join(FILM, "clips", name + ".taps.json")))["taps"]
    return [t["t_ms"] / 1000 * SLOW for t in taps if t["kind"] != "still"]


def mapper(old, new):
    a, b = events(old), events(new)
    if len(a) != len(b):
        raise SystemExit(f"{old} has {len(a)} events, {new} has {len(b)}")
    xs, ys = [0.0] + a, [0.0] + b

    def f(t):
        for i in range(len(xs) - 1):
            if t <= xs[i + 1]:
                k = (t - xs[i]) / ((xs[i + 1] - xs[i]) or 1)
                return round(ys[i] + k * (ys[i + 1] - ys[i]), 3)
        return round(ys[-1] + (t - xs[-1]), 3)
    return f


def remap(parts, table, log):
    for p in parts:
        old = os.path.basename(p["src"]).rsplit(".", 1)[0]
        if old not in table:
            continue
        f = mapper(old, table[old])
        new_in = f(p["in"])
        if "out" in p:
            p["out"] = f(p["out"])
        elif "dur" in p:  # keep the length: the night's beats are fixed
            pass
        log.append(f"{old} {p['in']} -> {table[old]} {new_in}")
        p["in"] = new_in
        p["src"] = f"clips/{table[old]}.webm"


def main():
    log = []
    tp = os.path.join(HERE, "tour.json")
    tour = json.load(open(tp))
    for ch in tour["chapters"]:
        remap(ch["parts"], TOUR, log)
        if "poster" in ch:
            ch.pop("poster")
    json.dump(tour, open(tp, "w"), indent=1, ensure_ascii=False)
    open(tp, "a").write("\n")
    np_ = os.path.join(HERE, "night", "timing.json")
    night = json.load(open(np_))
    for job in night["prep"]:
        remap(job["parts"], NIGHT, log)
    json.dump(night, open(np_, "w"), indent=1, ensure_ascii=False)
    open(np_, "a").write("\n")
    print("\n".join(log))


if __name__ == "__main__":
    main()
