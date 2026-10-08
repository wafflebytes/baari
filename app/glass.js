// GlassSurface from React Bits, ported to plain DOM. Chrome refracts what's
// behind the element through an SVG displacement filter; Safari and Firefox
// can't use an SVG filter as a backdrop-filter, so they get the frosted
// fallback, and so does Android. Same props, same CSS classes as the React version.
let n = 0;
// One colour channel each, alpha kept.
const M = ["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"];
const DEF = {
  borderRadius: 20, borderWidth: 0.07, brightness: 50, opacity: 0.93, blur: 11, displace: 0,
  backgroundOpacity: 0, saturation: 1, distortionScale: -180, redOffset: 0, greenOffset: 10, blueOffset: 20,
  xChannel: "R", yChannel: "G", mixBlendMode: "difference",
};

function supportsSVG(id) {
  const ua = navigator.userAgent;
  if ((/Safari/.test(ua) && !/Chrome|Chromium|CriOS/.test(ua)) || /Firefox|FxiOS/.test(ua)) return false;
  // Android Chrome can run the refraction, but on a phone screen it reads as
  // too much glass. It gets the same frosted pill iOS Safari shows.
  if (/Android/.test(ua)) return false;
  const d = document.createElement("div");
  d.style.backdropFilter = `url(#${id})`;
  return d.style.backdropFilter !== "";
}

export function glass(el, props = {}) {
  const o = { ...DEF, ...props };
  const id = `glass-${++n}`;
  const svgOk = supportsSVG(id);
  el.classList.add("glass-surface", svgOk ? "glass-surface--svg" : "glass-surface--fallback");
  el.style.setProperty("--glass-frost", o.backgroundOpacity);
  el.style.setProperty("--glass-saturation", o.saturation);
  el.style.setProperty("--filter-id", `url(#${id})`);
  if (!svgOk) return;
  const ns = "http://www.w3.org/2000/svg";
  const wrap = document.createElementNS(ns, "svg");
  wrap.setAttribute("class", "glass-surface__filter");
  wrap.innerHTML = `<defs><filter id="${id}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
    <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>
    ${["red", "green", "blue"].map((c, i) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${o.distortionScale + [o.redOffset, o.greenOffset, o.blueOffset][i]}" xChannelSelector="${o.xChannel}" yChannelSelector="${o.yChannel}" result="d${c}"/>
    <feColorMatrix in="d${c}" type="matrix" values="${M[i]}" result="${c}"/>`).join("")}
    <feBlend in="red" in2="green" mode="screen" result="rg"/>
    <feBlend in="rg" in2="blue" mode="screen" result="output"/>
    <feGaussianBlur in="output" stdDeviation="${o.displace || 0.7}"/>
  </filter></defs>`;
  el.prepend(wrap);
  const img = wrap.querySelector("feImage");
  const map = () => {
    const r = el.getBoundingClientRect();
    const w = r.width || 400, h = r.height || 200;
    const edge = Math.min(w, h) * (o.borderWidth * 0.5);
    const rad = Math.min(o.borderRadius, h / 2);
    const svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>
      <linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="black"/>
      <rect width="${w}" height="${h}" rx="${rad}" fill="url(#r)"/>
      <rect width="${w}" height="${h}" rx="${rad}" fill="url(#b)" style="mix-blend-mode:${o.mixBlendMode}"/>
      <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${rad}" fill="hsl(0 0% ${o.brightness}% / ${o.opacity})" style="filter:blur(${o.blur}px)"/></svg>`;
    img.setAttribute("href", `data:image/svg+xml,${encodeURIComponent(svg)}`);
  };
  map();
  new ResizeObserver(() => setTimeout(map, 0)).observe(el);
}
