// Pages Function: the app calls its own origin, this forwards GETs to rails.
// Only the read-only household feed and media are allowed through.
const RAILS = "https://baari-rails.vercel.app";
const ALLOW = [/^state$/, /^events$/, /^media\/.+/];

export async function onRequestGet({ params, request }) {
  const p = (params.path || []).join("/");
  if (!ALLOW.some((r) => r.test(p))) return new Response("not found", { status: 404 });
  const target = p.startsWith("media/") ? `${RAILS}/${p}` : `${RAILS}/app/${p}`;
  const res = await fetch(target + new URL(request.url).search, { headers: { accept: request.headers.get("accept") || "*/*" } });
  const h = new Headers(res.headers);
  h.set("cache-control", "no-store");
  return new Response(res.body, { status: res.status, headers: h });
}

// Writes from the app. The browser never holds a key: this adds
// x-household-key from the Pages secret HOUSEHOLD_KEY. A judge household's
// token (x-baari-token) rides along when the app has one.
const WRITE = ["turn", "demo", "away", "guests", "profile", "memory", "prefs", "paylink", "approve", "prep", "say", "pair", "household", "call", "call/turn"];
const MAX_BODY = 32 * 1024;

export async function onRequestPost({ params, request, env }) {
  const p = (params.path || []).join("/");
  if (!WRITE.includes(p)) return new Response("not found", { status: 404 });
  if (!env.HOUSEHOLD_KEY) return Response.json({ ok: false, error: "HOUSEHOLD_KEY is not set on Pages" }, { status: 503 });
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY) return Response.json({ ok: false, error: "body too big" }, { status: 413 });
  const headers = { "content-type": request.headers.get("content-type") || "application/json", "x-household-key": env.HOUSEHOLD_KEY };
  const tok = request.headers.get("x-baari-token");
  if (tok) headers["x-baari-token"] = tok;
  const res = await fetch(`${RAILS}/app/${p}`, { method: "POST", headers, body });
  const h = new Headers(res.headers);
  h.set("cache-control", "no-store");
  return new Response(res.body, { status: res.status, headers: h });
}
