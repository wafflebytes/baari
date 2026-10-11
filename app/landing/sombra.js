// Footer dawn, composed in Sombra (sombra.design) and ported from its React
// export to plain DOM. Five layers share nine stepped bars; each layer is one
// colour with a vertical opacity envelope and a 15px blur, and rises from the
// bottom. Colours run night to haldi to cream, the end of the night section.
const BARS = [
  "M 0 240.24 L 141.22 240.24 L 141.22 659 L 0 659 Z",
  "M 141.22 171.76 L 282.44 171.76 L 282.44 659 L 141.22 659 Z",
  "M 282.44 108.62 L 423.67 108.62 L 423.67 659 L 282.44 659 Z",
  "M 423.67 52.89 L 564.89 52.89 L 564.89 659 L 423.67 659 Z",
  "M 564.89 11.98 L 738.59 11.98 L 738.59 659 L 564.89 659 Z",
  "M 738.59 52.89 L 879.81 52.89 L 879.81 659 L 738.59 659 Z",
  "M 879.81 108.62 L 1021.04 108.62 L 1021.04 659 L 879.81 659 Z",
  "M 1021.04 171.76 L 1162.26 171.76 L 1162.26 659 L 1021.04 659 Z",
  "M 1162.26 240.24 L 1303.48 240.24 L 1303.48 659 L 1162.26 659 Z",
];
// [colour, [offset %, opacity] stops from the bottom up], top layer first
const LAYERS = [
  ["#fff1c7", [[0, 0], [80, 0], [80.08, 0.033], [80.31, 0.108], [80.78, 0.2], [81.56, 0.276], [82.5, 0.317], [83.75, 0.338], [85, 0.342], [87.5, 0.325], [90, 0.29], [92.5, 0.242], [95, 0.179], [97.5, 0.1], [100, 0]]],
  ["#f2b705", [[0, 0], [58, 0], [58.001, 0.9], [58.34, 0.909], [69, 0.905], [80, 0.9], [81.25, 0.791], [82.5, 0.689], [83.75, 0.594], [85, 0.506], [86.25, 0.425], [87.5, 0.352], [88.75, 0.285], [90, 0.225], [91.25, 0.172], [92.5, 0.127], [93.75, 0.088], [95, 0.056], [96.25, 0.032], [97.5, 0.014], [98.75, 0.004], [100, 0]]],
  ["#ec5b7e", [[0, 0], [30, 0], [30.001, 1], [58, 1], [60.75, 0.864], [63.5, 0.731], [66.25, 0.602], [69, 0.475], [71.75, 0.352], [74.5, 0.231], [77.25, 0.114], [80, 0], [100, 0]]],
  ["#6a3e8e", [[0, 0], [0.001, 1], [30, 1], [58, 0], [100, 0]]],
  ["#1c1a3f", [[0, 1], [30, 0], [100, 0]]],
];
const BLUR = 15, DUR = 1100, PAD = BLUR * 4;
const B = { minX: 0, minY: 11.98, maxX: 1303.48, maxY: 659 };

export function mountDawn(box, trigger) {
  if (!box) return;
  const defs = LAYERS.map(([c, stops], i) => `
    <linearGradient id="dawn-${i}-f" gradientUnits="objectBoundingBox" x1="0" y1="1" x2="0" y2="0">${stops.map(([o, a]) => `<stop offset="${o}%" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>
    <filter id="dawn-${i}-b" filterUnits="userSpaceOnUse" x="${B.minX - PAD}" y="${B.minY - PAD}" width="${B.maxX - B.minX + PAD * 2}" height="${B.maxY - B.minY + PAD * 2}"><feGaussianBlur stdDeviation="${BLUR}"/></filter>`).join("");
  const groups = LAYERS.map((_, i) => `<g class="dawn-l" style="transform-box:view-box;transform-origin:50% 100%;transform:scaleY(0)"><g fill="url(#dawn-${i}-f)" filter="url(#dawn-${i}-b)">${BARS.map((d) => `<path d="${d}"/>`).join("")}</g></g>`).join("");
  box.innerHTML = `<svg viewBox="0 0 1271 599" preserveAspectRatio="none" width="100%" height="100%" fill="none"><defs>${defs}</defs>${groups}</svg>`;

  const layers = [...box.querySelectorAll(".dawn-l")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = (on) => layers.forEach((g, i) => {
    g.style.transition = on && !reduce ? `transform ${DUR + i * 90}ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms` : "none";
    g.style.transform = on ? "scaleY(1)" : "scaleY(0)";
  });
  if (reduce) return show(true);
  // rises every time the footer comes into view, settles back when it leaves
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) requestAnimationFrame(() => requestAnimationFrame(() => show(true)));
    else show(false);
    trigger?.classList.toggle("up", e.isIntersecting);
  }, { threshold: 0.15 }).observe(trigger || box);
}
