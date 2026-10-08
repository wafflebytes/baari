#!/usr/bin/env python3
"""Claude Code stats for the deck's build slide. Counts only, never content.

Reads your local Claude Code transcripts (~/.claude/projects/*baari*/, subagents
included) and prints one JSON object: sessions, hours, prompts, tokens, tools,
skills, subagents and a few fun counters. No message text, file paths, commands
or keys leave your machine; bash commands are reduced to their first word.

    python3 film/deck/stats/cc_stats.py --who chaitanya --out film/deck/stats/chaitanya.json
    python3 film/deck/stats/cc_stats.py --match baari --since 2026-09-20

Python 3.8+, standard library only.
"""
import argparse, collections, datetime as dt, glob, json, os, re, sys

ap = argparse.ArgumentParser()
ap.add_argument("--root", default=os.path.expanduser("~/.claude/projects"))
ap.add_argument("--match", default="baari", help="substring(s) of the project folder name, comma-separated")
ap.add_argument("--since", default="2026-09-01")
ap.add_argument("--who", default=os.environ.get("USER", "me"))
ap.add_argument("--out")
a = ap.parse_args()

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
since = dt.datetime.fromisoformat(a.since).replace(tzinfo=IST)
pats = [m.strip().lower() for m in a.match.split(",") if m.strip()]
folders = [d for d in glob.glob(os.path.join(a.root, "*")) if any(m in os.path.basename(d).lower() for m in pats)]
files = [f for d in folders
         for f in glob.glob(os.path.join(d, "**", "*.jsonl"), recursive=True)]
if not files:
    sys.exit(f"no transcripts under {a.root} matching '{a.match}'. Try --match with part of your repo folder name.")

def ts(e):
    t = e.get("timestamp")
    try: return dt.datetime.fromisoformat(t.replace("Z", "+00:00")) if t else None
    except Exception: return None

def text_of(content):
    if isinstance(content, str): return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""

C = collections.Counter
tools, skills, slash, agents, bash, models, hours, days = C(), C(), C(), C(), C(), C(), C(), C()
fun = C()
tok = C()
subtok = C()
mcp = C()
versions = C()
titles = {}
seen_msg = set()
sessions = collections.defaultdict(list)
prompts = interrupts = compactions = 0
edited = set(); edits = 0
longest_prompt = 0
sub_files = 0
for f in files:
    is_sub = "/subagents/" in f.replace("\\", "/")
    sub_files += is_sub
    for line in open(f, encoding="utf-8", errors="ignore"):
        try: e = json.loads(line)
        except Exception: continue
        t = ts(e)
        if not t or t < since: continue
        sid = e.get("sessionId") or os.path.basename(f)
        sessions[sid].append(t)
        if e.get("version") and not is_sub: versions[e["version"]] += 1
        if e.get("type") in ("summary", "custom-title", "ai-title"):
            title = e.get("summary") or e.get("customTitle") or e.get("aiTitle") or e.get("title")
            if isinstance(title, str) and title.strip(): titles[sid] = title.strip()[:80]
        if e.get("isCompactSummary") or e.get("type") == "summary":
            compactions += 1
            continue
        m = e.get("message") or {}
        if e.get("type") == "user" and not is_sub and not e.get("isMeta"):
            c = m.get("content")
            if isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c):
                continue
            s = text_of(c)
            if "[Request interrupted by user" in s: interrupts += 1; continue
            cm = re.search(r"<command-name>/?([\w:.-]+)</command-name>", s)
            if cm: slash[cm.group(1)] += 1; continue
            if not s.strip() or s.lstrip().startswith("<"): continue
            prompts += 1
            li = t.astimezone(IST); hours[li.hour] += 1; days[li.strftime("%Y-%m-%d")] += 1
            low = s.lower()
            spoken = re.sub(r"<([\w-]+)[^>]*>.*?</\1>", " ", s, flags=re.S)
            longest_prompt = max(longest_prompt, len(spoken.split()))
            fun["bro / bruh"] += len(re.findall(r"\b(bro+|bruh+)\b", low))
            fun["bhai / yaar"] += len(re.findall(r"\b(bhai|yaar)\b", low))
            fun["please"] += low.count("please")
            fun["ultrathink"] += low.count("ultrathink")
            fun["!!!"] += s.count("!!!")
            fun["prompts typed in caps"] += int(len(s) > 12 and s.upper() == s and any(ch.isalpha() for ch in s))
        if e.get("type") == "assistant":
            key = (m.get("id"), e.get("requestId"))
            first = key not in seen_msg
            seen_msg.add(key)
            if first:
                u = m.get("usage") or {}
                bucket = subtok if is_sub else tok
                bucket["input"] += u.get("input_tokens", 0) or 0
                bucket["output"] += u.get("output_tokens", 0) or 0
                bucket["cache_write"] += u.get("cache_creation_input_tokens", 0) or 0
                bucket["cache_read"] += u.get("cache_read_input_tokens", 0) or 0
                if m.get("model") and not m["model"].startswith("<"): models[m["model"]] += 1
            for b in m.get("content") or []:
                if not isinstance(b, dict): continue
                if b.get("type") == "text":
                    s = b.get("text", "")
                    fun["'absolutely right'"] += len(re.findall(r"absolutely right", s, re.I))
                    fun["em dashes Claude wrote"] += s.count("—")
                    fun["sorry / apologies"] += len(re.findall(r"\b(sorry|apologi[sz]e)", s, re.I))
                if b.get("type") != "tool_use": continue
                n = b.get("name", "?"); inp = b.get("input") or {}
                tools[n] += 1
                if n.startswith("mcp__"): mcp[n.split("__")[1]] += 1
                if n == "Skill": skills[str(inp.get("skill", "?"))] += 1
                if n in ("Agent", "Task"): agents[str(inp.get("subagent_type") or "general-purpose")] += 1
                if n in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
                    edits += 1
                    p = inp.get("file_path") or inp.get("notebook_path")
                    if p: edited.add(p)
                if n == "Bash":
                    w = (inp.get("command") or "").strip().split()
                    w = [x for x in w if "=" not in x][:2]
                    if w:
                        k = os.path.basename(w[0]).rstrip(";&|")
                        if k in ("git", "npm", "npx", "wrangler", "vercel", "gh") and len(w) > 1 and re.match(r"^[a-z@][\w@.-]*$", w[1]):
                            k += " " + w[1]
                        bash[k] += 1

def active_hours(times, gap=dt.timedelta(minutes=30)):
    times = sorted(times); s = dt.timedelta(0)
    for x, y in zip(times, times[1:]):
        d = y - x
        if d <= gap: s += d
    return s.total_seconds() / 3600

per = {k: active_hours(v) for k, v in sessions.items()}
allt = sorted(t for v in sessions.values() for t in v)
total_tok = sum(tok.values()) + sum(subtok.values())
top = sorted(per.items(), key=lambda kv: -kv[1])[:5]
out = {
    "who": a.who,
    "project_folders": len(folders),
    "window": [allt[0].astimezone(IST).isoformat(timespec="minutes"), allt[-1].astimezone(IST).isoformat(timespec="minutes")] if allt else None,
    "sessions": len(sessions),
    "subagent_transcripts": sub_files,
    "active_hours": round(sum(per.values()), 1),
    "longest_session_hours": round(max(per.values()), 1) if per else 0,
    "prompts_typed": prompts,
    "longest_prompt_words": longest_prompt,
    "interrupts": interrupts,
    "compactions": compactions,
    "assistant_turns": len(seen_msg),
    "tokens_main": dict(tok),
    "tokens_subagents": dict(subtok),
    "tokens_total": total_tok,
    "claude_code_versions": sorted(versions)[:1] + sorted(versions)[-1:],
    "longest_sessions": [{"title": titles.get(k), "hours": round(v, 1)} for k, v in top],
    "mcp_servers_used": dict(mcp.most_common()),
    "models": dict(models.most_common()),
    "tool_calls": sum(tools.values()),
    "tools": dict(tools.most_common(25)),
    "skills": dict(skills.most_common()),
    "slash_commands": dict(slash.most_common(20)),
    "subagents": dict(agents.most_common()),
    "files_edited": len(edited),
    "edits": edits,
    "bash_top": dict(bash.most_common(20)),
    "prompts_by_ist_hour": {h: hours[h] for h in range(24)},
    "prompts_by_day": dict(sorted(days.items())),
    "fun": dict(fun),
}
js = json.dumps(out, indent=1)
if a.out:
    open(a.out, "w").write(js + "\n"); print(f"wrote {a.out}")
try: print(js)
except BrokenPipeError: pass
