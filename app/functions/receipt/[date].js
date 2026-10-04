// /receipt/2026-10-05 serves the static receipt page; receipt.js reads the
// date from the path. A function, not _redirects, so /receipt/ itself stays
// a plain static file and can't loop. Anything that isn't a date
// (receipt.css, receipt.js) passes through to the static file.
export function onRequestGet({ request, env, params }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date || "")) return env.ASSETS.fetch(request);
  return env.ASSETS.fetch(new URL("/receipt/", request.url));
}
