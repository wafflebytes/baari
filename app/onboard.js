// First run. Baari sets up the house with you, out loud: the island at the
// top is Baari itself (it listens, thinks, then says what it understood),
// every answer changes something you can see, and the last screen runs
// tonight once, fast-forward, with your own people in it. Every question is
// a tap, every screen has a way out, and nothing here is a form.
import { haptic, burst } from "./play.js";
import { LOOKS, faceHtml, lookFor } from "./avatars.js";
import { editorHtml, wireEditor } from "./faceedit.js";
import { inviteHtml, wireInvite } from "./invite.js";
import { verb } from "./verbs.js";
import { mx } from "./icons.js";

const qs = new URLSearchParams(location.search);
const BOT = "Baari_ken_bot";
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 60) : ms));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MEMBERS = [
  { k: "main", l: ["Me", "Main", "मैं"], em: "🙋🏽", adult: 1 }, { k: "mummy", l: ["Mummy", "Mummy", "मम्मी"], em: "👩🏽", adult: 1 },
  { k: "papa", l: ["Papa", "Papa", "पापा"], em: "👨🏽‍🦳", adult: 1 }, { k: "didi", l: ["Didi", "Didi", "दीदी"], em: "👧🏽", adult: 1 },
  { k: "bhaiya", l: ["Bhaiya", "Bhaiya", "भैया"], em: "👦🏽", adult: 1 }, { k: "dadi", l: ["Dadi", "Dadi", "दादी"], em: "👵🏽", adult: 1 },
  { k: "dadaji", l: ["Dada ji", "Dada ji", "दादा जी"], em: "👴🏽", adult: 1 },
  { k: "beta", l: ["Son", "Beta", "बेटा"], em: "👦🏽", adult: 1, multi: 1 }, { k: "beti", l: ["Daughter", "Beti", "बेटी"], em: "👧🏽", adult: 1, multi: 1 },
  { k: "bachche", l: ["Little one", "Chhotu", "छोटू"], em: "🧒🏽", adult: 0, multi: 1 },
];
// A house can have three sons. Each one is its own person ("beta", "beta~2",
// "beta~3") so each gets a seat in the baari; the tile just counts them.
const base = (k) => String(k).split("~")[0];
const mem = (k) => MEMBERS.find((m) => m.k === base(k));
const RULES = [
  { k: "aloo", c: "who", l: ["No potato on Papa's plate", "Papa ki thali mein aloo nahi", "पापा की थाली में आलू नहीं"] },
  { k: "oil", c: "health", l: ["Less oil for Mummy", "Mummy ke liye kam tel", "मम्मी के लिए कम तेल"] },
  { k: "teekha", c: "who", l: ["Less spice for the kids", "Bachchon ke liye kam teekha", "बच्चों के लिए कम तीखा"] },
  { k: "tue", c: "day", l: ["No non-veg on Tuesdays", "Mangalvaar ko non-veg nahi", "मंगलवार को नॉन-वेज नहीं"] },
  { k: "navratri", c: "day", l: ["No onion or garlic in Navratri", "Navratri mein pyaaz-lehsun nahi", "नवरात्रि में प्याज़-लहसुन नहीं"] },
  { k: "egg", c: "day", l: ["Eggs only on weekends", "Anda sirf weekend pe", "अंडा सिर्फ़ वीकेंड पर"] },
  { k: "veg", c: "food", l: ["Fully vegetarian", "Poora shakahari", "पूरा शाकाहारी"] },
  { k: "jain", c: "food", l: ["Jain: no roots", "Jain: zameen ke neeche ka nahi", "जैन: ज़मीकंद नहीं"] },
  { k: "sugar", c: "health", l: ["Low sugar for Dadi", "Dadi ke liye kam meetha", "दादी के लिए कम मीठा"] },
  { k: "salt", c: "health", l: ["Less salt for Papa", "Papa ke liye kam namak", "पापा के लिए कम नमक"] },
  { k: "peanut", c: "who", l: ["No peanuts, allergy", "Moongphali nahi, allergy", "मूँगफली नहीं, एलर्जी"] },
  { k: "repeat", c: "food", l: ["No dish twice a week", "Hafte mein ek dish do baar nahi", "हफ़्ते में एक डिश दो बार नहीं"] },
];
const RCATS = [["all", ["All", "Sab", "सब"]], ["who", ["People", "Logon ke", "लोगों के"]], ["health", ["Health", "Sehat", "सेहत"]], ["day", ["Days", "Din", "दिन"]], ["food", ["Food", "Khaana", "खाना"]]];
const LANGS = ["Hindi", "Marathi", "Bangla", "Tamil", "Kannada", "Telugu"];
const TIMES = ["6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00"];
const DISH_IMG = ["rajma", "palak-paneer", "kadhi", "aloo-puri", "lauki-chana-dal", "egg-bhurji"];
const mins = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const hm = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
const MIC_OK = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const SVG = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const IC = {
  arrow: SVG("M13.3 5.3 20 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.2l-4.3-4.3z"), back: SVG("M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3z"),
  check: SVG("m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"), mic: SVG("M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"),
  play: SVG("M8 5v14l11-7z"), stop: SVG("M7 7h10v10H7z"),
};

export function needsOnboarding() {
  if (qs.has("onboard")) return true;
  if (qs.has("fixture") || qs.has("skip")) return false;
  return !store.get("baari:onboarded");
}

export function onboard({ onDone } = {}) {
  const pick = {
    ui: "hing", members: ["main", "mummy", "papa"], me: { who: "main", look: { ...LOOKS.main }, tint: "sand" }, mode: "pick", inb: null, duty: null,
    rules: ["aloo"], custom: [], cook: "Sunita", time: "8:00", lang: "Hindi",
    ...(store.get("baari:setup") || {}),
  };
  if (!pick.me.look) pick.me = { ...pick.me, look: { ...LOOKS.main }, tint: pick.me.tint || "sand" };
  const ui0 = pick.ui;
  const L = (en, hing, hi) => (pick.ui === "en" ? en : pick.ui === "hi" ? hi : hing);
  const lbl = (m) => m.l[["en", "hing", "hi"].indexOf(pick.ui)];
  pick.members = (pick.members || []).filter((k) => mem(k));
  const people = () => pick.members.map((k) => ({ ...mem(k), k }));
  const count = (b) => pick.members.filter((k) => base(k) === b).length;
  const inb = () => { const r = (pick.inb || pick.members.filter((k) => mem(k).adult)).filter((k) => pick.members.includes(k)); return r.length ? r : pick.members.slice(0, 1); };
  // "Beta" when there's one; "Beta 1", "Beta 2" when there are more.
  const nameFor = (k) => { const m = mem(k), n = count(m.k), at = +(String(k).split("~")[1] || 1); return n > 1 ? `${lbl(m)} ${at}` : lbl(m); };
  const nameOf = (k) => (k === "main" ? L("you", "aap", "आप") : nameFor(k));
  const faceOf = (k, cls = "") => k === "main" ? faceHtml(pick.me.look, pick.me.tint, cls) : faceHtml(LOOKS[base(k)] || lookFor(k), "stone", cls);
  let rcat = "all";

  const root = document.createElement("div");
  root.className = "ag";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `<div class="ag-top">
      <button type="button" class="ag-back" aria-label="Back">${IC.back}</button>
      <div class="ag-isl" aria-live="polite"><svg class="ag-ring" aria-hidden="true"><rect class="b" pathLength="100"/><rect class="f" pathLength="100"/></svg><img src="/img/baari-mark.png" alt=""><span class="ag-say"></span><span class="ag-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
      <span class="ag-skip" aria-hidden="true"></span>
    </div>
    <div class="ag-stage"></div>
    <div class="ag-foot"></div>`;
  document.body.appendChild(root);
  document.documentElement.classList.add("ob-open");
  const isl = root.querySelector(".ag-isl"), say = root.querySelector(".ag-say"), stage = root.querySelector(".ag-stage"), foot = root.querySelector(".ag-foot");

  // ---- the island: Baari's face. It listens, thinks (three dots and a
  // shimmer), then says one short thing. Its outline is how far along we are.
  let mood = "";
  function island(text, state = "listen") {
    isl.className = `ag-isl ${state}`;
    if (say.textContent !== text) { say.textContent = text; say.classList.remove("swap"); void say.offsetWidth; say.classList.add("swap"); }
    mood = state;
    sizeRing();
  }
  function sizeRing() {
    const w = isl.offsetWidth + 10, h = isl.offsetHeight + 10, svg = isl.querySelector(".ag-ring");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.querySelectorAll("rect").forEach((r) => { r.setAttribute("x", 1.25); r.setAttribute("y", 1.25); r.setAttribute("width", w - 2.5); r.setAttribute("height", h - 2.5); r.setAttribute("rx", (h - 2.5) / 2); });
  }
  new ResizeObserver(sizeRing).observe(isl);
  // Think for a beat, then react. The reaction lands in the island and, when
  // it's worth keeping, in the line under the question.
  let thinkT = 0;
  async function react(line, keep) {
    const my = ++thinkT;
    island(verb(pick.ui), "think");
    await wait(520);
    if (my !== thinkT) return;
    island(L("Got it", "Samajh gaya", "समझ गया"), "said");
    haptic(4);
    const el = stage.querySelector(".ag-react");
    if (el && keep !== false) { el.innerHTML = `<img src="/img/baari-mark.png" alt=""><span>${line}</span>`; el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); }
    setTimeout(() => { if (my === thinkT) island(L("Listening", "Sun raha hoon", "सुन रहा हूँ"), "listen"); }, 1600);
  }
  // Baari's lines arrive word by word through a soft blur (streaming text).
  const stream = (text, cls = "", tag = "h1") => `<${tag} class="ag-q ${cls}">${String(text).replace(/<br>/g, cls.includes("big") ? "<br>" : " ").split(/(<br>| )/).filter((w) => w && w !== " ").map((w, i) => (w === "<br>" ? "<br>" : `<span style="--w:${i}">${w}</span>`)).join(" ")}</${tag}>`;

  // ---- scenes
  const SC = [
    { id: "hello", say: () => L("Namaste", "Namaste", "नमस्ते"), view: () => `
        <div class="ag-orbit" aria-hidden="true"><div class="ag-ringd">${DISH_IMG.map((f, i) => `<span style="--a:${i * 60}deg"><img src="/img/dishes/${f}.webp" alt=""></span>`).join("")}</div><span class="ag-coin"><img src="/img/baari-mark.png" alt=""></span></div>
        ${stream(L("Tomorrow's lunch,<br>sorted tonight.", "Kal ka khana,<br>aaj raat tay.", "कल का खाना,<br>आज रात तय।"), "big")}
        <p class="ag-sub">${L("I ask the family, order what's missing and tell your cook in her language. You just tap.", "Main family se poochta hoon, jo kam hai mangata hoon aur cook ko unki bhasha mein batata hoon. Aap bas tap karo.", "मैं परिवार से पूछता हूँ, जो कम है मँगाता हूँ और कुक को उनकी भाषा में बताता हूँ।")}</p>
        <p class="ag-ask">${L("Which language should we talk in?", "Kis bhasha mein baat karein?", "किस भाषा में बात करें?")}</p>
        <div class="ag-langs" role="radiogroup">${[["en", "English"], ["hing", "Hinglish"], ["hi", "हिंदी"]].map(([k, l]) => `<button type="button" role="radio" aria-checked="${pick.ui === k}" class="${pick.ui === k ? "on" : ""}" data-ui="${k}">${l}</button>`).join("")}</div>`,
      cta: () => L("Set up my home", "Ghar set karo", "घर सेट करो"), alt: () => L("Just look around first", "Pehle bas dekhna hai", "पहले बस देखना है") },
    { id: "who", say: () => L("Counting", "Gin raha hoon", "गिन रहा हूँ"), view: () => `
        ${stream(L("Who's at the table?", "Khaane pe kaun?", "खाने पर कौन?"))}
        <p class="ag-sub">${L("Tap everyone who eats lunch. Two sons? Tap, then +.", "Jo lunch khaate hain, sabko tap karo. Do bete? Tap, phir +.", "जो लंच खाते हैं, सबको टैप करो। दो बेटे? टैप, फिर +।")}</p>
        <div class="ag-grid">${MEMBERS.map(tile).join("")}</div>
        <p class="ag-react"></p>` },
    { id: "me", say: () => L("Looking at you", "Aapko dekh raha hoon", "आपको देख रहा हूँ"), view: () => `
        ${stream(L("Make yourself.", "Apna chehra banao.", "अपना चेहरा बनाओ।"))}
        <p class="ag-sub">${L("The family sees this on every vote. The dice makes a new one.", "Har vote pe family yahi dekhegi. Paasa naya chehra banata hai.", "हर वोट पर परिवार यही देखेगा।")}</p>
        ${editorHtml(pick.me, pick.ui)}
        <p class="fe-credit">Faces: Personas by Draftbit, CC BY 4.0</p>` },
    { id: "baari", say: () => L("The big question", "Asli sawaal", "असली सवाल"), view: () => `
        ${stream(L("Who decides,<br>day by day?", "Roz kaun<br>chunega?", "रोज़ कौन<br>चुनेगा?"))}
        <p class="ag-sub">${L("That's the baari: a turn that goes round the house.", "Yahi baari hai: ek turn jo ghar mein ghoomta hai.", "यही बारी है: एक बारी जो घर में घूमती है।")}</p>
        <div class="ag-modes">
          <button type="button" class="ag-mode ${pick.mode === "pick" ? "on" : ""}" data-mode="pick"><span class="ag-mv"><i class="c"></i>${'<i class="p"></i>'.repeat(3)}</span><b>${L("One picks", "Baari wala chune", "बारी वाला चुने")}</b><small>${L("Whoever's turn it is picks. The rest can veto once.", "Jiski baari, woh chune. Baaki ek veto.", "जिसकी बारी, वो चुने। बाकी एक वीटो।")}</small></button>
          <button type="button" class="ag-mode ${pick.mode === "vote" ? "on" : ""}" data-mode="vote"><span class="ag-mv v">${'<i class="p"></i>'.repeat(3)}</span><b>${L("Everyone votes", "Sab vote karein", "सब वोट करें")}</b><small>${L("Majority wins. The turn breaks a tie.", "Zyada vote jeete. Baari wala tie tode.", "ज़्यादा वोट जीते। बारी वाला टाई तोड़े।")}</small></button>
        </div>
        <p class="ag-ask">${L("Who's in the baari?", "Baari mein kaun kaun?", "बारी में कौन कौन?")}</p>
        <div class="ag-inb">${people().map((m) => `<button type="button" class="${inb().includes(m.k) ? "on" : ""}" data-inb="${m.k}">${faceOf(m.k, "xs")}<span>${m.k === "main" ? L("Me", "Main", "मैं") : nameFor(m.k)}</span></button>`).join("")}</div>
        <p class="ag-react"></p>` },
    { id: "spin", say: () => L("Ready to spin", "Ghumane ko taiyaar", "घुमाने को तैयार"), view: () => {
        const ring = inb();
        return `${stream(L("Who goes first?", "Pehli baari<br>kiski?", "पहली बारी<br>किसकी?"))}
        <p class="ag-sub">${L("Spin the coin. After that it moves on by itself, every day.", "Sikka ghumao. Uske baad roz khud aage badhega.", "सिक्का घुमाओ। फिर रोज़ ख़ुद आगे बढ़ेगा।")}</p>
        <div class="ag-wheel" style="--n:${ring.length};--s:${ring.length <= 4 ? 54 : ring.length <= 6 ? 46 : 40}px">${ring.map((k, i) => `<span class="ag-seat ${pick.duty === k ? "on" : ""}" data-seat="${k}" style="--a:${(360 / ring.length) * i}deg">${faceOf(k, "")}<b>${k === "main" ? L("Me", "Main", "मैं") : nameFor(k)}</b></span>`).join("")}
          <button type="button" class="ag-spin" data-spin style="--rot:${pick.duty ? (360 / ring.length) * Math.max(0, ring.indexOf(pick.duty)) : 0}deg"><span class="ag-needle"></span><img src="/img/baari-mark.png" alt=""><small>${L("Spin", "Ghumao", "घुमाओ")}</small></button></div>
        <p class="ag-react"></p>`; } },
    { id: "rules", say: () => L("Listening", "Sun raha hoon", "सुन रहा हूँ"), view: () => `
        ${stream(L("Anything that must<br>never happen?", "Kuch jo kabhi<br>nahi hona chahiye?", "कुछ जो कभी<br>नहीं होना चाहिए?"))}
        <p class="ag-sub">${L("I'll never break these, whatever the vote says.", "Vote kuch bhi kahe, main ye kabhi nahi todunga.", "वोट कुछ भी कहे, मैं ये कभी नहीं तोड़ूँगा।")}</p>
        <div class="ag-rf" role="tablist" data-nopull>${RCATS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${rcat === k}" data-rc="${k}">${l[["en", "hing", "hi"].indexOf(pick.ui)]}${k === "all" ? "" : `<i data-rcn="${k}">${RULES.filter((r) => r.c === k && pick.rules.includes(r.k)).length || ""}</i>`}</button>`).join("")}</div>
        <div class="ag-chips" data-rcat="${rcat}">${RULES.map((r) => `<button type="button" class="ag-chip ${pick.rules.includes(r.k) ? "on" : ""}" data-r="${r.k}" data-c="${r.c}"><i>${IC.check}</i>${lbl(r)}</button>`).join("")}
          ${pick.custom.map((c, i) => `<button type="button" class="ag-chip on own" data-own="${i}" data-c="own"><i>${IC.check}</i>${esc(c)}</button>`).join("")}</div>
        <div class="ag-own"><input data-owntext placeholder="${L("Or say your own, any language", "Ya apna bolo, kisi bhi bhasha mein", "या अपना बोलो, किसी भी भाषा में")}" maxlength="60" enterkeyhint="done" autocomplete="off"><button type="button" class="ag-mic" data-mic aria-label="${L("Speak", "Bolo", "बोलो")}">${IC.mic}</button><button type="button" class="ag-ok" data-ownok aria-label="Add">${IC.check}</button></div>
        <p class="ag-react"></p>
        <p class="ag-later">${L("Not sure? Skip it. I'll ask one small thing at a time later, or call you for two minutes.", "Pakka nahi? Chhod do. Baad mein ek-ek chhota sawaal poochunga, ya 2 minute call kar lunga.", "पक्का नहीं? छोड़ दो। बाद में एक-एक सवाल पूछूँगा।")}</p>` },
    { id: "cook", say: () => L("Writing a note", "Note likh raha hoon", "नोट लिख रहा हूँ"), view: () => `
        ${stream(L("Who cooks?", "Khana kaun<br>banata hai?", "खाना कौन<br>बनाता है?"))}
        <div class="ag-cook">
          <label class="ag-name"><span class="av t-mint">👩🏽‍🍳</span><input data-cook value="${esc(pick.cook)}" maxlength="20" autocomplete="off" enterkeyhint="done" aria-label="${L("Her name", "Unka naam", "उनका नाम")}"><small>${L("ji", "ji", "जी")}</small></label>
          <div class="ag-row"><span>${L("Comes at", "Aati hain", "आती हैं")}</span><div class="tp-row" data-times data-nopull>${times()}</div></div>
          <div class="ag-row"><span>${L("Talks in", "Bhasha", "भाषा")}</span><div class="ag-seg" data-nopull>${LANGS.map((x) => `<button type="button" class="${pick.lang === x ? "on" : ""}" data-clang="${x}">${x}</button>`).join("")}</div></div>
        </div>
        <div class="ag-note"><button type="button" class="ag-play" data-speak aria-label="Play">${IC.play}</button><div><p class="ag-nk">${L("Her 7:45 voice note, drafted", "Unka 7:45 ka voice note, taiyaar", "उनका 7:45 का वॉइस नोट")}</p><p class="ag-nt" lang="hi" data-note>${noteText()}</p></div><span class="ag-wave" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--h:${30 + ((i * 37) % 70)}%"></i>`).join("")}</span></div>` },
    { id: "run", say: () => L("Running tonight", "Aaj raat chala raha hoon", "आज रात चला रहा हूँ"), view: () => `
        ${stream(L("Let me run tonight once,<br>so you can see.", "Ek baar aaj raat<br>chala ke dikhata hoon.", "एक बार आज रात<br>चला के दिखाता हूँ।"))}
        <div class="ag-clock"><span class="ag-ck" data-ck>8:30</span><small data-ckap>PM</small><i class="ag-sky" data-sky></i></div>
        <ol class="ag-run" data-run></ol>` },
    { id: "done", say: () => L("Your home is ready", "Ghar taiyaar", "घर तैयार"), view: () => {
        const ring = inb();
        const d = pick.duty || ring[0];
        return `<div class="ag-house">
          <p class="ag-hk"><img src="/img/baari-mark.png" alt="">${L("Your home", "Aapka ghar", "आपका घर")}</p>
          <div class="ag-hf">${people().map((m, i) => `<span class="ag-hp ${ring.includes(m.k) ? "" : "out"}" style="--i:${i}">${faceOf(m.k, "sm")}${m.k === d ? '<i class="ag-hc"><img src="/img/baari-mark.png" alt=""></i>' : ""}</span>`).join("")}</div>
          <dl><div><dt>${L("First baari", "Pehli baari", "पहली बारी")}</dt><dd>${esc(cap(nameOf(d)))}</dd></div><div><dt>${L("Rules", "Niyam", "नियम")}</dt><dd>${pick.rules.length + pick.custom.length}</dd></div><div><dt>${esc(pick.cook)}</dt><dd>${pick.time} · ${pick.lang}</dd></div></dl>
        </div>
        ${stream(L("Tonight at 8:30,<br>it's real.", "Aaj raat 8:30 se,<br>sach mein.", "आज रात 8:30 से,<br>सच में।"))}
        <p class="ag-sub">${L("The dishes and votes arrive on Telegram. Send everyone the link now, it takes ten seconds.", "Dishes aur vote Telegram pe aate hain. Sabko abhi link bhej do, 10 second lagenge.", "डिश और वोट टेलीग्राम पर आते हैं। सबको अभी लिंक भेजो।")}</p>
        ${inviteHtml({ home: L("Your", "Aapka", "आपका"), people: people().filter((m) => m.k !== "main").map((m) => ({ name: nameFor(m.k), look: LOOKS[base(m.k)] || lookFor(m.k), tint: "stone", joined: false })), T: L })}`; },
      cta: () => L("Open my home", "Mera ghar kholo", "मेरा घर खोलो"), alt: () => L("I'll invite them later", "Baad mein bulaunga", "बाद में बुलाऊँगा") },
  ];
  const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  // A tile is a face and a name. Sons, daughters and little ones can
  // repeat: tap one and the tile grows to two columns, the face on the left
  // and a − n + on the right. The grid reflows with a FLIP so every other
  // tile glides to its new place instead of jumping.
  function tile(m) {
    const n = count(m.k), on = n > 0, wide = m.multi && on;
    const face = m.k === "main" ? faceHtml(pick.me.look, pick.me.tint, "ag-tf") : faceHtml(LOOKS[m.k] || lookFor(m.k), on ? "sand" : "stone", "ag-tf");
    const name = lbl(m);
    return `<div class="ag-tile ${on ? "on" : ""} ${m.multi ? "multi" : ""} ${wide ? "wide" : ""}" data-tile="${m.k}" data-n="${n}"><button type="button" class="ag-tb" data-m="${m.k}" aria-pressed="${on}">${face}<b>${name}</b>${wide ? `<span class="ag-x">${n}</span>` : ""}</button>${wide
      ? `<span class="ag-n"><b>${name}</b><span class="ag-st" aria-live="polite"><button type="button" data-mstep="-1" data-mk="${m.k}" aria-label="One less">−</button><em>${n}</em><button type="button" data-mstep="1" data-mk="${m.k}" aria-label="One more">+</button></span></span>`
      : ""}<i class="ag-ck">${IC.check}</i></div>`;
  }
  function setCount(b, n) {
    const keep = pick.members.filter((k) => base(k) !== b);
    const add = Array.from({ length: Math.max(0, Math.min(6, n)) }, (_, j) => (j ? `${b}~${j + 1}` : b));
    const at = pick.members.findIndex((k) => base(k) === b);
    const before = count(b);
    pick.members = at < 0 ? [...keep, ...add] : [...keep.slice(0, at), ...add, ...keep.slice(at)];
    if (pick.inb) pick.inb = pick.inb.filter((k) => pick.members.includes(k)).concat(add.filter((k) => mem(k).adult && !pick.inb.includes(k)));
    const t = stage.querySelector(`[data-tile="${b}"]`);
    if (!t) return;
    const fresh = document.createElement("div"); fresh.innerHTML = tile(mem(b)); const nt = fresh.firstElementChild;
    const grow = t.classList.contains("wide") !== nt.classList.contains("wide");
    const was = t.classList.contains("on");
    if (!grow && nt.classList.contains("wide")) {
      // Same size: only the numbers change, each with its own small move.
      t.dataset.n = nt.dataset.n;
      const em = t.querySelector(".ag-st em"), x = t.querySelector(".ag-x");
      em.textContent = n; x.textContent = n;
      const d = n > before ? "tick-up" : "tick-down";
      [em, x].forEach((e) => { e.classList.remove("tick-up", "tick-down"); void e.offsetWidth; e.classList.add(d); });
      return;
    }
    const grid = t.parentElement, tiles = [...grid.children];
    const first = new Map(tiles.map((el) => [el, el.getBoundingClientRect()]));
    t.className = nt.className; t.dataset.n = nt.dataset.n; t.innerHTML = nt.innerHTML;
    if (was !== nt.classList.contains("on") && !grow) bump(t);
    if (reduce) return;
    tiles.forEach((el) => {
      const a = first.get(el), z = el.getBoundingClientRect();
      const dx = a.left - z.left, dy = a.top - z.top;
      if (el === t) {
        el.animate([{ width: `${a.width}px`, transform: `translate(${dx}px, ${dy}px)` }, { width: `${z.width}px`, transform: "none" }], { duration: 420, easing: "cubic-bezier(0.34, 1.2, 0.64, 1)" });
      } else if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
      }
    });
  }
  function noteText() {
    const n = pick.members.length;
    const nm = esc(pick.cook || "Sunita");
    return `${nm} जी, नमस्ते। कल राजमा चावल, ${n} लोगों के लिए। ${pick.time} बजे आइए, शर्मा किराना से टमाटर ले लीजिए, पैसे बारी देगा।`;
  }
  // Times: one scrolling row. Tap a time and the rest fold away; the one you
  // chose opens into − 8:00 + for 15-minute nudges. Tap it again for the row.
  let timePicked = false;
  function times() {
    const near = TIMES.reduce((b, x) => (Math.abs(mins(x) - mins(pick.time)) < Math.abs(mins(b) - mins(pick.time)) ? x : b), TIMES[0]);
    return TIMES.map((x) => `<span class="tc ${x === near ? "sel" : ""}" data-t="${x}"><button type="button" class="tc-m" data-tstep="-15" aria-label="15 min earlier" tabindex="-1">−</button><b>${x === near ? pick.time : x}</b><button type="button" class="tc-p" data-tstep="15" aria-label="15 min later" tabindex="-1">+</button></span>`).join("");
  }

  let i = 0;
  const N = SC.length;
  function paint(dir = 1) {
    const sc = SC[i];
    try { if (utter) { speechSynthesis.cancel(); root.classList.remove("speaking"); utter = null; } if (rec) rec.abort(); } catch (e) {}
    root.dataset.scene = sc.id;
    root.querySelector(".ag-back").style.visibility = i > 0 && sc.id !== "run" ? "visible" : "hidden";
    isl.style.setProperty("--p", (i / (N - 1)).toFixed(3));
    const old = stage.firstElementChild;
    const page = document.createElement("div");
    page.className = "ag-page";
    page.style.setProperty("--dir", dir);
    page.innerHTML = sc.view();
    if (old) { old.classList.add("leave"); old.style.setProperty("--dir", dir); setTimeout(() => old.remove(), 260); }
    stage.appendChild(page);
    // The way out sits above the main button as a quiet second choice, so
    // the island up top has the whole bar to itself.
    const alt = sc.alt ? sc.alt() : L("Later", "Baad mein", "बाद में");
    foot.innerHTML = sc.id === "run" ? "" : `<button type="button" class="ag-ghost" data-alt>${alt}</button><button type="button" class="ag-cta" data-next>${sc.cta ? sc.cta() : L("Continue", "Aage", "आगे")} ${sc.id === "done" ? "" : IC.arrow}</button>`;
    island(sc.say(), sc.id === "run" ? "think" : "listen");
    timePicked = false;
    if (sc.id === "who") react(countLine(), true);
    if (sc.id === "baari") react(baariLine(), true);
    if (sc.id === "run") dryRun();
    if (sc.id === "me") wireEditor(page, pick.me, (st, tab) => { haptic(4); if (tab === "dice") react(L("Fresh face. Keep rolling or tweak it.", "Naya chehra. Aur ghumao ya badlo.", "नया चेहरा।"), false); else island(L("Looking good", "Badiya lag rahe ho", "बढ़िया लग रहे हो"), "said"); });
    if (sc.id === "done") wireInvite(page, { home: "Aapka", cook: pick.cook || "Sunita", T: L });
    if (sc.id === "done") { const r = root.querySelector(".ag-house").getBoundingClientRect(); setTimeout(() => burst(r.left + r.width / 2, r.top + 30, ["🍛", "🫓", "✨", "🪙"], 16), 300); haptic(20); }
  }
  const countLine = () => {
    const n = pick.members.length;
    return L(`${n} people. About ${n * 3} roti and ${(n * 0.25).toFixed(1)} kg of sabzi a day.`, `${n} log. Roz lagbhag ${n * 3} roti aur ${(n * 0.25).toFixed(1)} kg sabzi.`, `${n} लोग। रोज़ लगभग ${n * 3} रोटी और ${(n * 0.25).toFixed(1)} किलो सब्ज़ी।`);
  };
  const baariLine = () => {
    const r = inb(), names = r.map((k) => cap(nameOf(k)));
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${L("and", "aur", "और")} ${names[names.length - 1]}` : names[0];
    const out = people().filter((m) => !r.includes(m.k)).map((m) => nameFor(m.k));
    return L(`${list}: one turn every ${r.length} days.${out.length ? ` ${out.join(", ")} just eat.` : ""}`, `${list}: har ${r.length} din mein ek baari.${out.length ? ` ${out.join(", ")} bas khaayenge.` : ""}`, `${list}: हर ${r.length} दिन में एक बारी।`);
  };

  // ---- the dry run: the clock spins from 8:30 pm to 8:00 am and each step
  // of the night lands with the house's own names in it.
  async function dryRun() {
    const ring = inb(), d = pick.duty || ring[0];
    const n = pick.members.length;
    const D = cap(nameOf(d));
    const steps = [
      ["20:30", "telegram", pick.mode === "pick" ? L(`Two dishes to ${D}: Rajma chawal or Lauki dal`, `${D} ko do dishes: Rajma chawal ya Lauki dal`, `${D} को दो डिश: राजमा या लौकी दाल`) : L("Two dishes to everyone: Rajma chawal or Lauki dal", "Sabko do dishes: Rajma chawal ya Lauki dal", "सबको दो डिश")],
      ["21:30", "", pick.mode === "pick" ? L(`${D} picked Rajma chawal. No veto.`, `${D} ne Rajma chawal chuna. Koi veto nahi.`, `${D} ने राजमा चुना।`) : L(`Rajma chawal won. Food for ${n}.`, `Rajma chawal jeeta. ${n} log.`, `राजमा चावल जीता। ${n} लोग।`)],
      ["21:31", "pinelabs", L("Rajma ordered, ₹106, inside your limit", "Rajma mangaya, ₹106, limit ke andar", "राजमा मँगाया, ₹106")],
      ["06:40", "delhivery", L("Parcel at the door, 50 min early", "Parcel aa gaya, 50 min pehle", "पार्सल आ गया")],
      ["07:45", "gnani", L(`Voice note to ${pick.cook} ji, in ${pick.lang}`, `${pick.cook} ji ko ${pick.lang} mein voice note`, `${pick.cook} जी को वॉइस नोट`)],
      [pick.time.padStart(5, "0"), "", L("Lunch is on the stove", "Khana ban raha hai", "खाना बन रहा है")],
    ];
    const run = stage.querySelector("[data-run]"), ck = stage.querySelector("[data-ck]"), ap = stage.querySelector("[data-ckap]"), sky = stage.querySelector("[data-sky]");
    const logos = { telegram: "/img/brands/telegram.svg", pinelabs: "/img/brands/pinelabs.svg", delhivery: "/img/brands/delhivery.png", gnani: "/img/brands/gnani.svg" };
    let cur = mins("20:30");
    const show = (m) => { const h = Math.floor((m % 1440) / 60); ck.textContent = `${h % 12 || 12}:${String(m % 60).padStart(2, "0")}`; ap.textContent = h < 12 ? "AM" : "PM"; sky.style.setProperty("--t", Math.min(1, Math.max(0, ((m - 1200) % 1440) / 720)).toFixed(3)); };
    await wait(700);
    for (const [at, logo, text] of steps) {
      if (!root.isConnected || SC[i].id !== "run") return;
      let to = mins(at); if (to < 1200) to += 1440;
      const from = cur, t0 = performance.now(), dur = Math.min(900, 120 + (to - from) * 2.2);
      await new Promise((ok) => { const f = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); show(Math.round(from + (to - from) * e)); if (p < 1 && !reduce) requestAnimationFrame(f); else { show(to); ok(); } }; requestAnimationFrame(f); });
      cur = to;
      run.insertAdjacentHTML("beforeend", `<li class="thinking"><span class="ag-rt">${ck.textContent}</span><span class="ag-rx t-shimmer">${esc(text)}</span>${logo ? `<img src="${logos[logo]}" alt="">` : ""}<i class="ag-rc">${IC.check}</i></li>`);
      const li = run.lastElementChild;
      island(text, "think");
      await wait(560);
      li.classList.remove("thinking"); li.querySelector(".ag-rx").classList.remove("t-shimmer");
      haptic(6);
      await wait(260);
    }
    island(L("That's a night", "Bas, itni si raat", "बस, इतनी सी रात"), "said");
    await wait(900);
    if (root.isConnected && SC[i].id === "run") { i++; paint(1); }
  }

  // ---- reading the room
  // The cook's voice note, read out by the phone's own Hindi voice. The
  // utterance is kept on the closure: Safari drops one that gets collected
  // mid-sentence.
  let utter = null;
  function speak() {
    const b = stage.querySelector("[data-speak]");
    if (!("speechSynthesis" in window)) { b.classList.add("nope"); react(L("This phone can't read aloud here. On Telegram she gets a real voice note.", "Ye phone yahan bol nahi sakta. Telegram pe asli voice note jaata hai.", "ये फ़ोन यहाँ बोल नहीं सकता।")); return; }
    const done = () => { root.classList.remove("speaking"); b.innerHTML = IC.play; utter = null; island(L("Listening", "Sun raha hoon", "सुन रहा हूँ")); };
    if (utter) { speechSynthesis.cancel(); done(); return; }
    speechSynthesis.cancel();
    const u = (utter = new SpeechSynthesisUtterance(stage.querySelector("[data-note]").textContent));
    u.lang = "hi-IN"; u.rate = 0.92;
    const vs = speechSynthesis.getVoices();
    const v = vs.find((x) => /hi[-_]IN/i.test(x.lang) && /google|lekha|neural|premium|enhanced/i.test(x.name)) || vs.find((x) => /hi[-_]IN/i.test(x.lang));
    if (v) u.voice = v;
    root.classList.add("speaking"); b.innerHTML = IC.stop;
    u.onend = u.onerror = done;
    speechSynthesis.speak(u);
    // Some Androids queue it paused.
    setTimeout(() => { if (speechSynthesis.paused) speechSynthesis.resume(); }, 120);
    island(L("Speaking", "Bol raha hoon", "बोल रहा हूँ"), "busy");
    haptic(6);
  }
  if ("speechSynthesis" in window) { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices()); }
  root.addEventListener("click", (e) => {
    const t = e.target, q = (s) => t.closest(s);
    let el;
    if (q(".ag-back")) { if (i > 0) { i--; if (SC[i].id === "run") i--; paint(-1); haptic(4); } return; }
    if (q("[data-alt]")) { finish(); return; }
    if (q("[data-next]")) { next(); return; }
    if ((el = q("[data-ui]"))) {
      pick.ui = el.dataset.ui; haptic(6);
      store.set("baari:setup", pick);
      const keep = i; i = keep; paint(0);
      return;
    }
    if ((el = q("[data-mstep]"))) {
      const b = el.dataset.mk, n = count(b) + +el.dataset.mstep;
      if (n > 6) { bump(el); return; }
      setCount(b, n); haptic(5);
      react(countLine());
      return;
    }
    if ((el = q("[data-m]"))) {
      const k = el.dataset.m, has = count(k) > 0;
      if (k === "main") { bump(el.parentElement); react(L("You're always in. It's your home.", "Aap toh hamesha ho. Aapka ghar hai.", "आप तो हमेशा हो।")); return; }
      setCount(k, has ? 0 : 1); haptic(5);
      react(countLine());
      return;
    }
    if ((el = q("[data-mode]"))) {
      pick.mode = el.dataset.mode; stage.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === el)); bump(el); haptic(6);
      react(pick.mode === "pick" ? L("One person decides each day. Fewer pings, faster nights.", "Roz ek insaan tay karega. Kam message, jaldi faisla.", "रोज़ एक तय करेगा।") : L("Everyone votes. I'll count, and keep who picked what private.", "Sab vote karenge. Main ginunga, kisne kya chuna private rahega.", "सब वोट करेंगे।"));
      return;
    }
    if ((el = q("[data-inb]"))) {
      const k = el.dataset.inb, r = new Set(inb());
      if (r.has(k) && r.size <= 1) { bump(el); return; }
      r.has(k) ? r.delete(k) : r.add(k);
      pick.inb = [...r]; if (!r.has(pick.duty)) pick.duty = null;
      el.classList.toggle("on", r.has(k)); bump(el); haptic(5);
      react(baariLine());
      return;
    }
    if (q("[data-spin]")) { spin(); return; }
    if ((el = q("[data-rc]"))) {
      rcat = el.dataset.rc;
      stage.querySelectorAll("[data-rc]").forEach((x) => x.setAttribute("aria-selected", String(x === el)));
      const box = stage.querySelector(".ag-chips");
      box.dataset.rcat = rcat;
      box.querySelectorAll(".ag-chip").forEach((c, j) => { c.style.animation = "none"; void c.offsetWidth; c.style.animation = ""; c.style.animationDelay = `${j * 18}ms`; });
      el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
      haptic(4);
      return;
    }
    if ((el = q("[data-r]"))) {
      const k = el.dataset.r, has = pick.rules.includes(k);
      pick.rules = has ? pick.rules.filter((x) => x !== k) : [...pick.rules, k];
      el.classList.toggle("on", !has); haptic(5);
      const c = RULES.find((r) => r.k === k).c, n = stage.querySelector(`[data-rcn="${c}"]`);
      if (n) n.textContent = RULES.filter((r) => r.c === c && pick.rules.includes(r.k)).length || "";
      if (!has) react(L(`Understood: ${lbl(RULES.find((r) => r.k === k)).toLowerCase()}. Even if the vote says otherwise.`, `Samjha: ${lbl(RULES.find((r) => r.k === k)).toLowerCase()}. Vote kuch bhi kahe.`, `समझा: ${lbl(RULES.find((r) => r.k === k))}।`));
      return;
    }
    if ((el = q("[data-own]"))) { pick.custom.splice(+el.dataset.own, 1); el.remove(); haptic(5); return; }
    if (q("[data-ownok]")) { addOwn(); return; }
    if ((el = q("[data-mic]"))) { listen(el); return; }
    if ((el = q("[data-tstep]"))) {
      e.stopPropagation();
      pick.time = hm(Math.max(mins("5:00"), Math.min(mins("11:45"), mins(pick.time) + +el.dataset.tstep)));
      const b = el.parentElement.querySelector("b");
      b.textContent = pick.time; b.classList.remove("tick-up", "tick-down"); void b.offsetWidth; b.classList.add(+el.dataset.tstep > 0 ? "tick-up" : "tick-down");
      haptic(4); updNote();
      return;
    }
    if ((el = q("[data-t]"))) {
      const row = el.parentElement;
      if (timePicked && el.classList.contains("sel")) { timePicked = false; row.classList.remove("picked"); haptic(4); requestAnimationFrame(() => el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" })); return; }
      row.querySelectorAll(".tc").forEach((x) => { x.classList.toggle("sel", x === el); x.querySelector("b").textContent = x.dataset.t; });
      pick.time = el.dataset.t; timePicked = true;
      row.classList.add("picked"); row.scrollTo({ left: 0, behavior: reduce ? "auto" : "smooth" });
      haptic(6); updNote();
      react(L(`${pick.time} it is. The note goes at 7:45 so she can plan.`, `${pick.time} pakka. Note 7:45 pe jayega, taaki woh plan kar sakein.`, `${pick.time} पक्का।`), false);
      return;
    }
    if ((el = q("[data-clang]"))) { pick.lang = el.dataset.clang; stage.querySelectorAll("[data-clang]").forEach((x) => x.classList.toggle("on", x === el)); el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" }); haptic(4); react(L(`Notes in ${pick.lang}. She never needs to read.`, `${pick.lang} mein note. Unhe padhna nahi padega.`, `${pick.lang} में नोट।`), false); return; }
    if (q("[data-speak]")) { speak(); return; }
  });
  root.addEventListener("input", (e) => { if (e.target.matches("[data-cook]")) { pick.cook = e.target.value.trim() || "Sunita"; updNote(); } });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-owntext]")) addOwn(); });
  const bump = (el) => { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); };
  const updNote = () => { const n = stage.querySelector("[data-note]"); if (n) { n.textContent = noteText(); } island(L("Writing a note", "Note likh raha hoon", "नोट लिख रहा हूँ"), "busy"); clearTimeout(updNote.t); updNote.t = setTimeout(() => island(L("Listening", "Sun raha hoon", "सुन रहा हूँ")), 900); };
  function addOwn() {
    const inp = stage.querySelector("[data-owntext]"), v = inp.value.trim();
    if (!v) { inp.focus(); return; }
    pick.custom.push(v);
    inp.value = "";
    stage.querySelector(".ag-chips").insertAdjacentHTML("beforeend", `<button type="button" class="ag-chip on own bump" data-own="${pick.custom.length - 1}"><i>${IC.check}</i>${esc(v)}</button>`);
    react(L(`Understood: "${esc(v)}". Every day, every plate.`, `Samjha: "${esc(v)}". Har din, har thali.`, `समझा: "${esc(v)}"।`));
  }
  // Say a rule out loud. Words appear in the box as you speak; when you stop,
  // it becomes a chip. Where the browser can't listen, the keyboard's own
  // mic still can, so we open the keyboard and say so.
  let rec = null;
  function listen(btn) {
    const inp = stage.querySelector("[data-owntext]");
    if (rec) { rec.stop(); return; }
    if (!MIC_OK) { inp.focus(); react(L("Tap the mic on your keyboard and say it.", "Keyboard ke mic ko tap karke bolo.", "कीबोर्ड के माइक को टैप करके बोलो।")); return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new R();
    rec.lang = pick.ui === "en" ? "en-IN" : "hi-IN";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let heard = "", failed = "";
    btn.classList.add("rec"); root.classList.add("hearing");
    island(L("Listening", "Sun raha hoon", "सुन रहा हूँ"), "busy");
    rec.onresult = (ev) => { heard = [...ev.results].map((r) => r[0].transcript).join(" ").trim(); inp.value = heard; };
    rec.onerror = (ev) => { failed = ev.error; };
    rec.onend = () => {
      rec = null; btn.classList.remove("rec"); root.classList.remove("hearing");
      if (heard) { addOwn(); return; }
      if (failed === "not-allowed" || failed === "service-not-allowed") { inp.focus(); react(L("I can't use the mic here. Your keyboard's mic works too.", "Yahan mic nahi chal raha. Keyboard ka mic bhi chalega.", "यहाँ माइक नहीं चल रहा। कीबोर्ड का माइक चलेगा।")); return; }
      island(failed ? L("Didn't catch that", "Sunai nahi diya", "सुनाई नहीं दिया") : L("Listening", "Sun raha hoon", "सुन रहा हूँ"), failed ? "said" : "listen");
    };
    try { rec.start(); haptic(8); } catch (err) { rec = null; btn.classList.remove("rec"); root.classList.remove("hearing"); inp.focus(); }
  }

  // The coin spins round the people in the baari and lands on one, with a
  // tick as it passes each face.
  let spinning = false;
  async function spin() {
    if (spinning) return;
    spinning = true;
    const ring = inb(), btn = stage.querySelector("[data-spin]");
    const win = Math.floor(Math.random() * ring.length);
    const prev = parseFloat(btn.style.getPropertyValue("--rot")) || 0;
    const turns = 3 * 360 + (360 / ring.length) * win;
    const target = prev - (prev % 360) + turns;
    btn.classList.add("going");
    btn.style.setProperty("--rot", `${target}deg`);
    island(L("Spinning", "Ghuma raha hoon", "घुमा रहा हूँ"), "busy");
    const seats = stage.querySelectorAll(".ag-seat");
    for (let k = 0, steps = ring.length * 3 + win; k <= steps; k++) {
      seats.forEach((s, j) => s.classList.toggle("pass", j === k % ring.length));
      haptic(3);
      await wait(60 + Math.pow(k / steps, 3) * 260);
    }
    btn.classList.remove("going");
    pick.duty = ring[win];
    seats.forEach((s, j) => { s.classList.remove("pass"); s.classList.toggle("on", j === win); });
    haptic(18);
    const r = seats[win].getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, ["🪙", "✨"], 10);
    react(L(`${cap(nameOf(pick.duty))} goes first. Tomorrow it moves on.`, `Pehli baari ${nameOf(pick.duty)} ki. Kal aage badhegi.`, `पहली बारी ${nameOf(pick.duty)} की।`));
    spinning = false;
  }

  function next() {
    const sc = SC[i];
    if (sc.id === "spin" && !pick.duty) { spin(); return; }
    store.set("baari:setup", { ...pick, inb: inb() });
    if (sc.id === "done") { finish(); return; }
    i = Math.min(N - 1, i + 1);
    haptic(6);
    paint(1);
  }
  async function finish() {
    const langChanged = ui0 !== pick.ui;
    try { speechSynthesis.cancel(); rec && rec.abort(); } catch (e) {}
    store.set("baari:onboarded", true);
    store.set("baari:setup", { ...pick, inb: inb(), duty: pick.duty || inb()[0] });
    root.classList.add("is-out");
    await wait(420);
    if (qs.has("onboard") || langChanged) { location.replace("/"); return; }
    root.remove();
    document.documentElement.classList.remove("ob-open");
    onDone && onDone();
  }
  paint(1);
}
