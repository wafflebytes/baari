#!/usr/bin/env node
// The lines rails writes into a case's task text (EATING, NEEDS, PREP), worked
// out from the rails modules in baari-mock/lib on an in-memory store with the
// case's preset state. No network, never live Redis.
//
//   node evals/harness/rails_lines.js E11          print each step's lines
//   node evals/harness/rails_lines.js --check all  fail if a case's extra
//                                                  lines drifted from rails
//
// A step says which dish and shortlist rails would see with `rails:`
// {dish, shortlist}; otherwise its handoff's locked.winner and shortlist.
for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete process.env[k];
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const ROOT = path.join(__dirname, "../..");
const lib = (m) => require(path.join(ROOT, "baari-mock/lib", m));

function fill(v, vars) {
  if (typeof v === "string") return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  if (Array.isArray(v)) return v.map((x) => fill(x, vars));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [fill(k, vars), fill(x, vars)]));
  return v;
}

async function linesFor(c) {
  const store = lib("store");
  const household = lib("household");
  const att = lib("attendance");
  const prep = lib("prep");
  const preset = lib("ops").PRESETS[c.preset || c.id] || {};
  const date_for = (c.handoff && c.handoff.date_for) || "2026-10-05";
  for (const k of ["kitchen", `att:${date_for}`, `prep:${date_for}`, "demo", "turn", "handoff:last"]) await store.del(k);
  const st = preset.state || {};
  if (st.kitchen_reset || st.pantry) await household.setKitchen({ reset: true, ...(st.pantry ? { pantry: st.pantry } : {}) });
  for (const [k, v] of Object.entries(fill(st.store || {}, { date_for }))) await store.set(k, v);

  const steps = [{ phase: c.phase, handoff: c.handoff, rails: c.rails, extra: c.extra, rails_off: c.rails_off }, ...(c.steps || [])];
  let last = c.handoff || {};
  const out = [];
  for (const s of steps) {
    const h = s.handoff || last;
    last = h;
    const hint = { dish: (h.locked && h.locked.winner) || null, shortlist: h.shortlist || null, ...(s.rails || {}) };
    const v = await att.view(date_for);
    const lines = [att.line(v)];
    if (["BUY", "CHECK"].includes(s.phase) && hint.dish && household.dishName(hint.dish)) lines.push(await household.needsLine(hint.dish, v.headcount || 4));
    if (["SHORTLIST", "INBOX"].includes(s.phase)) lines.push(await prep.line(Object.keys(prep.PREP), date_for));
    if (s.phase === "LOCK") lines.push(await prep.line(hint.shortlist || Object.keys(prep.PREP), date_for));
    if (["BRIEF", "COOK_REPLY", "CHECK"].includes(s.phase)) {
      const b = await prep.briefLine(date_for);
      if (b) lines.push(b);
    }
    out.push({ phase: s.phase, lines, extra: [].concat(s.extra || []), rails_off: s.rails_off || [] });
  }
  return out;
}

(async () => {
  const a = process.argv.slice(2);
  const check = a.includes("--check");
  let ids = a.filter((x) => !x.startsWith("--"));
  const dir = path.join(ROOT, "evals/cases");
  if (!ids.length || ids[0] === "all") ids = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).map((f) => f.replace(".yaml", "")).sort();
  let drift = 0;
  for (const id of ids) {
    const c = YAML.parse(fs.readFileSync(path.join(dir, `${id}.yaml`), "utf8"));
    // Only cases that carry rails lines are checked (E01 to E10 predate them).
    if (check && !c.extra && !(c.steps || []).some((s) => s.extra)) continue;
    const steps = await linesFor(c);
    for (const [i, s] of steps.entries()) {
      if (!check) {
        console.log(`${id} step ${i} ${s.phase}`);
        for (const l of s.lines) console.log(`  ${l}`);
        continue;
      }
      // rails_off: a step's lines that rails can't write yet (a cuisine or
      // judge household night); listed by prefix, they're not checked.
      for (const l of s.lines) {
        if (s.rails_off.some((p) => l.startsWith(p))) continue;
        if (!s.extra.includes(l)) {
          drift++;
          console.log(`${id} step ${i} ${s.phase}: rails writes\n    ${l}\n  but extra has\n    ${s.extra.filter((x) => x.split(" ")[0] === l.split(" ")[0]).join("\n    ") || "(no such line)"}`);
        }
      }
    }
  }
  if (check) {
    console.log(drift ? `${drift} line(s) drifted` : `rails lines match in ${ids.length} case file(s)`);
    process.exit(drift ? 1 : 0);
  }
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
