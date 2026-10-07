// Install to the home screen. Android Chrome hands us beforeinstallprompt and
// we only add a button for it. iOS has no prompt at all: Safari hides "Add to
// Home Screen" in the share sheet, and iOS 26 moved Share behind the ••• menu.
// So on iOS we show a banner, then a sheet with the steps for this exact
// browser and an arrow pointing at the button it needs.
const ua = navigator.userAgent;
const qs = new URLSearchParams(location.search);
const FORCE = qs.has("install");
const KEY = "baari:install-later";
const LATER_MS = 3 * 864e5;

// ?install=safari18|safari26|ipad|chrome|inapp previews one flavour on any
// device; add "banner" (safari26banner) to start from the banner.
const FAKE = qs.get("install") || "";
const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const ipad = /ipad/.test(FAKE) || /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const ios = !!FAKE || ipad || /iPhone|iPod/.test(ua);
const inApp = /inapp/.test(FAKE) || /FBAN|FBAV|Instagram|Line\/|GSA\/|Twitter|LinkedInApp|Snapchat|WhatsApp|Telegram/.test(ua);
const otherBrowser = /chrome/.test(FAKE) || /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);
const safariMajor = +((FAKE.match(/safari(\d+)/) || ua.match(/Version\/(\d+)/) || [])[1] || 0);

// Glyphs drawn to match what the user sees in Safari, so they can find it.
const G = {
  share: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 7.8 6.7l1.1 1.1L11.2 5.5V15h1.6V5.5l2.3 2.3 1.1-1.1z"/><path d="M6.5 9.5H9v1.6H6.6v9.3h10.8v-9.3H15V9.5h2.5c.8 0 1.5.7 1.5 1.5v9.5c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5V11c0-.8.7-1.5 1.5-1.5z"/></svg>`,
  more: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
  add: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm0 1.6A1.4 1.4 0 0 0 4.6 6v12c0 .8.6 1.4 1.4 1.4h12c.8 0 1.4-.6 1.4-1.4V6c0-.8-.6-1.4-1.4-1.4z"/><path d="M11.2 7.5h1.6v3.7h3.7v1.6h-3.7v3.7h-1.6v-3.7H7.5v-1.6h3.7z"/></svg>`,
  safari: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8z"/><path d="m16.8 7.2-3 6.6-6.6 3 3-6.6zm-5.9 3.7-1 2.2 2.2-1z"/></svg>`,
  link: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0z"/><path d="M8.5 11 6.4 13.1a2.5 2.5 0 0 0 3.5 3.5l2.1-2.1 1.4 1.4-2.1 2.1a4.5 4.5 0 0 1-6.4-6.4L7.1 9.5zm7-2L17.6 6.9a2.5 2.5 0 0 0-3.5-3.5L12 5.5 10.6 4.1l2.1-2.1a4.5 4.5 0 0 1 6.4 6.4l-2.1 2.1z" transform="translate(0 1.5)"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>`,
};
const chip = (g, label) => `<span class="ins-chip">${G[g]}${label ? `<b>${label}</b>` : ""}</span>`;

// Which steps, and where the arrow points: "bottom", "bottom-right" or "top-right".
function plan() {
  if (inApp) return {
    title: "Open Baari in Safari first",
    sub: "This in-app browser can't add apps to your home screen. Safari can.",
    steps: [
      `Tap ${chip("more")} or ${chip("share")} in this screen and choose ${chip("safari", "Open in Safari")}`,
      `Or copy the link and paste it into Safari`,
      `Then come back to these steps there`,
    ],
    copy: true,
    point: null,
  };
  if (otherBrowser) return {
    title: "Add Baari to your home screen",
    sub: "Two taps. It opens full screen, like any other app.",
    steps: [
      `Tap ${chip("share")} at the top right, next to the address bar`,
      `Scroll down and tap ${chip("add", "Add to Home Screen")}`,
      `Tap <b>Add</b>. Baari is now on your home screen`,
    ],
    point: "top-right",
  };
  if (safariMajor >= 26) return {
    title: "Add Baari to your home screen",
    sub: "Four taps. It opens full screen, like any other app.",
    steps: [
      `Tap ${chip("more")} next to the address bar`,
      `Tap ${chip("share", "Share")}`,
      `Tap ${chip("add", "Add to Home Screen")}. Don't see it? Tap <b>View More</b> first`,
      `Keep <b>Open as Web App</b> on and tap <b>Add</b>`,
    ],
    point: ipad ? "top-right" : "bottom-right",
  };
  return {
    title: "Add Baari to your home screen",
    sub: "Three taps. It opens full screen, like any other app.",
    steps: [
      `Tap ${chip("share")} ${ipad ? "at the top right" : "in the bar at the bottom"}`,
      `Scroll down and tap ${chip("add", "Add to Home Screen")}`,
      `Tap <b>Add</b>. Baari is now on your home screen`,
    ],
    point: ipad ? "top-right" : "bottom",
  };
}

let deferred = null; // Android's beforeinstallprompt, kept for our button.
let banner = null;

function later() {
  try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
}
function snoozed() {
  try { return Date.now() - (+localStorage.getItem(KEY) || 0) < LATER_MS; } catch (e) { return false; }
}

function hideBanner() {
  if (!banner) return;
  const b = banner;
  banner = null;
  b.classList.add("is-hiding");
  setTimeout(() => b.remove(), 260);
}

function showBanner() {
  if (banner || standalone()) return;
  const android = !ios;
  banner = document.createElement("div");
  banner.className = "ins-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Install Baari");
  banner.innerHTML = `
    <img src="/apple-touch-icon.png" alt="" width="40" height="40">
    <div class="ins-bt"><b>Add Baari to your phone</b><span>Opens full screen from your home screen</span></div>
    <button class="ins-go" type="button">${android ? "Install" : "How"}</button>
    <button class="ins-x" type="button" aria-label="Not now"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg></button>`;
  banner.querySelector(".ins-go").onclick = () => (android ? promptAndroid() : openSheet());
  banner.querySelector(".ins-x").onclick = () => { later(); hideBanner(); };
  document.body.appendChild(banner);
}

async function promptAndroid() {
  if (!deferred) return;
  deferred.prompt();
  const { outcome } = await deferred.userChoice.catch(() => ({}));
  deferred = null;
  if (outcome !== "accepted") later();
  hideBanner();
}

function openSheet() {
  const p = plan();
  const wrap = document.createElement("div");
  wrap.className = "ins-wrap";
  wrap.dataset.point = p.point || "none";
  wrap.innerHTML = `
    <div class="ins-scrim"></div>
    <section class="ins-sheet" role="dialog" aria-modal="true" aria-labelledby="ins-title">
      <span class="ins-grab" aria-hidden="true"></span>
      <div class="ins-head">
        <img src="/apple-touch-icon.png" alt="" width="56" height="56">
        <div><h2 id="ins-title">${p.title}</h2><p>${p.sub}</p></div>
      </div>
      <ol class="ins-steps">${p.steps.map((s, i) => `<li style="--i:${i}"><span class="ins-n">${i + 1}</span><span>${s}</span></li>`).join("")}</ol>
      ${p.copy ? `<button class="btn ins-copy" type="button">${G.link}<span>Copy link for Safari</span></button>` : ""}
      <button class="btn light ins-done" type="button">Got it</button>
    </section>
    ${p.point ? `<div class="ins-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 20.5 4.5 13l1.4-1.4 5.1 5.1V3.5h2v13.2l5.1-5.1 1.4 1.4z"/></svg></div>` : ""}`;
  const close = () => {
    wrap.classList.add("is-closing");
    setTimeout(() => wrap.remove(), 260);
    removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  wrap.querySelector(".ins-scrim").onclick = close;
  wrap.querySelector(".ins-done").onclick = close;
  const copy = wrap.querySelector(".ins-copy");
  if (copy) copy.onclick = async () => {
    const url = location.origin + "/";
    try { await navigator.clipboard.writeText(url); } catch (e) { prompt("Copy this link", url); return; }
    copy.innerHTML = `${G.check}<span>Copied. Paste it in Safari</span>`;
  };
  addEventListener("keydown", onKey);
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("is-open"));
  wrap.querySelector(".ins-done").focus({ preventScroll: true });
}

addEventListener("beforeinstallprompt", (e) => {
  // No preventDefault: Chrome keeps its own install UI, we just add a button.
  deferred = e;
  if (!snoozed() || FORCE) setTimeout(showBanner, 1500);
});
addEventListener("appinstalled", () => { deferred = null; hideBanner(); });

export function initInstall({ quiet } = {}) {
  if (standalone() || !ios) return;
  if (quiet && !FORCE) return;
  if (FORCE && !/banner/.test(FAKE)) { setTimeout(openSheet, 600); return; }
  if (FORCE) { setTimeout(showBanner, 600); return; }
  if (!snoozed()) setTimeout(showBanner, 2500);
}
export { openSheet as openInstall };
