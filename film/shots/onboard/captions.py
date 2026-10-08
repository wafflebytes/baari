# Writes English captions (.srt beside the take in film/clips/) for the
# Hinglish takes, timed from each take's .taps.json, so a non-Hindi viewer
# can follow. Run after recording:  python3 film/shots/onboard/captions.py
import json, os, sys
CLIPS = os.path.join(os.path.dirname(__file__), "..", "..", "clips")

def taps(take):
    return json.load(open(os.path.join(CLIPS, take + ".taps.json")))["taps"]

def at(tp, key, n=1):
    hits = [x for x in tp if key == x.get("name") or key in (x.get("target") or "")]
    return hits[n - 1]["t_ms"] / 1000

def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{sec:02},{ms:03}"

def write(take, cues):
    cues = sorted(cues)
    out = []
    for i, (a, b, text) in enumerate(cues, 1):
        if i < len(cues): b = min(b, cues[i][0] - 0.05)
        out.append(f"{i}\n{ts(a)} --> {ts(b)}\n{text}\n")
    open(os.path.join(CLIPS, take + ".srt"), "w").write("\n".join(out))
    print(take + ".srt", len(cues), "cues")

def ca76(take):
    tp = taps(take); nx = lambda n: at(tp, "[data-next]", n)
    end = tp[-1]["t_ms"] / 1000 + 1
    c = [(0.3, 2.6, "Tomorrow's lunch, sorted tonight."),
         (2.7, nx(1), "I ask the family, order what's missing and tell your cook in her language."),
         (nx(1) + 0.4, at(tp, 'data-m="didi"'), "Who's in the family? Tap everyone at home."),
         (at(tp, 'data-m="didi"'), nx(2), "Each tap: how many people, how many roti and how much sabzi a day."),
         (nx(2) + 0.4, nx(3), "Make your face. The family sees it on every vote."),
         (nx(3) + 0.4, at(tp, 'data-mode="vote"'), "Who decides, day by day? That's the baari: a turn that goes round the house."),
         (at(tp, 'data-mode="vote"'), nx(4), "One person picks, or everyone votes."),
         (nx(4) + 0.4, at(tp, "[data-spin]"), "Who goes first? Spin the coin."),
         (at(tp, "[data-spin]") + 3.2, nx(5), "First baari decided. Tomorrow it moves on by itself."),
         (nx(5) + 0.4, at(tp, 'data-scope="papa"'), "What goes on each plate? Tap, don't type. I'll never break these."),
         (at(tp, 'data-scope="papa"'), at(tp, "vrat"), "Papa's plate: one tap is less, two taps is never. Less spice, no oil."),
         (at(tp, "vrat"), at(tp, "[data-owntext]"), "Fasts the house keeps: Navratri, Ekadashi."),
         (at(tp, "[data-owntext]"), nx(6), "Or just say it: \"Mummy ko meetha kam\" (less sugar for Mummy)."),
         (nx(6) + 0.4, nx(7), "Who cooks? Sunita comes at 7:30 and understands Hindi best."),
         (nx(7) + 0.3, nx(7) + 3.0, "This is how it sounds to her: a voice note at 7:45 am, nothing to read."),
         (nx(7) + 3.0, nx(7) + 7.5, "\"Didi, namaste. Tomorrow's lunch is rajma chawal, for four.\""),
         (nx(7) + 7.5, nx(7) + 12.0, "\"Rajma and tomatoes reach the door in the morning. No potato on one plate.\""),
         (at(tp, "Marathi"), at(tp, "Bangla"), "The same note in Marathi"),
         (at(tp, "Bangla"), at(tp, "Tamil"), "in Bangla"),
         (at(tp, "Tamil"), at(tp, "Kannada"), "in Tamil"),
         (at(tp, "Kannada"), at(tp, "Telugu"), "in Kannada"),
         (at(tp, "Telugu"), nx(8), "and in Telugu. Six languages, real Gnani voices."),
         (nx(8) + 0.3, nx(8) + 4.5, "Let me run tonight once, so you can see: two dishes go out at 8:30 pm, a pick, rajma ordered for ₹106"),
         (nx(8) + 4.5, at(tp, "burst") - 0.6, "the parcel at the door by 6:40, a voice note to Sunita at 7:45, lunch on the stove."),
         (at(tp, "burst") - 0.5, end, "Your home is ready. Tonight at 8:30, it's real.")]
    write(take, c)

def cv02(take):
    tp = taps(take); end = tp[-1]["t_ms"] / 1000 + 1.5
    b = at(tp, "bas"); p = at(tp, "poster")
    write(take, [(0.3, 4.0, "What's for lunch tomorrow? Vote from your phone. 1 of 3 have voted."),
                 (4.0, b, "Sound on, the room's 60-second ring (10 s here). Who chose what is never shown."),
                 (b, b + 1.2, "Time's up. Locking."),
                 (b + 1.3, p - 1.5, "And tomorrow it's..."),
                 (p - 1.4, end, "Locked: Rajma chawal. Mummy picks next.")])

def ca74(take):
    tp = taps(take)
    write(take, [(at(tp, "poster") - 1.0, at(tp, "pulled") + 0.2, "Pull down: the roti flips on the tawa. \"Let go, flip the roti.\""),
                 (at(tp, "pulled") + 0.6, at(tp, "garam") + 1.5, "Refreshing... \"Piping hot.\"")])

for take, fn in [("CA76-01-app-light-t2", ca76), ("CV02-01-tv-light-t1", cv02), ("CA74-01-app-light-t1", ca74), ("CA74-01-app-dark-t1", ca74)]:
    if os.path.exists(os.path.join(CLIPS, take + ".taps.json")): fn(take)
