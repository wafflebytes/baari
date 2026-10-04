import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, Img } from "remotion";
import { Canvas, Card } from "./anidoodle/host";
import { drawTable, drawTablePost, drawTheatre, drawDrop } from "./anidoodle/theatre";
import { loadFont as rozha } from "@remotion/google-fonts/RozhaOne";
import { loadFont as interTight } from "@remotion/google-fonts/InterTight";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as deva } from "@remotion/google-fonts/NotoSansDevanagari";
import { loadFont as mono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as kalam } from "@remotion/google-fonts/Kalam";

export const F = {
  rozha: rozha().fontFamily,
  tight: interTight("normal", { weights: ["600", "700", "800"] }).fontFamily,
  inter: inter("normal", { weights: ["400", "500", "600", "700"] }).fontFamily,
  deva: deva("normal", { weights: ["400", "600"] }).fontFamily,
  mono: mono("normal", { weights: ["500"] }).fontFamily,
  hand: kalam("normal", { weights: ["400", "700"] }).fontFamily,
};

export const C = {
  kraft: "#b8905f", kraftDark: "#8f6a3f", teal: "#2f6f73", tealDark: "#1f4f52", gold: "#e1b54a",
  red: "#b8302c", night: "#1c2a4a", night2: "#2b3d66", haldi: "#F2B705", green: "#06C167",
  ink: "#0D0D0E", cream: "#f4ead5", paper: "#fbf6ea",
};

export const smooth = Easing.bezier(0.22, 1, 0.36, 1);
export const bounce = Easing.bezier(0.34, 1.36, 0.64, 1);

/** Stop-motion: the paper world moves on twos. */
export const twos = (f: number) => f - (f % 2);
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** A held-high piece lands, jiggles, and is still. Returns transform. */
export function land(f: number, start: number, opts: { from?: number; seed?: number; dur?: number } = {}) {
  const g = twos(f) - start;
  const dur = opts.dur ?? 10;
  const from = opts.from ?? -140;
  if (g < 0) return { opacity: 0, transform: `translateY(${from}px)` };
  const p = Math.min(1, g / dur);
  const y = interpolate(p, [0, 1], [from, 0], { easing: Easing.out(Easing.quad) });
  const s = opts.seed ?? 1;
  const jig = g >= dur && g < dur + 8 ? (rnd(s + g) - 0.5) * 5 : 0;
  const rot = g < dur + 8 ? (rnd(s * 3 + g) - 0.5) * 6 * (1 - Math.min(1, (g - dur) / 8)) : (rnd(s) - 0.5) * 2.5;
  const sq = g >= dur && g < dur + 4 ? 1.04 : 1;
  return { opacity: 1, transform: `translateY(${y + jig}px) rotate(${rot}deg) scaleY(${2 - sq}) scaleX(${sq})` };
}
/** Idle wobble for paper pieces, on twos. */
export const wob = (f: number, seed = 1, amt = 1.2) => (rnd(seed * 7 + Math.floor(f / 6)) - 0.5) * amt;

/** White sticker margin + card shadow, the cut-out look. */
export const cut = (m = 4, sh = 10) =>
  `drop-shadow(${m}px 0 0 #fff) drop-shadow(-${m}px 0 0 #fff) drop-shadow(0 ${m}px 0 #fff) drop-shadow(0 -${m}px 0 #fff) drop-shadow(${sh * 0.5}px ${sh}px ${sh * 0.8}px rgba(40,20,0,.38))`;

export const Grain: React.FC<{ o?: number; blend?: string }> = ({ o = 0.18, blend = "multiply" }) => (
  <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, backgroundSize: "256px", opacity: o, mixBlendMode: blend as any, pointerEvents: "none" }} />
);

export const Paper: React.FC<{ bg: string; style?: React.CSSProperties; children?: React.ReactNode; m?: number; sh?: number; r?: number; edge?: "scissor" | "tear"; seed?: string }> = ({ bg, style = {}, children, m = 4, sh = 10, r = 6, edge, seed }) => {
  const { width, height, ...rest } = style as any;
  return (
    <Card w={Math.round(width)} h={Math.round(height)} bg={bg} r={r} border={m > 0 ? Math.max(3, m) : 0} depth={Math.max(2, sh * 0.6)} edge={edge} seed={seed} style={rest}>
      {children}
    </Card>
  );
};

/** Kraft table + teal toy-theatre proscenium. Stage content goes in children. */
export const Theatre: React.FC<{ children: React.ReactNode; night?: number; valance?: React.ReactNode }> = ({ children, valance }) => (
  <AbsoluteFill style={{ background: C.kraft }}>
    <Canvas w={1920} h={1080} k="table" draw={(c, e) => { drawTable(c, e); c.setTransform(1, 0, 0, 1, 0, 0); drawTablePost(c, e); }} />
    <div style={{ position: "absolute", left: 90, top: 70, width: 1740, height: 800, overflow: "hidden", background: "#e9dcc0" }}>{children}</div>
    <Canvas w={1920} h={1080} k="theatre" draw={drawTheatre} />
    {valance}
  </AbsoluteFill>
);

/** Red curtain halves and a drop that flies. p: 0 closed, 1 open. */
export const Curtain: React.FC<{ p: number; children?: React.ReactNode }> = ({ p, children }) => {
  const y = interpolate(p, [0, 1], [0, -880]);
  return (
    <div style={{ position: "absolute", left: -20, top: -10, width: 1780, height: 860, transform: `translateY(${twos(Math.round(y))}px)` }}>
      <Canvas w={1780} h={900} k="drop" draw={(c, e) => drawDrop(c, e, 1780, 860)} />
      <div style={{ position: "absolute", left: 20, top: 10, width: 1740, height: 800 }}>{children}</div>
    </div>
  );
};

/** Cut paper letters. */
export const CutTitle: React.FC<{ text: string; size: number; color?: string; f: number; start: number; font?: string; stagger?: number; style?: React.CSSProperties }> = ({ text, size, color = C.gold, f, start, font, stagger = 2, style }) => (
  <div style={{ display: "flex", justifyContent: "center", gap: size * 0.02, fontFamily: font ?? F.rozha, fontSize: size, color, lineHeight: 1.1, ...style }}>
    {(/[\u0900-\u097F]/.test(text) ? text.split(/(\s+)/) : [...text]).map((ch, i) => (
      <span key={i} style={{ display: "inline-block", whiteSpace: "pre", filter: cut(Math.max(2, size / 28), size / 12), ...land(f, start + i * stagger, { from: -60, seed: i + 3, dur: 6 }) }}>
        {ch}
      </span>
    ))}
  </div>
);

/** Paper speech cut-out. */
export const Speech: React.FC<{ f: number; start: number; text: string; x: number; y: number; w?: number; size?: number; tail?: "l" | "r"; bg?: string; color?: string; font?: string; rot?: number }> = ({ f, start, text, x, y, w = 360, size = 40, tail = "l", bg = "#fff", color = C.ink, font, rot = -2 }) => {
  if (f < start) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...land(f, start, { from: -30, seed: x, dur: 4 }) }}>
      <div style={{ transform: `rotate(${rot}deg)`, filter: cut(3, 8) }}>
        <div style={{ background: bg, borderRadius: 26, padding: "18px 26px", fontFamily: font ?? F.hand, fontWeight: 700, fontSize: size, color, lineHeight: 1.15, position: "relative" }}>
          {text}
          <div style={{ position: "absolute", bottom: -22, [tail === "l" ? "left" : "right"]: 40, width: 0, height: 0, borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderTop: `26px solid ${bg}` } as any} />
        </div>
      </div>
    </div>
  );
};

export const PHONE_W = 390, PHONE_H = 844;
/** The real app, recorded, standing on stage in a black-card phone. */
export const Phone: React.FC<{ src: string; from: number; scale?: number; style?: React.CSSProperties; rate?: number; children?: React.ReactNode; tilt?: number; slab?: string }> = ({ src, from, scale = 1, style, rate = 1, children, tilt = 1, slab = C.teal }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [0, 22], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.2, 1.3, 0.4, 1) });
  const ry = (interpolate(inP, [0, 1], [-34, 0]) + Math.sin(f / 46) * 5 - 6) * tilt;
  const rx = (interpolate(inP, [0, 1], [14, 0]) + Math.cos(f / 61) * 2.5 + 3) * tilt;
  const rz = interpolate(inP, [0, 1], [-6, 0]) * tilt + Math.sin(f / 80) * 0.8;
  const glare = ((f + 30) % 150) / 150;
  const W2 = PHONE_W + 28, H2 = PHONE_H + 28;
  return (
    <div style={{ position: "absolute", width: W2, height: H2, transform: `scale(${scale})`, transformOrigin: "top left", ...style }}>
      <div style={{ position: "absolute", inset: 0, transform: `perspective(1800px) rotateY(${ry}deg) rotateX(${rx}deg) rotate(${rz}deg) translateY(${(1 - inP) * 60}px)`, transformStyle: "preserve-3d" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 64, background: slab, transform: "translate(26px, 30px)", opacity: 0.95 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 64, backgroundImage: "radial-gradient(rgba(0,0,0,.22) 2px, transparent 2.6px)", backgroundSize: "11px 11px" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, filter: cut(5, 18) }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#2a2a2e,#0b0b0c 40%,#1d1d20)", borderRadius: 64 }} />
          <div style={{ position: "absolute", right: -6, top: 210, width: 8, height: 96, borderRadius: 4, background: "#222" }} />
          <div style={{ position: "absolute", left: -6, top: 180, width: 8, height: 60, borderRadius: 4, background: "#222" }} />
          <div style={{ position: "absolute", left: -6, top: 256, width: 8, height: 60, borderRadius: 4, background: "#222" }} />
          <div style={{ position: "absolute", left: 14, top: 14, width: PHONE_W, height: PHONE_H, borderRadius: 52, overflow: "hidden", background: "#fff" }}>
            <OffthreadVideo src={staticFile(`rec/${src}.mp4`)} startFrom={Math.round(from * 30)} playbackRate={rate} muted style={{ width: PHONE_W, height: PHONE_H, display: "block" }} />
            {children}
            <div style={{ position: "absolute", left: -PHONE_W, top: -200, width: PHONE_W * 0.5, height: PHONE_H + 400, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.22), rgba(255,255,255,0))", transform: `translateX(${glare * PHONE_W * 3.2}px) rotate(18deg)` }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 52, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06), inset 0 0 40px rgba(0,0,0,.08)" }} />
          </div>
          <div style={{ position: "absolute", left: W2 / 2 - 56, top: 24, width: 112, height: 30, borderRadius: 20, background: "#000" }} />
        </div>
      </div>
    </div>
  );
};

/** Subject frame: camera push. */
export const Cam: React.FC<{ s: number; x?: number; y?: number; children: React.ReactNode; ox?: number; oy?: number }> = ({ s, x = 0, y = 0, children, ox = 870, oy = 400 }) => (
  <div style={{ position: "absolute", inset: 0, transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</div>
);

export const Img2: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => <Img src={staticFile(src)} style={style} />;

/** Paper label tag on a string. */
export const Tag: React.FC<{ text: string; bg?: string; color?: string; style?: React.CSSProperties; size?: number }> = ({ text, bg = C.paper, color = C.ink, style, size = 24 }) => (
  <div style={{ position: "absolute", filter: cut(3, 6), ...style }}>
    <div style={{ background: bg, color, fontFamily: F.mono, fontSize: size, padding: "8px 16px 8px 30px", borderRadius: 6, position: "relative", letterSpacing: 1, whiteSpace: "nowrap" }}>
      <span style={{ position: "absolute", left: 10, top: "50%", width: 10, height: 10, marginTop: -5, borderRadius: 5, background: C.kraft }} />
      {text}
    </div>
  </div>
);

export const useF = () => useCurrentFrame();
export const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
export const ease = (f: number, a: number, b: number, e = smooth) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
