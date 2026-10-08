#!/usr/bin/env python3
"""Git numbers for the deck's build slide and its appendix. Run from the repo root
after `git fetch origin` so every branch counts:

    python3 film/deck/stats/git_stats.py > film/deck/stats/git.json

Times are IST. Merges are counted apart. Standard library only.
"""
import collections, datetime as dt, json, re, subprocess

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
def git(*a): return subprocess.run(["git", *a], capture_output=True, text=True).stdout

raw = git("log", "--all", "--no-merges", "--format=@@@%H|%an|%aI|%s%n%b", "--numstat")
commits = []
for block in raw.split("@@@")[1:]:
    lines = block.split("\n")
    h, an, ai, s = lines[0].split("|", 3)
    body, adds, dels, files = [], 0, 0, []
    for l in lines[1:]:
        m = re.match(r"^(\d+|-)\t(\d+|-)\t(.+)$", l)
        if m:
            a, d, f = m.groups(); files.append(f)
            if a != "-": adds += int(a); dels += int(d)
        else: body.append(l)
    who = "Vinay" if "vinay" in an.lower() else ("Claude (cloud)" if an == "Claude" else "Chaitanya")
    t = dt.datetime.fromisoformat(ai).astimezone(IST)
    commits.append(dict(h=h[:7], who=who, t=t, s=s, body="\n".join(body), adds=adds, dels=dels, files=files))
# A rebased commit keeps its author time and subject, so count each once.
uniq = {}
for c in commits: uniq.setdefault((c["who"], c["t"], c["s"]), c)
commits = sorted(uniq.values(), key=lambda c: c["t"])
merges = git("log", "--all", "--merges", "--format=%aI|%s").strip().splitlines()

def stretch(ts, gap):
    best, start = (dt.timedelta(0), None, None), ts[0]
    for x, y in zip(ts, ts[1:]):
        if y - x > gap:
            if x - start > best[0]: best = (x - start, start, x)
            start = y
    if ts[-1] - start > best[0]: best = (ts[-1] - start, start, ts[-1])
    return best

ts = [c["t"] for c in commits]
st = stretch(ts, dt.timedelta(hours=3))
sw = re.findall(r'^\+const CACHE = "baari-shell-v(\d+)"', git("log", "--all", "-p", "--", "app/sw.js"), re.M)
app_versions = sorted(set(re.findall(r"App v(\d+(?:\.\d+)*)", " ".join(c["s"] for c in commits))), key=lambda v: [int(x) for x in v.split(".")])
touch = collections.Counter(f for c in commits for f in c["files"])
out = {
    "generated": dt.datetime.now(IST).isoformat(timespec="minutes"),
    "first": ts[0].isoformat(timespec="minutes"), "last": ts[-1].isoformat(timespec="minutes"),
    "commits": len(commits), "merges": len(merges),
    "by_author": dict(collections.Counter(c["who"] for c in commits)),
    "with_claude_coauthor": sum(1 for c in commits if re.search(r"Co-Authored-By: Claude", c["body"], re.I) or c["who"] == "Claude (cloud)"),
    "lines_added": sum(c["adds"] for c in commits), "lines_deleted": sum(c["dels"] for c in commits),
    "by_ist_hour": {h: sum(1 for c in commits if c["t"].hour == h) for h in range(24)},
    "after_8pm_share": round(sum(1 for c in commits if c["t"].hour >= 20 or c["t"].hour < 6) / len(commits), 2),
    "after_midnight": sum(1 for c in commits if c["t"].hour < 6),
    "latest_clock_commit": max(((c["t"].hour - 6) % 24, c["t"].strftime("%a %H:%M"), c["who"], c["s"]) for c in commits)[1:],
    "by_day": dict(collections.Counter(c["t"].strftime("%a %d %b") for c in commits)),
    "longest_stretch_no_3h_gap": [round(st[0].total_seconds() / 3600, 1), st[1].isoformat(timespec="minutes"), st[2].isoformat(timespec="minutes")],
    "lanes": dict(collections.Counter((re.match(r"^\[([^\]]+)\]", c["s"]) or [None, "untagged"])[1] for c in commits)),
    "touches_by_folder": dict(collections.Counter(f.split("/")[0] for c in commits for f in c["files"]).most_common(12)),
    "most_edited_files": dict(touch.most_common(8)),
    "sw_cache_bumps": len(sw), "sw_cache_latest": max(map(int, sw)) if sw else None,
    "app_versions_named": app_versions,
    "app_version_span": [c["t"].isoformat(timespec="minutes") for c in commits if re.search(r"App v\d", c["s"])][::max(1, len([1 for c in commits if re.search(r"App v\d", c["s"])]) - 1)],
    "prompt_versions": len([f for f in git("ls-files", "agent/prompts").split() if re.search(r"/v\d+\.md$", f)]),
    "biggest_commits": [dict(h=c["h"], who=c["who"], lines=c["adds"] + c["dels"], s=c["s"][:90]) for c in sorted(commits, key=lambda c: -(c["adds"] + c["dels"]))[:5]],
    "log": [dict(h=c["h"], who=c["who"], t=c["t"].isoformat(timespec="minutes"), lines=c["adds"] + c["dels"], s=c["s"][:100]) for c in commits],
    "merge_times": [m.split("|")[0] for m in merges],
}
print(json.dumps(out, indent=1, ensure_ascii=False))
