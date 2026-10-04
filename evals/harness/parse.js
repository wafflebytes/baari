// Parse the run output contract (PRD 9.1): DECISIONS lines, HANDOFF JSON,
// NEXT and CONFIDENCE. Lenient on whitespace, strict on structure.

function parseOutput(text) {
  const out = { decisions: [], handoff: null, handoff_error: null, next: null, confidence: null, has_decisions: false, has_handoff: false, has_next: false };
  if (!text) return out;
  const t = String(text).replace(/\r/g, "");
  out.has_decisions = /(^|\n)\s*\**DECISIONS\**\s*(\n|$)/.test(t);
  out.has_handoff = /(^|\n)\s*\**HANDOFF\**\s*(\n|$)/.test(t);
  const dStart = t.search(/(^|\n)\s*\**DECISIONS/);
  const hStart = t.search(/(^|\n)\s*\**HANDOFF/);
  const block = dStart >= 0 ? t.slice(dStart, hStart > dStart ? hStart : undefined) : "";
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*[-*]?\s*(D\d+)\s*\|(.*)$/);
    if (!m) continue;
    const parts = m[2].split("|").map((s) => s.trim());
    const field = (name) => {
      const p = parts.find((x) => x.toLowerCase().startsWith(name + ":"));
      return p ? p.slice(name.length + 1).trim() : null;
    };
    out.decisions.push({ id: m[1], time: parts[0], input: field("input"), source: field("source"), decided: field("decided"), rule: field("rule"), said_did: field("said/did"), via: field("via"), raw: line.trim() });
  }
  const hj = t.slice(hStart >= 0 ? hStart : 0).match(/```(?:json)?\s*([\s\S]*?)```/);
  if (hj) {
    try {
      out.handoff = JSON.parse(hj[1]);
    } catch (e) {
      out.handoff_error = String(e.message);
    }
  }
  const n = t.match(/(^|\n)\s*\**NEXT\**\s*:\s*(.+)/);
  if (n) {
    out.has_next = true;
    out.next = n[2].trim();
  }
  const c = t.match(/CONFIDENCE\**\s*:\s*([0-9.]+)/);
  if (c) out.confidence = Number(c[1]);
  return out;
}

module.exports = { parseOutput };
