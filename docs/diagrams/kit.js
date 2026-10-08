// Baari diagram kit: draws labelled orthogonal wires between cards.
//   W.wire("a", "r", "b", "l", { label, hot, dash, red, green, fa, fb, mx, my, via, at, dx, dy, both, none })
// Sides are l, r, t, b; fa and fb slide the anchor along that side (0 to 1).
// Call W.draw(fn) once: it waits for fonts, runs fn, then sets window.__ready.
(() => {
  const qs = new URLSearchParams(location.search);
  if (qs.get("theme") === "dark") document.documentElement.classList.add("dk");
  if (qs.has("slide")) document.documentElement.classList.add("slide");
  const NS = "http://www.w3.org/2000/svg";
  let canvas, svg;
  function setup() {
    canvas = document.querySelector(".canvas");
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "wires");
    svg.innerHTML = `<defs>
      <marker id="ah" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1,1.2 L9,5 L1,8.8 z" style="fill:var(--wire);stroke:none"/></marker>
      <marker id="ahh" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1,1.2 L9,5 L1,8.8 z" style="fill:var(--haldi-lo);stroke:none"/></marker>
      <marker id="ahr" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1,1.2 L9,5 L1,8.8 z" style="fill:var(--red);stroke:none"/></marker>
      <marker id="ahg" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1,1.2 L9,5 L1,8.8 z" style="fill:var(--green);stroke:none"/></marker>
    </defs>`;
    canvas.prepend(svg);
  }
  function box(id) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) throw new Error("no element " + id);
    const c = canvas.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  }
  function anchor(b, side, f = 0.5) {
    if (side === "l") return { x: b.x, y: b.y + b.h * f };
    if (side === "r") return { x: b.x + b.w, y: b.y + b.h * f };
    if (side === "t") return { x: b.x + b.w * f, y: b.y };
    return { x: b.x + b.w * f, y: b.y + b.h };
  }
  const H = (s) => s === "l" || s === "r";
  function route(p, sp, q, sq, o) {
    if (o.via) return [p, ...o.via.map((v) => ({ x: v[0] ?? p.x, y: v[1] ?? p.y })), q];
    if (H(sp) && H(sq)) {
      if (Math.abs(p.y - q.y) < 1) return [p, q];
      const mx = o.mx ?? (p.x + q.x) / 2;
      return [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
    }
    if (!H(sp) && !H(sq)) {
      if (Math.abs(p.x - q.x) < 1) return [p, q];
      const my = o.my ?? (p.y + q.y) / 2;
      return [p, { x: p.x, y: my }, { x: q.x, y: my }, q];
    }
    if (H(sp)) return [p, { x: q.x, y: p.y }, q];
    return [p, { x: p.x, y: q.y }, q];
  }
  function d(pts, r = 14) {
    let s = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
      const k = Math.min(r, l1 / 2, l2 / 2);
      const p1 = { x: b.x + ((a.x - b.x) / l1) * k, y: b.y + ((a.y - b.y) / l1) * k };
      const p2 = { x: b.x + ((c.x - b.x) / l2) * k, y: b.y + ((c.y - b.y) / l2) * k };
      s += ` L${p1.x},${p1.y} Q${b.x},${b.y} ${p2.x},${p2.y}`;
    }
    const z = pts[pts.length - 1];
    return s + ` L${z.x},${z.y}`;
  }
  function along(pts, t) {
    const seg = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); tot += l; }
    let want = tot * t;
    for (let i = 1; i < pts.length; i++) {
      if (want <= seg[i - 1]) { const f = seg[i - 1] ? want / seg[i - 1] : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f }; }
      want -= seg[i - 1];
    }
    return pts[pts.length - 1];
  }
  function wire(a, sa, b, sb, o = {}) {
    const gap = o.gap ?? 6;
    let p = anchor(box(a), sa, o.fa), q = anchor(box(b), sb, o.fb);
    if (o.straight) { if (H(sa) && H(sb)) q.y = p.y; else if (!H(sa) && !H(sb)) q.x = p.x; }
    const push = (pt, s, g) => s === "l" ? { x: pt.x - g, y: pt.y } : s === "r" ? { x: pt.x + g, y: pt.y } : s === "t" ? { x: pt.x, y: pt.y - g } : { x: pt.x, y: pt.y + g };
    p = push(p, sa, o.both ? gap : 2); q = push(q, sb, o.none ? 2 : gap);
    const pts = route(p, sa, q, sb, o);
    const path = document.createElementNS(NS, "path");
    const cls = [o.hot && "hot", o.dash && "dash", o.red && "red", o.green && "green"].filter(Boolean).join(" ");
    if (cls) path.setAttribute("class", cls);
    path.setAttribute("d", d(pts, o.r));
    const m = o.hot ? "ahh" : o.red ? "ahr" : o.green ? "ahg" : "ah";
    if (!o.none) path.setAttribute("marker-end", `url(#${m})`);
    if (o.both) path.setAttribute("marker-start", `url(#${m})`);
    svg.appendChild(path);
    if (o.label) {
      const at = along(pts, o.at ?? 0.5);
      const l = document.createElement("div");
      l.className = "wl" + (o.hot ? " hot" : o.red ? " red" : o.green ? " green" : "") + (o.up ? " up" : o.down ? " down" : "");
      l.innerHTML = o.label;
      l.style.left = at.x + (o.dx || 0) + "px"; l.style.top = at.y + (o.dy || 0) + "px";
      canvas.appendChild(l);
    }
    return pts;
  }
  window.W = {
    wire, box,
    draw(fn) {
      const go = () => { setup(); fn(); window.__ready = true; };
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 60));
    },
  };
})();
