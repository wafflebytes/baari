// Beyond dal chawal. The person who brought Baari home is often the
// youngest one in it, and they want pasta on a Thursday. This card lets
// them say so: pick the cuisines, swipe through dishes a home kitchen can
// actually make, then say how often and for whom. Liked dishes go into the
// vote pool (local.cuisine), never forced on the table. Rails reads them
// once W1 lands prd/AMBIENT_HANDOFF.md section 10 step 1b.
//
// Every dish is veg or egg here; the house rules still filter the vote.
// `buy` names the one thing a regular kirana won't have, which Baari
// orders with the staples.

export const CUISINES = [
  { k: "ghar", e: "🍛", n: ["Ghar ka khana", "Ghar ka khana", "घर का खाना"], c: "#E9A23B" },
  { k: "south", e: "🥞", n: ["South Indian", "South Indian", "दक्षिण भारतीय"], c: "#C9A227" },
  { k: "street", e: "🥙", n: ["Street food", "Street food", "स्ट्रीट फ़ूड"], c: "#E0663A" },
  { k: "indochinese", e: "🥡", n: ["Indo-Chinese", "Chinese (desi)", "देसी चाइनीज़"], c: "#D2452F" },
  { k: "momos", e: "🥟", n: ["Momos and thukpa", "Momos aur thukpa", "मोमो और थुकपा"], c: "#B88A6B" },
  { k: "italian", e: "🍝", n: ["Italian", "Italian", "इटैलियन"], c: "#C2453B" },
  { k: "mexican", e: "🌯", n: ["Mexican", "Mexican", "मैक्सिकन"], c: "#3E9A57" },
  { k: "korean", e: "🍜", n: ["Korean", "Korean", "कोरियन"], c: "#D93C57" },
  { k: "thai", e: "🍲", n: ["Thai", "Thai", "थाई"], c: "#5E9E3A" },
  { k: "levant", e: "🧆", n: ["Middle Eastern", "Middle Eastern", "मिडिल ईस्टर्न"], c: "#B07A3A" },
  { k: "bowls", e: "🥗", n: ["Bowls and salads", "Bowls aur salad", "बाउल और सलाद"], c: "#4C9A7A" },
  { k: "cafe", e: "🥪", n: ["Cafe at home", "Ghar pe cafe", "घर पे कैफ़े"], c: "#A06A3B" },
];

// f: photo file in /img/dishes (design/dish-photos.md), e: fallback emoji,
// m: minutes, egg: has egg, buy: the one thing to order.
export const FOODS = [
  { id: "chole-bhature", c: "ghar", n: "Chole bhature", e: "🫓", m: 60 },
  { id: "aloo-paratha", c: "ghar", n: "Aloo paratha", e: "🫓", m: 35 },
  { id: "dal-makhani", c: "ghar", n: "Dal makhani jeera rice", e: "🍛", m: 70 },
  { id: "paneer-butter-masala", c: "ghar", n: "Paneer butter masala", e: "🍛", m: 40 },
  { id: "masala-dosa", c: "south", n: "Masala dosa", e: "🥞", m: 40, buy: "dosa batter" },
  { id: "idli-sambar", c: "south", n: "Idli sambar", e: "🍚", m: 35, buy: "idli batter" },
  { id: "curd-rice", c: "south", n: "Curd rice", e: "🍚", m: 20 },
  { id: "lemon-rice", c: "south", n: "Lemon rice", e: "🍋", m: 20 },
  { id: "pav-bhaji", c: "street", n: "Pav bhaji", e: "🥘", m: 45, buy: "pav" },
  { id: "vada-pav", c: "street", n: "Vada pav", e: "🍔", m: 40, buy: "pav" },
  { id: "dahi-puri", c: "street", n: "Dahi puri", e: "🥙", m: 25, buy: "puri shells" },
  { id: "misal-pav", c: "street", n: "Misal pav", e: "🥘", m: 50, buy: "pav, farsan" },
  { id: "hakka-noodles", c: "indochinese", n: "Veg hakka noodles", e: "🍜", m: 25, buy: "hakka noodles" },
  { id: "chilli-paneer", c: "indochinese", n: "Chilli paneer", e: "🌶️", m: 30 },
  { id: "manchurian-fried-rice", c: "indochinese", n: "Manchurian fried rice", e: "🍚", m: 45 },
  { id: "schezwan-noodles", c: "indochinese", n: "Schezwan noodles", e: "🍜", m: 25, buy: "schezwan sauce" },
  { id: "veg-momos", c: "momos", n: "Veg momos", e: "🥟", m: 50 },
  { id: "paneer-momos", c: "momos", n: "Paneer momos", e: "🥟", m: 50 },
  { id: "thukpa", c: "momos", n: "Veg thukpa", e: "🍜", m: 30 },
  { id: "arrabbiata", c: "italian", n: "Penne arrabbiata", e: "🍝", m: 25, buy: "penne" },
  { id: "white-sauce-pasta", c: "italian", n: "White sauce pasta", e: "🍝", m: 25, buy: "penne" },
  { id: "tawa-pizza", c: "italian", n: "Tawa pizza", e: "🍕", m: 30, buy: "pizza base, mozzarella" },
  { id: "mac-cheese", c: "italian", n: "Mac and cheese", e: "🧀", m: 25, buy: "macaroni, cheddar" },
  { id: "burrito-bowl", c: "mexican", n: "Rajma burrito bowl", e: "🥙", m: 35 },
  { id: "quesadilla", c: "mexican", n: "Paneer quesadilla", e: "🌮", m: 25, buy: "tortillas" },
  { id: "nachos", c: "mexican", n: "Loaded nachos", e: "🧀", m: 20, buy: "nachos, salsa" },
  { id: "tacos", c: "mexican", n: "Bean tacos", e: "🌮", m: 30, buy: "taco shells" },
  { id: "kimchi-fried-rice", c: "korean", n: "Kimchi fried rice", e: "🍳", m: 20, egg: true, buy: "kimchi" },
  { id: "korean-ramen", c: "korean", n: "Spicy Korean ramen", e: "🍜", m: 15, egg: true, buy: "ramen" },
  { id: "bibimbap", c: "korean", n: "Bibimbap", e: "🍲", m: 40, egg: true, buy: "gochujang" },
  { id: "gochujang-paneer", c: "korean", n: "Gochujang paneer rice", e: "🌶️", m: 30, buy: "gochujang" },
  { id: "green-curry", c: "thai", n: "Thai green curry", e: "🍲", m: 35, buy: "green curry paste, coconut milk" },
  { id: "pad-thai", c: "thai", n: "Veg pad thai", e: "🍜", m: 30, egg: true, buy: "rice noodles" },
  { id: "basil-fried-rice", c: "thai", n: "Thai basil fried rice", e: "🍚", m: 20, buy: "thai basil" },
  { id: "falafel-wrap", c: "levant", n: "Falafel wrap", e: "🧆", m: 45, buy: "pita" },
  { id: "hummus-pita", c: "levant", n: "Hummus and pita", e: "🫓", m: 20, buy: "tahini, pita" },
  { id: "paneer-shawarma", c: "levant", n: "Paneer shawarma", e: "🌯", m: 30, buy: "pita" },
  { id: "buddha-bowl", c: "bowls", n: "Chana buddha bowl", e: "🥗", m: 25 },
  { id: "quinoa-salad", c: "bowls", n: "Quinoa salad", e: "🥗", m: 20, buy: "quinoa" },
  { id: "sprouts-bowl", c: "bowls", n: "Masala sprouts bowl", e: "🥗", m: 15 },
  { id: "bombay-sandwich", c: "cafe", n: "Bombay sandwich", e: "🥪", m: 15 },
  { id: "aloo-tikki-burger", c: "cafe", n: "Aloo tikki burger", e: "🍔", m: 35, buy: "burger buns" },
  { id: "grilled-cheese", c: "cafe", n: "Grilled cheese", e: "🧀", m: 10 },
  { id: "masala-omelette", c: "cafe", n: "Masala omelette toast", e: "🍳", m: 10, egg: true },
];
const cuisineOf = (k) => CUISINES.find((c) => c.k === k);
const food = (id) => FOODS.find((f) => f.id === id);
const FREQ = [
  ["1w", ["Once a week", "Hafte mein ek baar", "हफ़्ते में एक बार"]],
  ["2w", ["Twice a week", "Hafte mein do baar", "हफ़्ते में दो बार"]],
  ["wknd", ["Weekends only", "Sirf weekend", "सिर्फ़ वीकेंड"]],
  ["ask", ["When I ask", "Jab main bolun", "जब मैं बोलूँ"]],
];

export function cuisinePick(local) {
  const c = local.cuisine || {};
  return { c: c.c || [], like: c.like || [], no: c.no || [], freq: c.freq || "1w", who: c.who || null };
}

// A dish face: the render when it exists, the emoji on the cuisine's tint
// when it doesn't (most of the new dishes until their photos land).
const face = (f, cls = "") => `<span class="cz-face ${cls}" style="--t:${cuisineOf(f.c).c}"><b>${f.e}</b><img src="/img/dishes/${f.id}.webp" alt="" loading="lazy" onerror="this.remove()"></span>`;

export function cuisineCard({ T, local }) {
  const p = cuisinePick(local);
  const liked = p.like.map(food).filter(Boolean);
  const picked = p.c.map(cuisineOf).filter(Boolean);
  const coins = (picked.length ? picked : CUISINES.slice(5, 9)).slice(0, 4);
  return `<section class="sec rv" style="--i:4"><button type="button" class="vn cz-card" data-cuisine>
    <span class="vn-top"><span class="cz-coins" aria-hidden="true">${coins.map((c) => `<i style="--t:${c.c}">${c.e}</i>`).join("")}</span><span class="vn-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>
    <b class="vn-h">${liked.length ? T(`${liked.length} new dishes in the vote`, `Vote mein ${liked.length} nayi dishes`, `वोट में ${liked.length} नई डिश`) : T("Not just dal chawal", "Sirf dal chawal nahi", "सिर्फ़ दाल चावल नहीं")}</b>
    <span class="vn-s">${liked.length ? esc(liked.slice(0, 3).map((f) => f.n).join(", ")) + (liked.length > 3 ? T(` and ${liked.length - 3} more`, ` aur ${liked.length - 3}`, ` और ${liked.length - 3}`) : "")
      : T("Pasta, momos, Korean ramen. Swipe what you'd eat and it joins the vote.", "Pasta, momos, Korean ramen. Jo pasand ho swipe karo, vote mein aayega.", "पास्ता, मोमो, कोरियन रेमन। जो पसंद हो, वोट में आएगा।")}</span>
    <span class="vn-foot"><span class="cz-mini">${(liked.length ? liked : FOODS.filter((f) => ["arrabbiata", "veg-momos", "korean-ramen", "pav-bhaji", "burrito-bowl"].includes(f.id))).slice(0, 5).map((f) => face(f, "sm")).join("")}</span><span class="vn-note">${liked.length ? T(FREQ.find((x) => x[0] === p.freq)[1][0], FREQ.find((x) => x[0] === p.freq)[1][1], FREQ.find((x) => x[0] === p.freq)[1][2]) : T(`${CUISINES.length} cuisines · ${FOODS.length} dishes`, `${CUISINES.length} cuisines · ${FOODS.length} dishes`, `${CUISINES.length} व्यंजन · ${FOODS.length} डिश`)}</span></span>
  </button></section>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function openCuisine({ T, local, save, people = [], cook = "Sunita", haptic = () => {}, toast }) {
  if (document.querySelector(".cz")) return;
  const p = cuisinePick(local);
  const sel = new Set(p.c);
  const like = new Set(p.like), no = new Set(p.no);
  let freq = p.freq;
  const who = new Set(p.who || people);
  let deck = [], di = 0;
  const w = document.createElement("div");
  w.className = "cz";
  w.setAttribute("role", "dialog");
  w.setAttribute("aria-modal", "true");
  w.innerHTML = `<div class="cz-top"><button type="button" class="vx-x" data-czx aria-label="${T("Close", "Band karo", "बंद करो")}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button><span class="cz-steps"><i class="on"></i><i></i><i></i></span><span class="cz-sp"></span></div><div class="cz-body"></div>`;
  document.body.appendChild(w);
  document.documentElement.classList.add("vx-on");
  const body = w.querySelector(".cz-body");
  const steps = (n) => w.querySelectorAll(".cz-steps i").forEach((d, i) => d.classList.toggle("on", i <= n));
  const show = (html, n) => {
    steps(n);
    body.classList.remove("in"); body.classList.add("out");
    setTimeout(() => { body.innerHTML = html; body.classList.remove("out"); void body.offsetWidth; body.classList.add("in"); wire(); }, 150);
  };
  const keep = () => { local.cuisine = { c: [...sel], like: [...like], no: [...no], freq, who: [...who] }; save(); };

  // Step 1: which cuisines.
  const stepPick = () => `<h2 class="cz-h">${T("What else does the house eat?", "Ghar mein aur kya chalta hai?", "घर में और क्या चलता है?")}</h2>
    <p class="cz-s">${T("Pick every cuisine someone here would eat. You'll see dishes from them next.", "Jo bhi koi khaata ho, sab chuno. Agle step mein unki dishes.", "जो भी कोई खाता हो, सब चुनो।")}</p>
    <div class="cz-grid">${CUISINES.map((c) => { const ex = FOODS.filter((f) => f.c === c.k).slice(0, 2).map((f) => f.n).join(", "); return `<button type="button" class="cz-tile ${sel.has(c.k) ? "on" : ""}" data-cz="${c.k}" style="--t:${c.c}" aria-pressed="${sel.has(c.k)}"><span class="cz-em">${c.e}</span><b>${T(...c.n)}</b><small>${esc(ex)}</small><i class="cz-tick"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></i></button>`; }).join("")}</div>
    <div class="cz-foot"><button type="button" class="cz-go" data-cznext ${sel.size ? "" : "disabled"}>${sel.size ? T(`Show dishes · ${sel.size}`, `Dishes dikhao · ${sel.size}`, `डिश दिखाओ · ${sel.size}`) : T("Pick at least one", "Kam se kam ek chuno", "कम से कम एक चुनो")}</button></div>`;

  // Step 2: a swipe deck. Right is yes, left is no.
  const card = (f, i) => `<article class="cz-dc" data-di="${i}" style="--t:${cuisineOf(f.c).c};--k:${i - di}">
      ${face(f, "lg")}
      <div class="cz-dt"><span class="cz-tag">${cuisineOf(f.c).e} ${T(...cuisineOf(f.c).n)}</span><h3>${esc(f.n)}</h3>
        <p><span>${f.m} min</span><span>${f.egg ? T("Has egg", "Anda hai", "अंडा है") : T("Veg", "Veg", "शाकाहारी")}</span></p>
        <p class="cz-buy">${f.buy ? T(`Baari orders ${f.buy} with the staples`, `${f.buy} Baari saamaan ke saath mangayega`, `${f.buy} बारी सामान के साथ मँगाएगा`) : T("Everything's already in a home kitchen", "Sab ghar mein milta hai", "सब घर में मिलता है")}</p></div>
      <span class="cz-stamp yes">${T("Yes", "Haan", "हाँ")}</span><span class="cz-stamp no">${T("Nope", "Nahi", "नहीं")}</span>
    </article>`;
  const stepDeck = () => {
    deck = FOODS.filter((f) => sel.has(f.c));
    di = 0;
    return `<h2 class="cz-h">${T("Would you eat this?", "Ye khaoge?", "ये खाओगे?")}</h2>
      <p class="cz-s" data-czn>1 / ${deck.length}</p>
      <div class="cz-deck"><p class="cz-empty">${T("That's all of them.", "Bas, itni hi thi.", "बस, इतनी ही थीं।")}</p>${deck.map(card).reverse().join("")}</div>
      <div class="cz-acts"><button type="button" class="cz-b no" data-czv="0" aria-label="${T("No", "Nahi", "नहीं")}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
        <button type="button" class="cz-skip" data-czdone>${T("Done", "Ho gaya", "हो गया")}</button>
        <button type="button" class="cz-b yes" data-czv="1" aria-label="${T("Yes", "Haan", "हाँ")}"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="currentColor"/></svg></button></div>`;
  };

  // Step 3: how often, and for whom.
  const stepHow = () => `<h2 class="cz-h">${like.size ? T(`${like.size} dishes you'd eat`, `${like.size} dishes pasand aayi`, `${like.size} डिश पसंद आईं`) : T("Nothing yet, and that's fine", "Abhi kuch nahi, koi baat nahi", "अभी कुछ नहीं, कोई बात नहीं")}</h2>
    ${like.size ? `<div class="cz-liked">${[...like].map(food).filter(Boolean).map((f) => `<span>${face(f, "sm")}${esc(f.n)}</span>`).join("")}</div>` : ""}
    <p class="cz-q">${T("How often should one come up in the vote?", "Vote mein kitni baar aaye?", "वोट में कितनी बार आए?")}</p>
    <div class="cz-opts">${FREQ.map(([k, l]) => `<button type="button" data-czf="${k}" aria-pressed="${freq === k}">${T(...l)}</button>`).join("")}</div>
    ${people.length ? `<p class="cz-q">${T("Who's in for these?", "Ye kaun kaun khayega?", "ये कौन कौन खाएगा?")}</p>
    <div class="cz-opts">${people.map((n) => `<button type="button" data-czw="${esc(n)}" aria-pressed="${who.has(n)}">${esc(n)}</button>`).join("")}</div>
    <p class="cz-fine">${T("Not everyone? Baari plans their usual plate alongside.", "Sab nahi? Baaki ke liye Baari unki roz wali thali bhi rakhega.", "सब नहीं? बाकी के लिए रोज़ वाली थाली भी।")}</p>` : ""}
    <div class="cz-foot"><button type="button" class="cz-go" data-czsave>${T("Add to the vote", "Vote mein daalo", "वोट में डालो")}</button></div>`;

  const decide = (yes) => {
    const el = body.querySelector(`.cz-dc[data-di="${di}"]`);
    if (!el) return;
    const f = deck[di];
    (yes ? like : no).add(f.id); (yes ? no : like).delete(f.id);
    haptic(yes ? 10 : 5);
    el.classList.add(yes ? "go-yes" : "go-no");
    el.style.transform = "";
    di++;
    body.querySelectorAll(".cz-dc").forEach((c) => c.style.setProperty("--k", +c.dataset.di - di));
    const n = body.querySelector("[data-czn]");
    if (n) n.textContent = di < deck.length ? `${di + 1} / ${deck.length}` : T(`${like.size} liked`, `${like.size} pasand`, `${like.size} पसंद`);
    setTimeout(() => el.remove(), 380);
    keep();
    if (di >= deck.length) setTimeout(() => show(stepHow(), 2), 520);
  };

  function wire() {
    body.querySelectorAll("[data-cz]").forEach((b) => b.onclick = () => {
      const k = b.dataset.cz; sel.has(k) ? sel.delete(k) : sel.add(k);
      b.classList.toggle("on", sel.has(k)); b.setAttribute("aria-pressed", String(sel.has(k)));
      b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
      haptic(5);
      const g = body.querySelector("[data-cznext]");
      g.disabled = !sel.size;
      g.textContent = sel.size ? T(`Show dishes · ${sel.size}`, `Dishes dikhao · ${sel.size}`, `डिश दिखाओ · ${sel.size}`) : T("Pick at least one", "Kam se kam ek chuno", "कम से कम एक चुनो");
    });
    const nx = body.querySelector("[data-cznext]");
    if (nx) nx.onclick = () => { keep(); haptic(8); show(stepDeck(), 1); };
    body.querySelectorAll("[data-czv]").forEach((b) => b.onclick = () => decide(b.dataset.czv === "1"));
    const dn = body.querySelector("[data-czdone]");
    if (dn) dn.onclick = () => show(stepHow(), 2);
    body.querySelectorAll("[data-czf]").forEach((b) => b.onclick = () => { freq = b.dataset.czf; body.querySelectorAll("[data-czf]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); haptic(5); keep(); });
    body.querySelectorAll("[data-czw]").forEach((b) => b.onclick = () => { const n = b.dataset.czw; who.has(n) ? who.delete(n) : who.add(n); b.setAttribute("aria-pressed", String(who.has(n))); haptic(5); keep(); });
    const sv = body.querySelector("[data-czsave]");
    if (sv) sv.onclick = () => {
      keep(); close();
      toast?.(like.size
        ? { icon: "🍝", title: T(`${like.size} dishes join the vote`, `${like.size} dishes vote mein`, `${like.size} डिश वोट में`), body: T(`${FREQ.find((x) => x[0] === freq)[1][0]}. Baari sends ${cook} ji the recipe in Hindi.`, `${FREQ.find((x) => x[0] === freq)[1][1]}. ${cook} ji ko recipe Hindi mein Baari bhejega.`, `${cook} जी को रेसिपी बारी भेजेगा।`), ms: 4600 }
        : { icon: "🍛", title: T("Ghar ka khana it is", "Ghar ka khana hi sahi", "घर का खाना ही सही"), ms: 3000 });
    };
    // Drag the top card.
    const top = () => body.querySelector(`.cz-dc[data-di="${di}"]`);
    const deckEl = body.querySelector(".cz-deck");
    if (!deckEl) return;
    let s = null;
    deckEl.onpointerdown = (e) => { const c = top(); if (!c || !c.contains(e.target)) return; s = { x: e.clientX, y: e.clientY, t: performance.now(), c }; c.setPointerCapture(e.pointerId); c.classList.add("drag"); };
    deckEl.onpointermove = (e) => {
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      s.c.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${dx / 18}deg)`;
      s.c.style.setProperty("--yes", Math.max(0, Math.min(1, dx / 90)).toFixed(2));
      s.c.style.setProperty("--no", Math.max(0, Math.min(1, -dx / 90)).toFixed(2));
    };
    const up = (e) => {
      if (!s) return;
      const dx = e.clientX - s.x, v = dx / Math.max(1, performance.now() - s.t), c = s.c;
      s = null; c.classList.remove("drag");
      if (dx > 90 || v > 0.6) decide(true);
      else if (dx < -90 || v < -0.6) decide(false);
      else { c.style.transform = ""; c.style.setProperty("--yes", 0); c.style.setProperty("--no", 0); }
    };
    deckEl.onpointerup = up;
    deckEl.onpointercancel = up;
  }
  const key = (e) => {
    if (e.key === "Escape") close();
    if (body.querySelector(".cz-deck")) { if (e.key === "ArrowRight") decide(true); if (e.key === "ArrowLeft") decide(false); }
  };
  addEventListener("keydown", key);
  body.innerHTML = stepPick(); wire();
  requestAnimationFrame(() => w.classList.add("is-open"));
  function close() {
    if (w.classList.contains("is-closing")) return;
    removeEventListener("keydown", key);
    w.classList.remove("is-open"); w.classList.add("is-closing");
    document.documentElement.classList.remove("vx-on");
    setTimeout(() => w.remove(), 360);
    w.dispatchEvent(new CustomEvent("cz-close", { bubbles: true }));
  }
  w.querySelector("[data-czx]").onclick = close;
}
