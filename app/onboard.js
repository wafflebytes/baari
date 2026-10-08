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
// The rules page is a picture of the kitchen, not a list. The house's diet,
// then whose plate, then a grid of things that tap from fine to less to
// never. Days and fasts sit under it, and anything else can be said out loud.
const DIETS = [
  { k: "veg", e: "🥦", l: ["Vegetarian", "Shakahari", "शाकाहारी"] },
  { k: "egg", e: "🥚", l: ["Eggs okay", "Anda chalta", "अंडा चलता"] },
  { k: "nonveg", e: "🍗", l: ["Non-veg too", "Non-veg bhi", "नॉन-वेज भी"] },
];
const ROOTS = ["aloo", "pyaaz", "lehsun"];
const FOODS = [
  { k: "aloo", e: "🥔", l: ["Potato", "Aloo", "आलू"], w: ["aloo", "potato", "batata", "आलू"] },
  { k: "pyaaz", e: "🧅", l: ["Onion", "Pyaaz", "प्याज़"], w: ["pyaaz", "pyaz", "onion", "kanda", "प्याज", "प्याज़"] },
  { k: "lehsun", e: "🧄", l: ["Garlic", "Lehsun", "लहसुन"], w: ["lehsun", "lahsun", "garlic", "लहसुन"] },
  { k: "teekha", e: "🌶️", l: ["Spice", "Teekha", "तीखा"], w: ["teekha", "tikha", "mirchi", "spicy", "spice", "तीखा", "मिर्च"] },
  { k: "tel", e: "🫗", l: ["Oil", "Tel", "तेल"], w: ["tel", "oil", "ghee", "तेल"] },
  { k: "namak", e: "🧂", l: ["Salt", "Namak", "नमक"], w: ["namak", "salt", "नमक"] },
  { k: "meetha", e: "🍬", l: ["Sugar", "Meetha", "मीठा"], w: ["meetha", "mitha", "cheeni", "sugar", "sweet", "मीठा", "चीनी"] },
  { k: "moong", e: "🥜", l: ["Peanuts", "Moongphali", "मूँगफली"], w: ["moongphali", "mungfali", "peanut", "peanuts", "मूँगफली", "मूंगफली"], hard: 1 },
  { k: "paneer", e: "🧀", l: ["Paneer", "Paneer", "पनीर"], w: ["paneer", "पनीर"] },
  { k: "doodh", e: "🥛", l: ["Dairy", "Doodh", "दूध"], w: ["doodh", "milk", "dairy", "dahi", "दूध"] },
  { k: "baingan", e: "🍆", l: ["Brinjal", "Baingan", "बैंगन"], w: ["baingan", "brinjal", "eggplant", "बैंगन"], hard: 1 },
  { k: "mushroom", e: "🍄", l: ["Mushroom", "Mushroom", "मशरूम"], w: ["mushroom", "मशरूम"], hard: 1 },
];
const WEEK = [
  { k: "mon", l: ["Mon", "Som", "सोम"], w: ["monday", "somvaar", "somvar", "सोमवार"] },
  { k: "tue", l: ["Tue", "Mangal", "मंगल"], w: ["tuesday", "mangalvaar", "mangalvar", "mangal", "मंगलवार", "मंगल"] },
  { k: "wed", l: ["Wed", "Budh", "बुध"], w: ["wednesday", "budhvaar", "budhvar", "बुधवार"] },
  { k: "thu", l: ["Thu", "Guru", "गुरु"], w: ["thursday", "guruvaar", "guruvar", "veervaar", "गुरुवार"] },
  { k: "fri", l: ["Fri", "Shukr", "शुक्र"], w: ["friday", "shukravaar", "shukravar", "शुक्रवार"] },
  { k: "sat", l: ["Sat", "Shani", "शनि"], w: ["saturday", "shanivaar", "shanivar", "शनिवार"] },
  { k: "sun", l: ["Sun", "Ravi", "रवि"], w: ["sunday", "ravivaar", "itvaar", "रविवार"] },
];
const VRATS = [
  { k: "navratri", e: "🪔", l: ["Navratri", "Navratri", "नवरात्रि"], w: ["navratri", "navratra", "नवरात्रि"] },
  { k: "ekadashi", e: "🌙", l: ["Ekadashi", "Ekadashi", "एकादशी"], w: ["ekadashi", "gyaras", "एकादशी"] },
  { k: "sawan", e: "🌧️", l: ["Sawan Mondays", "Sawan ke Somvaar", "सावन के सोमवार"], w: ["sawan", "shravan", "सावन"] },
  { k: "paryushan", e: "🙏", l: ["Paryushan", "Paryushan", "पर्युषण"], w: ["paryushan", "पर्युषण"] },
  { k: "chhath", e: "🌅", l: ["Chhath", "Chhath", "छठ"], w: ["chhath", "छठ"] },
];
const LANGS = ["Hindi", "Marathi", "Bangla", "Tamil", "Kannada", "Telugu"];
const LNAT = { Hindi: "हिंदी", Marathi: "मराठी", Bangla: "বাংলা", Tamil: "தமிழ்", Kannada: "ಕನ್ನಡ", Telugu: "తెలుగు" };
const LCODE = { Hindi: "hi", Marathi: "mr", Bangla: "bn", Tamil: "ta", Kannada: "kn", Telugu: "te" };
// What the sample note says, for whoever is setting this up. The clips in
// /audio are real Gnani voices, made once from the same text in each language.
const GLOSS = {
  en: "Didi, namaste. Tomorrow's lunch is rajma chawal, for four. The rajma and tomatoes reach the door in the morning. No potato on one plate. See you at eight. Thank you!",
  hing: "Didi, namaste. Kal dopahar rajma chawal, chaar logon ke liye. Rajma aur tamatar subah darwaaze pe aa jayenge. Ek thali mein aloo nahi. Aath baje milte hain. Dhanyavaad!",
  hi: "दीदी, नमस्ते। कल दोपहर राजमा चावल, चार लोगों के लिए। राजमा और टमाटर सुबह दरवाज़े पर आ जाएँगे। एक थाली में आलू नहीं। आठ बजे मिलते हैं।",
};
const TIMES = ["6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00"];
const DISH_IMG = ["rajma", "palak-paneer", "kadhi", "aloo-puri", "lauki-chana-dal", "egg-bhurji"];
const mins = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const hm = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
const MIC_OK = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const SVG = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const IC = {
  arrow: mx("arrow-right", true), back: mx("arrow-left"), check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>', mic: mx("microphone-2", true),
  play: mx("play", true), stop: mx("stop", true), pause: mx("pause", true), lang: mx("translate"), down: mx("arrow-down"),
};

export function needsOnboarding() {
  if (qs.has("onboard")) return true;
  if (qs.has("fixture") || qs.has("skip")) return false;
  return !store.get("baari:onboarded");
}

export function onboard({ onDone } = {}) {
  const pick = {
    ui: "hing", members: ["main", "mummy", "papa"], me: { who: "main", look: { ...LOOKS.main }, tint: "sand" }, mode: "pick", inb: null, duty: null,
    diet: "veg", jain: false, avoid: { papa: { aloo: 2 } }, nv: ["tue"], vrat: ["navratri"], cook: "Sunita", time: "8:00", lang: "Hindi",
    ...(store.get("baari:setup") || {}),
  };
  // Older setups kept typed rules in custom; now custom is the read-back
  // (what the app shows) and own is only what was typed or said.
  if (!Array.isArray(pick.own)) pick.own = Array.isArray(pick.custom) ? pick.custom : [];
  if (!pick.avoid || typeof pick.avoid !== "object") pick.avoid = {};
  pick.nv = pick.nv || []; pick.vrat = pick.vrat || [];
  if (!LANGS.includes(pick.lang)) pick.lang = "Hindi";
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
  let scope = "all";

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
  // The island drops in once. After that "born" keeps the entrance from
  // replaying every time a state class comes and goes.
  let mood = "", born = false;
  setTimeout(() => { born = true; isl.classList.add("born"); }, 760);
  function island(text, state = "listen") {
    isl.className = `ag-isl ${born ? "born " : ""}${state}`;
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
    setTimeout(() => { if (my === thinkT) island(L("Listening", "Sun rahi hoon", "सुन रही हूँ"), "listen"); }, 1600);
  }
  // Baari's lines arrive word by word through a soft blur (streaming text).
  const stream = (text, cls = "", tag = "h1") => `<${tag} class="ag-q ${cls}">${String(text).replace(/<br>/g, cls.includes("big") ? "<br>" : " ").split(/(<br>| )/).filter((w) => w && w !== " ").map((w, i) => (w === "<br>" ? "<br>" : `<span style="--w:${i}">${w}</span>`)).join(" ")}</${tag}>`;

  // ---- scenes
  const SC = [
    { id: "hello", say: () => L("Namaste", "Namaste", "नमस्ते"), view: () => `
        <div class="ag-orbit" aria-hidden="true"><div class="ag-ringd">${DISH_IMG.map((f, i) => `<span style="--a:${i * 60}deg"><img src="/img/dishes/${f}.webp" alt=""></span>`).join("")}</div><span class="ag-coin"><img src="/img/baari-mark.png" alt=""></span></div>
        ${stream(L("Tomorrow's lunch,<br>sorted tonight.", "Kal ka khana,<br>aaj raat tay.", "कल का खाना,<br>आज रात तय।"), "big")}
        <p class="ag-sub">${L("I ask the family, order what's missing and tell your cook in her language. You just tap.", "Main family se poochti hoon, jo kam hai mangati hoon aur cook ko unki bhasha mein batati hoon. Aap bas tap karo.", "मैं परिवार से पूछती हूँ, जो कम है मँगाती हूँ और कुक को उनकी भाषा में बताती हूँ।")}</p>
        <p class="ag-ask">${L("Which language should we talk in?", "Kis bhasha mein baat karein?", "किस भाषा में बात करें?")}</p>
        <label class="ag-lsel"><span class="ag-li">${IC.lang}</span><select data-uisel aria-label="${L("Language", "Bhasha", "भाषा")}">${[["hing", "Hinglish"], ["en", "English"], ["hi", "हिंदी"]].map(([k, l]) => `<option value="${k}" ${pick.ui === k ? "selected" : ""}>${l}</option>`).join("")}</select><span class="ag-lc">${IC.down}</span></label>`,
      cta: () => L("Set up my home", "Ghar set karo", "घर सेट करो"), alt: () => L("Just look around first", "Pehle bas dekhna hai", "पहले बस देखना है") },
    { id: "who", say: () => L("Counting", "Gin rahi hoon", "गिन रही हूँ"), view: () => `
        ${stream(L("Who's in the family?", "Ghar mein<br>kaun kaun hai?", "घर में<br>कौन कौन है?"))}
        <p class="ag-sub">${L("Tap everyone at home. I plan the cooking and the shopping around them. Two sons? Tap, then +.", "Ghar mein sabko tap karo. Khaana aur saamaan inke hisaab se. Do bete? Tap, phir +.", "घर में सबको टैप करो। खाना और सामान इनके हिसाब से। दो बेटे? टैप, फिर +।")}</p>
        <div class="ag-grid">${MEMBERS.map(tile).join("")}</div>
        <p class="ag-react"></p>` },
    { id: "me", say: () => L("Looking at you", "Aapko dekh rahi hoon", "आपको देख रही हूँ"), view: () => `
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
    { id: "rules", say: () => L("Listening", "Sun rahi hoon", "सुन रही हूँ"), view: () => rulesView() },
    { id: "cook", say: () => L("Meeting your cook", "Cook se milte hain", "कुक से मिलते हैं"), view: () => `
        ${stream(L("Who cooks?", "Khana kaun<br>banata hai?", "खाना कौन<br>बनाता है?"))}
        <p class="ag-sub">${L("She might speak a few languages. Pick the one she understands best, and every note comes in that.", "Shayad woh kai bhashayein bolti hain. Jo sabse achhi samajhti hain, woh chuno. Har note usi mein aayega.", "शायद वो कई भाषाएँ बोलती हैं। जो सबसे अच्छी समझती हैं, वो चुनो।")}</p>
        <div class="ag-cook">
          <label class="ag-name"><span class="av t-mint">👩🏽‍🍳</span><input data-cook value="${esc(pick.cook)}" maxlength="20" autocomplete="off" enterkeyhint="done" aria-label="${L("Her name", "Unka naam", "उनका नाम")}"><small>${L("ji", "ji", "जी")}</small></label>
          <div class="ag-row"><span>${L("Comes at", "Aati hain", "आती हैं")}</span><div class="tp-row" data-times data-nopull>${times()}</div></div>
          <div class="ag-row"><span>${L("Understands best", "Sabse achhi samajhti hain", "सबसे अच्छी समझती हैं")}</span><div class="ag-seg" data-nopull>${LANGS.map((x) => `<button type="button" class="${pick.lang === x ? "on" : ""}" data-clang="${x}" lang="${LCODE[x]}">${LNAT[x]}</button>`).join("")}</div></div>
        </div>` },
    { id: "voice", say: () => L("A sample note", "Ek sample note", "एक नमूना नोट"), view: () => `
        ${stream(L("This is how it could<br>sound to her.", "Unhe kuch aisa<br>sunai dega.", "उन्हें कुछ ऐसा<br>सुनाई देगा।"))}
        <p class="ag-sub">${L(`Every morning at 7:45, a voice note on her phone in ${pick.lang}. Nothing to read.`, `Roz subah 7:45, unke phone pe ${pick.lang} mein voice note. Padhna kuch nahi.`, `रोज़ सुबह 7:45, उनके फ़ोन पर ${LNAT[pick.lang]} में वॉइस नोट।`)}</p>
        <div class="vk" data-vk>
          <div class="vk-h"><span class="av t-mint">👩🏽‍🍳</span><div><b>${esc(pick.cook)} ${L("ji", "ji", "जी")}</b><small>${L("Voice note · 7:45 am", "Voice note · subah 7:45", "वॉइस नोट · सुबह 7:45")}</small></div><img src="/img/brands/gnani.svg" alt="Gnani"></div>
          <p class="vk-ly" data-ly></p>
          <p class="vk-gl" data-gl></p>
          <div class="vk-bar"><button type="button" class="vk-play" data-vplay aria-label="${L("Play", "Chalao", "चलाओ")}">${IC.play}</button><span class="vk-wave" aria-hidden="true">${Array.from({ length: 34 }, (_, j) => `<i style="--h:${22 + Math.round(Math.abs(Math.sin(j * 1.7) * 60 + Math.cos(j * 0.6) * 18))}%"></i>`).join("")}</span><small class="vk-t" data-vt>0:00</small></div>
        </div>
        <div class="vk-langs" data-nopull>${LANGS.map((x) => `<button type="button" class="${x === pick.lang ? "on" : ""}" data-vlang="${x}" lang="${LCODE[x]}">${LNAT[x]}</button>`).join("")}</div>
        <p class="vk-fine">${L("A sample in Gnani's voice. The real note has tomorrow's dish, her time and your family's rules.", "Gnani ki awaaz mein ek sample. Asli note mein kal ki dish, unka time aur aapke niyam honge.", "ग्नानी की आवाज़ में एक नमूना। असली नोट में कल की डिश और आपके नियम होंगे।")}</p>` },
    { id: "run", say: () => L("Running tonight", "Aaj raat chala rahi hoon", "आज रात चला रही हूँ"), view: () => `
        ${stream(L("Let me run tonight once,<br>so you can see.", "Ek baar aaj raat<br>chala ke dikhata hoon.", "एक बार आज रात<br>चला के दिखाता हूँ।"))}
        <div class="ag-clock"><span class="ag-ck" data-ck>8:30</span><small data-ckap>PM</small><i class="ag-sky" data-sky></i></div>
        <ol class="ag-run" data-run></ol>` },
    { id: "done", say: () => L("Your home is ready", "Ghar taiyaar", "घर तैयार"), view: () => {
        const ring = inb();
        const d = pick.duty || ring[0];
        return `<div class="ag-house">
          <p class="ag-hk"><img src="/img/baari-mark.png" alt="">${L("Your home", "Aapka ghar", "आपका घर")}</p>
          <div class="ag-hf">${people().map((m, i) => `<span class="ag-hp ${ring.includes(m.k) ? "" : "out"}" style="--i:${i}">${faceOf(m.k, "sm")}${m.k === d ? '<i class="ag-hc"><img src="/img/baari-mark.png" alt=""></i>' : ""}</span>`).join("")}</div>
          <dl><div><dt>${L("First baari", "Pehli baari", "पहली बारी")}</dt><dd>${esc(cap(nameOf(d)))}</dd></div><div><dt>${L("Rules", "Niyam", "नियम")}</dt><dd>${lines().length}</dd></div><div><dt>${esc(pick.cook)}</dt><dd>${pick.time} · ${pick.lang}</dd></div></dl>
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
    stopVoice();
    try { if (rec) rec.abort(); } catch (e) {}
    root.dataset.scene = sc.id;
    root.querySelector(".ag-back").style.visibility = i > 0 && sc.id !== "run" ? "visible" : "hidden";
    isl.style.setProperty("--p", (i / (N - 1)).toFixed(3));
    const old = stage.firstElementChild;
    const page = document.createElement("div");
    page.className = "ag-page";
    page.style.setProperty("--dir", dir);
    page.innerHTML = sc.view();
    if (old) { old.classList.add("leave"); old.style.setProperty("--dir", dir); setTimeout(() => old.remove(), 300); }
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
    if (sc.id === "voice") loadVoice(dir > 0);
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

  // ---- the rules page
  const FL = (f) => f.l[["en", "hing", "hi"].indexOf(pick.ui)];
  const food = (k) => FOODS.find((f) => f.k === k);
  const level = (who, k) => (pick.jain && ROOTS.includes(k) ? 2 : (pick.avoid[who] || {})[k] || 0);
  const scoped = (who) => Object.values(pick.avoid[who] || {}).filter(Boolean).length;
  function rulesView() {
    return `${stream(L("What goes on<br>each plate?", "Kiski thali mein<br>kya chalega?", "किसकी थाली में<br>क्या चलेगा?"))}
      <p class="ag-sub">${L("Tap, don't type. I'll never break these, whatever the vote says.", "Tap karo, likhna nahi. Vote kuch bhi kahe, main ye nahi todunga.", "टैप करो, लिखना नहीं। वोट कुछ भी कहे, मैं ये नहीं तोड़ूँगा।")}</p>
      <div class="rl-diet" role="radiogroup" data-rdiet>${dietRow()}</div>
      <div class="rl-box">
        <div class="rl-who" data-nopull data-rwho>${whoRow()}</div>
        <div class="rl-foods" data-rfoods>${foodTiles()}</div>
        <p class="rl-leg"><span><i class="k1"></i>${L("1 tap: less", "1 tap: kam", "1 टैप: कम")}</span><span><i class="k2"></i>${L("2 taps: never", "2 tap: bilkul nahi", "2 टैप: बिल्कुल नहीं")}</span></p>
      </div>
      <div class="rl-days" data-rdays ${pick.diet === "veg" ? "hidden" : ""}><p class="rl-k">${L("No non-veg on", "Non-veg nahi", "नॉन-वेज नहीं")}</p><div class="rl-wk">${WEEK.map((d) => `<button type="button" class="${pick.nv.includes(d.k) ? "on" : ""}" data-day="${d.k}" aria-pressed="${pick.nv.includes(d.k)}">${FL(d)}</button>`).join("")}</div></div>
      <div class="rl-vrat"><p class="rl-k">${L("Fasts the house keeps", "Ghar ke vrat", "घर के व्रत")} <small>${L("pick any", "jitne bhi", "जितने भी")}</small></p><div class="rl-vc" data-nopull>${VRATS.map((v) => `<button type="button" class="${pick.vrat.includes(v.k) ? "on" : ""}" data-vrat="${v.k}" aria-pressed="${pick.vrat.includes(v.k)}"><span>${v.e}</span>${FL(v)}<i>${IC.check}</i></button>`).join("")}</div></div>
      <div class="ag-own"><input data-owntext placeholder="${L("Or just say it: less salt for Papa", "Ya bas bolo: Papa ko namak kam", "या बस बोलो: पापा को नमक कम")}" maxlength="80" enterkeyhint="done" autocomplete="off"><button type="button" class="ag-mic" data-mic aria-label="${L("Speak", "Bolo", "बोलो")}">${IC.mic}</button><button type="button" class="ag-ok" data-ownok aria-label="Add">${IC.check}</button></div>
      <div class="rl-read" data-read>${readBack()}</div>`;
  }
  const dietRow = () => DIETS.map((d) => `<button type="button" role="radio" aria-checked="${pick.diet === d.k}" class="rl-d ${pick.diet === d.k ? "on" : ""} ${pick.jain && d.k !== "veg" ? "dim" : ""}" data-diet="${d.k}"><span>${d.e}</span><b>${FL(d)}</b></button>`).join("")
    + `<button type="button" class="rl-d rl-jain ${pick.jain ? "on" : ""}" data-jain aria-pressed="${pick.jain}"><span>🙏</span><b>Jain</b></button>`;
  const whoRow = () => `<button type="button" class="rl-p ${scope === "all" ? "on" : ""}" data-scope="all"><span class="rl-all">${people().slice(0, 3).map((m) => faceOf(m.k, "xs")).join("")}</span><b>${L("Everyone", "Sabki", "सबकी")}</b>${scoped("all") ? `<i>${scoped("all")}</i>` : ""}</button>`
    + people().map((m) => `<button type="button" class="rl-p ${scope === m.k ? "on" : ""}" data-scope="${m.k}">${faceOf(m.k, "xs")}<b>${m.k === "main" ? L("Me", "Main", "मैं") : esc(nameFor(m.k))}</b>${scoped(m.k) ? `<i>${scoped(m.k)}</i>` : ""}</button>`).join("");
  const foodTiles = () => FOODS.map((f) => {
    const v = level(scope, f.k), lock = pick.jain && ROOTS.includes(f.k), all = scope !== "all" && level("all", f.k);
    return `<button type="button" class="rl-f l${v} ${lock ? "lock" : ""}" data-food="${f.k}" aria-label="${FL(f)}"><span class="rl-fe">${f.e}</span><b>${FL(f)}</b><i class="rl-ft">${v === 1 ? L("Less", "Kam", "कम") : v === 2 ? (lock ? "Jain" : L("Never", "Nahi", "नहीं")) : all ? L("All", "Sab", "सब") : ""}</i></button>`;
  }).join("");
  const listOf = (xs) => xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ${L("and", "aur", "और")} ${xs[xs.length - 1]}` : xs[0] || "";
  // Everything Baari understood, as sentences. These are what the app's rules
  // sheet shows later, so they're saved as custom.
  function lines() {
    const out = [], d = DIETS.find((x) => x.k === pick.diet) || DIETS[0];
    out.push(pick.jain ? ["🙏", L("Jain kitchen: vegetarian, nothing from under the ground", "Jain rasoi: shakahari, zameen ke neeche ka kuch nahi", "जैन रसोई: शाकाहारी, ज़मीकंद नहीं")]
      : [d.e, d.k === "veg" ? L("Vegetarian home", "Poora shakahari ghar", "पूरा शाकाहारी घर") : d.k === "egg" ? L("Vegetarian, eggs are fine", "Shakahari, anda chalta hai", "शाकाहारी, अंडा चलता है") : L("Non-veg is fine", "Non-veg chalta hai", "नॉन-वेज चलता है")]);
    for (const who of ["all", ...pick.members]) {
      const m = pick.avoid[who] || {}, no = [], less = [];
      for (const f of FOODS) { if (pick.jain && ROOTS.includes(f.k)) continue; if (m[f.k] === 2) no.push(f); else if (m[f.k] === 1) less.push(f); }
      if (!no.length && !less.length) continue;
      const nm = who === "all" ? L("Everyone", "Sabki thali", "सबकी थाली") : who === "main" ? L("Me", "Meri thali", "मेरी थाली") : cap(nameFor(who));
      const parts = [];
      if (no.length) parts.push(`${listOf(no.map((f) => FL(f).toLowerCase()))} ${L("never", "nahi", "नहीं")}`);
      if (less.length) parts.push(`${listOf(less.map((f) => FL(f).toLowerCase()))} ${L("less", "kam", "कम")}`);
      out.push([(no[0] || less[0]).e, `${nm}: ${parts.join(", ")}`]);
    }
    if (pick.diet !== "veg" && pick.nv.length) { const ds = WEEK.filter((d) => pick.nv.includes(d.k)).map(FL); out.push(["🗓️", L(`No non-veg on ${listOf(ds)}`, `${listOf(ds)} ko non-veg nahi`, `${listOf(ds)} को नॉन-वेज नहीं`)]); }
    if (pick.vrat.length) { const vs = VRATS.filter((v) => pick.vrat.includes(v.k)).map(FL); out.push(["🪔", L(`Fasting food on ${listOf(vs)}`, `${listOf(vs)} mein vrat ka khaana`, `${listOf(vs)} में व्रत का खाना`)]); }
    pick.own.forEach((t) => out.push(["💬", t]));
    return out;
  }
  function readBack() {
    const ls = lines(), own0 = ls.length - pick.own.length;
    return `<p class="rl-rk"><img src="/img/baari-mark.png" alt="">${L("What I understood", "Baari ne samjha", "बारी ने समझा")}</p><ul>${ls.map(([e, t], j) => `<li><span>${e}</span><p>${esc(t)}</p>${j >= own0 ? `<button type="button" data-own="${j - own0}" aria-label="${L("Remove", "Hatao", "हटाओ")}">×</button>` : ""}</li>`).join("")}</ul>`;
  }
  function patchRules(changed) {
    const q = (sel) => stage.querySelector(sel);
    if (!q("[data-rfoods]")) return;
    q("[data-rdiet]").innerHTML = dietRow();
    q("[data-rwho]").innerHTML = whoRow();
    q("[data-rfoods]").innerHTML = foodTiles();
    q("[data-rdays]").hidden = pick.diet === "veg";
    q("[data-read]").innerHTML = readBack();
    if (changed) { const el = q(changed); if (el) bump(el); }
    store.set("baari:setup", { ...pick, inb: inb(), custom: lines().map((x) => x[1]) });
  }
  // "Papa ko namak kam" becomes Papa's plate, salt, less. Anything it can't
  // place on the board is kept word for word.
  function understand(v) {
    const s = v.toLowerCase(), tk = s.split(/[^\p{L}\p{M}]+/u).filter(Boolean);
    const has = (ws) => ws.some((w) => tk.includes(w) || (w.length > 3 && s.includes(w)));
    const who = people().filter((m) => m.k !== "main" && has([...m.l, nameFor(m.k)].map((x) => String(x).toLowerCase()))).map((m) => m.k);
    const fs = FOODS.filter((f) => has(f.w));
    const lvl = has(["kam", "less", "thoda", "low", "कम"]) ? 1 : 2;
    const days = WEEK.filter((d) => has(d.w)).map((d) => d.k);
    const vr = VRATS.filter((x) => has(x.w)).map((x) => x.k);
    let did = "";
    if (fs.length) { (who.length ? who : ["all"]).forEach((k) => { pick.avoid[k] = pick.avoid[k] || {}; fs.forEach((f) => { pick.avoid[k][f.k] = f.hard ? 2 : lvl; }); }); scope = who[0] || "all"; did = "food"; }
    if (days.length && has(["non-veg", "nonveg", "non", "meat", "chicken", "mutton", "machhi", "fish", "anda", "egg", "नॉन", "मांस"])) { pick.nv = [...new Set([...pick.nv, ...days])]; if (pick.diet === "veg") pick.diet = "nonveg"; did = did || "day"; }
    if (vr.length) { pick.vrat = [...new Set([...pick.vrat, ...vr])]; did = did || "vrat"; }
    if (has(["jain", "जैन"])) { pick.jain = true; pick.diet = "veg"; did = did || "jain"; }
    return did;
  }

  // ---- the sample voice note, as karaoke: each word lights up as Gnani's
  // voice reaches it. Tap a word to hear from there.
  let audio = null, kRaf = 0, TIM = null;
  async function timings() { if (!TIM) { try { TIM = await (await fetch("/audio/brief.json")).json(); } catch (e) { TIM = {}; } } return TIM; }
  function stopVoice() { if (audio) { audio.onplay = audio.onpause = audio.onended = null; audio.pause(); audio = null; } cancelAnimationFrame(kRaf); }
  async function loadVoice(autoplay) {
    stopVoice();
    const vk = stage.querySelector("[data-vk]"); if (!vk) return;
    const lang = pick.lang, t = (await timings())[lang];
    if (!t || !vk.isConnected || lang !== pick.lang) return;
    const ly = vk.querySelector("[data-ly]");
    ly.setAttribute("lang", LCODE[lang]);
    ly.innerHTML = t.words.map(([w], j) => `<span data-w="${j}">${esc(w)}</span>`).join(" ");
    ly.classList.remove("in"); void ly.offsetWidth; ly.classList.add("in");
    const gl = vk.querySelector("[data-gl]");
    gl.textContent = pick.ui === "hi" && lang === "Hindi" ? "" : GLOSS[pick.ui];
    const a = (audio = new Audio(`/audio/brief-${lang.toLowerCase()}.mp3`));
    a.preload = "auto";
    const spans = [...ly.children], bars = [...vk.querySelectorAll(".vk-wave i")], tl = vk.querySelector("[data-vt]"), btn = vk.querySelector("[data-vplay]");
    const fmt = (x) => `0:${String(Math.floor(x)).padStart(2, "0")}`;
    tl.textContent = fmt(t.dur);
    const paintAt = (c) => {
      spans.forEach((sp, j) => { const [, s0, s1] = t.words[j]; sp.classList.toggle("said", c >= s1); sp.classList.toggle("now", c >= s0 && c < s1); });
      const p = c / t.dur; bars.forEach((b, j) => b.classList.toggle("on", (j + 0.5) / bars.length <= p));
      tl.textContent = fmt(c || t.dur);
    };
    const tick = () => { if (audio !== a) return; paintAt(a.currentTime); if (!a.paused) kRaf = requestAnimationFrame(tick); };
    a.onplay = () => { vk.classList.add("playing"); btn.innerHTML = IC.pause; island(L("Speaking", "Bol rahi hoon", "बोल रही हूँ"), "busy"); cancelAnimationFrame(kRaf); kRaf = requestAnimationFrame(tick); };
    a.onpause = () => { vk.classList.remove("playing"); btn.innerHTML = IC.play; cancelAnimationFrame(kRaf); };
    a.onended = () => { vk.classList.remove("playing"); vk.classList.add("vk-end"); btn.innerHTML = IC.play; paintAt(t.dur + 1); tl.textContent = fmt(t.dur); island(L("That's her morning", "Bas, itna sa", "बस, इतना सा"), "said"); haptic(10); };
    vk._seek = (j) => { a.currentTime = t.words[j][1]; paintAt(a.currentTime); a.play().catch(() => {}); };
    if (autoplay && !reduce) setTimeout(() => { if (audio === a) a.play().catch(() => {}); }, 650);
  }
  root.addEventListener("click", (e) => {
    const t = e.target, q = (s) => t.closest(s);
    let el;
    if (q(".ag-back")) { if (i > 0) { i--; if (SC[i].id === "run") i--; paint(-1); haptic(4); } return; }
    if (q("[data-alt]")) { finish(); return; }
    if (q("[data-next]")) { next(); return; }
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
    if ((el = q("[data-diet]"))) {
      pick.diet = el.dataset.diet; if (pick.diet !== "veg") pick.jain = false;
      haptic(6); patchRules(`[data-diet="${pick.diet}"]`);
      react(lines()[0][1]);
      return;
    }
    if (q("[data-jain]")) {
      pick.jain = !pick.jain; if (pick.jain) pick.diet = "veg";
      haptic(6); patchRules("[data-jain]");
      if (pick.jain) stage.querySelectorAll(ROOTS.map((k) => `[data-food="${k}"]`).join(",")).forEach(bump);
      react(pick.jain ? L("Jain kitchen. Potato, onion and garlic are off every plate.", "Jain rasoi. Aloo, pyaaz, lehsun kisi thali mein nahi.", "जैन रसोई। आलू, प्याज़, लहसुन किसी थाली में नहीं।") : L("Okay, not Jain.", "Theek hai, Jain nahi.", "ठीक है, जैन नहीं।"));
      return;
    }
    if ((el = q("[data-scope]"))) {
      scope = el.dataset.scope; haptic(4); patchRules();
      stage.querySelector(`[data-scope="${scope}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
      stage.querySelectorAll(".rl-f").forEach((f, j) => { f.style.animationDelay = `${j * 16}ms`; f.classList.remove("fresh"); void f.offsetWidth; f.classList.add("fresh"); });
      island(scope === "all" ? L("Everyone's plate", "Sabki thali", "सबकी थाली") : L(`${cap(nameOf(scope))}'s plate`, `${cap(nameOf(scope))} ki thali`, `${cap(nameOf(scope))} की थाली`), "said");
      return;
    }
    if ((el = q("[data-food]"))) {
      const k = el.dataset.food, f = food(k);
      if (pick.jain && ROOTS.includes(k)) { bump(el); react(L("Jain kitchen: that one stays off.", "Jain rasoi hai, ye nahi aayega.", "जैन रसोई है, ये नहीं आएगा।")); return; }
      const m = (pick.avoid[scope] = pick.avoid[scope] || {}), v = m[k] || 0;
      const nv = f.hard ? (v ? 0 : 2) : (v + 1) % 3;
      if (nv) m[k] = nv; else delete m[k];
      haptic(nv === 2 ? 10 : 5); patchRules(`[data-food="${k}"]`);
      const nm = scope === "all" ? L("everyone", "sabki thali", "सबकी थाली") : cap(nameOf(scope));
      if (nv) react(nv === 2 ? L(`No ${FL(f).toLowerCase()} for ${nm}. Ever.`, `${nm}: ${FL(f).toLowerCase()} bilkul nahi.`, `${nm}: ${FL(f)} बिल्कुल नहीं।`) : L(`Less ${FL(f).toLowerCase()} for ${nm}.`, `${nm}: ${FL(f).toLowerCase()} kam.`, `${nm}: ${FL(f)} कम।`), false);
      return;
    }
    if ((el = q("[data-day]"))) {
      const k = el.dataset.day, has = pick.nv.includes(k);
      pick.nv = has ? pick.nv.filter((x) => x !== k) : [...pick.nv, k];
      haptic(5); el.classList.toggle("on", !has); el.setAttribute("aria-pressed", String(!has)); bump(el); patchRules();
      return;
    }
    if ((el = q("[data-vrat]"))) {
      const k = el.dataset.vrat, has = pick.vrat.includes(k);
      pick.vrat = has ? pick.vrat.filter((x) => x !== k) : [...pick.vrat, k];
      haptic(5); el.classList.toggle("on", !has); el.setAttribute("aria-pressed", String(!has)); bump(el); patchRules();
      if (!has) react(L(`${FL(VRATS.find((x) => x.k === k))}: fasting food those days. I'll plan it.`, `${FL(VRATS.find((x) => x.k === k))}: un dinon vrat ka khaana. Main plan kar lunga.`, `${FL(VRATS.find((x) => x.k === k))}: उन दिनों व्रत का खाना।`), false);
      return;
    }
    if ((el = q("[data-own]"))) { pick.own.splice(+el.dataset.own, 1); haptic(5); patchRules(); return; }
    if (q("[data-ownok]")) { addOwn(); return; }
    if ((el = q("[data-mic]"))) { useFallback && !rec ? fallbackListen(el) : listen(el); return; }
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
    if ((el = q("[data-clang]"))) { pick.lang = el.dataset.clang; stage.querySelectorAll("[data-clang]").forEach((x) => x.classList.toggle("on", x === el)); el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" }); haptic(4); react(L(`Notes in ${pick.lang}. You'll hear one next.`, `${pick.lang} mein note. Agle page pe suniye.`, `${LNAT[pick.lang]} में नोट। अगले पेज पर सुनिए।`), false); return; }
    if (q("[data-vplay]")) { if (!audio) { loadVoice(true); return; } audio.paused ? audio.play().catch(() => {}) : audio.pause(); haptic(6); return; }
    if ((el = q("[data-w]"))) { const vk = stage.querySelector("[data-vk]"); vk && vk._seek && vk._seek(+el.dataset.w); haptic(4); return; }
    if ((el = q("[data-vlang]"))) {
      pick.lang = el.dataset.vlang; haptic(5);
      stage.querySelectorAll("[data-vlang]").forEach((x) => x.classList.toggle("on", x === el));
      el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
      const sub = stage.querySelector(".ag-page:last-child .ag-sub"); if (sub) sub.textContent = L(`Every morning at 7:45, a voice note on her phone in ${pick.lang}. Nothing to read.`, `Roz subah 7:45, unke phone pe ${pick.lang} mein voice note. Padhna kuch nahi.`, `रोज़ सुबह 7:45, उनके फ़ोन पर ${LNAT[pick.lang]} में वॉइस नोट।`);
      store.set("baari:setup", { ...pick, inb: inb(), custom: lines().map((x) => x[1]) });
      loadVoice(true);
      return;
    }
  });
  root.addEventListener("change", (e) => {
    if (!e.target.matches("[data-uisel]")) return;
    pick.ui = e.target.value; haptic(6);
    store.set("baari:setup", pick);
    paint(0);
  });
  root.addEventListener("input", (e) => { if (e.target.matches("[data-cook]")) { pick.cook = e.target.value.trim() || "Sunita"; updNote(); } });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-owntext]")) addOwn(); });
  const bump = (el) => { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); };
  const updNote = () => { island(L("Writing it down", "Likh rahi hoon", "लिख रही हूँ"), "busy"); clearTimeout(updNote.t); updNote.t = setTimeout(() => island(L("Listening", "Sun rahi hoon", "सुन रही हूँ")), 900); };
  function addOwn() {
    const inp = stage.querySelector("[data-owntext]"), v = inp.value.trim();
    if (!v) { inp.focus(); return; }
    inp.value = "";
    const did = understand(v);
    if (did) {
      patchRules(did === "food" ? `[data-scope="${scope}"]` : did === "day" ? "[data-rdays]" : did === "vrat" ? ".rl-vc" : "[data-jain]");
      stage.querySelectorAll(".rl-f.l1, .rl-f.l2").forEach(bump);
      react(L("Got it, it's on the board.", "Samajh gaya, upar laga diya.", "समझ गया, ऊपर लगा दिया।"));
      return;
    }
    pick.own.push(v);
    patchRules();
    react(L(`Understood: "${esc(v)}". Every day, every plate.`, `Samjha: "${esc(v)}". Har din, har thali.`, `समझा: "${esc(v)}"।`));
  }
  // Say it out loud, as much as you like. The bar turns into a listening
  // strip with your voice in it; stop, and Gnani writes it down (through
  // /api/stt, so the key stays on the server). Baari then breaks it into
  // separate points and places each one on the board. Where Gnani can't be
  // reached, the browser's own recogniser or the keyboard's mic takes over.
  let rec = null;
  async function recorder() {
    // A permission sheet left open would hang here; give it eight seconds.
    const stream = await Promise.race([navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }), new Promise((_, no) => setTimeout(() => no(new Error("mic timeout")), 8000))]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(), sp = ctx.createScriptProcessor(4096, 1, 1);
    an.fftSize = 512;
    const chunks = [], buf = new Uint8Array(an.fftSize);
    sp.onaudioprocess = (ev) => chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
    src.connect(an); src.connect(sp); sp.connect(ctx.destination);
    return {
      level() { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return Math.min(1, m / 64); },
      async stop() {
        sp.disconnect(); src.disconnect(); stream.getTracks().forEach((t) => t.stop());
        const rate = ctx.sampleRate; await ctx.close().catch(() => {});
        const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
        // down to 16 kHz mono, 16-bit WAV: small, and every Gnani decoder reads it
        const r = rate / 16000, n = Math.floor(all.length / r), pcm = new Int16Array(n);
        for (let i = 0; i < n; i++) { let sum = 0, c = 0; for (let j = Math.floor(i * r); j < Math.floor((i + 1) * r) && j < all.length; j++) { sum += all[j]; c++; } const v = Math.max(-1, Math.min(1, c ? sum / c : 0)); pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
        const wav = new DataView(new ArrayBuffer(44 + pcm.length * 2));
        const w = (off, str) => [...str].forEach((ch, k) => wav.setUint8(off + k, ch.charCodeAt(0)));
        w(0, "RIFF"); wav.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
        wav.setUint32(24, 16000, true); wav.setUint32(28, 32000, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); w(36, "data"); wav.setUint32(40, pcm.length * 2, true);
        pcm.forEach((v, i) => wav.setInt16(44 + i * 2, v, true));
        return { blob: new Blob([wav], { type: "audio/wav" }), secs: n / 16000 };
      },
    };
  }
  const own = () => stage.querySelector(".ag-own");
  function ownState(st, html = "") {
    const box = own(); if (!box) return;
    box.dataset.st = st;
    let strip = box.querySelector(".ag-rec");
    if (!strip) { box.insertAdjacentHTML("beforeend", `<div class="ag-rec" aria-live="polite"></div>`); strip = box.querySelector(".ag-rec"); }
    strip.innerHTML = html;
  }
  async function listen(btn) {
    if (rec) { rec.done(); return; }
    const inp = stage.querySelector("[data-owntext]");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fallbackListen(btn); return; }
    let r;
    try { r = await recorder(); } catch (err) {
      inp.focus(); react(L("I can't use the mic here. Your keyboard's mic works too.", "Yahan mic nahi chal raha. Keyboard ka mic bhi chalega.", "यहाँ माइक नहीं चल रहा। कीबोर्ड का माइक चलेगा।")); return;
    }
    haptic(10);
    const t0 = performance.now();
    ownState("rec", `<span class="ag-rdot"></span><span class="ag-rl">${L("Listening", "Sun rahi hoon", "सुन रही हूँ")}</span><span class="ag-rw">${Array.from({ length: 22 }, () => "<i></i>").join("")}</span><b class="ag-rt" data-rt>0:00</b><button type="button" class="ag-rs" data-mic aria-label="${L("Done", "Bas", "बस")}"><i></i></button>`);
    root.classList.add("hearing");
    island(L("Listening", "Sun rahi hoon", "सुन रही हूँ"), "busy");
    const bars = [...own().querySelectorAll(".ag-rw i")], hist = bars.map(() => 0), rt = own().querySelector("[data-rt]");
    let raf = 0, stopped = false;
    const loop = () => {
      if (stopped) return;
      hist.shift(); hist.push(r.level());
      bars.forEach((b, i) => { b.style.transform = `scaleY(${(0.12 + hist[i] * 0.88).toFixed(3)})`; });
      const sec = Math.floor((performance.now() - t0) / 1000); rt.textContent = `0:${String(sec).padStart(2, "0")}`;
      if (sec >= 45) { rec.done(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    rec = {
      abort: () => { stopped = true; cancelAnimationFrame(raf); r.stop().catch(() => {}); rec = null; root.classList.remove("hearing"); ownState(""); },
      done: async () => {
        stopped = true; cancelAnimationFrame(raf); rec = null; root.classList.remove("hearing"); haptic(8);
        const { blob, secs } = await r.stop();
        if (secs < 0.6) { ownState(""); island(L("Didn't catch that", "Sunai nahi diya", "सुनाई नहीं दिया"), "said"); return; }
        ownState("think", `<img src="/img/brands/gnani.svg" alt=""><span class="ag-rl t-think">${L("Gnani is writing it down", "Gnani likh raha hai", "ग्नानी लिख रहा है")}</span>`);
        island(L("Understanding", "Samajh rahi hoon", "समझ रही हूँ"), "think");
        let text = "";
        try {
          const fd = new FormData(); fd.append("audio", blob, "voice.wav"); fd.append("lang", pick.ui === "en" ? "en-IN" : "hi-IN");
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          if (res.ok) text = ((await res.json()).text || "").trim();
        } catch (err) {}
        ownState("");
        if (!text) { if (window.SpeechRecognition || window.webkitSpeechRecognition) { react(L("Gnani's not reachable. Try once more, I'll use the phone's ears.", "Gnani tak nahi pahuncha. Ek baar aur bolo, phone se sununga.", "ग्नानी तक नहीं पहुँचा। एक बार और बोलो।")); useFallback = true; } else { inp.focus(); react(L("Couldn't hear that clearly. Type it, or try again.", "Saaf sunai nahi diya. Likh do ya phir bolo.", "साफ़ सुनाई नहीं दिया।")); } return; }
        heardAll(text);
      },
    };
  }
  // One long sentence becomes several points: split on pauses and joining
  // words, place what fits on the board, keep the rest word for word.
  function heardAll(text) {
    const before = new Set(lines().map((x) => x[1]));
    const parts = text.split(/[,.।!?;\n]+|\s+(?:aur|and|lekin|but|phir|also|tatha|और|लेकिन|फिर|तथा|साथ ही)\s+/i).map((x) => x.trim()).filter((x) => x.replace(/[^\p{L}]/gu, "").length > 2);
    let placed = 0, kept = 0, lastDid = "";
    for (const c of parts.length ? parts : [text]) {
      const did = understand(c);
      if (did) { placed++; lastDid = did; } else { pick.own.push(c); kept++; }
    }
    patchRules();
    const fresh = [...stage.querySelectorAll(".rl-read li")].filter((li) => !before.has(li.querySelector("p").textContent));
    fresh.forEach((li, j) => { li.style.setProperty("--j", j); li.classList.add("new"); });
    if (lastDid === "food") stage.querySelectorAll(".rl-f.l1, .rl-f.l2").forEach(bump);
    stage.querySelector(".rl-read")?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    const n = fresh.length || placed + kept;
    react(L(`Heard "${esc(text.length > 60 ? text.slice(0, 57) + "..." : text)}". ${n} ${n === 1 ? "point" : "points"} on the board.`, `Suna: "${esc(text.length > 60 ? text.slice(0, 57) + "..." : text)}". ${n} baatein upar laga di.`, `सुना: "${esc(text.length > 60 ? text.slice(0, 57) + "..." : text)}"। ${n} बातें ऊपर लगा दीं।`));
  }
  // The browser's own recogniser, for when Gnani can't be reached.
  let useFallback = false;
  function fallbackListen(btn) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition, inp = stage.querySelector("[data-owntext]");
    if (!R) { inp.focus(); react(L("Tap the mic on your keyboard and say it.", "Keyboard ke mic ko tap karke bolo.", "कीबोर्ड के माइक को टैप करके बोलो।")); return; }
    const sr = new R(); sr.lang = pick.ui === "en" ? "en-IN" : "hi-IN"; sr.interimResults = true;
    let heard = "";
    ownState("rec", `<span class="ag-rdot"></span><span class="ag-rl">${L("Listening", "Sun rahi hoon", "सुन रही हूँ")}</span><span class="ag-rx" data-rx></span><button type="button" class="ag-rs" data-mic aria-label="${L("Done", "Bas", "बस")}"><i></i></button>`);
    rec = { abort: () => { try { sr.abort(); } catch (e) {} rec = null; ownState(""); }, done: () => { try { sr.stop(); } catch (e) {} } };
    sr.onresult = (ev) => { heard = [...ev.results].map((x) => x[0].transcript).join(" ").trim(); const rx = stage.querySelector("[data-rx]"); if (rx) rx.textContent = heard; };
    sr.onend = () => { rec = null; ownState(""); if (heard) heardAll(heard); };
    try { sr.start(); } catch (e) { rec = null; ownState(""); inp.focus(); }
  }

  // The coin spins round the people in the baari and lands on one. One
  // clock drives both: the needle's angle each frame decides which face is
  // lit, so the light and the needle slow down and stop together.
  let spinning = false;
  async function spin() {
    if (spinning) return;
    spinning = true;
    const ring = inb(), n = ring.length, step = 360 / n, btn = stage.querySelector("[data-spin]");
    const win = Math.floor(Math.random() * n);
    const from = parseFloat(btn.style.getPropertyValue("--rot")) || 0;
    const to = from - (from % 360) + 3 * 360 + step * win;
    const seats = [...stage.querySelectorAll(".ag-seat")];
    seats.forEach((x) => x.classList.remove("on"));
    btn.classList.add("going");
    island(L("Spinning", "Ghuma rahi hoon", "घुमा रही हूँ"), "busy");
    const D = reduce ? 1 : 3000, t0 = performance.now();
    let last = -1;
    await new Promise((ok) => {
      const f = (now) => {
        const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 4);
        const rot = from + (to - from) * e;
        btn.style.setProperty("--rot", `${rot.toFixed(2)}deg`);
        const at = ((Math.round(rot / step) % n) + n) % n;
        if (at !== last) { last = at; seats.forEach((x, j) => x.classList.toggle("pass", j === at)); haptic(3); }
        if (p < 1) requestAnimationFrame(f); else ok();
      };
      requestAnimationFrame(f);
    });
    btn.classList.remove("going");
    pick.duty = ring[win];
    seats.forEach((x, j) => { x.classList.remove("pass"); x.classList.toggle("on", j === win); });
    haptic(18);
    const r = seats[win].getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, ["🪙", "✨"], 10);
    react(L(`${cap(nameOf(pick.duty))} goes first. Tomorrow it moves on.`, `Pehli baari ${nameOf(pick.duty)} ki. Kal aage badhegi.`, `पहली बारी ${nameOf(pick.duty)} की।`));
    spinning = false;
  }

  function next() {
    const sc = SC[i];
    if (sc.id === "spin" && !pick.duty) { spin(); return; }
    store.set("baari:setup", { ...pick, inb: inb(), custom: lines().map((x) => x[1]) });
    if (sc.id === "done") { finish(); return; }
    i = Math.min(N - 1, i + 1);
    haptic(6);
    paint(1);
  }
  async function finish() {
    const langChanged = ui0 !== pick.ui;
    stopVoice();
    try { rec && rec.abort(); } catch (e) {}
    store.set("baari:onboarded", true);
    store.set("baari:setup", { ...pick, inb: inb(), duty: pick.duty || inb()[0], custom: lines().map((x) => x[1]) });
    if (qs.has("onboard") || langChanged) {
      // A new language needs a fresh load. Keep this screen's background up
      // until the page goes, so the old app never flashes behind it, and
      // tell the next load to skip the splash.
      try { sessionStorage.setItem("baari:nosplash", "1"); } catch (e) {}
      root.classList.add("is-hold");
      await wait(200);
      location.replace("/");
      return;
    }
    root.classList.add("is-out");
    await wait(420);
    root.remove();
    document.documentElement.classList.remove("ob-open");
    onDone && onDone();
  }
  paint(1);
}
