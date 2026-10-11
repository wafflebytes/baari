// Flat illustrations for the hero flanks and the closing scene: Baari's own
// characters (a haldi blob with a karchi, a samosa, a tomato, a green chilli)
// and the small things that float around them. Every piece is an SVG string;
// layouts place them in a fixed box that CSS scales.
import { faceUri, LOOKS } from "/avatars.js";

const INK = "#1D1B17";
const limb = (d) => `<path class="lb" d="${d}"/>`;
const shoe = (cx, cy, c) => `<ellipse cx="${cx}" cy="${cy}" rx="13" ry="8" fill="${c}"/>`;
const pivot = (x, y) => `style="transform-origin:${x}px ${y}px"`;
const eyesOpen = (x1, x2, y) =>
  `<g class="m-eyes" ${pivot((x1 + x2) / 2, y)}><ellipse cx="${x1}" cy="${y}" rx="7.5" ry="11" fill="${INK}"/><ellipse cx="${x2}" cy="${y}" rx="7.5" ry="11" fill="${INK}"/><circle cx="${x1 + 2.5}" cy="${y - 4}" r="2.4" fill="#fff"/><circle cx="${x2 + 2.5}" cy="${y - 4}" r="2.4" fill="#fff"/></g>`;
const cheeks = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="9" ry="6" fill="#FF7A59" opacity=".55"/><ellipse cx="${x2}" cy="${y}" rx="9" ry="6" fill="#FF7A59" opacity=".55"/>`;

const M = {
  blob() {
    const cx = 125, cy = 112, bumps = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
      return `<circle cx="${(cx + Math.cos(a) * 64).toFixed(1)}" cy="${(cy + Math.sin(a) * 64).toFixed(1)}" r="40"/>`;
    }).join("");
    return `<svg viewBox="0 0 250 260" class="m">
      <g class="m-arm" ${pivot(62, 128)}>${limb("M62 128 Q36 134 22 158")}</g>
      <g class="m-arm m-wave" ${pivot(188, 120)}>${limb("M188 120 Q212 110 222 86")}<path d="M222 88 L229 36" stroke="#9B6A3C" stroke-width="6" stroke-linecap="round"/><ellipse cx="230" cy="30" rx="16" ry="9.5" fill="#CFC9BE"/><ellipse cx="230" cy="28" rx="10" ry="5" fill="#ECE8E0"/></g>
      <g class="m-leg" ${pivot(104, 196)}>${limb("M104 196 L94 236")}${shoe(88, 240, "#FF4B1F")}</g>
      <g class="m-leg m-leg2" ${pivot(146, 196)}>${limb("M146 196 L156 236")}${shoe(162, 240, "#FF4B1F")}</g>
      <g fill="#FFC93C"><circle cx="${cx}" cy="${cy}" r="72"/>${bumps}</g>
      <circle cx="92" cy="66" r="17" fill="#FFE291" opacity=".9"/><circle cx="70" cy="86" r="7" fill="#FFE291" opacity=".9"/>
      ${eyesOpen(108, 142, 106)}${cheeks(92, 158, 128)}
      <path d="M112 130 Q125 143 138 130" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>
    </svg>`;
  },
  samosa() {
    return `<svg viewBox="0 0 200 230" class="m">
      <g class="m-arm" ${pivot(48, 128)}>${limb("M48 128 Q26 136 14 154")}</g>
      <g class="m-arm m-wave" ${pivot(152, 124)}>${limb("M152 124 Q176 114 186 92")}</g>
      <g class="m-leg" ${pivot(82, 158)}>${limb("M82 158 L74 204")}${shoe(68, 208, "#20C26B")}</g>
      <g class="m-leg m-leg2" ${pivot(118, 158)}>${limb("M118 158 L128 204")}${shoe(134, 208, "#20C26B")}</g>
      <path d="M100 16 C107 16 111 20 114 26 L176 146 C182 158 176 166 164 166 L36 166 C24 166 18 158 24 146 L86 26 C89 20 93 16 100 16 Z" fill="#F5B942"/>
      <path d="M114 26 L176 146 C182 158 176 166 164 166 L150 166 L106 38 Z" fill="#E59A2B" opacity=".75"/>
      <path d="M88 36 L42 132" stroke="#FFE1A0" stroke-width="7" stroke-linecap="round" opacity=".85"/>
      <path d="M42 158 q7 -7 14 0 q7 -7 14 0 q7 -7 14 0 q7 -7 14 0 q7 -7 14 0 q7 -7 14 0 q7 -7 14 0 q7 -7 14 0" stroke="#D98A1E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="m-eyes" ${pivot(101, 104)}><path d="M78 106 Q86 96 94 106 M108 106 Q116 96 124 106" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/></g>
      ${cheeks(74, 128, 120)}
      <path d="M90 118 Q101 132 112 118 Z" fill="#7A2E12" stroke="#7A2E12" stroke-width="3" stroke-linejoin="round"/>
    </svg>`;
  },
  tomato() {
    return `<svg viewBox="0 0 200 210" class="m">
      <g class="m-arm" ${pivot(44, 118)}>${limb("M44 118 Q24 112 12 98")}</g>
      <g class="m-arm m-wave" ${pivot(156, 116)}>${limb("M156 116 Q178 120 190 136")}</g>
      <g class="m-leg" ${pivot(86, 164)}>${limb("M86 164 L76 196")}${shoe(70, 199, "#FFC93C")}</g>
      <g class="m-leg m-leg2" ${pivot(114, 164)}>${limb("M114 164 L126 194")}${shoe(132, 197, "#FFC93C")}</g>
      <circle cx="100" cy="112" r="62" fill="#FF4B1F"/>
      <path d="M146 76 A62 62 0 0 1 120 171 A70 70 0 0 0 146 76 Z" fill="#D9300B" opacity=".5"/>
      <ellipse cx="74" cy="84" rx="15" ry="9" fill="#fff" opacity=".42" transform="rotate(-32 74 84)"/>
      <path d="M100 60 L86 40 L100 47 L113 36 L109 54 L127 52 L111 64 L89 64 L73 53 Z" fill="#20C26B" stroke="#20C26B" stroke-width="3" stroke-linejoin="round"/>
      <path d="M100 47 L103 28" stroke="#138A47" stroke-width="5" stroke-linecap="round"/>
      <g class="m-eyes" ${pivot(100, 112)}><path d="M76 110 Q84 119 92 110 M108 110 Q116 119 124 110" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/></g>
      ${cheeks(72, 128, 126)}
      <path d="M93 130 Q100 137 107 130" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    </svg>`;
  },
  chilli() {
    return `<svg viewBox="0 0 230 150" class="m">
      <g class="m-leg" ${pivot(112, 90)}>${limb("M112 90 L100 130")}${shoe(94, 133, "#FF4B1F")}</g>
      <g class="m-leg m-leg2" ${pivot(148, 82)}>${limb("M148 82 L160 122")}${shoe(166, 125, "#FF4B1F")}</g>
      <g class="m-arm m-wave" ${pivot(70, 96)}>${limb("M70 96 Q56 112 52 132")}</g>
      <path d="M40 66 C70 30 160 26 204 52 C214 58 212 74 200 74 C164 72 96 86 58 102 C38 110 26 84 40 66 Z" fill="#20C26B"/>
      <path d="M58 102 C96 86 164 72 200 74 C190 82 150 86 112 96 C92 102 72 110 58 102 Z" fill="#159A52"/>
      <path d="M66 58 C96 42 144 38 182 50" stroke="#7BE6A8" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>
      <path d="M42 66 C30 56 26 42 36 30" stroke="#127A42" stroke-width="8" stroke-linecap="round" fill="none"/>
      <ellipse cx="44" cy="70" rx="10" ry="15" fill="#138A47" transform="rotate(-24 44 70)"/>
      <g class="m-eyes" ${pivot(90, 62)}><path d="M72 66 Q78 57 84 66 M96 62 Q102 53 108 62" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" fill="none"/></g>
      <path d="M80 76 Q91 88 102 73 Z" fill="#0D5C30" stroke="#0D5C30" stroke-width="3" stroke-linejoin="round"/>
    </svg>`;
  },
};

const S = {
  coin: () => `<svg viewBox="0 0 80 80" class="coin"><circle cx="40" cy="40" r="36" fill="#FFC93C"/><circle cx="40" cy="40" r="27" fill="#FFDA6B" stroke="#EDA900" stroke-width="3"/><text x="40" y="53" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="34" fill="#DB9400">₹</text><path d="M18 30 A24 24 0 0 1 32 16" stroke="#FFF2C2" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`,
  star: (c = "#FFC93C") => {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 24; return `${(30 + Math.cos(a) * r).toFixed(1)},${(31 + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
    return `<svg viewBox="0 0 60 60" class="twk"><polygon points="${pts}" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/></svg>`;
  },
  spark: (c = "var(--art-soft)") => `<svg viewBox="0 0 60 60" class="twk"><path d="M30 4 C32 22 38 28 56 30 C38 32 32 38 30 56 C28 38 22 32 4 30 C22 28 28 22 30 4Z" style="fill:${c}"/></svg>`,
  dot: (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" style="fill:${c}"/></svg>`,
  heart: () => `<svg viewBox="0 0 80 72" class="beat"><path d="M40 68 C16 50 4 36 4 22 C4 10 14 2 25 2 C32 2 37 6 40 11 C43 6 48 2 55 2 C66 2 76 10 76 22 C76 36 64 50 40 68Z" fill="#FF4B1F"/><ellipse cx="22" cy="20" rx="8" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 22 20)"/></svg>`,
  plane: () => `<svg viewBox="0 0 80 80"><polygon points="6,38 74,8 58,70" fill="#3FA9F5"/><polygon points="30,48 74,8 30,68" fill="#1E8BE6"/></svg>`,
  bubble: () => `<svg viewBox="0 0 120 72" class="typing"><rect x="4" y="4" width="112" height="48" rx="24" fill="#20C26B"/><path d="M26 48 L14 68 L46 50 Z" fill="#20C26B"/><circle cx="40" cy="28" r="6.5" fill="#fff"/><circle cx="60" cy="28" r="6.5" fill="#fff"/><circle cx="80" cy="28" r="6.5" fill="#fff"/></svg>`,
  check: () => `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" style="fill:var(--art-soft)"/><path d="M23 42 L35 54 L58 28" stroke="#20C26B" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  lock: () => `<svg viewBox="0 0 80 92"><path d="M23 42 V28 a17 17 0 0 1 34 0 V42" stroke="#EDA900" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="10" y="38" width="60" height="50" rx="14" fill="#FFC93C"/><path d="M18 50 L30 50" stroke="#FFE291" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="60" r="6.5" fill="#DB9400"/><rect x="37" y="62" width="6" height="12" rx="3" fill="#DB9400"/></svg>`,
  jalebi: () => {
    let d = "";
    for (let t = 0.4; t <= Math.PI * 4.4; t += 0.18) { const r = 3 + 2.7 * t; d += `${d ? "L" : "M"}${(45 + Math.cos(t) * r).toFixed(1)} ${(45 + Math.sin(t) * r).toFixed(1)} `; }
    return `<svg viewBox="0 0 90 90" class="spin-slow"><path d="${d}" stroke="#FF8A1F" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="#FFC072" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/></svg>`;
  },
  roti: () => `<svg viewBox="0 0 90 90"><circle cx="45" cy="45" r="41" fill="#EBC88F" stroke="#D9AD6C" stroke-width="3"/><g fill="#C48A45" opacity=".7"><ellipse cx="30" cy="32" rx="6" ry="4"/><ellipse cx="58" cy="28" rx="4" ry="3"/><ellipse cx="54" cy="56" rx="7" ry="4"/><ellipse cx="28" cy="60" rx="4" ry="3"/><ellipse cx="44" cy="44" rx="3" ry="2"/><ellipse cx="68" cy="46" rx="3" ry="2"/></g></svg>`,
  lemon: () => `<svg viewBox="0 0 90 56"><path d="M6 8 A39 39 0 0 0 84 8 Z" fill="#FFE14D" stroke="#F2C200" stroke-width="5" stroke-linejoin="round"/><g stroke="#FFF6C2" stroke-width="3" stroke-linecap="round"><path d="M45 12 L45 40"/><path d="M45 12 L24 34"/><path d="M45 12 L66 34"/><path d="M45 12 L14 18"/><path d="M45 12 L76 18"/></g></svg>`,
  turn: () => `<svg viewBox="0 0 100 100"><path d="M78 46 A30 30 0 1 0 66 74" stroke="#20C26B" stroke-width="14" stroke-linecap="round" fill="none"/><polygon points="64,40 94,38 82,64" fill="#20C26B" stroke="#20C26B" stroke-width="6" stroke-linejoin="round"/></svg>`,
  note: () => `<svg viewBox="0 0 120 140"><rect x="4" y="4" width="112" height="132" rx="16" style="fill:var(--art-soft)"/><g stroke-width="7" stroke-linecap="round" style="stroke:var(--art-line)"><path d="M24 34 H96"/><path d="M24 56 H84"/><path d="M24 78 H96"/><path d="M24 100 H66"/></g></svg>`,
  ring: () => `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" style="fill:var(--art-soft)"/></svg>`,
};

const tile = (who) => `<span class="tile"><img src="${faceUri(LOOKS[who])}" alt=""></span>`;

// [kind, x, y, width, depth, rotation(deg), extra]
const LEFT = [
  ["ring", 330, 320, 270, 0.3], ["ring", 150, 500, 170, 0.3], ["ring", 470, 170, 150, 0.3],
  ["note", 34, 250, 112, 0.6, -10],
  ["dot", 92, 84, 46, 0.9, 0, "#20C26B"], ["coin", 300, 66, 80, 1.2, -18],
  ["star", 420, 92, 38, 1.1, 8], ["spark", 140, 96, 30, 0.8, 0, "var(--art-line)"],
  ["spark", 232, 150, 22, 0.9, 0, "#3FA9F5"], ["spark", 262, 124, 18, 0.9, 0, "#3FA9F5"], ["spark", 204, 162, 15, 0.9, 0, "#3FA9F5"],
  ["blob", 250, 330, 300, 1, -4, null, true],
  ["plane", 572, 150, 60, 1.4, -8], ["heart", 532, 262, 80, 1.3, 12],
  ["dot", 486, 360, 22, 0.8, 0, "var(--art-line)"], ["coin", 470, 432, 70, 1.2, 14],
  ["star", 504, 336, 34, 1, -10], ["dot", 40, 420, 30, 0.9, 0, "#FF4B1F"],
  ["jalebi", 402, 540, 76, 1.1], ["dot", 470, 566, 26, 0.9, 0, "#3FA9F5"],
  ["dot", 300, 592, 58, 1.1, 0, "#FF4B1F"], ["star", 156, 580, 36, 1, 14, "#EDE3CF"],
  ["tile:Mummy", 86, 520, 74, 1.1, -8], ["spark", 560, 520, 28, 0.9, 0, "#FFC93C"],
];
const RIGHT = [
  ["ring", 250, 250, 210, 0.3], ["ring", 440, 460, 240, 0.3], ["ring", 120, 520, 150, 0.3],
  ["tile:Papa", 150, 96, 78, 1.1, -8], ["star", 290, 54, 34, 1, 0], ["check", 420, 76, 82, 1.2],
  ["star", 506, 50, 28, 0.9, 12, "#EDE3CF"], ["bubble", 572, 196, 116, 1.3, 8],
  ["lock", 302, 172, 66, 1.2, 12], ["spark", 62, 214, 30, 0.8, 0, "var(--art-line)"],
  ["dot", 100, 300, 28, 0.9, 0, "var(--art-line)"],
  ["chilli", 188, 300, 200, 1, -10, null, true], ["tomato", 448, 266, 196, 1.15, 6, null, true],
  ["turn", 58, 410, 86, 1.2, -16], ["roti", 288, 410, 72, 1.1, 0],
  ["dot", 236, 456, 22, 0.9, 0, "#20C26B"], ["coin", 520, 410, 78, 1.2, 10],
  ["samosa", 372, 508, 188, 1, 4, null, true], ["dot", 70, 520, 36, 1, 0, "#3FA9F5"],
  ["tile:Sunita", 196, 546, 86, 1.1, 6], ["star", 556, 548, 30, 1, -12],
  ["lemon", 560, 300, 62, 1.1, -20], ["spark", 300, 600, 30, 0.9, 0, "var(--art-line)"], ["star", 110, 600, 26, 0.9, 0, "#FFC93C"],
];
const MOBILE = [
  ["ring", 80, 104, 120, 0.3], ["ring", 290, 110, 120, 0.3],
  ["plane", 26, 34, 34, 1.3, -8], ["spark", 112, 22, 18, 0.9, 0, "#3FA9F5"], ["coin", 158, 150, 42, 1.2, -12],
  ["blob", 76, 112, 124, 1, -4, null, true], ["star", 214, 26, 24, 1, 0], ["tomato", 196, 88, 84, 1.15, 6, null, true],
  ["samosa", 296, 112, 108, 1, 4, null, true], ["heart", 340, 30, 36, 1.3, 12], ["dot", 246, 160, 14, 0.9, 0, "#20C26B"],
  ["dot", 352, 168, 16, 0.9, 0, "#FF4B1F"], ["star", 18, 160, 20, 1, 0, "#EDE3CF"],
];
const SCENE = [
  ["ring", 150, 170, 220, 0.3], ["ring", 380, 150, 180, 0.3],
  ["spark", 70, 40, 26, 0.9, 0, "#FFC93C"], ["coin", 250, 54, 58, 1.2, -14], ["star", 330, 30, 28, 1, 8],
  ["blob", 150, 168, 210, 1, -4, null, true], ["tomato", 450, 84, 116, 1.15, 8, null, true],
  ["samosa", 334, 196, 150, 1, 4, null, true], ["heart", 40, 150, 46, 1.2, -10], ["roti", 250, 262, 56, 1, 0],
  ["star", 500, 220, 26, 1, 0, "#EDE3CF"], ["dot", 470, 270, 18, 0.9, 0, "#20C26B"], ["spark", 520, 150, 22, 0.9, 0, "#3FA9F5"],
];

// fx pulls a flank toward the headline: x stays put at the inner edge
function render(box, layout, fx = (x) => x) {
  box.innerHTML = layout.map(([kind, x0, y, w, z, r = 0, extra, mascot], i) => {
    const x = Math.round(fx(x0));
    const body = kind.startsWith("tile:") ? tile(kind.slice(5)) : M[kind] ? M[kind]() : S[kind](extra || undefined);
    const ring = kind === "ring";
    return `<div class="ha${mascot ? " mascot" : ""}${ring ? " ha-ring" : ""}" style="--x:${x};--y:${y};--w:${w};--z:${z};--r:${r}deg;--i:${i};--t:${(4.6 + ((i * 7) % 5) * 0.6).toFixed(1)}s;--dl:${(-i * 0.7).toFixed(1)}s"><div class="hp"><div class="hh"><div class="hf">${body}</div></div></div></div>`;
  }).join("");
}

// Mouse parallax: each piece drifts by its depth, so the flanks feel layered.
function parallax(zone, boxes) {
  let raf = 0, nx = 0, ny = 0;
  zone.addEventListener("pointermove", (e) => {
    nx = (e.clientX / innerWidth - 0.5) * 2;
    ny = (e.clientY / innerHeight - 0.5) * 2;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      boxes.forEach((b) => { b.style.setProperty("--px", (nx * -16).toFixed(1)); b.style.setProperty("--py", (ny * -12).toFixed(1)); });
    });
  });
  zone.addEventListener("pointerleave", () => boxes.forEach((b) => { b.style.setProperty("--px", 0); b.style.setProperty("--py", 0); }));
}

export function mountArt() {
  const L = document.getElementById("artL"), R = document.getElementById("artR"), Mo = document.getElementById("artM"), Sc = document.getElementById("artScene");
  if (L) render(L, LEFT, (x) => 620 - (620 - x) * 0.82);
  if (R) render(R, RIGHT, (x) => x * 0.82);
  if (Mo) render(Mo, MOBILE);
  if (Sc) render(Sc, SCENE);
  const hero = document.querySelector(".hero");
  if (hero && matchMedia("(hover: hover)").matches) parallax(hero, [L, R].filter(Boolean));
  const cta = document.querySelector(".cta");
  if (cta && Sc && matchMedia("(hover: hover)").matches) parallax(cta, [Sc]);
}
