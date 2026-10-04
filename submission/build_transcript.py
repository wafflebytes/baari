"""Builds a shareable, redacted transcript of Chaitanya's Claude Code session.

Starts at the build phase (18:10 IST, 12:40 UTC, onward), so ideation and planning stay
private. Keeps user messages, Claude's replies and a one-line note per tool
call. Drops tool outputs, thinking, pasted blocks, skill bodies and context
summaries. Redacts every value found in the local env/session files, plus
anything shaped like a key, token, JWT, email or phone number.

Usage: python3 submission/build_transcript.py <session.jsonl> <out.html>
"""
import html
import json
import os
import re
import sys
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START_UTC = "2026-10-04T12:40"  # "Okay so let's start continue working!"
END_UTC = "2026-10-04T15:42"  # stops before the transcript export itself

SECRET_FILES = [".env.shared", "agenticorg-cli/.env", "baari-mock/.env", "agenticorg-cli/.ao-session.json", "app/.dev.vars"]


def secret_values():
    vals = set()
    for f in SECRET_FILES:
        p = os.path.join(ROOT, f)
        if not os.path.exists(p):
            continue
        text = open(p, encoding="utf-8", errors="ignore").read()
        for m in re.finditer(r"^[A-Z0-9_]+\s*=\s*\"?([^\"\n#]+)", text, re.M):
            v = m.group(1).strip()
            if len(v) >= 8:
                vals.add(v)
        for m in re.finditer(r"\"[^\"]*\"\s*:\s*\"([^\"]{12,})\"", text):
            vals.add(m.group(1))
    return sorted(vals, key=len, reverse=True)


PATTERNS = [
    r"sk-[A-Za-z0-9_\-]{12,}", r"cfk_[A-Za-z0-9_\-]{8,}", r"cfut_[A-Za-z0-9_\-]{8,}", r"vach_[A-Za-z0-9_\-]{8,}",
    r"\b\d{8,10}:[A-Za-z0-9_\-]{30,}", r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-\.]+", r"gh[pousr]_[A-Za-z0-9]{20,}",
    r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[a-z]{2,}", r"(?<![\d.])(?:\+?91[\s-]?)?[6-9]\d{9}(?![\d.])",
    r"(?i)(?:api[_-]?key|token|secret|password|passwd|bearer|authorization)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_\-\.]{12,}",
    r"\b[A-Fa-f0-9]{32,}\b", r"\b[A-Za-z0-9+/]{40,}={0,2}",
]
KEEP = {"9999999999", "9999999998"}


def redact(text, vals):
    for v in vals:
        text = text.replace(v, "[redacted]")
    for p in PATTERNS:
        text = re.sub(p, lambda m: m.group(0) if m.group(0) in KEEP or "noreply@anthropic.com" in m.group(0) else "[redacted]", text)
    return text


def clean_user(t):
    t = re.sub(r"<pasted_content[^>]*>.*?</pasted_content[^>]*>", "[pasted content omitted]", t, flags=re.S)
    t = re.sub(r"<system-reminder>.*?</system-reminder>", "", t, flags=re.S)
    t = re.sub(r"\[Image[^\]]*\]", "[screenshot]", t)
    return t.strip()


def tool_line(name, inp):
    if name == "Bash":
        return f"Ran: {inp.get('description') or 'a shell command'}"
    if name in ("Read", "Edit", "Write"):
        p = str(inp.get("file_path", "")).replace(ROOT + "/", "")
        if "/private/tmp" in p or "/.claude/" in p:
            p = "a scratch file"
        return {"Read": "Read", "Edit": "Edited", "Write": "Wrote"}[name] + f" {p}"
    if name.startswith("mcp__Claude_Browser__"):
        return f"Browser: {name.split('__')[-1].replace('_', ' ')}"
    if name == "Skill":
        return f"Loaded skill: {inp.get('skill')}"
    if name == "Agent":
        return f"Started a subagent: {inp.get('description', '')}"
    return f"Tool: {name}"


def ist(ts):
    t = datetime.fromisoformat(ts.replace("Z", "+00:00")) + timedelta(hours=5, minutes=30)
    return t.strftime("%H:%M")


def main(src, out):
    vals = secret_values()
    seen, rows, queued = set(), [], set()
    for line in open(src, encoding="utf-8"):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        uid, ts = d.get("uuid"), d.get("timestamp", "")
        if not uid or uid in seen or ts < START_UTC or ts >= END_UTC:
            continue
        seen.add(uid)
        att = d.get("attachment") or {}
        if d.get("type") == "attachment" and att.get("type") == "queued_command" and isinstance(att.get("prompt"), str):
            t = clean_user(att["prompt"])
            if t and not t.startswith("<") and (ts[:19], t) not in queued:
                queued.add((ts[:19], t))
                rows.append((ts, "user", t))
            continue
        if d.get("type") not in ("user", "assistant"):
            continue
        if d.get("isCompactSummary") or d.get("isMeta"):
            continue
        c = d.get("message", {}).get("content")
        parts = c if isinstance(c, list) else [{"type": "text", "text": c or ""}]
        for p in parts:
            if not isinstance(p, dict):
                continue
            if d["type"] == "user" and p.get("type") == "text":
                t = clean_user(p.get("text", ""))
                if not t or t.startswith(("This session is being continued", "Base directory for this skill", "[Request interrupted", "[Usage limit", "[Earlier usage", "The desktop app couldn't", "Your response above was cut", "<")):
                    continue
                rows.append((ts, "user", t))
            elif d["type"] == "assistant" and p.get("type") == "text" and p.get("text", "").strip():
                rows.append((ts, "claude", p["text"].strip()))
            elif d["type"] == "assistant" and p.get("type") == "tool_use":
                rows.append((ts, "tool", tool_line(p.get("name", ""), p.get("input") or {})))
    rows.sort(key=lambda r: r[0])

    body, tools = [], []

    def flush():
        if tools:
            body.append(f'<details class="tools"><summary>{len(tools)} tool call{"s" if len(tools) > 1 else ""}</summary><ul>' + "".join(f"<li>{html.escape(redact(t, vals))}</li>" for t in tools) + "</ul></details>")
            tools.clear()

    for ts, who, t in rows:
        if who == "tool":
            tools.append(t)
            continue
        flush()
        label = "Chaitanya" if who == "user" else "Claude"
        body.append(f'<div class="msg {who}"><div class="who">{label} <span>{ist(ts)} IST</span></div><div class="txt">{html.escape(redact(t, vals))}</div></div>')
    flush()

    page = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Baari build session</title>
<style>
:root{{--bg:#F6F5F1;--card:#fff;--ink:#0d0d0e;--mute:#6b6b70;--line:#e6e4dd;--me:#0d0d0e;--meink:#fff}}
@media (prefers-color-scheme:dark){{:root{{--bg:#111;--card:#1b1b1d;--ink:#eee;--mute:#9a9aa0;--line:#2a2a2d;--me:#2c2c30;--meink:#fff}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,system-ui,sans-serif}}
main{{max-width:820px;margin:0 auto;padding:32px 16px 80px}}
h1{{font-size:26px;margin:0 0 6px}} .lede{{color:var(--mute);margin:0 0 28px}}
.msg{{margin:14px 0;padding:14px 16px;border-radius:14px;background:var(--card);border:1px solid var(--line)}}
.msg.user{{background:var(--me);color:var(--meink);border-color:transparent}}
.who{{font-weight:600;font-size:13px;margin-bottom:6px}} .who span{{font-weight:400;opacity:.6;margin-left:6px}}
.txt{{white-space:pre-wrap;word-wrap:break-word}}
.tools{{margin:4px 0 4px 8px;color:var(--mute);font-size:13px}} .tools summary{{cursor:pointer}} .tools ul{{margin:6px 0;padding-left:18px}}
</style><main>
<h1>Baari: Claude Code build session</h1>
<p class="lede">Chaitanya's Claude Code session, 4 October 2026, from the start of the build ({ist(rows[0][0]) if rows else ''} IST) to submission. Planning before the build is left out. Tool outputs are left out, and keys, tokens and phone numbers are redacted. Repo: github.com/wafflebytes/baari</p>
{''.join(body)}
</main></html>"""
    open(out, "w", encoding="utf-8").write(page)
    print(out, len(rows), "rows,", sum(1 for r in rows if r[1] == "user"), "user messages")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
