// Shell and fonts are cached; live data (/api, rails) never is.
const CACHE = "baari-shell-v36";
const SHELL = ["/", "/index.html", "/app.css", "/app.js", "/play.js", "/extras.js", "/install.js", "/glass.js", "/shell.js", "/onboard.js", "/fonts.css", "/avatars.js", "/faceedit.js", "/invite.js", "/voice.js", "/cuisine.js", "/icons.js", "/verbs.js", "/vendor/personas.js", "/manifest.webmanifest", "/icon.svg", "/apple-touch-icon.png", "/img/baari-mark.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.startsWith("/api/") || u.pathname.startsWith("/audio/") || u.hostname.includes("baari-rails")) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return r;
  }).catch(() => caches.match(e.request)));
});
