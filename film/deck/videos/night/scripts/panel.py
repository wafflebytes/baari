"""Quotes the three R3 traces named in film/CLIPS.md call for call, for the
night video's panel: the operation each call ran and who a message went to.
Never message text. Run from the repo root:
  python3 -I film/deck/videos/night/scripts/panel.py
Writes film/deck/videos/night/panel.json.

The traces record calls as the platform saw them: Telegram and Pine Labs ride
the elevenlabs_gnanibaari bridge (PRD section 6.2), so a call named
"elevenlabs_gnanibaari__create_voice_clone:tg.send" is the rails operation
tg.send. The panel shows that operation. Reads with an id in the name
(tg.updates.<after_id>, pl.debit.<presentation_id>) show the id as <id>.
"""
import json, os, re

RUNS = {
    "LOCK": "evals/runs/R3/E02/2026-10-04T14-54-16-870Z_platform.json",
    "CHECK": "evals/runs/R3/E07/2026-10-04T13-52-14-139Z_platform.json",
    "COOK_REPLY": "evals/runs/R3/E08/2026-10-04T13-58-05-035Z_platform.json",
}

def op(name):
    name = name.split(":", 1)[1] if name.startswith("elevenlabs_gnanibaari__") else name
    if name.startswith("tg.updates."): return "tg.updates"
    if name.startswith("pl.balance."): return "pl.balance"
    if re.match(r"^pl\.debit\..+", name): return "pl.debit.<id>"
    return name

out = {}
for run, path in RUNS.items():
    d = json.load(open(path))
    calls = []
    for c in d["tool_calls"]:
        args = c.get("args") or c.get("arguments") or {}
        if isinstance(args, str): args = json.loads(args)
        o = op(c["name"])
        to = args.get("to") if o in ("tg.send", "tg.voice") else None
        calls.append({"op": o, "to": to})
    out[run] = {"case": path.split("/")[3], "trace": path, "model": d.get("model"), "at": d.get("at"), "calls": calls}
json.dump(out, open("film/deck/videos/night/panel.json", "w"), indent=1)
for r, v in out.items():
    print(r, v["case"], v["at"], [c["op"] + (" > " + c["to"] if c["to"] else "") for c in v["calls"]])
