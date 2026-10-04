// No dotfile is ever served. An edge cache still held /.dev.vars from the
// 18:05 deploy that leaked it; answering here comes before any asset lookup.
export async function onRequest({ request, next }) {
  if (/\/\./.test(new URL(request.url).pathname)) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  return next();
}
