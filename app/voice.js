// Baari's voice. Five Gnani Timbre voices, one picked for the owner and one
// for the cook. The studio is a full screen orb, like a voice app's picker:
// swipe the card at the bottom and the next voice speaks a real sample. The
// samples are pre-rendered Gnani clips in /audio/voice-<name>-<who>.mp3, so
// the picker works offline and never spends a TTS call. The choice lives in
// local.voice ({ you, cook, lang }); rails reads it once Vinay's /app/prefs
// lands (see prd/FINALE_HANDOFF.md).

export const VOICES = [
  { k: "urmila", n: "Urmila", d: ["Clear and direct", "Seedhi aur saaf", "सीधी और साफ़"], c: ["#2E8C86", "#9ED9C9", "#F3FBF6"] },
  { k: "jwala", n: "Jwala", d: ["Bright and lively", "Tez aur josh wali", "तेज़ और जोश वाली"], c: ["#D2491F", "#FF9A5A", "#FFE7CF"] },
  { k: "chitra", n: "Chitra", d: ["Warm and caring", "Garam aur apnapan", "गर्म और अपनापन"], c: ["#C98A00", "#FFD253", "#FFF6D9"] },
  { k: "ambuja", n: "Ambuja", d: ["Calm and unhurried", "Shaant aur dheeme", "शांत और धीमी"], c: ["#B4466E", "#F29BB8", "#FFE6EE"] },
  { k: "nalini", n: "Nalini", d: ["Deep and steady", "Gehri aur bharosemand", "गहरी और भरोसेमंद"], c: ["#3F4FA8", "#8E9BF0", "#E6E9FF"] },
];
const LANGS = [["hi", "हिंदी"], ["hing", "Hinglish"], ["mr", "मराठी"], ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"]];
const byK = (k) => VOICES.find((v) => v.k === k) || VOICES[2];
const orbVars = (v) => `--oa:${v.c[0]};--ob:${v.c[1]};--oc:${v.c[2]}`;

export function voicePick(local) {
  const v = local.voice || {};
  return { you: v.you || "chitra", cook: v.cook || "urmila", lang: v.lang || "hi" };
}

// The home card that sits above "Kiski baari".
export function voiceCard({ T, local, cook }) {
  const p = voicePick(local);
  const y = byK(p.you), c = byK(p.cook);
  return `<section class="sec rv" style="--i:4"><button type="button" class="vn" data-voice>
    <span class="vn-top"><img class="brand-logo on-dark b-gnani vn-logo" src="/img/brands/gnani.svg" alt="Gnani"><span class="vn-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>
    <b class="vn-h">${T("How should Baari sound?", "Baari kis awaaz mein bole?", "बारी किस आवाज़ में बोले?")}</b>
    <span class="vn-row">
      <span class="vn-who"><span class="vn-orb" style="${orbVars(y)}" aria-hidden="true"><i></i><i></i><i></i></span><span><small>${T("To you", "Aapse", "आपसे")}</small>${y.n}</span></span>
      <span class="vn-who"><span class="vn-orb" style="${orbVars(c)}" aria-hidden="true"><i></i><i></i><i></i></span><span><small>${T(`To ${cook} ji`, `${cook} ji se`, `${cook} जी से`)}</small>${c.n}</span></span>
    </span>
    <span class="vn-foot"><span class="vn-stack" aria-hidden="true">${VOICES.map((v) => `<span class="vn-orb" style="${orbVars(v)}"><i></i><i></i><i></i></span>`).join("")}</span><span class="vn-note">${T("5 voices · hear each one", "5 awaazein · sunke chuno", "5 आवाज़ें · सुनकर चुनो")}</span></span>
  </button></section>`;
}

export function openVoice({ T, local, save, cook, haptic = () => {}, toast }) {
  if (document.querySelector(".vx")) return;
  const pick = voicePick(local);
  let who = "you";
  let idx = VOICES.findIndex((v) => v.k === pick[who]);
  const w = document.createElement("div");
  w.className = "vx";
  w.setAttribute("role", "dialog");
  w.setAttribute("aria-modal", "true");
  w.setAttribute("aria-label", T("Baari's voice", "Baari ki awaaz", "बारी की आवाज़"));
  w.innerHTML = `<div class="vx-top">
      <button type="button" class="vx-x" aria-label="${T("Close", "Band karo", "बंद करो")}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      <div class="vx-seg" role="tablist"><span class="vx-pill"></span>
        <button type="button" role="tab" data-who="you" aria-selected="true">${T("For you", "Aapke liye", "आपके लिए")}</button>
        <button type="button" role="tab" data-who="cook" aria-selected="false">${T(`For ${cook} ji`, `${cook} ji ke liye`, `${cook} जी के लिए`)}</button>
      </div>
    </div>
    <div class="vx-mid"><div class="vx-orbw"><div class="vx-orb" aria-hidden="true"><i></i><i></i><i></i><b></b></div></div><p class="vx-line"></p></div>
    <div class="vx-card">
      <div class="vx-names"><h2 class="vx-n"></h2><p class="vx-d"></p></div>
      <div class="vx-dots">${VOICES.map((v, i) => `<button type="button" data-vi="${i}" aria-label="${v.n}"></button>`).join("")}</div>
      <label class="vx-lang"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>${T("Language", "Bhasha", "भाषा")}</span>
        <select data-vlang>${LANGS.map(([k, l]) => `<option value="${k}" ${pick.lang === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    </div>`;
  document.body.appendChild(w);
  document.documentElement.classList.add("vx-on");
  const $ = (s) => w.querySelector(s);
  const orb = $(".vx-orb"), card = $(".vx-card");

  // Audio: one element, read through an analyser so the orb breathes with
  // the actual voice rather than a canned loop.
  const au = new Audio();
  au.preload = "auto";
  let ctx = null, an = null, buf = null, raf = 0;
  const hook = () => {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      an = ctx.createAnalyser(); an.fftSize = 256; buf = new Uint8Array(an.fftSize);
      ctx.createMediaElementSource(au).connect(an); an.connect(ctx.destination);
    } catch (e) { ctx = null; }
  };
  let amp = 0;
  const tick = () => {
    let a = 0;
    if (an && !au.paused) { an.getByteTimeDomainData(buf); let s = 0; for (const x of buf) s += (x - 128) ** 2; a = Math.min(1, Math.sqrt(s / buf.length) / 28); }
    amp += (a - amp) * 0.25;
    orb.parentElement.style.setProperty("--amp", amp.toFixed(3));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const play = () => {
    hook();
    ctx?.resume?.();
    au.src = `/audio/voice-${VOICES[idx].k}-${who}.mp3`;
    au.currentTime = 0;
    au.play().catch(() => {});
    orb.classList.add("talk");
  };
  au.onended = () => orb.classList.remove("talk");

  const line = () => who === "you"
    ? T("Baari talking to you", "Baari aapse baat karte hue", "बारी आपसे बात करते हुए")
    : T(`Baari briefing ${cook} ji`, `Baari ${cook} ji ko brief dete hue`, `बारी ${cook} जी को ब्रीफ़ देते हुए`);
  const swap = (el, txt) => {
    if (el.textContent === txt) return;
    el.classList.remove("in"); el.classList.add("out");
    setTimeout(() => { el.textContent = txt; el.classList.remove("out"); void el.offsetWidth; el.classList.add("in"); }, 150);
  };
  const paint = (first) => {
    const v = VOICES[idx];
    orb.parentElement.setAttribute("style", `${orbVars(v)};--amp:${amp}`);
    if (first) { $(".vx-n").textContent = v.n; $(".vx-d").textContent = T(...v.d); $(".vx-line").textContent = line(); }
    else { swap($(".vx-n"), v.n); swap($(".vx-d"), T(...v.d)); swap($(".vx-line"), line()); }
    w.querySelectorAll(".vx-dots button").forEach((b, i) => b.classList.toggle("on", i === idx));
  };
  const pill = () => {
    const on = w.querySelector(`[data-who="${who}"]`), seg = $(".vx-seg");
    const p = $(".vx-pill");
    p.style.width = `${on.offsetWidth}px`;
    p.style.transform = `translateX(${on.offsetLeft - 4}px)`;
    seg.querySelectorAll("[data-who]").forEach((b) => b.setAttribute("aria-selected", String(b === on)));
  };
  const keep = () => { local.voice = { ...voicePick(local), [who]: VOICES[idx].k, lang: $("[data-vlang]").value }; save(); };
  const go = (n) => {
    n = Math.max(0, Math.min(VOICES.length - 1, n));
    if (n === idx) { card.classList.remove("nudge-l", "nudge-r"); void card.offsetWidth; card.classList.add(n === 0 ? "nudge-r" : "nudge-l"); return; }
    idx = n; haptic(6); paint(); keep(); play();
  };
  paint(true);
  requestAnimationFrame(() => { $(".vx-pill").style.transition = "none"; pill(); void w.offsetWidth; $(".vx-pill").style.transition = ""; w.classList.add("is-open"); });
  setTimeout(play, 420);

  w.querySelectorAll("[data-who]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.who === who) return;
    who = b.dataset.who; idx = VOICES.findIndex((v) => v.k === voicePick(local)[who]);
    haptic(6); pill(); paint(); play();
  }));
  w.querySelectorAll("[data-vi]").forEach((b) => b.addEventListener("click", () => go(+b.dataset.vi)));
  $("[data-vlang]").addEventListener("change", () => { keep(); haptic(4); });
  orb.addEventListener("click", () => { haptic(4); au.paused ? play() : (au.pause(), orb.classList.remove("talk")); });

  // Swipe the card, or the whole lower half, sideways to change voice.
  let sx = null;
  const area = w;
  area.addEventListener("pointerdown", (e) => { if (e.target.closest("button, select, .vx-top")) return; sx = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  area.addEventListener("pointermove", (e) => {
    if (!sx) return;
    const dx = e.clientX - sx.x;
    if (Math.abs(e.clientY - sx.y) > Math.abs(dx) + 10) { sx = null; card.style.transform = ""; return; }
    card.classList.add("drag");
    card.style.transform = `translateX(${dx / 4}px)`;
  });
  const up = (e) => {
    if (!sx) return;
    const dx = e.clientX - sx.x, v = dx / Math.max(1, performance.now() - sx.t);
    sx = null; card.classList.remove("drag"); card.style.transform = "";
    if (dx < -40 || v < -0.4) go(idx + 1); else if (dx > 40 || v > 0.4) go(idx - 1);
  };
  area.addEventListener("pointerup", up);
  area.addEventListener("pointercancel", () => { sx = null; card.classList.remove("drag"); card.style.transform = ""; });
  const key = (e) => { if (e.key === "ArrowRight") go(idx + 1); if (e.key === "ArrowLeft") go(idx - 1); if (e.key === "Escape") close(); };
  addEventListener("keydown", key);

  function close() {
    if (w.classList.contains("is-closing")) return;
    removeEventListener("keydown", key);
    au.pause(); cancelAnimationFrame(raf);
    w.classList.remove("is-open"); w.classList.add("is-closing");
    document.documentElement.classList.remove("vx-on");
    setTimeout(() => { w.remove(); ctx?.close?.(); }, 360);
    const p = voicePick(local);
    toast?.({ icon: "🎙️", title: T(`You hear ${byK(p.you).n}. ${cook} ji hears ${byK(p.cook).n}.`, `Aap ${byK(p.you).n} sunenge, ${cook} ji ${byK(p.cook).n}.`, `आप ${byK(p.you).n} सुनेंगे, ${cook} जी ${byK(p.cook).n}।`), body: T("Telegram voice notes switch over soon too.", "Telegram voice notes bhi jald isi awaaz mein.", "टेलीग्राम वॉइस नोट भी जल्द इसी आवाज़ में।"), ms: 4200 });
    w.dispatchEvent(new CustomEvent("vx-close", { bubbles: true }));
  }
  $(".vx-x").addEventListener("click", close);
  return close;
}
