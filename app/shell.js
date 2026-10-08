// The app around the screens: the splash and the action menu that grows
// out of the + beside the nav. First run lives in onboard.js.
import { mx } from "./icons.js";

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
  // Coming straight out of onboarding (it reloads for a new language), the
  // house is already on screen in the user's head; no second intro.
  let after = false;
  try { after = sessionStorage.getItem("baari:nosplash") === "1"; sessionStorage.removeItem("baari:nosplash"); } catch (e) {}
  if (skip || after) { el.remove(); return; }
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
const COOK = (store.get("baari:setup") || {}).cook || "Sunita";

// ---- the + beside the nav. It turns into an ×, and the whole screen grows
// out of it in a circle: a big "bring the family" tile, then the household
// actions as colour cards, two to a row, rippling in from your thumb. Only
// what works today is live; the rest are greyed with a "Soon" pill.
export const ACTIONS = [
  { k: "vote", ic: "tick-circle", l: L3("Vote now", "Vote karo", "वोट करो"), s: L3("On Telegram, till 9:30", "Telegram pe, 9:30 tak", "टेलीग्राम पर, 9:30 तक"), href: `https://t.me/${BOT}`, live: true, tint: "#2E6C99", tint2: "#3A7AA8" },
  { k: "treat", ic: "cake", l: L3("Treat night", "Aaj treat", "आज ट्रीट"), s: L3("Order in, kitchen rests", "Bahar se, rasoi ki chhutti", "बाहर से, रसोई की छुट्टी"), act: true, live: true, tint: "#A8475A", tint2: "#B85468" },
  { k: "guest", ic: "user-add", l: L3("Guests coming", "Mehmaan aa rahe", "मेहमान आ रहे"), s: L3("How many extra?", "Kitne log extra?", "कितने लोग ज़्यादा?"), act: true, live: true, tint: "#68519E", tint2: "#765EAD" },
  { k: "leave", ic: "calendar-remove", l: L3("Cook on leave", "Cook ki chhutti", "कुक की छुट्टी"), s: L3("Find one nearby", "Paas mein dhoondho", "पास में ढूँढो"), act: true, live: true, tint: "#A0552A", tint2: "#A85A2A" },
  { k: "shuffle", ic: "shuffle", l: L3("Shuffle dish", "Dish badlo", "डिश बदलो"), s: L3("Rules stay kept", "Niyam nahi tootenge", "नियम नहीं टूटेंगे"), act: true, live: true, tint: "#80621A", tint2: "#8E6E22" },
  { k: "left", ic: "reserve", l: L3("Leftovers", "Bacha khaana", "बचा खाना"), s: L3("Tomorrow cooks less", "Kal kam banega", "कल कम बनेगा"), act: true, live: true, tint: "#2C7650", tint2: "#36835C" },
  { k: "brief", ic: "microphone", l: L3("Hear the brief", "Brief suno", "ब्रीफ़ सुनो"), s: L3(`${COOK}'s 7:45 note`, `${COOK} ka 7:45 note`, `${COOK} का 7:45 नोट`), href: "#/sunita", live: true, tint: "#2B2620", tint2: "#3D362C" },
  { k: "rule", ic: "shield-tick", l: L3("Add a rule", "Niyam jodo", "नियम जोड़ो"), s: L3("Never, whatever the vote", "Vote kuch bhi kahe", "वोट कुछ भी कहे"), act: true, live: true, tint: "#39668A", tint2: "#43739A" },
  { k: "pantry", ic: "box", l: L3("Say the pantry", "Pantry bolo", "पेंट्री बोलो"), s: L3("Coming soon", "Jald aa raha", "जल्द आ रहा"), tint: "#9A948A" },
];

export function fab({ onAct } = {}) {
  const ui = (store.get("baari:setup") || {}).ui || "hing";
  const T = (en, hing, hi) => (ui === "en" ? en : ui === "hi" ? hi : hing);
  const btn = document.querySelector(".fab");
  if (!btn) return;
  const menu = document.createElement("div");
  menu.className = "fab-menu fm";
  menu.id = "fab-menu";
  menu.setAttribute("role", "menu");
  // Each tile's delay is its distance from the + (bottom right), so the
  // grid ripples outward from your thumb.
  const rows = Math.ceil(ACTIONS.length / 2);
  const tile = (a, i) => {
    const d = (1 - (i % 2)) + (rows - 1 - Math.floor(i / 2));
    const st = `style="--d:${d};--c:${a.tint};--c2:${a.tint2 || a.tint}"`;
    const inner = `<span class="fa-ic">${mx(a.ic, true)}</span><span class="fa-t"><b>${a.l[ui]}</b><small>${a.s[ui]}</small></span>${a.live ? "" : `<em class="soon">${T("Soon", "Jald", "जल्द")}</em>`}`;
    if (a.act) return `<button role="menuitem" class="fa" type="button" data-act="${a.k}" ${st}>${inner}</button>`;
    return a.live
      ? `<a role="menuitem" class="fa" href="${a.href}" ${a.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""} ${st}>${inner}</a>`
      : `<button role="menuitem" class="fa off" type="button" aria-disabled="true" ${st}>${inner}</button>`;
  };
  menu.innerHTML = `<div class="fm-in">
    <p class="fm-k">${T("Quick actions", "Ek tap mein", "एक टैप में")}</p>
    <h2 class="fm-h">${T("What's up at home?", "Ghar mein kya chal raha?", "घर में क्या चल रहा?")}</h2>
    <button role="menuitem" type="button" class="fm-inv" data-act="invite" style="--d:${rows + 1}"><span class="fm-inv-ic">${mx("people", true)}</span><span class="fa-t"><b>${T("Bring the family in", "Family ko bulao", "परिवार को बुलाओ")}</b><small>${T("One Telegram link, one tap to join", "Telegram ka ek link, ek tap mein judo", "टेलीग्राम का एक लिंक, एक टैप में जुड़ो")}</small></span><span class="fm-go">${mx("arrow-right")}</span></button>
    <div class="fm-grid">${ACTIONS.map(tile).join("")}</div>
  </div>`;
  document.body.append(menu);
  const set = (open) => {
    if (open) {
      const r = btn.getBoundingClientRect();
      menu.style.setProperty("--fx", `${r.left + r.width / 2}px`);
      menu.style.setProperty("--fy", `${r.top + r.height / 2}px`);
      menu.scrollTop = 0;
    }
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? T("Close", "Band karo", "बंद करो") : T("Actions", "Kaam", "काम"));
    document.documentElement.classList.toggle("fab-open", open);
    if (!open) { menu.classList.add("is-closing"); setTimeout(() => menu.classList.remove("is-closing"), 320); }
    tap();
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => {
    const off = e.target.closest(".fa.off");
    if (off) { off.classList.remove("nope"); void off.offsetWidth; off.classList.add("nope"); return; }
    const act = e.target.closest("[data-act]");
    // Guests: the tile itself turns into a − n + stepper; the rest close
    // the menu and run.
    if (act && act.dataset.act === "guest") { onAct && onAct("guest", act, () => set(false)); return; }
    if (act) { set(false); setTimeout(() => onAct && onAct(act.dataset.act, act), 220); return; }
    if (e.target.closest(".fa")) set(false);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") set(false); });
}
