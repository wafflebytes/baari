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
