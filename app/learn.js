// What Baari knows and what it did quietly, plus the two ways to ask it
// "why" and to talk to it out loud. Everything here reads rails' state
// (memory, quiet, decisions) and writes through the Pages proxy; a missing
// key hides its piece, so nothing shows a number rails didn't send.
//
// ctx, from app.js: { T, esc, mx, avatar, sheet, api, haptic, toast,
// undoable, me, state(), plain, why, overlay, members(), recorder, stt,
// voiceColors(), onAnswered(ids) }
const VIA = {
  telegram: ["Telegram", "Telegram", "टेलीग्राम"], telegram_voice: ["voice note", "voice note", "वॉइस नोट"], call: ["call", "call", "कॉल"],
  app: ["app", "app", "ऐप"], island: ["app", "app", "ऐप"], routine: ["noticed", "Baari ne dekha", "बारी ने देखा"], sim: ["test", "test", "टेस्ट"],
};
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => { const m = String(iso || "").match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${+m[2]} ${MON[+m[1] - 1]}` : ""; };
const hm = (iso) => { const m = String(iso || "").match(/[T ](\d{2}):(\d{2})/); if (!m) return ""; const h = +m[1]; return `${h % 12 || 12}:${m[2]}`; };

// ---- Baari ne seekha

export function memoryLine(ctx, m) {
  const { T } = ctx;
  if (!m || typeof m.asked_week !== "number" || typeof m.learned_week !== "number") return "";
  const a = m.asked_week, l = m.learned_week;
  return T(`This week Baari asked ${a} question${a === 1 ? "" : "s"} and learned ${l} thing${l === 1 ? "" : "s"}`,
    `Is hafte Baari ne ${a} sawaal ${a === 1 ? "poocha" : "puche"}, ${l} ${l === 1 ? "baat seekhi" : "baatein seekhi"}`,
    `इस हफ़्ते बारी ने ${a} सवाल पूछे, ${l} बातें सीखीं`);
}
export function quietLine(ctx, q) {
  const { T } = ctx;
  if (!q || typeof q.handled !== "number") return "";
  const t = q.told || 0;
  return T(`Today Baari handled ${q.handled} things and told you ${t === 1 ? "once" : `${t} times`}`,
    `Aaj Baari ne ${q.handled} kaam sambhale, aapko ${t} baar bataya`,
    `आज बारी ने ${q.handled} काम सँभाले, आपको ${t} बार बताया`);
}

// The Ghar rows: what Baari did quietly today, and what it has learned.
// Each opens its own sheet. Only the rows rails has data for.
export function learnCard(ctx) {
  const { T, esc, mx } = ctx, s = ctx.state();
  const q = quietLine(ctx, s.quiet), m = memoryLine(ctx, s.memory);
  const facts = (s.memory && s.memory.facts) || [];
  const ask = facts.filter((f) => f.status === "proposed").length;
  if (!q && !m) return "";
  const row = (k, ic, b, sub, done) => `<li class="${done ? "done" : ""}"><button type="button" class="lr-b" data-learn="${k}"><span class="ic">${mx(ic, true)}</span><p><b>${esc(b)}</b><span>${sub}</span></p><span class="mo-st">${done ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>' : ""}</span></button></li>`;
  return `<section class="sec rv" style="--i:4"><div class="sec-h"><h2>${T("Baari, quietly", "Baari ne chup chaap", "बारी ने चुपचाप")}</h2></div>
    <ul class="rows mo lr">${q ? row("quiet", "tick-circle", q, T("See everything", "Sab dekho", "सब देखो"), true) : ""}${m ? row("memory", "book", m, ask ? T(`${ask} waiting for your yes`, `${ask} baatein aapki haan ke liye`, `${ask} बातें आपकी हाँ के लिए`) : T(`${facts.filter((f) => f.status === "confirmed").length} things it remembers`, `${facts.filter((f) => f.status === "confirmed").length} baatein yaad hain`, `${facts.filter((f) => f.status === "confirmed").length} बातें याद हैं`), !ask) : ""}</ul></section>`;
}

const groupOrder = (ctx, facts) => {
  const fam = ctx.members();
  const who = [...new Set(facts.map((f) => f.who || "Ghar"))];
  const rank = (w) => (fam.includes(w) ? fam.indexOf(w) : w === "Ghar" ? 50 : 60);
  return who.sort((a, b) => rank(a) - rank(b));
};
function factHtml(ctx, f) {
  const { T, esc, mx } = ctx;
  const health = f.kind === "health";
  const text = health ? f.say_it_as || T("A health rule", "Sehat ka niyam", "सेहत का नियम") : f.text;
  const src = f.source || {};
  const via = VIA[src.via] ? T(...VIA[src.via]) : "";
  if (f.status === "proposed") return `<li class="mf ask" data-fid="${esc(f.id)}"><p class="mf-t">${esc(text)}</p>${f.evidence && !health ? `<p class="mf-ev">${esc(f.evidence)}</p>` : ""}
    <div class="mf-ask"><span>${T("Remember this?", "Yaad rakhun?", "याद रखूँ?")}</span><button type="button" class="mf-y" data-mem="confirm">${T("Yes", "Haan", "हाँ")}</button><button type="button" class="mf-n" data-mem="reject">${T("No", "Nahi", "नहीं")}</button></div></li>`;
  return `<li class="mf" data-fid="${esc(f.id)}"><div class="mf-x"><p class="mf-t">${health ? mx("shield-tick", true) : ""}${esc(text)}</p>
      <p class="mf-m">${via ? `<span class="tag">${esc(via)}</span>` : ""}${src.at_ist ? `<span>${esc(day(src.at_ist))}</span>` : ""}${health ? `<span>${T("health, shown as the rule only", "sehat ki baat, sirf niyam", "सेहत की बात, सिर्फ़ नियम")}</span>` : ""}</p></div>
    <span class="mf-a">${health ? "" : `<button type="button" data-mem="edit" aria-label="${T("Edit", "Badlo", "बदलो")}">${mx("edit")}</button>`}<button type="button" data-mem="reject" aria-label="${T("Remove", "Hatao", "हटाओ")}">${mx("close-circle")}</button></span></li>`;
}
function memoryBody(ctx) {
  const { T, esc, avatar } = ctx, s = ctx.state(), m = s.memory || {};
  const facts = (m.facts || []).filter((f) => f.status !== "rejected");
  const trend = (arr, l) => Array.isArray(arr) && arr.length > 1 ? `<div class="mt"><span>${l}</span><span class="mt-b">${arr.map((n) => `<i style="--h:${Math.max(0.08, n / Math.max(...arr)).toFixed(2)}"><b>${n}</b></i>`).join("")}</span></div>` : "";
  const hist = (s.turn && s.turn.history) || [];
  const nights = hist.length >= 7 ? T(`${hist.length} nights together`, `${hist.length} raatein saath`, `${hist.length} रातें साथ`) : "";
  const groups = groupOrder(ctx, facts).map((w) => {
    const fs = facts.filter((f) => (f.who || "Ghar") === w).sort((a, b) => (a.status === "proposed" ? -1 : 0) - (b.status === "proposed" ? -1 : 0));
    const face = w === "Ghar" ? `<span class="mg-home">${ctx.mx("home-2", true)}</span>` : avatar(w, "sm");
    return `<section class="mg"><h3>${face}<span>${esc(w === "Ghar" ? T("The house", "Poora ghar", "पूरा घर") : w)}</span></h3><ul>${fs.map((f) => factHtml(ctx, f)).join("")}</ul></section>`;
  }).join("");
  return `${trend(m.asked_weeks, T("Questions a week", "Har hafte sawaal", "हर हफ़्ते सवाल"))}${nights ? `<p class="mt-n">${esc(nights)}</p>` : ""}
    ${groups || `<p class="mf-none">${T("Nothing yet. Baari learns from every night.", "Abhi kuch nahi. Baari har raat se seekhti hai.", "अभी कुछ नहीं। बारी हर रात से सीखती है।")}</p>`}`;
}
export function memorySheet(ctx) {
  const { T, esc } = ctx, s = ctx.state();
  if (!s.memory) return;
  const sh = ctx.sheet(`<div class="sheet-h"><p class="k">${T("What Baari learned", "Baari ne seekha", "बारी ने सीखा")}</p><h2>${esc(memoryLine(ctx, s.memory) || T("What Baari remembers", "Baari ko kya yaad hai", "बारी को क्या याद है"))}</h2>
    <p class="sub">${T("Only what you said yes to goes into tonight's plan.", "Sirf wahi jo aapne haan kaha, aaj raat ke plan mein jaata hai.", "सिर्फ़ वही जो आपने हाँ कहा, प्लान में जाता है।")}</p></div><div data-mbody>${memoryBody(ctx)}</div>`, "mem");
  const repaint = () => { const b = sh.w.querySelector("[data-mbody]"); if (b) b.innerHTML = memoryBody(ctx); };
  sh.w.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mem]");
    if (!b) return;
    const li = b.closest("[data-fid]"), id = li.dataset.fid, act = b.dataset.mem;
    const f = (ctx.state().memory.facts || []).find((x) => x.id === id);
    if (!f) return;
    if (act === "edit") {
      if (li.querySelector("input")) return;
      li.querySelector(".mf-t").outerHTML = `<form class="mf-ed"><input value="${esc(f.text)}" maxlength="140" enterkeyhint="done" aria-label="${T("Fact", "Baat", "बात")}"><button type="submit">${T("Save", "Save", "सेव")}</button></form>`;
      const form = li.querySelector("form"), inp = form.querySelector("input");
      inp.focus(); inp.select();
      form.onsubmit = (ev) => { ev.preventDefault(); const v = inp.value.trim(); if (!v || v === f.text) { repaint(); return; } write(id, "edit", v); };
      return;
    }
    write(id, act);
  });
  function write(id, action, text) {
    const was = ctx.state().memory.facts.find((x) => x.id === id);
    const prev = { status: was.status, text: was.text };
    const patch = (st) => { const x = ((st.memory || {}).facts || []).find((y) => y.id === id); if (!x) return; if (action === "edit") x.text = text; else x.status = action === "confirm" ? "confirmed" : "rejected"; };
    ctx.overlay(patch);
    ctx.haptic(action === "reject" ? 10 : 8); repaint(); ctx.refresh();
    const label = action === "confirm" ? T("Baari will remember", "Yaad rakhungi", "याद रखूँगी") : action === "reject" ? T("Forgotten", "Bhool gayi", "भूल गई") : T("Changed", "Badal diya", "बदल दिया");
    if (action === "reject" && prev.status === "confirmed") ctx.undoable(label, null, () => { ctx.overlay((st) => { const x = st.memory.facts.find((y) => y.id === id); if (x) x.status = prev.status; }); repaint(); ctx.refresh(); ctx.api("memory", { id, action: "confirm", by: ctx.me() }).catch(() => {}); });
    else ctx.toast({ icon: action === "confirm" ? "🧠" : "✏️", title: label, body: "", ms: 2200 });
    ctx.api("memory", { id, action, ...(text ? { text } : {}), by: ctx.me() }).catch((err) => {
      ctx.overlay((st) => { const x = st.memory.facts.find((y) => y.id === id); if (x) Object.assign(x, prev); });
      repaint(); ctx.refresh();
      ctx.toast({ icon: "⚠️", title: T("Didn't save", "Save nahi hua", "सेव नहीं हुआ"), body: String(err.message || err).slice(0, 120) });
    });
  }
  return sh;
}

// The island's card for one proposed fact: the same Haan / Nahi.
export function factAskHtml(ctx, f) {
  const { T, esc, avatar } = ctx;
  const text = f.kind === "health" ? f.say_it_as || f.text : f.text;
  return `<div class="ac-row">${f.who && f.who !== "Ghar" ? avatar(f.who, "") : ""}<div><h3>${esc(text)}</h3>${f.evidence && f.kind !== "health" ? `<p>${esc(f.evidence)}</p>` : ""}</div></div>
    <div class="ac-acts"><button type="button" class="ac-go" data-ak="fact-yes" data-ref="${esc(f.id)}">${T("Yes, remember", "Haan, yaad rakho", "हाँ, याद रखो")}</button><button type="button" class="ac-no" data-ak="fact-no" data-ref="${esc(f.id)}">${T("No", "Nahi", "नहीं")}</button></div>`;
}

// ---- the quiet log

export function quietSheet(ctx) {
  const { T, esc } = ctx, q = ctx.state().quiet;
  if (!q) return;
  const items = (q.items || []).slice().sort((a, b) => String(a.at_ist).localeCompare(String(b.at_ist)));
  return ctx.sheet(`<div class="sheet-h"><p class="k">${T("Today, quietly", "Aaj chup chaap", "आज चुपचाप")}</p><h2>${esc(quietLine(ctx, q))}</h2>
    <p class="sub">${T("Everything Baari did without asking anyone. The marked ones reached a person.", "Jo Baari ne bina kisi ko pareshan kiye kiya. Jo kisi tak pahuncha, us pe nishaan hai.", "जो बारी ने बिना पूछे किया। जो किसी तक पहुँचा, उस पर निशान है।")}</p></div>
    <ol class="ql">${items.map((x, i) => `<li class="${x.told ? "told" : ""}" style="--i:${i}"><span class="at">${esc(hm(x.at_ist))}</span><p>${esc(x.text)}</p>${x.told ? `<span class="chip warn">${T("told", "bataya", "बताया")}${typeof x.told === "string" ? ` · ${esc(x.told)}` : ""}</span>` : ""}</li>`).join("")}</ol>`, "quiet");
}

// ---- Kyun?: the night's decision lines in plain words, the rule ids gone.
const DISH_R = /^(S|V|C|A|T)\d/;
const BUY_R = /^(B|L|M|K|H|P)\d/;
export function hasWhy(ctx, kind) { return pickWhy(ctx, kind).length > 0; }
function pickWhy(ctx, kind) {
  const ds = ctx.state().decisions || [];
  return ds.filter((d) => {
    const r = String(d.rule || ""), t = String(d.text || "");
    return kind === "dish" ? DISH_R.test(r) || /vote|niyam|dish|jeet|won|chun/i.test(t) && !BUY_R.test(r)
      : BUY_R.test(r) || /delhivery|kirana|pine|parcel|rider|debit|rs \d|₹/i.test(t);
  });
}
export function whyBtn(ctx, kind, cls = "") {
  if (!hasWhy(ctx, kind)) return "";
  return `<button type="button" class="kyun ${cls}" data-kyun="${kind}">${ctx.T("Why?", "Kyun?", "क्यों?")}</button>`;
}
export function whySheet(ctx, kind) {
  const { T, esc } = ctx;
  const ds = pickWhy(ctx, kind);
  if (!ds.length) return;
  return ctx.sheet(`<div class="sheet-h"><p class="k">${kind === "dish" ? T("The dish", "Dish", "डिश") : T("The groceries", "Saamaan", "सामान")}</p><h2>${T("Why?", "Kyun?", "क्यों?")}</h2>
    <p class="sub">${T("How Baari thought it through tonight.", "Aaj raat Baari ne aise socha.", "आज रात बारी ने ऐसे सोचा।")}</p></div>
    <ol class="ky">${ds.map((d, i) => { const w = String(d.rule || "").split(/[,\s]+/).map((r) => ctx.why[r]).filter(Boolean); return `<li style="--i:${i}"><span class="at">${esc(d.at || "")}</span><div><p>${esc(ctx.plain(d.text))}</p>${w.length ? `<small>${esc(w.join(", "))}</small>` : ""}</div></li>`; }).join("")}</ol>`, "why");
}

// ---- Baari se baat karo: the in-app call. Baari asks the questions still
// open, out loud, in the voice picked in the studio; the orb breathes with
// her voice. Hold the mic to answer; let go and the next line plays.
export async function openCall(ctx) {
  const { T, esc } = ctx;
  if (document.querySelector(".vx")) return;
  const c = ctx.voiceColors();
  const w = document.createElement("div");
  w.className = "vx call";
  w.setAttribute("role", "dialog");
  w.setAttribute("aria-modal", "true");
  w.setAttribute("aria-label", T("Talking to Baari", "Baari se baat", "बारी से बात"));
  w.innerHTML = `<div class="vx-top"><button type="button" class="vx-x" data-cend aria-label="${T("End", "Band karo", "बंद करो")}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button><p class="cl-k"><i></i><span data-cst>${T("Calling", "Call lag rahi hai", "कॉल लग रही है")}</span></p><span class="cl-t" data-ct>0:00</span></div>
    <div class="vx-mid"><div class="vx-orbw" style="--oa:${c[0]};--ob:${c[1]};--oc:${c[2]};--amp:0"><div class="vx-orb" aria-hidden="true"><i></i><i></i><i></i><b></b></div></div><p class="vx-line">Baari</p></div>
    <div class="vx-card cl-card">
      <p class="cl-line" data-cline aria-live="polite">…</p>
      <div class="cl-acts">
        <button type="button" class="cl-mic" data-cmic disabled aria-label="${T("Hold to talk", "Daba ke bolo", "दबा के बोलो")}">${ctx.mx("microphone-2", true)}</button>
      </div>
      <p class="cl-hint" data-chint>${T("Hold to talk", "Daba ke bolo", "दबा के बोलो")}</p>
      <form class="cl-type" data-ctype hidden><input maxlength="200" enterkeyhint="send" placeholder="${T("Type your answer", "Jawab likho", "जवाब लिखो")}" aria-label="${T("Your answer", "Aapka jawab", "आपका जवाब")}"><button type="submit">${ctx.mx("send-2", true)}</button></form>
      <div class="cl-foot"><button type="button" class="cl-alt" data-ctog>${T("Type instead", "Likh ke", "लिख के")}</button><button type="button" class="cl-later" data-cend>${T("The rest later", "Baaki baad mein", "बाकी बाद में")}</button></div>
    </div>`;
  document.body.appendChild(w);
  document.documentElement.classList.add("vx-on");
  requestAnimationFrame(() => w.classList.add("is-open"));
  const $ = (s) => w.querySelector(s);
  const orbw = $(".vx-orbw"), orb = $(".vx-orb"), line = $("[data-cline]"), mic = $("[data-cmic]"), hint = $("[data-chint]"), st = $("[data-cst]");
  let session = null, ended = false, busy = false, answered = [];
  const t0 = Date.now();
  const clk = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $("[data-ct]").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 1000);
  // Breathing: the analyser when the clip allows it, a soft pulse when it
  // doesn't (cross-origin audio, or a line with no clip).
  const au = new Audio(); au.crossOrigin = "anonymous";
  let actx = null, an = null, buf = null, raf = 0, amp = 0, fake = 0;
  const tick = () => {
    let a = 0;
    if (an && !au.paused) { an.getByteTimeDomainData(buf); let s = 0; for (const x of buf) s += (x - 128) ** 2; a = Math.min(1, Math.sqrt(s / buf.length) / 28); }
    else if (fake > performance.now()) a = 0.35 + 0.3 * Math.sin(performance.now() / 140);
    amp += (a - amp) * 0.25;
    orbw.style.setProperty("--amp", amp.toFixed(3));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const hook = () => { if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); an = actx.createAnalyser(); an.fftSize = 256; buf = new Uint8Array(an.fftSize); actx.createMediaElementSource(au).connect(an); an.connect(actx.destination); } catch (e) { actx = null; an = null; } };
  const speak = (text, url) => new Promise((done) => {
    line.classList.remove("in"); void line.offsetWidth; line.textContent = text || ""; line.classList.add("in");
    orb.classList.add("talk"); st.textContent = T("Baari is speaking", "Baari bol rahi hai", "बारी बोल रही है"); mic.disabled = true;
    const fin = () => { orb.classList.remove("talk"); fake = 0; done(); };
    if (url) { hook(); actx?.resume?.(); au.src = url; au.onended = fin; au.onerror = () => { fake = performance.now() + Math.min(6000, 600 + (text || "").length * 55); setTimeout(fin, Math.min(6000, 600 + (text || "").length * 55)); }; au.play().catch(au.onerror); }
    else { const ms = Math.min(6000, 600 + (text || "").length * 55); fake = performance.now() + ms; setTimeout(fin, ms); }
  });
  const listenMode = () => { if (ended) return; mic.disabled = false; st.textContent = T("Your turn", "Aapki baari", "आपकी बारी"); hint.textContent = T("Hold to talk", "Daba ke bolo", "दबा के बोलो"); };
  const fail = () => { st.textContent = T("Call dropped", "Call kat gayi", "कॉल कट गई"); line.textContent = T("Couldn't reach Baari. Try again in a bit.", "Baari tak nahi pahunch paaye. Thodi der mein phir try karo.", "बारी तक नहीं पहुँच पाए।"); mic.disabled = true; };
  const turn = async (body) => {
    if (busy || ended) return;
    busy = true; mic.disabled = true; st.textContent = T("Baari is thinking", "Baari soch rahi hai", "बारी सोच रही है");
    try {
      const r = await ctx.api("call/turn", { session, ...body });
      answered = [...new Set([...answered, ...(r.answered || [])])];
      if (r.answered && r.answered.length) ctx.onAnswered(r.answered);
      busy = false;
      await speak(r.line_text, r.audio_url);
      if (r.done) { end(true); return; }
      listenMode();
    } catch (err) { busy = false; fail(err); }
  };
  // Hold the mic: record while held, then Gnani writes it down (/api/stt)
  // and the text goes to the call.
  let rec = null;
  const down = async (e) => {
    if (mic.disabled || rec) return;
    e.preventDefault();
    try { rec = await ctx.recorder(); } catch (err) { rec = null; hint.textContent = T("The mic isn't available. Type instead.", "Mic nahi chal raha. Likh ke jawab do.", "माइक नहीं चल रहा। लिख के जवाब दो।"); $("[data-ctype]").hidden = false; return; }
    mic.classList.add("rec"); ctx.haptic(10); hint.textContent = T("Listening, let go when done", "Sun rahi hoon, bol ke chhod do", "सुन रही हूँ, बोल के छोड़ दो");
    const lv = () => { if (!rec) return; orbw.style.setProperty("--amp", (rec.level() * 0.8).toFixed(3)); requestAnimationFrame(lv); };
    lv();
  };
  const up = async () => {
    if (!rec) return;
    const r = rec; rec = null; mic.classList.remove("rec"); ctx.haptic(6);
    const { blob, secs } = await r.stop();
    if (secs < 0.5) { hint.textContent = T("Hold a little longer", "Thoda der daba ke rakho", "थोड़ी देर दबा के रखो"); return; }
    hint.textContent = T("Gnani is writing it down", "Gnani likh raha hai", "ग्नानी लिख रहा है");
    const text = await ctx.stt(blob);
    if (!text) { hint.textContent = T("Didn't catch that. Once more?", "Saaf nahi suna. Ek baar aur?", "साफ़ नहीं सुना। एक बार और?"); return; }
    hint.textContent = `"${text}"`;
    turn({ text });
  };
  mic.addEventListener("pointerdown", down);
  mic.addEventListener("pointerup", up);
  mic.addEventListener("pointercancel", up);
  mic.addEventListener("pointerleave", up);
  $("[data-ctype]").addEventListener("submit", (e) => { e.preventDefault(); const i = e.target.querySelector("input"), v = i.value.trim(); if (!v) return; i.value = ""; hint.textContent = `"${v}"`; turn({ text: v }); });
  w.addEventListener("click", (e) => {
    if (e.target.closest("[data-ctog]")) { const f = $("[data-ctype]"); f.hidden = !f.hidden; if (!f.hidden) f.querySelector("input").focus(); return; }
    if (e.target.closest("[data-cend]")) end(false);
  });
  const key = (e) => { if (e.key === "Escape") end(false); };
  addEventListener("keydown", key);
  async function end(byBaari) {
    if (ended) return;
    ended = true; mic.disabled = true;
    if (!byBaari) { await speak(T("Okay, the rest later.", "Theek hai, baaki baad mein.", "ठीक है, बाकी बाद में।"), null); }
    st.textContent = T("Call ended", "Call khatam", "कॉल ख़त्म");
    setTimeout(close, 700);
  }
  function close() {
    removeEventListener("keydown", key);
    clearInterval(clk); cancelAnimationFrame(raf); au.pause();
    if (rec) rec.stop().catch(() => {});
    w.classList.remove("is-open"); w.classList.add("is-closing");
    document.documentElement.classList.remove("vx-on");
    setTimeout(() => { w.remove(); actx?.close?.(); }, 360);
    if (answered.length) ctx.toast({ icon: "📞", title: T(`${answered.length} answered on the call`, `Call pe ${answered.length} jawab mile`, `कॉल पर ${answered.length} जवाब`), body: T("The island drops those questions.", "Woh sawaal ab nahi aayenge.", "वो सवाल अब नहीं आएँगे।"), ms: 3200 });
  }
  try {
    const r = await ctx.api("call", { member: ctx.me(), purpose: "ask", carrier: "web" });
    session = r.session;
    await speak(r.line_text, r.audio_url);
    listenMode();
  } catch (err) { fail(err); }
}
