// The film's finish: camera breathing per scene, torn-paper and punch-hole transitions,
// and a print look (gate weave, riso halftone, light leak, vignette) laid over every frame.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SCENES } from "./timeline";
import { C, twos, smooth } from "./kit";

const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const W = 1740, H = 800;

/** Slow camera drift inside a scene, so no shot is ever dead still. */
export const Breathe: React.FC<{ i: number; f: number; d: number; children: React.ReactNode }> = ({ i, f, d, children }) => {
  const p = interpolate(f, [0, d], [0, 1], { extrapolateRight: "clamp", easing: smooth });
  const s = 1 + 0.035 * p;
  const ox = [50, 30, 70, 45, 60, 35, 55, 40][i % 8];
  const oy = [45, 55, 40, 50, 35, 60, 45, 50][i % 8];
  return <AbsoluteFill style={{ transform: `scale(${s}) rotate(${(i % 2 ? -1 : 1) * 0.35 * p}deg)`, transformOrigin: `${ox}% ${oy}%` }}>{children}</AbsoluteFill>;
};

/** A torn edge, as a polygon point list down one side of a sheet. */
const torn = (seed: number, h: number, x0: number, amp: number) => {
  const pts: string[] = [];
  let drift = 0;
  for (let y = -20, k = 0; y <= h + 20; k++) {
    drift = drift * 0.7 + (rnd(seed + k * 3.1) - 0.5) * amp * 0.9;
    pts.push(`${x0 + drift + (rnd(seed + k) - 0.5) * amp * 0.35},${y}`);
    y += 6 + rnd(seed + k * 7) * 16;
  }
  return pts;
};

const PAL: [string, string][] = [
  [C.haldi, C.red], [C.teal, C.haldi], [C.red, C.cream], [C.cream, C.teal], ["#e98a5a", C.teal], [C.haldi, C.teal],
];

/** Two torn sheets sweep across the stage; the cut happens behind them. */
const TornWipe: React.FC<{ g: number; n: number; dir: 1 | -1 }> = ({ g, n, dir }) => {
  const [a, b] = PAL[n % PAL.length];
  const sheet = (lag: number, col: string, seed: number, stripe?: boolean) => {
    const t = interpolate(g - lag, [-12, 0, 12], [0, 0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smooth });
    const x = interpolate(t, [0, 1], [W + 260, -W - 260]) * dir;
    const left = torn(seed, H, 0, 60), right = torn(seed + 50, H, W + 120, 60).reverse();
    return (
      <svg width={W + 240} height={H + 40} viewBox={`-60 -20 ${W + 240} ${H + 40}`} style={{ position: "absolute", left: -60, top: -20, transform: `translateX(${twos(Math.round(x))}px) rotate(${(rnd(seed) - 0.5) * 3}deg)`, filter: "drop-shadow(10px 14px 10px rgba(30,15,0,.45))" }}>
        <defs>
          <pattern id={`dots${seed}`} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.6" fill="rgba(0,0,0,.13)" /></pattern>
        </defs>
        <polygon points={[...left, ...right].join(" ")} fill="#fff" transform="translate(-8,0)" />
        <polygon points={[...left, ...right].join(" ")} fill={col} />
        <polygon points={[...left, ...right].join(" ")} fill={`url(#dots${seed})`} />
        {stripe && <text x={W / 2 + 60} y={H / 2 + 50} textAnchor="middle" fontFamily="Rozha One" fontSize="150" fill="rgba(255,255,255,.18)">ब</text>}
      </svg>
    );
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sheet(0, b, n * 17 + 3)}
      {sheet(3, a, n * 17 + 9, true)}
    </AbsoluteFill>
  );
};

/** A hole-punch iris: a paper disc closes to a dot on the old scene and opens on the new one. */
const Iris: React.FC<{ g: number; n: number; x: number; y: number }> = ({ g, n, x, y }) => {
  const a = n % 2 ? C.haldi : C.red;
  const R = 1900;
  const r = g < 0 ? interpolate(g, [-14, -1], [R, 0], { extrapolateLeft: "clamp", easing: smooth }) : interpolate(g, [1, 14], [0, R], { extrapolateRight: "clamp", easing: smooth });
  const rr = twos(Math.round(r));
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <defs>
        <mask id={`iris${n}`}>
          <rect width={W} height={H} fill="#fff" />
          <circle cx={x} cy={y} r={rr} fill="#000" />
        </mask>
        <pattern id={`irisdots${n}`} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.6" fill="rgba(0,0,0,.12)" /></pattern>
      </defs>
      <g mask={`url(#iris${n})`}>
        <rect width={W} height={H} fill={a} />
        <rect width={W} height={H} fill={`url(#irisdots${n})`} />
      </g>
      <circle cx={x} cy={y} r={rr} fill="none" stroke="#fff" strokeWidth={8} />
      <circle cx={x + 6} cy={y + 9} r={rr + 4} fill="none" stroke="rgba(40,20,0,.25)" strokeWidth={6} />
    </svg>
  );
};

/** Which boundaries get which transition. Key is the incoming scene. */
const T: Record<string, { k: "tear"; dir: 1 | -1 } | { k: "iris"; x: number; y: number }> = {
  kuchbhi: { k: "tear", dir: 1 },
  vote: { k: "iris", x: 870, y: 400 },
  papa: { k: "tear", dir: -1 },
  lock: { k: "tear", dir: 1 },
  khata: { k: "iris", x: 1200, y: 360 },
  night: { k: "tear", dir: -1 },
  brief: { k: "tear", dir: 1 },
  reply: { k: "iris", x: 1100, y: 420 },
  kirana: { k: "tear", dir: -1 },
  eight: { k: "tear", dir: 1 },
  agent: { k: "iris", x: 870, y: 430 },
  evals: { k: "tear", dir: -1 },
};

export const Transitions: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SCENES.map((sc, n) => {
        const t = T[sc.s];
        const g = f - sc.from;
        if (!t || g < -16 || g > 16) return null;
        return t.k === "tear" ? <TornWipe key={sc.s} g={g} n={n} dir={t.dir} /> : <Iris key={sc.s} g={g} n={n} x={t.x} y={t.y} />;
      })}
    </>
  );
};

/** Whole-frame gate weave: the print sits a hair loose in the gate, on twos. */
export const weave = (f: number) => {
  const g = Math.floor(f / 2);
  return `translate(${(rnd(g) - 0.5) * 2.2}px, ${(rnd(g + 99) - 0.5) * 2.2}px)`;
};

/** Print finish over everything: halftone, warm light leak, vignette, flicker. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  const g = Math.floor(f / 2);
  const leakX = 20 + 60 * (0.5 + 0.5 * Math.sin(f / 170));
  const leakO = 0.1 + 0.06 * Math.sin(f / 53);
  const flick = 1 + (rnd(g * 3) - 0.5) * 0.03;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(60,30,10,.16) 1.1px, transparent 1.4px)", backgroundSize: "7px 7px", mixBlendMode: "multiply", opacity: 0.35 }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 70% at ${leakX}% 10%, rgba(255,150,60,.9), rgba(255,90,40,0) 70%)`, mixBlendMode: "screen", opacity: leakO }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 48%, rgba(0,0,0,0) 60%, rgba(30,12,0,.42) 100%)" }} />
      <AbsoluteFill style={{ background: "#fff8e8", mixBlendMode: "soft-light", opacity: Math.max(0, (flick - 1) * 6 + 0.12) }} />
      {rnd(g * 7) > 0.93 && <div style={{ position: "absolute", left: `${rnd(g) * 100}%`, top: 0, width: 2, height: "100%", background: "rgba(255,250,235,.35)" }} />}
      {rnd(g * 11) > 0.95 && <div style={{ position: "absolute", left: `${rnd(g + 5) * 100}%`, top: `${rnd(g + 6) * 100}%`, width: 5, height: 5, borderRadius: 3, background: "rgba(20,10,0,.5)" }} />}
    </AbsoluteFill>
  );
};
