// The face editor: a big face up top, a row of text tabs, and a grid of
// choices under it. Shapes (hair, beard, eyes, smile) show as little faces
// wearing that choice, so you pick by looking, not by name. Colours are
// swatches. The dice rolls a whole new face. Used in onboarding and in
// "Edit family".
import { PARTS, TINTS, faceUri, shuffleLook } from "./avatars.js";
import { mx } from "./icons.js";

const TABS = [
  ["hair", ["Hair", "Baal", "बाल"]], ["skin", ["Skin", "Rang", "रंग"]], ["hairColor", ["Hair colour", "Baal ka rang", "बालों का रंग"]],
  ["beard", ["Beard", "Daadhi", "दाढ़ी"]], ["eyes", ["Eyes", "Aankhen", "आँखें"]], ["mouth", ["Smile", "Muskaan", "मुस्कान"]],
  ["cloth", ["Clothes", "Kapde", "कपड़े"]], ["tint", ["Backdrop", "Peeche", "पीछे"]],
];
const TINT_HEX = { sand: "#FBEFD9", rose: "#FBE4E8", sky: "#E2EEFA", mint: "#DFF2E7", clay: "#F5E3D8", stone: "#ECEAE5" };
const SHAPE = { hair: 1, beard: 1, eyes: 1, mouth: 1 };
const li = (ui) => ["en", "hing", "hi"].indexOf(ui);

function opts(st, tab) {
  if (tab === "tint") return TINTS.map((t) => `<button type="button" class="fe-sw ${st.tint === t ? "on" : ""}" data-fe-v="${t}" style="--c:${TINT_HEX[t]}" aria-label="${t}"></button>`).join("");
  if (!SHAPE[tab]) return PARTS[tab].map((c) => `<button type="button" class="fe-sw ${st.look[tab] === c ? "on" : ""}" data-fe-v="${c}" style="--c:#${c}" aria-label="#${c}"></button>`).join("");
  return PARTS[tab].map((v) => `<button type="button" class="fe-th t-${st.tint} ${st.look[tab] === v ? "on" : ""}" data-fe-v="${v}" aria-label="${v}"><img src="${faceUri({ ...st.look, [tab]: v })}" alt="" loading="lazy" decoding="async"></button>`).join("");
}

export function editorHtml(st, ui = "hing") {
  return `<div class="fe" data-fe data-tab="hair">
    <div class="fe-stage"><span class="av pf t-${st.tint} fe-big" data-fe-big><img src="${faceUri(st.look)}" alt=""></span>
      <button type="button" class="fe-dice" data-fe-dice aria-label="${["New face", "Naya chehra", "नया चेहरा"][li(ui)]}">${mx("refresh")}</button></div>
    <div class="fe-tabs" role="tablist" data-nopull>${TABS.map(([k, l]) => `<button type="button" role="tab" data-fe-tab="${k}" aria-selected="${k === "hair"}">${l[li(ui)]}</button>`).join("")}</div>
    <div class="fe-opts ${SHAPE.hair ? "shapes" : ""}" data-fe-opts>${opts(st, "hair")}</div>
  </div>`;
}

// st is { look, tint } and is changed in place; onChange runs after each pick.
export function wireEditor(root, st, onChange) {
  const box = root.querySelector("[data-fe]");
  const big = box.querySelector("[data-fe-big]");
  const grid = box.querySelector("[data-fe-opts]");
  const pop = () => {
    big.className = `av pf t-${st.tint} fe-big`;
    const img = big.querySelector("img");
    img.src = faceUri(st.look);
    big.classList.remove("fpop"); void big.offsetWidth; big.classList.add("fpop");
  };
  const fill = (tab, anim) => {
    box.dataset.tab = tab;
    grid.className = `fe-opts ${SHAPE[tab] ? "shapes" : "swatches"}`;
    grid.innerHTML = opts(st, tab);
    if (anim) { grid.classList.remove("in"); void grid.offsetWidth; grid.classList.add("in"); }
  };
  box.addEventListener("click", (e) => {
    const t = e.target.closest("[data-fe-tab]");
    if (t) {
      box.querySelectorAll("[data-fe-tab]").forEach((b) => b.setAttribute("aria-selected", String(b === t)));
      t.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      fill(t.dataset.feTab, true);
      return;
    }
    const v = e.target.closest("[data-fe-v]");
    if (v) {
      const tab = box.dataset.tab;
      if (tab === "tint") st.tint = v.dataset.feV; else st.look[tab] = v.dataset.feV;
      grid.querySelectorAll("[data-fe-v]").forEach((b) => b.classList.toggle("on", b === v));
      if (tab === "tint" || tab === "skin" || tab === "hairColor" || tab === "cloth") grid.querySelectorAll(".fe-th").forEach((b) => { b.className = `fe-th t-${st.tint} ${b.classList.contains("on") ? "on" : ""}`; });
      pop();
      onChange && onChange(st, tab);
      return;
    }
    if (e.target.closest("[data-fe-dice]")) {
      st.look = shuffleLook();
      st.tint = TINTS[Math.floor(Math.random() * TINTS.length)];
      const d = box.querySelector("[data-fe-dice]");
      d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll");
      pop();
      fill(box.dataset.tab, false);
      onChange && onChange(st, "dice");
    }
  });
}
