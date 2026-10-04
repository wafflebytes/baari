// /api/dev/* : the /dev operator panel's only door to rails admin and the
// baari-clock Worker (PRD 18.3). The browser sends x-dev-key; this function
// checks it and adds the real keys server-side, so RAILS_ADMIN_KEY and
// CLOCK_KEY never reach the browser. Pages secrets: DEV_KEY, RAILS_ADMIN_KEY,
// CLOCK_KEY.
const RAILS = "https://baari-rails.vercel.app";
const CLOCK = "https://baari-clock.chaitanyajha.workers.dev";

// method:path pairs the panel may call. Anything else is a 404.
const RAILS_OK = new Set([
  "GET:health", "GET:cast", "POST:cast", "GET:preset", "POST:preset", "GET:scenario", "POST:scenario",
  "POST:inject", "POST:reset-day", "POST:recording", "GET:handoff", "GET:run-output", "GET:sim-outbox", "GET:log",
]);
const CLOCK_OK = new Set(["GET:status", "POST:fire", "POST:auto", "POST:crons", "POST:refresh"]);

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function handle({ request, params, env }) {
  if (!env.DEV_KEY || request.headers.get("x-dev-key") !== env.DEV_KEY) return json({ ok: false, error: "dev key required" }, 401);
  const [svc, ...rest] = params.path || [];
  const p = rest.join("/");
  const m = request.method;
  const body = m === "POST" ? await request.text() : undefined;
  const qs = new URL(request.url).search;
  let url, headers;
  if (svc === "rails" && RAILS_OK.has(`${m}:${p}`)) {
    if (!env.RAILS_ADMIN_KEY) return json({ ok: false, error: "RAILS_ADMIN_KEY is not set on Pages" }, 500);
    url = `${RAILS}/admin/${p}${qs}`;
    headers = { "x-admin-key": env.RAILS_ADMIN_KEY, "content-type": "application/json" };
  } else if (svc === "clock" && CLOCK_OK.has(`${m}:${p}`)) {
    if (!env.CLOCK_KEY) return json({ ok: false, error: "CLOCK_KEY is not set on Pages (W1: wrangler pages secret put CLOCK_KEY --project-name baari)" }, 500);
    url = `${CLOCK}/${p}${qs}`;
    headers = { "x-clock-key": env.CLOCK_KEY, "content-type": "application/json" };
  } else {
    return json({ ok: false, error: `not allowed: ${m} ${svc}/${p}` }, 404);
  }
  try {
    const res = await fetch(url, { method: m, headers, body });
    return new Response(await res.text(), { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
  } catch (e) {
    return json({ ok: false, error: `upstream: ${e.message}` }, 502);
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
