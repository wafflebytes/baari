// The toy theatre from anidoodle's paperCraft.ts (proscenium, gold trim, apron, curtains,
// valance, kraft table), re-proportioned for a 1920x1080 frame, plus the Sharma household puppets.
import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { mix, smooth } from "./gallery";
import { fibres, path, scissor } from "./scrapbookKit";
import { gouache, shadeSide, diamondPrint, drawPiece, REST, WHITE, PEN, ovalP, roundP, rotP, capsule, type Piece } from "./paperKit";

export const OPEN = { x0: 90, y0: 70, x1: 1830, y1: 870 };
const CX = (OPEN.x0 + OPEN.x1) / 2;

export const drawTable = (ctx: Ctx, env: Env) => {
  ctx.fillStyle = "#b8905f"; ctx.fillRect(0, 0, env.W, env.H);
  fibres(ctx, [[0, 0], [env.W, 0], [env.W, env.H], [0, env.H]], "#b8905f", 201, 1.2, 0.3);
};
export const drawTablePost = (ctx: Ctx, env: Env) => { const g = new Gfx(ctx, env, 0, PEN); g.paper("paper", 0.12); g.vignette("rgba(60,36,14,0.32)"); };

const PRO_OUT: P[] = smooth([[40, 1000], [40, 22], [700, 22], [820, 8], [960, -10], [1100, 8], [1220, 22], [1880, 22], [1880, 1000]], false, 5);
const PRO_IN: P[] = [[OPEN.x0, OPEN.y1], [OPEN.x0, OPEN.y0 + 30], ...smooth([[OPEN.x0, OPEN.y0 + 30], [CX, OPEN.y0 - 10], [OPEN.x1, OPEN.y0 + 30]], false, 14).slice(1, -1), [OPEN.x1, OPEN.y0 + 30], [OPEN.x1, OPEN.y1]];

export const proscenium: Piece = {
  hole: true, id: "pros", at: [0, 1], from: [0, 0], pivot: [CX, 1000], edge: "#173b3e", depth: 5, cut: [PRO_OUT, PRO_IN],
  face: (c) => {
    c.save(); path(c, PRO_IN); c.clip(); c.strokeStyle = "rgba(20,14,8,0.22)"; c.lineWidth = 26; path(c, PRO_IN); c.stroke(); c.strokeStyle = "rgba(20,14,8,0.12)"; c.lineWidth = 50; path(c, PRO_IN); c.stroke(); c.restore();
    const ring = () => { c.beginPath(); [PRO_OUT, PRO_IN].forEach((s) => { s.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }); };
    c.fillStyle = "#2f6f73"; ring(); c.fill("evenodd");
    c.save(); ring(); c.clip("evenodd"); diamondPrint(c, PRO_OUT, "#e6c56a", 30); c.restore();
    c.save(); ring(); c.clip("evenodd"); fibres(c, PRO_OUT, "#2f6f73", 171, 0.5, 0.15); c.restore();
    c.strokeStyle = "#d9ae4a"; c.lineWidth = 16; c.lineJoin = "round"; path(c, PRO_IN.map(([x, y]) => [x + (x < CX ? -8 : 8), y + (y > 800 ? 8 : -8)] as P), false); c.stroke();
    c.strokeStyle = "#f2d78a"; c.lineWidth = 3; path(c, PRO_IN.map(([x, y]) => [x + (x < CX ? -12 : 12), y + (y > 800 ? 12 : -12)] as P), false); c.stroke();
    const r = rng(172); c.fillStyle = "#9c6f22"; for (let y = OPEN.y0 + 40; y < OPEN.y1; y += 22) [OPEN.x0 - 8, OPEN.x1 + 8].forEach((x) => { c.beginPath(); c.arc(x + (r() - 0.5), y, 2.6, 0, 6.28); c.fill(); });
    // the crest: Baari's haldi disc on a cream cartouche
    const cart: P[] = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * 6.28; return [CX + Math.cos(a) * 74, 40 + Math.sin(a) * 34] as P; });
    c.fillStyle = WHITE; path(c, cart); c.lineWidth = 10; c.strokeStyle = WHITE; c.stroke(); c.fill();
    gouache(c, cart, "#f1e2c2", 174, { len: 16, w: 6, vary: 0.06 });
    const disc = ovalP(CX, 40, 22, 22, 30); gouache(c, disc, "#F2B705", 175, { len: 10, w: 5 }); shadeSide(c, disc, "#c98e00", 176, [1, 1], 8, -0.6);
  },
};
export const apron: Piece = {
  id: "apron", at: [0, 1], from: [0, 0], pivot: [CX, 900], edge: "#6b1a18", depth: 4, cut: [[[OPEN.x0 - 30, OPEN.y1 + 16], [OPEN.x1 + 30, OPEN.y1 + 16], [OPEN.x1 + 30, 918], [OPEN.x0 - 30, 918]]],
  face: (c) => { const s = apron.cut[0]; c.fillStyle = "#b8302c"; path(c, s); c.fill(); fibres(c, s, "#b8302c", 173, 0.5, 0.2); c.save(); path(c, s); c.clip(); c.fillStyle = "#f0dcb0"; c.globalAlpha = 0.5; for (let x = OPEN.x0 - 22; x < OPEN.x1 + 30; x += 16) c.fillRect(x, OPEN.y1 + 24, 3, 18); c.restore(); c.globalAlpha = 1; c.fillStyle = "#e1b54a"; c.fillRect(OPEN.x0 - 30, OPEN.y1 + 16, OPEN.x1 - OPEN.x0 + 60, 5); c.fillRect(OPEN.x0 - 30, 913, OPEN.x1 - OPEN.x0 + 60, 5); },
};
export const drawTheatre = (c: Ctx, env: Env) => { drawPiece(c, env, apron, REST); c.setTransform(1, 0, 0, 1, 0, 0); drawPiece(c, env, proscenium, REST); };

/** A full drop curtain: red paper painted in folds, a gold scalloped hem. Local coords 0..w, 0..h. */
export const drawDrop = (c: Ctx, env: Env, w: number, h: number) => {
  const s: P[] = [[0, 0], [w, 0], [w, h - 40], ...Array.from({ length: 61 }, (_, i) => { const x = w - (i / 60) * w; return [x, h - 40 + Math.abs(Math.sin((i / 60) * Math.PI * 14)) * 30] as P; }), [0, h - 40]];
  const pc: Piece = { id: "drop", at: [0, 1], from: [0, 0], pivot: [w / 2, h], edge: "#6b1a18", depth: 10, cut: [s], face: (cx) => {
    gouache(cx, s, "#b8302c", 151, { dir: Math.PI / 2, len: 90, w: 12, vary: 0.18, dens: 1.2 });
    cx.save(); path(cx, s); cx.clip(); const r = rng(153);
    for (let i = 0; i < 26; i++) { const x = 30 + i * (w / 26) + (r() - 0.5) * 10; cx.strokeStyle = i % 2 ? "#7c1c1a" : "#d9574a"; cx.globalAlpha = 0.4; cx.lineWidth = 8 + r() * 6; cx.beginPath(); cx.moveTo(x, 0); cx.quadraticCurveTo(x + (r() - 0.5) * 30, h / 2, x + (r() - 0.5) * 16, h); cx.stroke(); }
    cx.restore(); cx.globalAlpha = 1;
    cx.strokeStyle = "#e1b54a"; cx.lineWidth = 8; path(cx, s.slice(3, -1).map(([x, y]) => [x, y - 10] as P), false); cx.stroke();
  } };
  drawPiece(c, env, pc, REST);
};

// ---------------------------------------------------------------- puppets
export type Who = "sunita" | "mummy" | "papa" | "vinay" | "sharma" | "behen";
const LOOK: Record<Who, { skin: string; cloth: string; cloth2: string; hair: string; kind: "bun" | "short" | "bald" | "grey" }> = {
  sunita: { skin: "#a8714b", cloth: "#2f8a7a", cloth2: "#e1b54a", hair: "#1b1410", kind: "bun" },
  mummy: { skin: "#c48a5e", cloth: "#b8302c", cloth2: "#f2c14e", hair: "#3a2c26", kind: "grey" },
  papa: { skin: "#b98256", cloth: "#efe3c8", cloth2: "#c9b48a", hair: "#9a958e", kind: "bald" },
  vinay: { skin: "#c38d63", cloth: "#3a6ea5", cloth2: "#2b5486", hair: "#16110e", kind: "short" },
  sharma: { skin: "#b07a50", cloth: "#7a5aa0", cloth2: "#5e4380", hair: "#2a201a", kind: "bald" },
  behen: { skin: "#c99066", cloth: "#d9668a", cloth2: "#F2B705", hair: "#1a1310", kind: "bun" },
};
export type PuppetState = { who: Who; arm: number; open: boolean; bob: number; mood: "smile" | "flat" | "o"; seed: number };

/** Paints a puppet in the 240x420 box, offset by M. Gouache parts with a sticker margin. */
export const drawPuppet = (c: Ctx, env: Env, st: PuppetState, M: number) => {
  const L = LOOK[st.who], sd = st.seed * 17;
  const T = (pts: P[]): P[] => pts.map(([x, y]) => [x + M, y + M] as P);
  const B = (pts: P[]): P[] => pts.map(([x, y]) => [x + M, y + M + st.bob] as P);
  const backArm = T(rotP(capsule(52, 180, 34, 150), 69, 190, st.arm ? 8 : 6));
  const backHand = T(rotP(ovalP(69, 322, 17, 17, 16), 69, 190, st.arm ? 8 : 6));
  const body = T(smooth([[60, 175], [120, 152], [180, 175], [206, 410], [34, 410]], true, 4));
  const neck = T([[104, 140], [136, 140], [136, 182], [104, 182]]);
  const head = B(ovalP(120, 92, 58, 64, 44));
  const ang = st.arm * -110;
  const frontArm = T(rotP(capsule(155, 180, 34, 150), 172, 190, ang));
  const frontHand = T(rotP(ovalP(172, 322, 17, 17, 16), 172, 190, ang));
  const parts: P[][] = [backArm, backHand, body, neck, head, frontArm, frontHand];
  let bun: P[] | null = null, hair: P[] | null = null;
  if (L.kind === "bun" || L.kind === "grey") { bun = B(ovalP(172, 66, 30, 30, 24)); hair = B(smooth([[62, 96], [64, 40], [120, 24], [178, 40], [180, 96], [160, 56], [120, 50], [80, 56]], true, 3)); }
  if (L.kind === "short") hair = B(smooth([[60, 90], [62, 36], [122, 20], [182, 36], [182, 88], [168, 50], [140, 42], [118, 58], [94, 46], [72, 54]], true, 3));
  if (bun) parts.unshift(bun);
  const cut = parts.map((p) => scissor(p, sd, 0.6));
  const pc: Piece = { id: "pup" + st.who, at: [0, 1], from: [0, 0], pivot: [M + 120, M + 410], edge: mix(L.cloth, "#1a1208", 0.5), depth: 6, border: 5, cut, face: (cx) => {
    gouache(cx, backArm, mix(L.cloth, "#1d2430", 0.12), sd + 1, { dir: Math.PI / 2, len: 22, w: 7 }); gouache(cx, backHand, L.skin, sd + 2, { len: 10, w: 5 });
    if (bun) gouache(cx, bun, L.kind === "grey" ? "#6e6660" : L.hair, sd + 3, { len: 12, w: 6 });
    gouache(cx, body, L.cloth, sd + 4, { dir: Math.PI / 2, len: 36, w: 10, vary: 0.12 });
    if (st.who === "sunita" || st.who === "mummy") { const dup = T(smooth([[150, 165], [190, 230], [120, 300], [80, 312], [60, 270], [128, 248]], true, 4)); gouache(cx, dup, L.cloth2, sd + 5, { dir: 0.8, len: 22, w: 7 }); }
    if (st.who === "papa") gouache(cx, T([[112, 175], [128, 175], [128, 300], [112, 300]]), L.cloth2, sd + 5, { len: 10, w: 4 });
    if (st.who === "vinay") { cx.fillStyle = "rgba(255,255,255,.8)"; cx.font = "800 30px Inter"; cx.textAlign = "center"; cx.fillText("{ }", M + 120, M + 300); }
    shadeSide(cx, body, mix(L.cloth, "#1d2430", 0.35), sd + 6, [1, 0], 26, Math.PI / 2);
    gouache(cx, neck, L.skin, sd + 7, { len: 10, w: 5 });
    gouache(cx, head, L.skin, sd + 8, { dir: -0.5, len: 18, w: 7, vary: 0.08 }); shadeSide(cx, head, mix(L.skin, "#3b2414", 0.35), sd + 9, [1, 1], 14, -0.6);
    if (hair) gouache(cx, hair, L.kind === "grey" ? "#4a423d" : L.hair, sd + 10, { dir: 0.3, len: 16, w: 6 });
    if (L.kind === "grey") gouache(cx, B([[100, 34], [140, 34], [136, 48], [104, 48]]), "#cfcac4", sd + 11, { len: 8, w: 3 });
    if (L.kind === "bald") { gouache(cx, B([[58, 100], [62, 62], [78, 58], [80, 98]]), L.hair, sd + 12, { len: 8, w: 4 }); gouache(cx, B([[182, 100], [178, 62], [162, 58], [160, 98]]), L.hair, sd + 13, { len: 8, w: 4 }); }
    const dot = (x: number, y: number, r: number, col: string) => { cx.fillStyle = col; cx.beginPath(); cx.arc(x + M, y + M + st.bob, r, 0, 6.28); cx.fill(); };
    dot(98, 92, 6, "#1b1410"); dot(142, 92, 6, "#1b1410"); dot(96, 90, 2, "#fff"); dot(140, 90, 2, "#fff");
    cx.globalAlpha = 0.35; dot(86, 112, 9, "#e07a6a"); dot(154, 112, 9, "#e07a6a"); cx.globalAlpha = 1;
    if (st.who === "sunita" || st.who === "mummy") dot(120, 64, 5, "#c4161c");
    if (st.who === "papa" || st.who === "sharma") gouache(cx, B(smooth([[90, 124], [120, 110], [150, 124], [120, 118]], true, 3)), st.who === "papa" ? "#e3dfd9" : "#1b1410", sd + 14, { len: 8, w: 4 });
    if (st.who === "papa") { cx.strokeStyle = "#2a2420"; cx.lineWidth = 4; cx.beginPath(); cx.arc(98 + M, 92 + M + st.bob, 16, 0, 6.28); cx.moveTo(158 + M, 92 + M + st.bob); cx.arc(142 + M, 92 + M + st.bob, 16, 0, 6.28); cx.moveTo(114 + M, 92 + M + st.bob); cx.lineTo(126 + M, 92 + M + st.bob); cx.stroke(); }
    cx.fillStyle = "#5a1d17";
    if (st.open) { cx.beginPath(); cx.ellipse(120 + M, 134 + M + st.bob, 12, 9, 0, 0, 6.28); cx.fill(); }
    else if (st.mood === "o") dot(120, 134, 8, "#5a1d17");
    else if (st.mood === "flat") cx.fillRect(104 + M, 131 + M + st.bob, 32, 5);
    else { path(cx, B([[100, 128], [120, 146], [140, 128], [120, 138]])); cx.fill(); }
    gouache(cx, frontArm, L.cloth, sd + 15, { dir: Math.PI / 2, len: 22, w: 7 }); shadeSide(cx, frontArm, mix(L.cloth, "#1d2430", 0.3), sd + 16, [1, 0], 10, Math.PI / 2);
    gouache(cx, frontHand, L.skin, sd + 17, { len: 10, w: 5 });
  } };
  drawPiece(c, env, pc, REST);
};
export { roundP };
