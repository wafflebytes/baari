"""Builds pitch/runsheet.html from pitch/SCRIPT.md and pitch/runsheet.tpl.html.

Run from the repo root: python3 pitch/build_page.py
The dated sections of SCRIPT.md become the script view; everything else on the
page lives in the template. Rerun after any edit to the script.
"""
import html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "SCRIPT.md")).read()
AUDIO = os.path.join(HERE, "audio")


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`\[(CHECK|DECIDE):\s*([^\]`]*)\]`", lambda m: f'<span class="flag" title="{m.group(2)}">{m.group(1).lower()} · {m.group(2)}</span>', s)
    s = re.sub(r"`([^`]*)`", r"<code>\1</code>", s)
    s = re.sub(r"\[SHOW:\s*([^\]]*)\]", r'<span class="cue">\1</span>', s)
    s = s.replace("(pause)", '<span class="pause" aria-label="pause">pause</span>')
    s = re.sub(r"\*([^*]+)\*", r'<span class="sung">\1</span>', s)
    return s


sections = []
for i, sec in enumerate(re.split(r"\n## ", src)):
    head = sec.split("\n")[0]
    m = re.match(r"(\d:\d\d) (.*?) \(([^)]*)\)$", head)
    if not m:
        continue
    time, title, lead = m.groups()
    turns, cur = [], None
    notes = []
    for raw in sec.split("\n")[1:]:
        if raw.startswith(">"):
            l = raw[1:].strip()
            if not l:
                continue
            sm = re.match(r"\*\*([A-Z]+)(?::\*\*|\*\*(?:\s*\(([^)]*)\))?:)\s*(.*)", l)
            if sm:
                cur = {"who": sm.group(1).title(), "how": sm.group(2) or "", "lines": []}
                turns.append(cur)
                l = sm.group(3)
            if not l:
                continue
            if cur is None:
                cur = {"who": lead.split(",")[0].strip().title(), "how": "", "lines": []}
                turns.append(cur)
            # a bare SHOW line is a cue on its own
            kind = "cue" if re.fullmatch(r"\[SHOW:[^\]]*\]", l) else ("sung" if l.startswith("*") else "line")
            cur["lines"].append({"k": kind, "h": inline(l)})
        elif raw.strip() and not raw.startswith("|") and "Spoken" not in raw[:8]:
            notes.append(inline(raw.lstrip("- ")))
    words = 0
    for t in turns:
        for ln in t["lines"]:
            if ln["k"] == "line":
                words += len(re.sub(r"<[^>]+>|pause", " ", ln["h"]).split())
    slug = re.sub(r"[^a-z]+", "_", title.lower()).strip("_")[:40]
    audio = next((f for f in sorted(os.listdir(AUDIO)) if f.endswith(slug + ".mp3")), None) if os.path.isdir(AUDIO) else None
    if "jingle" in title.lower() and os.path.exists(os.path.join(AUDIO, "00_jingle.mp3")):
        audio = "00_jingle.mp3"
    sections.append({"time": time, "title": title, "lead": lead, "turns": turns, "notes": notes[:6], "words": words,
                     "audio": f"audio/{audio}" if audio else None})

full = "audio/baari_finale_guide.mp3" if os.path.exists(os.path.join(AUDIO, "baari_finale_guide.mp3")) else None
tpl = open(os.path.join(HERE, "runsheet.tpl.html")).read()
out = tpl.replace("/*SECTIONS*/[]", json.dumps(sections, ensure_ascii=False)).replace("/*FULL*/null", json.dumps(full))
open(os.path.join(HERE, "runsheet.html"), "w").write(out)
print(f"{len(sections)} sections, full guide: {full}")
