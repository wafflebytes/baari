// The Remotion host for the ported anidoodle kit, after engine/tools/adapters/remotion/canvas.tsx:
// the frame's inputs are the only inputs, and the canvas is drawn before the frame is captured.
import React, { useLayoutEffect, useRef } from "react";
import type { Ctx, Env, Layer } from "./core";
import { gouache, fibres, scissor, tear, shadeSide, drawPiece, REST, rectP, roundP, type Piece, type P } from "./paperKit";
import { mix } from "./gallery";

const surface = (w: number, h: number): Layer => {
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  return { canvas: c, ctx: c.getContext("2d") as unknown as Ctx } as Layer;
};
export const makeEnv = (W: number, H: number): Env => ({ W, H, scale: 1, cache: new Map(), canvas: surface, image: () => undefined });

/** A canvas that redraws only when `k` changes. */
export const Canvas: React.FC<{ w: number; h: number; k: string; draw: (c: Ctx, env: Env) => void; style?: React.CSSProperties }> = ({ w, h, k, draw, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const env = useRef<Env | null>(null);
  const last = useRef<string>("");
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || last.current === k) return;
    if (!env.current) env.current = makeEnv(w, h);
    const c = cv.getContext("2d") as Ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    draw(c, env.current);
    c.getImageData(0, 0, 1, 1);
    last.current = k;
  });
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", width: w, height: h, ...style }} />;
};

let SEED = 1;
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 100000; };

/**
 * A card cut-out painted in gouache: scissor or torn edge, card edge, optional white sticker
 * margin, depth shadow. Children sit on its face.
 */
export const Card: React.FC<{ w: number; h: number; bg: string; r?: number; edge?: "scissor" | "tear"; border?: number; depth?: number; seed?: string; paint?: (c: Ctx, shape: P[]) => void; style?: React.CSSProperties; children?: React.ReactNode; dir?: number }> = ({ w, h, bg: bg0, r = 6, edge = "scissor", border = 0, depth = 6, seed, paint, style, children, dir = 0 }) => {
  const bg = bg0.length === 4 ? "#" + [...bg0.slice(1)].map((x) => x + x).join("") : bg0;
  const M = 40 + border;
  const sd = seed ? hash(seed) : hash(`${w}x${h}${bg}`);
  const draw = (c: Ctx, env: Env) => {
    const base = r > 0 ? roundP(M, M, w, h, r) : rectP(M, M, w, h);
    const shape = edge === "tear" ? tear(base, 1.8, sd) : scissor(base, sd, 0.8);
    const pc: Piece = {
      id: "c" + sd, at: [0, 1], from: [0, 0], pivot: [M + w / 2, M + h / 2], cut: [shape], border, depth, edge: mix(bg, "#1a1208", 0.45),
      face: (cx) => { gouache(cx, shape, bg, sd, { dir, len: Math.min(60, Math.max(18, w / 10)), w: Math.min(14, Math.max(5, w / 40)), vary: 0.09 }); fibres(cx, shape, bg, sd + 1, 0.6, 0.18); paint?.(cx, shape); shadeSide(cx, shape, mix(bg, "#1d2430", 0.25), sd + 2, [1, 1], Math.min(18, h * 0.08), 0.3); },
    };
    drawPiece(c, env, pc, REST);
  };
  return (
    <div style={{ position: "absolute", width: w, height: h, ...style }}>
      <Canvas w={w + M * 2} h={h + M * 2} k={`${w}${h}${bg}${sd}`} draw={draw} style={{ left: -M, top: -M }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: r, overflow: "hidden" }}>{children}</div>
    </div>
  );
};
void SEED;
