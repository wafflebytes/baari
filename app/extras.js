// Moments that take over the screen or slide in from the top: the in-app
// toast, the cook finder when the cook is on leave, and the reminders sheet.
import { haptic, burst } from "./play.js";

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const ui = () => (store.get("baari:setup") || {}).ui || "hing";
const T = (en, hing, hi) => ({ en, hing, hi })[ui()];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>';

// ---- toast: an iOS-style banner from the top (transitions.dev toast),
// swipe it up to dismiss, tap it to act.
export function toast({ icon = "", title, body = "", action, ms = 6000 }) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="toast-ic">${icon}</span><div class="toast-t"><b>${title}</b>${body ? `<span>${body}</span>` : ""}</div>${action ? `<span class="toast-go">${esc(action.label)}</span>` : ""}`;
  document.body.appendChild(el);
  void el.offsetHeight;
  el.classList.add("is-shown");
  haptic(10);
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    el.classList.remove("is-shown");
    el.classList.add("is-hiding");
    setTimeout(() => el.remove(), 380);
  };
  const timer = setTimeout(hide, ms);
  let y0 = null, dy = 0;
  el.addEventListener("pointerdown", (e) => { y0 = e.clientY; dy = 0; el.style.transition = "none"; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => { if (y0 === null) return; dy = Math.min(0, e.clientY - y0) || (e.clientY - y0) * 0.2; el.style.transform = `translate(-50%, ${dy}px)`; });
  el.addEventListener("pointerup", () => {
    if (y0 === null) return;
    y0 = null;
    el.style.transition = "";
    el.style.transform = "";
    if (dy < -30) { clearTimeout(timer); hide(); return; }
    if (Math.abs(dy) < 6 && action) { clearTimeout(timer); hide(); action.run(); }
  });
  return hide;
}

// ---- cook on leave: a full-screen search, like the splash. Rings pulse out
// from your flat, cooks from your network land on them, one gets picked.
// It is a prototype: nobody is messaged.
const COOKS = [
  { n: "Kamla ji", f: "👩🏽‍🍳", d: "350 m", a: 40, r: 0.42, note: T("Cooks for Flat 307, your building", "Flat 307 mein khana banati hain", "फ़्लैट 307 में खाना बनाती हैं"), star: "4.9", lang: "Hindi" },
  { n: "Rekha", f: "👩🏽", d: "800 m", a: 200, r: 0.68, note: T("Sunita ji's cousin", "Sunita ji ki behen", "सुनीता जी की बहन"), star: "4.8", lang: "Hindi" },
  { n: "Lakshmi", f: "🧕🏽", d: "1.2 km", a: 300, r: 0.86, note: T("Recommended by 3 homes on your block", "Aapke block ke 3 ghar recommend karte hain", "आपके ब्लॉक के 3 घर कहते हैं"), star: "4.7", lang: "Hindi, Bangla" },
  { n: "Meena", f: "👵🏽", d: "650 m", a: 120, r: 0.58, note: T("Tiffin cook, Sector 9", "Tiffin wali, Sector 9", "टिफ़िन वाली, सेक्टर 9"), star: "4.6", lang: "Hindi" },
];
export function cookFinder({ cook = "Sunita", dish = "" } = {}) {
  const el = document.createElement("div");
  el.className = "take";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  const lines = [
    T("Looking around Sector 9…", "Sector 9 mein dhoondh rahe hain…", "सेक्टर 9 में ढूँढ रहे हैं…"),
    T(`Asking people ${cook} ji knows…`, `${cook} ji ke jaan-pehchaan wale…`, `${cook} जी के जान-पहचान वाले…`),
    T("Checking who cooks in your building…", "Building ke cooks dekh rahe hain…", "बिल्डिंग के कुक देख रहे हैं…"),
  ];
  el.innerHTML = `
    <button class="take-x" type="button" aria-label="Close">${X}</button>
    <div class="take-top"><p class="take-k">${T(`${cook} ji is off tomorrow`, `${cook} ji kal chhutti pe`, `${cook} जी कल छुट्टी पर`)}</p>
      <h1>${T("Finding a cook<br>near you", "Paas mein cook<br>dhoondh rahe hain", "पास में कुक<br>ढूँढ रहे हैं")}</h1></div>
    <div class="radar" aria-hidden="true">
      <i class="rr r1"></i><i class="rr r2"></i><i class="rr r3"></i><i class="sweep"></i>
      <span class="radar-home"><img src="/img/baari-mark.png" alt=""></span>
      ${COOKS.map((c, i) => `<span class="blip" style="--a:${c.a}deg;--r:${c.r};--i:${i}"><span class="av t-${["mint", "rose", "sky", "sand"][i]}">${c.f}</span><b>${esc(c.n)}</b></span>`).join("")}
    </div>
    <p class="take-line" aria-live="polite">${lines[0]}</p>
    <div class="take-card" hidden></div>
    <p class="take-proto">${T("Prototype. In the real app Baari messages cooks your neighbours trust, and nobody gets your number.", "Prototype hai. Asli app mein Baari un cooks ko message karta hai jin pe padosi bharosa karte hain. Aapka number kisi ko nahi milta.", "यह प्रोटोटाइप है। असली ऐप में बारी उन कुक को संदेश भेजता है जिन पर पड़ोसी भरोसा करते हैं।")}</p>`;
  document.body.appendChild(el);
  document.documentElement.classList.add("take-open");
  void el.offsetHeight;
  el.classList.add("is-in");
  haptic(12);
  const line = el.querySelector(".take-line");
  const timers = [];
  lines.slice(1).forEach((l, i) => timers.push(setTimeout(() => { line.classList.remove("swap"); void line.offsetWidth; line.textContent = l; line.classList.add("swap"); }, 1300 * (i + 1))));
  COOKS.forEach((c, i) => timers.push(setTimeout(() => { el.querySelectorAll(".blip")[i].classList.add("on"); haptic(5); }, 900 + i * 650)));
  timers.push(setTimeout(() => {
    const c = COOKS[0];
    el.classList.add("found");
    el.querySelectorAll(".blip")[0].classList.add("pick");
    line.textContent = T("Found 4 cooks nearby. Kamla ji fits best.", "4 cooks mile. Kamla ji sabse sahi.", "4 कुक मिले। कमला जी सबसे सही।");
    const card = el.querySelector(".take-card");
    card.hidden = false;
    card.innerHTML = `<div class="tc-top"><span class="av t-mint lg">${c.f}</span><div><b>${esc(c.n)}</b><span>${esc(c.note)}</span></div><span class="tc-star">★ ${c.star}</span></div>
      <div class="tc-tags"><span>${c.d}</span><span>${esc(c.lang)}</span><span>${T("Knows your rules", "Niyam pata hain", "नियम पता हैं")}</span>${dish ? `<span>${esc(dish)}</span>` : ""}</div>
      <button type="button" class="btn tc-book" aria-disabled="true">${T("Book for tomorrow", "Kal ke liye bulao", "कल के लिए बुलाओ")}<em class="soon">${T("Soon", "Soon", "जल्द")}</em></button>
      <button type="button" class="tc-more">${T("See the other 3", "Baaki 3 dekho", "बाकी 3 देखो")}</button>`;
    void card.offsetHeight;
    card.classList.add("is-in");
    haptic(16);
    const r = el.querySelector(".blip.pick").getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, ["✨", "🫓", "✨"], 10);
  }, 900 + COOKS.length * 650 + 500));
  const close = () => {
    timers.forEach(clearTimeout);
    el.classList.add("is-out");
    document.documentElement.classList.remove("take-open");
    setTimeout(() => el.remove(), 450);
  };
  el.querySelector(".take-x").onclick = close;
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".tc-book");
    if (b) { b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); haptic(20); }
    if (e.target.closest(".tc-more")) { el.querySelectorAll(".blip").forEach((x) => x.classList.add("pick")); haptic(8); }
  });
  addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); removeEventListener("keydown", k); } });
}

// ---- reminders: what Baari will nudge you about, each shown as the
// notification it would be. Toggle any off; "Try one" sends a real
// notification when the phone allows it.
export const NUDGES = [
  { k: "vote", when: T("8:30 pm, vote opens", "8:30 pm, vote khula", "8:30 pm, वोट खुला"), t: "Rajma 🆚 Kadhi", b: T("Papa already voted. Your turn, it takes one tap.", "Papa vote kar chuke. Aapki baari, bas ek tap.", "पापा वोट कर चुके। आपकी बारी, बस एक टैप।") },
  { k: "last", when: T("9:20 pm, if you haven't voted", "9:20 pm, agar vote nahi kiya", "9:20 pm, अगर वोट नहीं किया"), t: T("10 minutes left", "10 minute bache", "10 मिनट बचे"), b: T("Or Mummy's vote decides tomorrow 😌", "Warna kal Mummy ka vote hi final 😌", "वरना कल मम्मी का वोट ही फ़ाइनल 😌") },
  { k: "done", when: T("8:05 am, when the cook confirms", "8:05 am, cook ke confirm pe", "8:05 am, कुक के कन्फ़र्म पर"), t: T("Rajma is on the stove", "Rajma pak raha hai", "राजमा पक रहा है"), b: T("You did nothing this morning. That was the plan.", "Aapne subah kuch nahi kiya. Yahi toh plan tha.", "आपने सुबह कुछ नहीं किया। यही तो प्लान था।") },
  { k: "left", when: T("9:30 pm, after dinner", "9:30 pm, khaane ke baad", "9:30 pm, खाने के बाद"), t: T("Any dal left?", "Dal bachi?", "दाल बची?"), b: T("One swipe and it becomes tomorrow's paratha.", "Ek swipe, kal ka paratha ban jayega.", "एक स्वाइप, कल का पराठा बन जाएगा।") },
  { k: "quiet", when: T("After 3 nights without a vote", "3 raat vote na karne pe", "3 रात वोट न करने पर"), t: T("Lauki has noticed", "Lauki ne note kar liya hai", "लौकी ने नोट कर लिया है"), b: T("Three nights, no vote from you. It's winning by default.", "Teen raat se aapka vote nahi. Woh default se jeet rahi hai.", "तीन रात से आपका वोट नहीं। वो डिफ़ॉल्ट से जीत रही है।") },
  { k: "week", when: T("Sunday, 7 pm", "Ravivaar, 7 pm", "रविवार, 7 pm"), t: T("This week: 6 lunches, ₹0 wasted", "Is hafte: 6 khaane, ₹0 barbaad", "इस हफ़्ते: 6 खाने, ₹0 बर्बाद"), b: T("And nobody asked 'aaj kya banega' even once.", "Aur kisi ne ek baar bhi 'aaj kya banega' nahi poocha.", "और किसी ने एक बार भी 'आज क्या बनेगा' नहीं पूछा।") },
  { k: "leave", when: T("When the cook says she's off", "Jab cook chhutti bataye", "जब कुक छुट्टी बताए"), t: T("Sunita ji is off tomorrow", "Sunita ji kal nahi aayengi", "सुनीता जी कल नहीं आएँगी"), b: T("Baari found 4 cooks nearby. Pick one or order in.", "Baari ne paas mein 4 cooks dhoondhe. Ek chuno ya bahar se mangao.", "बारी ने पास में 4 कुक ढूँढे। एक चुनो या बाहर से मँगाओ।") },
];
export function nudgeSheet(sheet) {
  const off = new Set(store.get("baari:nudges-off") || []);
  const perm = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Reminders", "Reminders", "रिमाइंडर")}</p><h2>${T("Baari only pings when it matters", "Baari tabhi bolega jab zaroori ho", "बारी तभी बोलेगा जब ज़रूरी हो")}</h2>
      <p class="sub">${T("At most two a day. Here is exactly what they say.", "Din mein zyada se zyada do. Yahi likha aayega.", "दिन में ज़्यादा से ज़्यादा दो। यही लिखा आएगा।")}</p></div>
    <ul class="nudges">${NUDGES.map((n, i) => `<li style="--i:${i}"><p class="nd-when">${esc(n.when)}</p>
      <div class="nd-row"><div class="nd-card"><img src="/img/baari-mark.png" alt=""><div><b>${esc(n.t)}</b><span>${esc(n.b)}</span></div><small>${T("now", "abhi", "अभी")}</small></div>
      <label class="tg"><input type="checkbox" data-nudge="${n.k}" ${off.has(n.k) ? "" : "checked"}><i></i></label></div></li>`).join("")}</ul>
    <button class="btn" type="button" data-try>${perm === "granted" ? T("Send me one now", "Ek abhi bhejo", "एक अभी भेजो") : T("Allow notifications", "Notifications chalu karo", "सूचनाएँ चालू करो")}</button>
    <p class="nd-fine">${perm === "unsupported" ? T("On iPhone, add Baari to your home screen first. Safari only allows notifications for installed apps.", "iPhone pe pehle Baari ko home screen pe jodo. Safari sirf installed apps ko notification deta hai.", "iPhone पर पहले बारी को होम स्क्रीन पर जोड़ो।") : T("Telegram gets the same messages, so nothing is missed if you turn these off.", "Telegram pe bhi yahi aata hai, toh band karne se kuch nahi chhootega.", "टेलीग्राम पर भी यही आता है।")}</p>`, "nudge");
  s.w.addEventListener("change", (e) => {
    const c = e.target.closest("[data-nudge]");
    if (!c) return;
    c.checked ? off.delete(c.dataset.nudge) : off.add(c.dataset.nudge);
    store.set("baari:nudges-off", [...off]);
    haptic(6);
  });
  s.w.querySelector("[data-try]").addEventListener("click", async (e) => {
    if (typeof Notification === "undefined") return;
    let p = Notification.permission;
    if (p !== "granted") p = await Notification.requestPermission().catch(() => "denied");
    if (p !== "granted") { e.target.textContent = T("Notifications are blocked in settings", "Settings mein notification band hai", "सेटिंग में सूचना बंद है"); return; }
    const n = NUDGES[Math.floor(Math.random() * NUDGES.length)];
    const reg = await navigator.serviceWorker?.getRegistration?.();
    const opts = { body: n.b, icon: "/icon-192.png", badge: "/icon-192.png", tag: "baari-try" };
    try { reg ? await reg.showNotification(n.t, opts) : new Notification(n.t, opts); } catch (err) {}
    e.target.textContent = T("Sent. Check your lock screen", "Bhej diya. Lock screen dekho", "भेज दिया। लॉक स्क्रीन देखो");
    haptic(12);
  });
}
