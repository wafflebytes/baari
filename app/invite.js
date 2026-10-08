// Bringing the family in. One link, four ways to send it: Telegram (where
// Baari lives), WhatsApp (where Indian families already are), copy, or the phone's own share
// sheet. Someone in the same room? Flip the card to a QR code. Each person
// also has their own Bulao button, so the message can start with their name.
import { mx } from "./icons.js";
import { faceHtml, lookFor } from "./avatars.js";
import { haptic, burst } from "./play.js";

const BOT = "Baari_ken_bot";
export const JOIN = `https://t.me/${BOT}?start=join`;
const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// people: [{ name, look?, tint?, joined? }]. T: the (en, hing, hi) picker.
export function inviteHtml({ home = "Sharma", people = [], T }) {
  const sent = store.get("baari:invited") || {};
  const face = (p, cls) => faceHtml(p.look || lookFor(p.name), p.tint || "sand", cls);
  const slot = (p, i) => p.joined || sent[p.name]
    ? `<span class="inv-p ${p.joined ? "in" : "sent"}" style="--i:${i}">${face(p, "sm")}${p.joined ? "" : `<i>${mx("timer", true)}</i>`}</span>`
    : `<span class="inv-p wait" style="--i:${i}"><span class="inv-dash">${mx("add")}</span></span>`;
  const left = people.filter((p) => !p.joined);
  return `<div class="inv">
    <div class="inv-card" data-inv-card>
      <div class="inv-f">
        <p class="inv-k"><img src="/img/baari-mark.png" alt="">${esc(home)} ${T("home", "ghar", "घर")}</p>
        <div class="inv-faces">${people.map(slot).join("")}</div>
        <h2>${T("Bring the family in", "Family ko bulao", "परिवार को बुलाओ")}</h2>
        <p class="inv-s">${T("One link. Telegram opens, one tap and they're in.", "Ek link. Telegram khulega, ek tap mein jud jaayenge.", "एक लिंक। टेलीग्राम खुलेगा, एक टैप में जुड़ जाएँगे।")}</p>
        <div class="inv-link"><span>t.me/${BOT}</span><button type="button" class="inv-copy" data-inv-copy><span class="inv-ci">${mx("copy")}${mx("copy-success", true)}</span><b>${T("Copy", "Copy", "कॉपी")}</b></button></div>
      </div>
      <div class="inv-b" aria-hidden="true">
        <div class="inv-qr" data-inv-qr></div>
        <p>${T("Hold it up. They scan, they're in.", "Phone dikhao. Scan karo, jud jao.", "फ़ोन दिखाओ। स्कैन करो, जुड़ जाओ।")}</p>
        <button type="button" class="inv-back" data-inv-flip>${T("Back", "Wapas", "वापस")}</button>
      </div>
    </div>
    <div class="inv-acts">
      <button type="button" data-inv-via="tg" style="--c:#1F75B8">${mx("telegram", true)}<b>Telegram</b></button>
      <button type="button" data-inv-via="wa" style="--c:#1E7F4C">${mx("whatsapp", true)}<b>WhatsApp</b></button>
      <button type="button" data-inv-flip style="--c:var(--bg-ink)">${mx("qr-code", true)}<b>QR</b></button>
      <button type="button" data-inv-via="more" style="--c:#5B4A9C">${mx("share", true)}<b>${T("More", "Aur", "और")}</b></button>
    </div>
    ${left.length ? `<p class="inv-h">${T("Who's still to join", "Kaun abhi baaki hai", "कौन अभी बाकी है")}</p>
    <ul class="inv-l">${left.map((p, i) => `<li style="--i:${i}">${face(p, "")}<div><b>${esc(p.name)}</b><span data-inv-st>${sent[p.name] ? T("Invite sent", "Bulaya gaya", "बुलाया गया") : T("Not on Telegram yet", "Abhi Telegram pe nahi", "अभी टेलीग्राम पर नहीं")}</span></div><button type="button" class="inv-one ${sent[p.name] ? "done" : ""}" data-inv-one="${esc(p.name)}"><span>${sent[p.name] ? T("Again", "Phir se", "फिर से") : T("Invite", "Bulao", "बुलाओ")}</span></button></li>`).join("")}</ul>` : `<p class="inv-all">${mx("tick-circle", true)}${T("Everyone's in. Nice.", "Sab jud gaye. Badiya.", "सब जुड़ गए। बढ़िया।")}</p>`}
  </div>`;
}

// The message and the ways to send it, shared by the sheet and the Ghar card.
export async function sendInvite(via, { home = "Sharma", cook = "Sunita", T, name } = {}) {
  const msg = () => `${name ? `${name}, ` : ""}${T(`our home is on Baari 🍛 Every night it asks what we want for lunch tomorrow, gets the groceries and tells ${cook} ji. One tap to join: ${JOIN}`, `${home} ghar ab Baari pe hai 🍛 Roz raat poochta hai kal lunch mein kya, saamaan mangata hai aur ${cook} ji ko bata deta hai. Judne ke liye ek tap: ${JOIN}`, `${home} घर अब बारी पर है 🍛 हर रात पूछता है कल लंच में क्या। जुड़ने के लिए एक टैप: ${JOIN}`)}`;
  const text = msg();
  if (via === "wa") { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); return true; }
  if (via === "tg") { window.open(`https://t.me/share/url?url=${encodeURIComponent(JOIN)}&text=${encodeURIComponent(text.replace(JOIN, "").trim())}`, "_blank", "noopener"); return true; }
  if (navigator.share) { try { await navigator.share({ title: "Baari", text }); return true; } catch (e) { return false; } }
  window.open(`https://t.me/share/url?url=${encodeURIComponent(JOIN)}&text=${encodeURIComponent(text.replace(JOIN, "").trim())}`, "_blank", "noopener");
  return true;
}

export function wireInvite(root, { home = "Sharma", cook = "Sunita", T }) {
  const send = (via, name) => sendInvite(via, { home, cook, T, name });
  const card = root.querySelector("[data-inv-card]");
  root.addEventListener("click", async (e) => {
    const t = e.target;
    const c = t.closest("[data-inv-copy]");
    if (c) {
      try { await navigator.clipboard.writeText(JOIN); } catch (err) { const r = document.createRange(); r.selectNodeContents(c.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); }
      c.classList.add("ok");
      const b = c.querySelector("b");
      b.textContent = T("Copied", "Copied", "कॉपी हुआ");
      haptic(10);
      clearTimeout(c._t);
      c._t = setTimeout(() => { c.classList.remove("ok"); b.textContent = T("Copy", "Copy", "कॉपी"); }, 1800);
      return;
    }
    if (t.closest("[data-inv-flip]")) {
      const on = !card.classList.contains("flip");
      if (on) await drawQr(card.querySelector("[data-inv-qr]"));
      card.classList.toggle("flip", on);
      card.querySelector(".inv-b").setAttribute("aria-hidden", String(!on));
      haptic(8);
      return;
    }
    const v = t.closest("[data-inv-via]");
    if (v) { v.classList.remove("hit"); void v.offsetWidth; v.classList.add("hit"); haptic(6); send(v.dataset.invVia); return; }
    const one = t.closest("[data-inv-one]");
    if (one) {
      const name = one.dataset.invOne;
      haptic(6);
      const ok = await send(navigator.share ? "more" : "tg", name);
      if (!ok) return;
      const sent = store.get("baari:invited") || {};
      sent[name] = Date.now();
      store.set("baari:invited", sent);
      one.classList.add("done");
      one.querySelector("span").textContent = T("Again", "Phir se", "फिर से");
      const st = one.parentElement.querySelector("[data-inv-st]");
      if (st) st.textContent = T("Invite sent", "Bulaya gaya", "बुलाया गया");
      const r = one.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, ["💌", "✨"], 8);
    }
  });
}

let qrLoad = null;
export async function drawQr(box, text = JOIN) {
  if (box.firstChild) return;
  if (!window.qrcode) {
    qrLoad = qrLoad || new Promise((ok, no) => { const s = document.createElement("script"); s.src = QR_SRC; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    try { await qrLoad; } catch (e) { qrLoad = null; box.innerHTML = `<p class="inv-qr-x">${text}</p>`; return; }
  }
  const q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}
