// Ported from alexgreensh/anidoodle (Apache-2.0, see LICENSE in this folder):
// engine/src/canvas-core/paperCraft.ts — gouache, shadeSide, the printed papers, the Piece
// (cut, card edge, white sticker margin, depth shadow) and poseAt (travel high, land, jiggle, on twos).
// Changes for Baari: pieces are positioned per React component, the theatre is sized to 1920x1080,
// and there are puppet painters for the Sharma household.
import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import { bounds, mix, smooth } from "./gallery";
import { clamp01, fibres, path, scissor, tear } from "./scrapbookKit";

export { fibres, path, scissor, tear, smooth, mix, rng };
export type { P, Ctx, Env };
export const PEN: Medium = { nib: 1, taper: 0.3, pressure: 0.3, retrace: false, wobble: 0.4, rough: 0.3 };
export const WHITE = "#fbf9f2";

// ---------------------------------------------------------------- paint and print (verbatim)
export const gouache = (c: Ctx, shape: P[], color: string, seed: number, o: { dir?: number; len?: number; w?: number; vary?: number; dens?: number } = {}) => {
  const { dir = 0, len = 44, w = 13, vary = 0.1, dens = 1 } = o, r = rng(seed), b = bounds(shape), area = (b.x1 - b.x0) * (b.y1 - b.y0);
  c.fillStyle = color; path(c, shape); c.fill();
  c.save(); path(c, shape); c.clip(); c.lineCap = "round";
  const n = Math.min(5000, Math.max(6, Math.round((area / (len * w)) * 1.6 * dens)));
  for (let i = 0; i < n; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0), a = dir + (r() - 0.5) * 0.35, l = len * (0.6 + r() * 0.7), k = r(); c.strokeStyle = k < 0.5 ? mix(color, "#ffffff", vary * (0.5 + r())) : mix(color, "#1d2430", vary * (0.4 + r())); c.globalAlpha = 0.28 + r() * 0.25; c.lineWidth = w * (0.6 + r() * 0.6); c.beginPath(); c.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); c.quadraticCurveTo(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); c.stroke(); }
  c.restore(); c.globalAlpha = 1;
};
export const shadeSide = (c: Ctx, shape: P[], color: string, seed: number, side: P, depth: number, dir = Math.PI / 2) => {
  const b = bounds(shape), r = rng(seed); c.save(); path(c, shape); c.clip(); c.lineCap = "round";
  for (let i = 0; i < 16; i++) { const u = r(), x = side[0] > 0 ? b.x1 - r() * depth : side[0] < 0 ? b.x0 + r() * depth : b.x0 + u * (b.x1 - b.x0), y = side[1] > 0 ? b.y1 - r() * depth : side[1] < 0 ? b.y0 + r() * depth : b.y0 + u * (b.y1 - b.y0), l = 16 + r() * 26; c.strokeStyle = color; c.globalAlpha = 0.3 + r() * 0.25; c.lineWidth = 5 + r() * 7; c.beginPath(); c.moveTo(x - Math.cos(dir) * l / 2, y - Math.sin(dir) * l / 2); c.lineTo(x + Math.cos(dir) * l / 2, y + Math.sin(dir) * l / 2); c.stroke(); }
  c.restore(); c.globalAlpha = 1;
};
export const print = (c: Ctx, shape: P[], fn: (b: { x0: number; y0: number; x1: number; y1: number }) => void) => { c.save(); path(c, shape); c.clip(); fn(bounds(shape)); c.restore(); c.globalAlpha = 1; };
export const wavePrint = (c: Ctx, shape: P[], col: string, gap = 22, sw = 2) => print(c, shape, (b) => { c.strokeStyle = col; c.lineWidth = sw; c.globalAlpha = 0.55; for (let y = b.y0 + 8, row = 0; y < b.y1 + 10; y += gap, row++) { c.beginPath(); for (let x = b.x0 - 30 + (row % 2) * 15; x < b.x1 + 30; x += 30) { c.moveTo(x, y); c.quadraticCurveTo(x + 7.5, y - 7, x + 15, y); } c.stroke(); } });
export const dotPrint = (c: Ctx, shape: P[], col: string, gap = 14, rad = 2.2) => print(c, shape, (b) => { c.fillStyle = col; c.globalAlpha = 0.8; for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap * 0.87, row++) for (let x = b.x0 + (row % 2) * gap * 0.5; x < b.x1 + gap; x += gap) { c.beginPath(); c.arc(x, y, rad, 0, 6.28); c.fill(); } });
export const diamondPrint = (c: Ctx, shape: P[], col: string, gap = 26) => print(c, shape, (b) => { c.fillStyle = col; c.globalAlpha = 0.5; for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap / 2, row++) for (let x = b.x0 + (row % 2) * gap / 2; x < b.x1 + gap; x += gap) { c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 3, y); c.lineTo(x, y + 4); c.lineTo(x - 3, y); c.closePath(); c.fill(); } c.globalAlpha = 0.18; c.strokeStyle = col; c.lineWidth = 0.8; for (let d = b.x0 - (b.y1 - b.y0); d < b.x1; d += gap) { c.beginPath(); c.moveTo(d, b.y0); c.lineTo(d + (b.y1 - b.y0), b.y1); c.stroke(); c.beginPath(); c.moveTo(d + (b.y1 - b.y0), b.y0); c.lineTo(d, b.y1); c.stroke(); } });
export const stonePrint = (c: Ctx, shape: P[], base: string, seed: number) => print(c, shape, (b) => { const r = rng(seed); for (let y = b.y0, row = 0; y < b.y1; y += 17, row++) for (let x = b.x0 - (row % 2) * 16; x < b.x1; ) { const w = 26 + r() * 16; c.fillStyle = mix(base, r() < 0.5 ? "#ffffff" : "#3b3226", 0.06 + r() * 0.14); c.globalAlpha = 1; c.beginPath(); c.roundRect(x + 1.5, y + 1.5, w - 3, 14, 4); c.fill(); x += w; } });
export const newsPrint = (c: Ctx, shape: P[], seed: number) => print(c, shape, (b) => { const r = rng(seed); c.fillStyle = "#4a4640"; c.globalAlpha = 0.5; for (let col = b.x0 + 4; col < b.x1; col += 36) for (let y = b.y0 + 4; y < b.y1; y += 4.2) { if (r() < 0.06) { y += 6; continue; } const l = 20 + r() * 12; c.fillRect(col, y, l, 1.3); } c.globalAlpha = 0.7; c.fillRect(b.x0 + 16, b.y0 + 30, 60, 5); });
export const woodPrint = (c: Ctx, shape: P[], col: string, seed: number) => print(c, shape, (b) => { const r = rng(seed); c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = 0.35; for (let y = b.y0; y < b.y1; y += 3 + r() * 4) { c.beginPath(); c.moveTo(b.x0, y); for (let x = b.x0; x <= b.x1; x += 40) c.lineTo(x, y + Math.sin(x * 0.013 + y) * 1.6); c.stroke(); } c.globalAlpha = 0.5; c.strokeStyle = mix(col, "#000000", 0.2); for (let x = b.x0 + 60 + r() * 60; x < b.x1; x += 90 + r() * 90) { c.beginPath(); c.moveTo(x, b.y0); c.lineTo(x, b.y1); c.stroke(); } });
export const tilePrint = (c: Ctx, shape: P[], col: string, gap = 62) => print(c, shape, (b) => { c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = 3; for (let y = b.y0; y < b.y1; y += gap) { c.beginPath(); c.moveTo(b.x0, y); c.lineTo(b.x1, y); c.stroke(); } for (let x = b.x0; x < b.x1; x += gap) { c.beginPath(); c.moveTo(x, b.y0); c.lineTo(x, b.y1); c.stroke(); } });
export const stripePrint = (c: Ctx, shape: P[], col: string, w = 22) => print(c, shape, (b) => { c.fillStyle = col; c.globalAlpha = 0.9; for (let x = b.x0; x < b.x1; x += w * 2) c.fillRect(x, b.y0, w, b.y1 - b.y0); });

// ---------------------------------------------------------------- pieces (verbatim, minus the theatre box clip)
export type Piece = { hole?: boolean; id: string; at: [number, number]; from: P; pivot: P; cut: P[][]; border?: number; edge: string; depth: number; face: (c: Ctx) => void };
export const cutPath = (c: Ctx, pc: Piece, dx = 0, dy = 0, grow = 0) => { c.save(); c.translate(dx, dy); c.beginPath(); pc.cut.forEach((s) => { s.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }); c.fill(pc.hole ? "evenodd" : "nonzero"); if (pc.border || grow) { c.lineJoin = "round"; c.lineWidth = 2 * ((pc.border ?? 0) + grow); c.strokeStyle = c.fillStyle; c.stroke(); } c.restore(); };
export type Pose = { dx: number; dy: number; rot: number; lift: number };
export const REST: Pose = { dx: 0, dy: 0, rot: 0, lift: 0 };
export const poseAt = (pc: Piece, f: number): Pose => {
  const [s, d] = pc.at, f2 = f - (f % 2); if (f >= s + d) return REST;
  const u = clamp01((f2 - s) / d), r = rng(pc.id.length * 131 + Math.round(f2)), seed = pc.id.charCodeAt(0) + pc.id.length;
  if (u < 0.62) { const v = u / 0.62, e = 1 - (1 - v) ** 2; return { dx: pc.from[0] * (1 - e) + (r() - 0.5) * 1.4, dy: pc.from[1] * (1 - e) + (r() - 0.5) * 1.4, rot: (seed % 2 ? 1 : -1) * 0.04 * (1 - e), lift: 1 - 0.6 * e }; }
  const v = (u - 0.62) / 0.38, damp = Math.exp(-4 * v) * (1 - v);
  return { dx: 0, dy: -2.2 * Math.abs(Math.sin(v * 9)) * damp, rot: (seed % 2 ? 1 : -1) * 0.035 * Math.sin(v * 13 + 0.6) * damp, lift: 0.4 * (1 - v) };
};
/** Draws a piece with a given pose: depth shadow (wider while held up), card edge, white margin, face. */
export const drawPiece = (ctx: Ctx, env: Env, pc: Piece, q: Pose) => {
  const xf = (c: Ctx) => { c.translate(pc.pivot[0] + q.dx, pc.pivot[1] + q.dy); c.rotate(q.rot); c.translate(-pc.pivot[0], -pc.pivot[1]); };
  const g = new Gfx(ctx, env, 0, PEN), sd = pc.depth * (1 + 2.2 * q.lift), all = pc.cut.flat();
  g.group("plain", () => { const c = g.cur; c.save(); xf(c); c.fillStyle = "#2a1c10"; cutPath(c, pc, sd * 0.6, sd); c.restore(); const b = bounds(all), m = (pc.border ?? 0) + sd * 2 + 60; g.touch(b.x0 - m, b.y0 - m, b.x1 + m, b.y1 + m); }, { blur: 2 + sd * 0.5, alpha: 0.36 - 0.1 * q.lift });
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.save(); xf(ctx);
  ctx.fillStyle = pc.edge; cutPath(ctx, pc, 1.2, 1.9);
  if (pc.border) { ctx.fillStyle = WHITE; cutPath(ctx, pc); }
  pc.face(ctx); ctx.restore();
};

// ---------------------------------------------------------------- shapes
export const rectP = (x0: number, y0: number, w: number, h: number): P[] => [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
export const roundP = (x0: number, y0: number, w: number, h: number, r: number, n = 6): P[] => {
  const pts: P[] = [];
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  r = Math.min(r, w / 2, h / 2);
  corner(x0 + w - r, y0 + r, -Math.PI / 2); corner(x0 + w - r, y0 + h - r, 0); corner(x0 + r, y0 + h - r, Math.PI / 2); corner(x0 + r, y0 + r, Math.PI);
  return pts;
};
export const ovalP = (cx: number, cy: number, rx: number, ry = rx, n = 40): P[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P; });
export const rotP = (pts: P[], cx: number, cy: number, deg: number): P[] => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
export const capsule = (x: number, y: number, w: number, h: number) => roundP(x, y, w, h, w / 2);
