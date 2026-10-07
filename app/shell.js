// The app around the screens: the splash and the action menu that grows
// out of the + beside the nav. First run lives in onboard.js.
const BOT = "Baari_ken_bot";
const qs = new URLSearchParams(location.search);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const tap = () => { if (navigator.vibrate) try { navigator.vibrate(6); } catch (e) {} };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

// ---- splash: the mark drops in, a ring turns once round it ("whose turn"),
// then the whole thing lifts away. At least 1.1 s so it never just flickers.
export function splash({ skip } = {}) {
  const el = document.getElementById("splash");
  if (!el) return;
  if (skip) { el.remove(); return; }
  const t0 = performance.now();
  el.classList.add("is-in");
  return async function done() {
    await wait(Math.max(0, 1150 - (performance.now() - t0)));
    el.classList.add("is-out");
    await wait(450);
    el.remove();
  };
}

const L3 = (en, hing, hi) => ({ en, hing, hi });

// ---- the + beside the nav. It turns into an ×, the screen behind blurs and
// a grid of household actions pops out of it, one after another. Only what
// works today is live; the rest are greyed with a "Soon" pill.
const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
export const ACTIONS = [
  { k: "vote", l: L3("Vote now", "Vote karo", "वोट करो"), icon: I("M4 12.5 9 17.5 20 6.5l-1.4-1.4L9 14.7l-3.6-3.6z"), href: `https://t.me/${BOT}`, live: true, tint: "#2AABEE" },
  { k: "treat", l: L3("Treat night", "Aaj treat", "आज ट्रीट"), icon: I("M8 3h2v8a3 3 0 0 1-2 2.8V21H6v-7.2A3 3 0 0 1 4 11V3h2v6h1V3h1zm10 0v18h-2v-7h-3V7a4 4 0 0 1 4-4z"), act: true, live: true, tint: "#E5484D" },
  { k: "guest", l: L3("Guests coming", "Mehmaan aa rahe", "मेहमान आ रहे"), icon: I("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.7-7 4v2h14v-2c0-2.3-3.7-4-7-4zm10-5V5h-2v3h-3v2h3v3h2v-3h3V8z"), act: true, live: true, tint: "#8E5BD8" },
  { k: "leave", l: L3("Cook on leave", "Cook ki chhutti", "कुक की छुट्टी"), icon: I("M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm-2 7v10h14V9zm4.5 2 2.5 2.5 2.5-2.5 1.4 1.4-2.5 2.5 2.5 2.5-1.4 1.4-2.5-2.5-2.5 2.5-1.4-1.4 2.5-2.5-2.5-2.5z"), act: true, live: true, tint: "#E0702A" },
  { k: "shuffle", l: L3("Shuffle dish", "Dish badlo", "डिश बदलो"), icon: I("M17 3l4 4-4 4V8h-2.6l-7 8H4v-2h2.6l7-8H17zm0 10 4 4-4 4v-3h-3.4l-2.3-2.6 1.4-1.6 1.8 2.2H17zM4 6h3.4l2.3 2.6-1.4 1.6L6.5 8H4z"), act: true, live: true, tint: "#F2B705" },
  { k: "left", l: L3("Log leftovers", "Bacha khaana", "बचा खाना"), icon: I("M3 11h18a9 9 0 0 1-18 0zm4-7c1 1 1 2 0 3s-1 2 0 3h-2c-1-1-1-2 0-3s1-2 0-3zm5 0c1 1 1 2 0 3s-1 2 0 3h-2c-1-1-1-2 0-3s1-2 0-3zm5 0c1 1 1 2 0 3s-1 2 0 3h-2c-1-1-1-2 0-3s1-2 0-3z"), act: true, live: true, tint: "#1F9D63" },
  { k: "brief", l: L3("Hear the brief", "Brief suno", "ब्रीफ़ सुनो"), icon: I("M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"), href: "#/sunita", live: true, tint: "#15130F" },
  { k: "pantry", l: L3("Say the pantry", "Pantry bolo", "पेंट्री बोलो"), icon: I("M5 3h14v4H5zm1 5h12v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm4 3v2h4v-2z"), tint: "#9A948A" },
  { k: "rule", l: L3("Add a rule", "Niyam jodo", "नियम जोड़ो"), icon: I("M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5zM11 11v3H8v2h3v3h2v-3h3v-2h-3v-3z"), act: true, live: true, tint: "#3B82C8" },
];

export function fab({ onAct } = {}) {
  const ui = (store.get("baari:setup") || {}).ui || "hing";
  const btn = document.querySelector(".fab");
  if (!btn) return;
  const scrim = document.createElement("div");
  scrim.className = "fab-scrim";
  const menu = document.createElement("div");
  menu.className = "fab-menu";
  menu.id = "fab-menu";
  menu.setAttribute("role", "menu");
  // Each tile's delay is its distance from the + (bottom right), so the
  // grid ripples outward from your thumb.
  menu.innerHTML = ACTIONS.map((a, i) => {
    const d = (2 - (i % 3)) + (2 - Math.floor(i / 3));
    const st = `style="--i:${i};--d:${d};--c:${a.tint || "#15130F"}"`;
    const inner = `<span class="fa-ic">${a.icon}</span><b>${a.l[ui]}</b>${a.live ? "" : '<em class="soon">Soon</em>'}`;
    if (a.act) return `<button role="menuitem" class="fa" type="button" data-act="${a.k}" ${st}>${inner}</button>`;
    return a.live
      ? `<a role="menuitem" class="fa" href="${a.href}" ${a.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""} ${st}>${inner}</a>`
      : `<button role="menuitem" class="fa off" type="button" aria-disabled="true" ${st}>${inner}</button>`;
  }).join("");
  document.body.append(scrim, menu);
  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("fab-open", open);
    if (!open) { menu.classList.add("is-closing"); setTimeout(() => menu.classList.remove("is-closing"), 260); }
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  scrim.addEventListener("click", () => set(false));
  menu.addEventListener("click", (e) => {
    const off = e.target.closest(".fa.off");
    if (off) { off.classList.remove("nope"); void off.offsetWidth; off.classList.add("nope"); return; }
    const act = e.target.closest("[data-act]");
    // Guests: the tile itself turns into a − n + stepper; the rest close
    // the menu and run.
    if (act && act.dataset.act === "guest") { onAct && onAct("guest", act, () => set(false)); return; }
    if (act) { set(false); setTimeout(() => onAct && onAct(act.dataset.act, act), 200); return; }
    if (e.target.closest(".fa")) set(false);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
}
