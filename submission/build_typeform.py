"""Turns submission/ANSWERS.md into submission/typeform.html: one card per
question, plain text (no markdown), with a Copy button, for pasting into the
Typeform portal. TODO lines are dropped; a card that still has a gap says so.

Usage: python3 submission/build_typeform.py
"""
import html
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SKIP_LINES = (r"^\[TODO", r"^Sources used for every answer")


def plain(md):
    out, in_fence = [], False
    for line in md.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if any(re.match(p, line) for p in SKIP_LINES):
            continue
        if re.match(r"^\|\s*:?-{3,}", line):
            continue
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            line = " | ".join(cells)
        line = re.sub(r"^> ?", "", line)
        line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1 (\2)", line)
        out.append(line.rstrip())
    text = "\n".join(out)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def main():
    md = open(os.path.join(HERE, "ANSWERS.md"), encoding="utf-8").read()
    parts = re.split(r"^## ", md, flags=re.M)[1:]
    cards = []
    for i, part in enumerate(parts):
        title, _, body = part.partition("\n")
        gap = "[TODO" in body
        text = plain(body)
        words = len(text.split())
        cards.append(f"""<section class="card{' gap' if gap else ''}">
<header><h2>{html.escape(title.strip())}</h2><span class="meta">{words} words · {len(text)} chars{' · <b>still has a gap</b>' if gap else ''}</span><button data-i="{i}">Copy</button></header>
<textarea id="t{i}" readonly>{html.escape(text)}</textarea></section>""")
    page = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Baari answers</title>
<style>
:root{{--bg:#F6F5F1;--card:#fff;--ink:#0d0d0e;--mute:#6b6b70;--line:#e6e4dd;--warn:#b45309}}
@media (prefers-color-scheme:dark){{:root{{--bg:#111;--card:#1b1b1d;--ink:#eee;--mute:#9a9aa0;--line:#2a2a2d;--warn:#f59e0b}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,system-ui,sans-serif}}
main{{max-width:860px;margin:0 auto;padding:28px 16px 80px}}
h1{{margin:0 0 4px;font-size:24px}} p.lede{{color:var(--mute);margin:0 0 20px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:14px 0}}
.card.gap{{border-color:var(--warn)}}
header{{display:flex;align-items:center;gap:12px;flex-wrap:wrap}}
h2{{font-size:16px;margin:0;flex:1 1 260px}} .meta{{color:var(--mute);font-size:13px}} .meta b{{color:var(--warn)}}
button{{font:600 14px system-ui;padding:8px 16px;border-radius:999px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}}
button.ok{{background:#16a34a;color:#fff}}
textarea{{width:100%;box-sizing:border-box;margin-top:10px;min-height:120px;height:220px;resize:vertical;border:1px solid var(--line);border-radius:10px;padding:10px;background:transparent;color:var(--ink);font:13px/1.5 ui-monospace,Menlo,monospace}}
</style><main>
<h1>Baari: answers to paste</h1>
<p class="lede">One card per question, in plain text. Press Copy and paste it into the matching Typeform field. Cards with an orange border still have a gap to fill. Built from submission/ANSWERS.md by submission/build_typeform.py.</p>
{''.join(cards)}
</main>
<script>
document.querySelectorAll("button[data-i]").forEach((b) => b.addEventListener("click", async () => {{
  const t = document.getElementById("t" + b.dataset.i);
  try {{ await navigator.clipboard.writeText(t.value); }} catch {{ t.select(); document.execCommand("copy"); }}
  b.textContent = "Copied"; b.classList.add("ok");
  setTimeout(() => {{ b.textContent = "Copy"; b.classList.remove("ok"); }}, 1500);
}}));
</script></html>"""
    out = os.path.join(HERE, "typeform.html")
    open(out, "w", encoding="utf-8").write(page)
    print(out, len(cards), "cards,", sum("gap" in c[:30] for c in cards), "with gaps")


if __name__ == "__main__":
    main()
