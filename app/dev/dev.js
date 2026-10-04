// /dev operator panel (PRD 18.2). One person runs the whole demo from here:
// a script stepper, phase buttons that call baari-clock /fire, scenarios,
// cast, "say it for them" and health. All calls go through /api/dev/*, which
// adds the real keys server-side.
const PHASES = ["SHORTLIST", "LOCK", "CHECK", "BRIEF", "COOK_REPLY"];
const CLOCK = { SHORTLIST: "20:30", LOCK: "21:30", CHECK: "22:45", BRIEF: "07:45", COOK_REPLY: "08:05" };
const LABEL = { SHORTLIST: "Shortlist bhejo", LOCK: "Vote lock + kharida", CHECK: "Delivery check", BRIEF: "Sunita ko brief", COOK_REPLY: "Sunita ka jawaab" };
const ROLES = ["Vinay", "Mummy", "Papa", "Sunita"];
const BOT = "Baari_ken_bot";
const CHAOS = [
  ["chaos_no_rider", "Rider nahi mila", "no_rider"],
  ["chaos_low_balance", "Paisa kam hai", "Rs 50 left"],
  ["chaos_timeout", "Server so gaya", "timeout"],
  ["chaos_malformed", "Kachra reply", "malformed"],
  ["chaos_papa_voice", "Papa ka voice note", "inject voice"],
];
const RUN_PRESETS = [["run1_happy", "Run 1"], ["run2_papa_no_rider", "Run 2"], ["run3_cook_late_overcap", "Run 3"]];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(`baari-dev:${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`baari-dev:${k}`, JSON.stringify(v)); } catch {} },
};

let key = store.get("key", "");
let scripts = {};
let run = store.get("run", "run1");
let step = store.get(`step:${run}`, 0);
let status = null;
let busy = false;
let activePreset = null;

function toast(msg, bad) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast show${bad ? " bad" : ""}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = "toast"), bad ? 5000 : 2600);
}

async function api(method, path, body) {
  const res = await fetch(`/api/dev/${path}`, { method, headers: { "x-dev-key": key, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) {
    askKey();
    throw new Error("dev key galat hai");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function askKey() {
  const d = $("#keydlg");
  if (!d.open) d.showModal();
}
$("#keyform").addEventListener("submit", () => {
  key = $("#key").value.trim();
  store.set("key", key);
  refreshAll();
});

// ---- time: evening phases are today, morning phases tomorrow
function istDay(offset = 0) {
  const d = new Date(Date.now() + 5.5 * 3600e3 + offset * 86400e3);
  return d.toISOString().slice(0, 10);
}
function nowFor(phase) {
  const t = store.get(`clock:${phase}`, CLOCK[phase]);
  const late = phase === "COOK_REPLY" && $("#late").checked ? "08:25" : t;
  const morning = late < "12:00";
  return `${istDay(morning ? 1 : 0)} ${late}`;
}

// ---- health
async function loadHealth() {
  const box = $("#health");
  const dots = [];
  try {
    const h = await api("GET", "rails/health");
    const checks = h.checks || h;
    for (const [k, v] of Object.entries(checks)) {
      if (!v || typeof v !== "object" || !("ok" in v)) continue;
      dots.push(`<span class="hdot ${v.ok ? "ok" : "bad"}" title="${esc(v.detail || "")}"><i></i>${esc(k.replace(/_/g, " "))}</span>`);
    }
  } catch (e) {
    dots.push(`<span class="hdot bad" title="${esc(e.message)}"><i></i>rails</span>`);
  }
  const s = status && status.session;
  dots.push(`<span class="hdot ${s && s.valid ? "ok" : "bad"}"><i></i>AgenticOrg</span>`);
  box.innerHTML = dots.join("");
  const sess = $("#session");
  if (s) {
    sess.textContent = s.valid ? `Session ${s.minutes_left} min` : "Session expired";
    sess.className = `pill ${!s.valid ? "red" : s.minutes_left < 15 ? "haldi" : "green"}`;
  }
  if (box.querySelector(".bad") && $("#recording").checked) toast("Health red hai: recording mat shuru karo", true);
}

// ---- clock status and phases
async function loadStatus() {
  try {
    status = await api("GET", "clock/status");
  } catch (e) {
    status = null;
    $("#run-body").innerHTML = `<span style="color:var(--red)">Clock tak nahi pahunche: ${esc(e.message)}</span>`;
  }
  renderPhases();
  renderRun();
}

function expectedPhase() {
  const st = currentStep();
  if (st && st.do && st.do.type === "fire") return st.do.phase;
  if (!status || !status.last) return "SHORTLIST";
  let latest = null;
  for (const p of PHASES) {
    const l = status.last[p];
    if (l && (!latest || String(l.at_ist || l.started_ist) > String(latest.at))) latest = { p, at: l.at_ist || l.started_ist };
  }
  if (!latest) return "SHORTLIST";
  return PHASES[Math.min(PHASES.indexOf(latest.p) + 1, PHASES.length - 1)];
}

function renderPhases() {
  const inflight = status && status.inflight && Date.now() - status.inflight.started_ms < 10 * 60e3 ? status.inflight : null;
  const next = expectedPhase();
  $("#phases").innerHTML = PHASES.map((p) => {
    const l = status && status.last && status.last[p];
    const running = inflight && inflight.phase === p;
    const secs = running ? Math.round((Date.now() - inflight.started_ms) / 1000) : 0;
    const lastTxt = running ? `<span class="spin"></span> ${secs}s` : l ? `${esc(l.status || "")}<br>${esc(String(l.at_ist || "").slice(11, 16))}${l.ms ? ` · ${Math.round(l.ms / 1000)}s` : ""}` : "";
    return `<button class="phase ${running ? "running" : p === next && !inflight ? "next" : ""}" data-phase="${p}" ${inflight || busy ? "disabled" : ""}>
      <b>${p.replace("_", " ")}</b><span class="last">${lastTxt}</span><span class="t">${esc(LABEL[p])} · ${esc(nowFor(p).slice(11))}</span></button>`;
  }).join("");
}

function renderRun() {
  const inflight = status && status.inflight;
  const state = $("#run-state");
  if (inflight && Date.now() - inflight.started_ms < 10 * 60e3) {
    state.className = "pill haldi";
    state.innerHTML = `<span class="spin" style="border-color:rgba(0,0,0,.2);border-top-color:#000"></span> ${esc(inflight.phase)}`;
    $("#run-body").innerHTML = `<div class="kv"><span>Shuru</span><span>${esc(inflight.started_ist || "")}</span><span>NOW</span><span>${esc(inflight.now || "")}</span></div>`;
    return;
  }
  const all = status && status.last ? PHASES.map((p) => status.last[p] && { p, ...status.last[p] }).filter(Boolean) : [];
  const l = all.sort((a, b) => String(b.at_ist || "").localeCompare(String(a.at_ist || "")))[0];
  if (!l) {
    state.className = "pill grey";
    state.textContent = "Idle";
    return;
  }
  const ok = /hitl|complete/.test(l.status || "");
  state.className = `pill ${ok ? "green" : "red"}`;
  state.textContent = `${l.p} · ${l.status}`;
  $("#run-body").innerHTML = `<div class="kv">
    <span>Run id</span><span>${esc(l.run_id || "")}</span>
    <span>Kab</span><span>${esc(String(l.at_ist || "").slice(0, 16))}${l.ms ? ` · ${Math.round(l.ms / 1000)}s` : ""}</span>
    <span>Decisions</span><span>${esc(l.decisions_count ?? "")}</span>
    ${l.error ? `<span>Error</span><span style="color:var(--red)">${esc(l.error)}</span>` : ""}
    ${l.tag || l.recording_tag ? `<span>Tag</span><span>${esc(l.tag || l.recording_tag)}</span>` : ""}
  </div>`;
}

async function fire(phase) {
  if (busy) return;
  busy = true;
  renderPhases();
  const tag = $("#recording").checked ? store.get("rectag", run) : null;
  try {
    const r = await api("POST", "clock/fire", { phase, now_ist: nowFor(phase), agent: "Baari", recording_tag: tag || undefined });
    toast(`${phase} chala${r.run_id ? ` · ${r.run_id}` : ""}`);
  } catch (e) {
    toast(`${phase} nahi chala: ${e.message}`, true);
  } finally {
    busy = false;
    loadStatus();
  }
}
$("#phases").addEventListener("click", (e) => {
  const b = e.target.closest("[data-phase]");
  if (b && !b.disabled) fire(b.dataset.phase);
});

// ---- demo clock
function renderClock() {
  $("#clock").innerHTML = PHASES.map((p) => `<label>${p.replace("_", " ").slice(0, 10)}<input data-clock="${p}" value="${esc(store.get(`clock:${p}`, CLOCK[p]))}" pattern="\\d{2}:\\d{2}" aria-label="${p} time"></label>`).join("");
}
$("#clock").addEventListener("change", (e) => {
  const p = e.target.dataset.clock;
  if (p && /^\d{2}:\d{2}$/.test(e.target.value)) store.set(`clock:${p}`, e.target.value);
  renderPhases();
});
$("#late").addEventListener("change", renderPhases);

// ---- auto-advance
$("#auto").addEventListener("change", async (e) => {
  try {
    await api("POST", "clock/auto", { on: e.target.checked, seconds: Number($("#auto-s").value) || 20 });
    toast(e.target.checked ? "Auto-advance on" : "Auto-advance off");
  } catch (err) {
    e.target.checked = !e.target.checked;
    toast(err.message, true);
  }
});

// ---- stepper
function currentStep() {
  const s = scripts[run];
  return s && s.steps[Math.max(0, Math.min(step, s.steps.length - 1))];
}
function renderRuns() {
  $("#runs").innerHTML = Object.entries(scripts).map(([k, v]) => `<button class="${k === run ? "on" : ""}" data-run="${k}" title="${esc(v.title)}">${esc(v.title.split(",")[0])}</button>`).join("");
}
function renderStep() {
  const s = scripts[run];
  if (!s) return;
  step = Math.max(0, Math.min(step, s.steps.length - 1));
  store.set(`step:${run}`, step);
  const st = s.steps[step];
  $("#step-n").textContent = step + 1;
  $("#step-of").textContent = `of ${s.steps.length} · ${s.title}`;
  $("#step-screen").textContent = st.screen || "";
  $("#step-screen").style.display = st.screen ? "" : "none";
  $("#step-say").textContent = st.say;
  $("#step-human").textContent = st.human || "";
  $("#step-expect").textContent = st.expect || "";
  const d = st.do || { type: "note" };
  const btn = $("#do");
  btn.textContent = d.type === "fire" ? `${d.phase.replace("_", " ")} chalao` : d.type === "reset" ? "Reset day" : d.type === "preset" ? `Preset: ${d.name}` : "Ho gaya, aage";
  btn.className = `btn big ${d.type === "reset" ? "danger" : "primary"}`;
  $("#prev").disabled = step === 0;
  $("#next").disabled = step === s.steps.length - 1;
  $("#steps").innerHTML = s.steps.map((x, i) => `<li class="${i === step ? "on" : i < step ? "done" : ""}" data-i="${i}"><span class="n">${i + 1}</span><span>${esc(x.say.slice(0, 64))}${x.say.length > 64 ? "…" : ""}</span><span>${x.do && x.do.type === "fire" ? `<span class="pill grey">${esc(x.do.phase)}</span>` : ""}</span></li>`).join("");
  if (d.type === "fire" && d.late !== undefined) $("#late").checked = !!d.late;
  renderPhases();
}
$("#runs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-run]");
  if (!b) return;
  run = b.dataset.run;
  store.set("run", run);
  step = store.get(`step:${run}`, 0);
  renderRuns();
  renderStep();
});
$("#steps").addEventListener("click", (e) => {
  const li = e.target.closest("[data-i]");
  if (li) (step = Number(li.dataset.i)), renderStep();
});
$("#prev").addEventListener("click", () => (step--, renderStep()));
$("#next").addEventListener("click", () => (step++, renderStep()));
$("#do").addEventListener("click", async () => {
  const d = (currentStep() || {}).do || { type: "note" };
  if (d.type === "fire") await fire(d.phase);
  else if (d.type === "reset") await resetDay();
  else if (d.type === "preset") await preset(d.name);
  step++;
  renderStep();
});
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, select, textarea")) return;
  if (e.key === "ArrowRight") (step++, renderStep());
  if (e.key === "ArrowLeft") (step--, renderStep());
});

// ---- scenarios
async function preset(name) {
  try {
    const r = await api("POST", "rails/preset", { name });
    activePreset = name;
    toast(`${r.label || name} set`);
  } catch (e) {
    toast(e.message, true);
  }
  loadOverrides();
}
async function loadOverrides() {
  try {
    const r = await api("GET", "rails/scenario");
    const list = r.overrides || r.active || r;
    const n = Array.isArray(list) ? list.length : Object.keys(list || {}).length;
    $("#overrides").textContent = n ? `${n} override active` : "Sab normal";
  } catch {
    $("#overrides").textContent = "";
  }
  document.querySelectorAll("[data-preset]").forEach((b) => b.classList.toggle("on", b.dataset.preset === activePreset));
}
function renderScenarios() {
  $("#run-presets").innerHTML = RUN_PRESETS.map(([k, l]) => `<button class="chip" data-preset="${k}">${esc(l)}</button>`).join("");
  $("#chaos").innerHTML = CHAOS.map(([k, l, f]) => `<button data-preset="${k}"><b>${esc(l)}</b><span>${esc(f)}</span></button>`).join("");
  $("#eval-presets").innerHTML = Array.from({ length: 10 }, (_, i) => `E${String(i + 1).padStart(2, "0")}`).map((k) => `<button class="chip" data-preset="${k}">${k}</button>`).join("");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-preset]");
  if (b) preset(b.dataset.preset);
});
$("#clear").addEventListener("click", async () => {
  try {
    await api("POST", "rails/scenario", { endpoint: "all", scenario: "normal" });
    activePreset = null;
    toast("Sab overrides hataye");
  } catch (e) {
    toast(e.message, true);
  }
  loadOverrides();
});
async function resetDay() {
  if (!confirm("Naya din: overrides clear, Telegram mark, Reserve Pay reseed. Cast rahega. Pakka?")) return;
  try {
    await api("POST", "rails/reset-day", {});
    activePreset = null;
    toast("Naya din shuru");
  } catch (e) {
    toast(e.message, true);
  }
  loadOverrides();
}
$("#reset").addEventListener("click", resetDay);

// ---- cast
async function loadCast() {
  try {
    const c = await api("GET", "rails/cast");
    const cast = c.cast || c;
    $("#solo").checked = !!cast.solo;
    $("#cast").innerHTML = ROLES.map((r) => {
      const bound = cast.roles && cast.roles[r];
      const sim = bound && String(bound).startsWith("sim-");
      const link = `https://t.me/${BOT}?start=role_${r.toLowerCase()}`;
      return `<div class="role"><a href="${link}" target="_blank" rel="noopener" title="${esc(link)}">${qr(link)}</a><div><b>${r}</b><span class="who ${bound && !sim ? "ok" : ""}">${bound ? (sim ? "eval sim chat" : "phone bound") : cast.solo && r !== "Vinay" ? "solo: operator ke phone pe" : "scan karke bind karo"}</span></div></div>`;
    }).join("");
    if (Object.values(cast.roles || {}).some((v) => String(v || "").startsWith("sim-"))) toast("Cast abhi eval mode mein hai (sim chats). Eval round khatam hone do.", true);
  } catch (e) {
    $("#cast").innerHTML = `<span class="muted small">${esc(e.message)}</span>`;
  }
}
function qr(text) {
  try {
    const q = window.qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createImgTag(2, 4).replace("<img", '<img alt="QR code for the role link"');
  } catch {
    return '<span class="qr"></span>';
  }
}
$("#solo").addEventListener("change", async (e) => {
  try {
    await api("POST", "rails/cast", { solo: e.target.checked });
    toast(e.target.checked ? "Solo mode on" : "Solo mode off");
  } catch (err) {
    toast(err.message, true);
  }
  loadCast();
});

// ---- say it for them (rehearsal only)
$("#say-go").addEventListener("click", async () => {
  const role = $("#say-role").value;
  const kind = $("#say-kind").value;
  const text = $("#say-text").value.trim();
  if (!text) return toast("Kuch likho pehle", true);
  const body = { role, kind };
  if (kind === "voice") (body.audio_text = text), (body.lang = "hi-IN");
  else if (kind === "button") body.button_data = text.startsWith("vote:") ? text : `vote:${text}`;
  else body.text = text;
  $("#say-go").disabled = true;
  try {
    await api("POST", "rails/inject", body);
    toast(`${role} ne bheja`);
    $("#say-text").value = "";
  } catch (e) {
    toast(e.message, true);
  } finally {
    $("#say-go").disabled = false;
  }
});

// ---- recording mode
function applyRecording() {
  const on = $("#recording").checked;
  $("#frame").classList.toggle("rec", on);
  $("#rec-label").textContent = on ? "Recording" : "Rehearsal";
  $("#sayit").classList.toggle("off", on);
}
$("#recording").addEventListener("change", async (e) => {
  const on = e.target.checked;
  try {
    await api("POST", "rails/recording", on ? { tag: run } : { on: false });
    store.set("rectag", run);
    toast(on ? `Recording on, runs tagged ${run}` : "Recording off");
  } catch (err) {
    e.target.checked = !on;
    toast(err.message, true);
  }
  applyRecording();
});

async function refreshAll() {
  await loadStatus();
  loadHealth();
  loadCast();
  loadOverrides();
}

(async () => {
  renderClock();
  renderScenarios();
  scripts = await (await fetch("/dev/scripts.json")).json();
  if (!scripts[run]) run = "run1";
  renderRuns();
  renderStep();
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
  s.onload = loadCast;
  document.head.appendChild(s);
  if (!key) askKey();
  else refreshAll();
  setInterval(() => document.visibilityState === "visible" && key && loadStatus(), 2000);
  setInterval(() => document.visibilityState === "visible" && key && loadHealth(), 20000);
  setInterval(renderPhases, 1000);
})();
