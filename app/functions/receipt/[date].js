// /receipt/2026-10-05 serves the static receipt page; receipt.js reads the
// date from the path. A function, not _redirects, so /receipt/ itself stays
// a plain static file and can't loop.
export function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new URL("/receipt/", request.url));
}
