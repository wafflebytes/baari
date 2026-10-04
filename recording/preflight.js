// One look before each take: is everything green, and is the stage set for
// this run? Prints GO or NO GO with the reason. Changes nothing.
//
//   node recording/preflight.js run1        (or run2, run3)
//
// Reads RAILS_BASE, RAILS_ADMIN_KEY, CLOCK_URL, CLOCK_KEY from .env.shared.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const env = { ...process.env };
const shared = path.join(root, ".env.shared");
if (fs.existsSync(shared)) {
  for (const line of fs.readFileSync(shared, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    if (i > 0 && !line.trim().startsWith("#") && !env[k]) env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
const RAILS = (env.RAILS_BASE || "https://baari-rails.vercel.app").replace(/\/$/, "");
const CLOCK = (env.CLOCK_URL || "https://baari-clock.chaitanyajha.workers.dev").replace(/\/$/, "");

// What each run needs active after its preset (run 1 is a plain reset).
const RUNS = {
  run1: { preset: null, overrides: [] },
  run2: { preset: "run2_papa_no_rider", overrides: ["delayed", "no_rider"] },
  run3: { preset: "run3_cook_late_overcap", overrides: [] },
};

const run = process.argv[2] || "run1";
if (!RUNS[run]) throw new Error("run1, run2 or run3");

const rows = [];
const row = (ok, what, detail, warnOnly) => rows.push({ mark: ok ? "ok  " : warnOnly ? "warn" : "FAIL", ok: ok || !!warnOnly, what, detail });

(async () => {
  const get = (url, headers) => fetch(url, { headers }).then((r) => r.json()).catch((e) => ({ error: String(e.message || e) }));
  const health = await get(`${RAILS}/admin/health?key=${env.RAILS_ADMIN_KEY}`);
  const cast = await get(`${RAILS}/admin/cast?key=${env.RAILS_ADMIN_KEY}`);
  const clock = await get(`${CLOCK}/status`, { "x-clock-key": env.CLOCK_KEY });

  const c = health.checks || {};
  for (const k of ["storage", "telegram_webhook", "gnani", "reserve_pay"]) row(c[k] && c[k].ok, k, c[k] ? c[k].detail : health.error || "missing");

  // Cast: every role needs a chat, or solo mode covers the gaps.
  const roles = cast.roles || {};
  const unbound = Object.keys(roles).filter((r) => !roles[r]);
  row(!cast.eval, "cast not in eval mode", cast.eval ? "eval:true sends everything to sim-*; POST /admin/cast {eval:false}" : "real chats");
  row(!!roles.Vinay, "Vinay bound", roles.Vinay ? "yes" : "open the Vinay link in Telegram");
  row(!unbound.length || cast.solo, "every role reachable", unbound.length ? (cast.solo ? `solo covers ${unbound.join(", ")}` : `no chat for ${unbound.join(", ")}; turn solo on or scan QR`) : "all bound");

  // Overrides: only what this run's preset sets.
  const od = (c.overrides && c.overrides.detail) || "none";
  const active = od === "none" ? [] : od.split(", ");
  const want = RUNS[run].overrides;
  const clean = want.length ? want.every((w) => active.some((a) => a.includes(w))) : !active.length;
  row(clean, "scenario overrides", od);
  if (!clean) rows[rows.length - 1].detail += RUNS[run].preset ? `; press preset ${RUNS[run].preset} after reset` : "; press Reset";

  // Clock: session long enough for a take, nothing in flight, crons off.
  const s = clock.session || {};
  row(s.valid && s.minutes_left >= 20, "AgenticOrg session", s.valid ? `${s.minutes_left} min left (Worker refreshes at :00 and :30)` : clock.error || "expired: node agenticorg-cli/ao.js login, then POST /session");
  row(!clock.inflight, "no run in flight", clock.inflight ? `${clock.inflight.phase} since ${clock.inflight.started_ist}` : "idle");
  row(!clock.crons, "crons off", clock.crons ? "a real 20:30 SHORTLIST could fire mid-take; POST /crons {on:false}" : "off");
  const kb = clock.kb;
  row(kb && kb.ok && kb.at_ist, "KB heal", kb ? `${kb.total} files, ${kb.missing} missing at ${kb.at_ist}${kb.failed && kb.failed.length ? `, failed ${kb.failed.join("; ")}` : ""}` : "no heal yet (deploy the Worker, run kb-load.js)", true);
  row(c.recording && /off/.test(c.recording.detail || ""), "recording mode", c.recording ? `${c.recording.detail}; switch on in /dev right before rolling` : "unknown", true);

  for (const r of rows) console.log(`${r.mark}  ${r.what.padEnd(24)} ${r.detail}`);
  const go = rows.every((r) => r.ok);
  console.log(`\n${go ? "GO" : "NO GO"} for ${run}`);
  process.exit(go ? 0 : 1);
})();
