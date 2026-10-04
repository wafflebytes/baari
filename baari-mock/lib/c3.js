// Capability C3, get_a_true_answer (PRD 8). Not a Gnani API today: a Baari
// mock of what Gnani's post-call extraction would look like on a voice note.
//
// Two stages, inside the connector's 10 s timeout:
//   1. Rules, deterministic: Hindi number words (Latin and Devanagari) next to
//      known items give quantities in digits; fixed phrases give clear labels.
//   2. A small LLM call (OpenRouter, W2's baari-llm Worker when BAARI_LLM_URL
//      is set) judges the commitment within the time left. Its label must be
//      one of the five; anything else counts as a failure.
// Rules unsure and the LLM failed or late: commitment "unclear", confidence 0.

const LABELS = ["confirmed_with_counts", "vague_yes", "refusal", "item_missing", "unclear"];
const CAPABILITY = "gnani.household_reply.v0 (Baari mock, not a Gnani API today)";

const NUM = {
  ek: 1, एक: 1, do: 2, दो: 2, teen: 3, tin: 3, तीन: 3, char: 4, chaar: 4, चार: 4,
  paanch: 5, panch: 5, pach: 5, पांच: 5, पाँच: 5, chhe: 6, chhah: 6, che: 6, छह: 6, छः: 6,
  saat: 7, सात: 7, aath: 8, आठ: 8, nau: 9, नौ: 9, das: 10, दस: 10, gyarah: 11, ग्यारह: 11, barah: 12, बारह: 12,
  aadha: 0.5, adha: 0.5, आधा: 0.5, dedh: 1.5, डेढ़: 1.5, डेढ: 1.5, dhai: 2.5, ढाई: 2.5, pav: 0.25, पाव: 0.25,
};
const UNIT = { kilo: "kg", kg: "kg", किलो: "kg", gram: "g", grams: "g", ग्राम: "g", packet: "pkt", packet2: "pkt", पैकेट: "pkt", litre: "l", liter: "l", लीटर: "l", dozen: "dozen", दर्जन: "dozen" };
const ITEMS = {
  tomato: ["tamatar", "tamater", "tomato", "टमाटर"],
  onion: ["pyaz", "pyaaz", "piyaz", "onion", "प्याज", "प्याज़"],
  potato: ["aloo", "alu", "potato", "आलू"],
  paneer: ["paneer", "पनीर"],
  palak: ["palak", "spinach", "पालक"],
  curd: ["dahi", "curd", "दही"],
  lauki: ["lauki", "louki", "लौकी"],
  rajma: ["rajma", "राजमा"],
  chana_dal: ["chana", "dal", "daal", "चना", "दाल"],
  rice: ["chawal", "rice", "चावल"],
  atta: ["atta", "aata", "आटा"],
  besan: ["besan", "बेसन"],
  milk: ["doodh", "dudh", "milk", "दूध"],
  oil: ["tel", "oil", "तेल"],
  ginger: ["adrak", "ginger", "अदरक"],
  garlic: ["lahsun", "lehsun", "garlic", "लहसुन"],
  chilli: ["mirch", "mirchi", "chilli", "मिर्च", "मिर्ची"],
  coriander: ["dhaniya", "dhania", "धनिया"],
  egg: ["anda", "ande", "egg", "eggs", "अंडा", "अंडे"],
};
const WORD2ITEM = Object.fromEntries(Object.entries(ITEMS).flatMap(([k, ws]) => ws.map((w) => [w, k])));

// "accha" / "अच्छा" is left out on purpose: it's as often a filler as a yes.
const YES = /\b(haan|ha+n?|han|ji|theek|thik|ok|okay|bilkul)\b|हाँ|हां|जी|ठीक|बिल्कुल/i;
const REFUSAL = /nahi aa (paungi|paaungi|sakti)|nahi aaungi|nahin aaungi|chhutti|chutti|nahi banaungi|नहीं आ (पाऊंगी|पाउंगी|सकती)|नहीं आऊंगी|छुट्टी|नहीं बनाऊंगी/i;
const MISSING = /(nahi|nahin|nhi) (hai|he|mila|mili|tha)|khatam|khattam|nahi bacha|नहीं (है|मिला|मिली|था)|ख़त्म|खत्म|नहीं बचा/i;

function tokens(text) {
  return String(text || "").toLowerCase().replace(/[.,!?।;:"'()]/g, " ").split(/\s+/).filter(Boolean);
}

function numberOf(t) {
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  return NUM[t];
}

// Quantities: an item with a number within two words either side.
function ruleQuantities(text) {
  const tk = tokens(text);
  const out = {};
  tk.forEach((t, i) => {
    const item = WORD2ITEM[t];
    if (!item || out[item]) return;
    for (const j of [i - 1, i + 1, i - 2, i + 2]) {
      if (j < 0 || j >= tk.length) continue;
      const n = numberOf(tk[j]);
      if (n === undefined) continue;
      // A unit between or next to the number.
      const unit = UNIT[tk[j + 1]] || UNIT[tk[j - 1]] || "pcs";
      out[item] = { value: n, unit };
      return;
    }
  });
  return out;
}

// Items said to be missing: an item followed by a "nahi hai" phrase within
// four words.
function ruleMissing(text) {
  const tk = tokens(text);
  const missing = [];
  tk.forEach((t, i) => {
    const item = WORD2ITEM[t];
    if (!item) return;
    const after = tk.slice(i + 1, i + 5).join(" ");
    if (MISSING.test(after) && !missing.includes(item)) missing.push(item);
  });
  return missing;
}

function rules(text) {
  const quantities = ruleQuantities(text);
  const items_missing = ruleMissing(text);
  for (const m of items_missing) delete quantities[m];
  let commitment = "unclear";
  let confidence = 0;
  if (REFUSAL.test(text)) [commitment, confidence] = ["refusal", 0.8];
  else if (items_missing.length) [commitment, confidence] = ["item_missing", 0.75];
  else if (Object.keys(quantities).length) [commitment, confidence] = ["confirmed_with_counts", 0.8];
  else if (YES.test(text)) [commitment, confidence] = ["vague_yes", 0.75];
  return { commitment, quantities, items_missing, confidence };
}

const SYSTEM = `You label a Hindi or Hinglish voice-note transcript from a household cook replying to her morning brief.
Return only JSON: {"commitment": one of ${JSON.stringify(LABELS)}, "quantities": {"<english item>": {"value": <number>, "unit": "pcs|kg|g|l|pkt|dozen"}}, "items_missing": ["<english item>"], "confidence": <0..1>}.
confirmed_with_counts: she agrees and states counts or amounts. vague_yes: she agrees ("haan haan, sab theek hai") but gives no counts. refusal: she can't come or won't cook. item_missing: she says an item isn't there or ran out. unclear: anything else.
Numbers as digits ("chaar tamatar" -> {"tomato": {"value": 4, "unit": "pcs"}}). Never invent counts she didn't say.`;

function keys() {
  return String(process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function llm(text, budgetMs) {
  if (budgetMs < 1500) return { ok: false, error: "no time left" };
  const url = process.env.BAARI_LLM_URL ? `${process.env.BAARI_LLM_URL.replace(/\/$/, "")}/chat/completions` : "https://openrouter.ai/api/v1/chat/completions";
  const auth = process.env.BAARI_LLM_URL ? process.env.BAARI_LLM_TOKEN : keys()[0];
  if (!auth) return { ok: false, error: "no LLM key" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), budgetMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL_SIM || "qwen/qwen3.8-27b:free",
        max_tokens: 400,
        temperature: 0,
        reasoning: { effort: "low", exclude: true },
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: text }],
      }),
    });
    const j = await res.json();
    const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!content) return { ok: false, error: `LLM HTTP ${res.status}` };
    const parsed = JSON.parse(content.replace(/^```(json)?|```$/g, "").trim());
    if (!LABELS.includes(parsed.commitment)) return { ok: false, error: `label ${parsed.commitment} not in the set` };
    return { ok: true, ...parsed };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "LLM timed out" : String(e.message) };
  } finally {
    clearTimeout(timer);
  }
}

function normQuantities(q) {
  const out = {};
  for (const [k, v] of Object.entries(q || {})) {
    const item = WORD2ITEM[String(k).toLowerCase()] || String(k).toLowerCase();
    if (v && typeof v === "object" && Number.isFinite(Number(v.value))) out[item] = { value: Number(v.value), unit: v.unit || "pcs" };
    else if (Number.isFinite(Number(v))) out[item] = { value: Number(v), unit: "pcs" };
  }
  return out;
}

// deadline: Date.now() value by which we must answer.
async function extract(text, deadline) {
  const t0 = Date.now();
  if (!text || !String(text).trim()) return { capability: CAPABILITY, commitment: "unclear", quantities: {}, items_missing: [], confidence: 0, method: "empty transcript" };
  const r = rules(text);
  const l = await llm(text, Math.min(7000, (deadline || t0 + 6000) - Date.now() - 300));
  let out;
  if (l.ok) {
    // The LLM judges the label; counts the rules read from the words win.
    const items_missing = [...new Set([...(r.items_missing || []), ...((l.items_missing || []).map((x) => WORD2ITEM[String(x).toLowerCase()] || String(x).toLowerCase()))])];
    out = {
      commitment: l.commitment,
      quantities: { ...normQuantities(l.quantities), ...r.quantities },
      items_missing,
      confidence: Math.max(0, Math.min(0.95, Number(l.confidence) || 0.5)),
      method: "rules+llm",
    };
  } else if (r.commitment !== "unclear") {
    out = { ...r, method: `rules (llm: ${l.error})` };
  } else {
    out = { commitment: "unclear", quantities: {}, items_missing: [], confidence: 0, method: `llm failed: ${l.error}` };
  }
  return { capability: CAPABILITY, ...out, ms: Date.now() - t0 };
}

module.exports = { extract, rules, LABELS };
