// /api/chaos : the five chaos buttons on /live?chaos=1 (PRD 17 item 2).
// POST {name}. Only the named presets go through, and only with the dev key,
// so a stranger who finds the URL can't break a take. RAILS_ADMIN_KEY stays
// server-side (Pages secret).
const RAILS = "https://baari-rails.vercel.app";
const CHAOS = new Set(["chaos_no_rider", "chaos_low_balance", "chaos_timeout", "chaos_malformed", "chaos_papa_voice"]);

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.DEV_KEY || request.headers.get("x-dev-key") !== env.DEV_KEY) return json({ ok: false, error: "dev key required" }, 401);
  const { name } = await request.json().catch(() => ({}));
  if (!CHAOS.has(name)) return json({ ok: false, error: `not a chaos preset: ${name}` }, 400);
  if (!env.RAILS_ADMIN_KEY) return json({ ok: false, error: "RAILS_ADMIN_KEY is not set on Pages" }, 500);
  const res = await fetch(`${RAILS}/admin/preset`, { method: "POST", headers: { "x-admin-key": env.RAILS_ADMIN_KEY, "content-type": "application/json" }, body: JSON.stringify({ name }) });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
