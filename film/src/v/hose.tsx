// v4, "Baari Toons": a 1930s rubber-hose cartoon. Black ink on warm sepia stock, everything
// bouncing on the beat, pie-cut eyes, white gloves, faces on every object. Acts are cut with
// black irises that open on matched shapes (moon to sun, cooker lid to clock). The only colour
// in the film is the real app: the phone mascot's screen stays crisp and untouched.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { loadFont as rye } from "@remotion/google-fonts/Rye";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as deva } from "@remotion/google-fonts/NotoSansDevanagari";
import { loadFont as bang } from "@remotion/google-fonts/Bangers";
import { Root2, Screen, Crisp, World, Soundtrack, SCENES, ez, spring, rnd, currentLine, NAMES, speaking } from "./common";
import { at } from "../timeline";
import { AgentPage } from "../ui";

const DECO = rye("normal", { weights: ["400"] }).fontFamily;
const SANS = inter("normal", { weights: ["600", "800"] }).fontFamily;
const DEVA = deva("normal", { weights: ["600", "800"] }).fontFamily;
const POP = bang("normal", { weights: ["400"] }).fontFamily;

const INK = "#17120d";
const PAPER = "#efe3c8";
const MID = "#b9a782";
const SH = "#d8c8a4";
const W = 5; // ink weight

type PP = { f: number; d: number };
const PI = Math.PI;
/** The house beat: every toon bounces on it. 16 frames = 112 bpm. */
const BEAT = 16;
const bnc = (f: number, o = 0) => Math.abs(Math.sin(((f + o) * PI) / BEAT));
const boil = (f: number, s = 0) => {
  const g = Math.floor(f / 3);
  return `translate(${(rnd(g * 5 + s) - 0.5) * 1.6}px,${(rnd(g * 9 + s) - 0.5) * 1.6}px)`;
};

const Svg: React.FC<{ children: React.ReactNode; f?: number }> = ({ children, f = 0 }) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", transform: boil(f) }}>{children}</svg>
);

/* ---------- toon parts ---------- */
/** Pie-cut eyes: tall ovals with a wedge out of the pupil, blinking now and then. */
const Eyes: React.FC<{ x: number; y: number; f: number; s?: number; look?: number; sad?: boolean }> = ({ x, y, f, s = 1, look = 0, sad }) => {
  const bl = (f + Math.floor(x)) % 97 < 4 ? 0.12 : 1;
  const eye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy={y} rx={13 * s} ry={20 * s * bl} fill="#fff" stroke={INK} strokeWidth={3.5} />
      {bl > 0.5 && <ellipse cx={cx + look * 4 * s} cy={y + 4 * s} rx={7 * s} ry={12 * s} fill={INK} />}
      {bl > 0.5 && <path d={`M${cx + look * 4 * s},${y + 4 * s} l${6 * s},${-11 * s} l${-7 * s},${-1 * s}Z`} fill="#fff" />}
      {sad && <path d={`M${cx - 16 * s},${y - 22 * s} L${cx + 14 * s},${y - 30 * s + (cx > x ? 0 : 12 * s)}`} stroke={INK} strokeWidth={4} />}
    </g>
  );
  return <>{eye(x - 15 * s)}{eye(x + 15 * s)}</>;
};

/** White four-finger cartoon glove at the end of a noodle arm. */
const Glove: React.FC<{ x: number; y: number; r?: number; s?: number }> = ({ x, y, r = 0, s = 1 }) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
    <path d="M-10,8 Q-24,-4 -18,-22 Q-14,-30 -6,-24 Q-4,-38 6,-36 Q14,-36 12,-24 Q22,-30 24,-18 Q28,-4 14,10 Z" fill="#fff" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <path d="M-6,-24 L-4,-8 M6,-36 L4,-10 M12,-24 L10,-6" stroke={INK} strokeWidth={2.5} />
    <rect x={-13} y={6} width={30} height={10} rx={4} fill="#fff" stroke={INK} strokeWidth={4} />
  </g>
);

/** A rubber-hose arm: a single bending noodle from shoulder to hand. */
const Hose: React.FC<{ x1: number; y1: number; x2: number; y2: number; bend?: number; w?: number }> = ({ x1, y1, x2, y2, bend = 40, w = 9 }) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend;
  return <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" />;
};

type Who = "sunita" | "mummy" | "papa" | "vinay" | "sharma";
/**
 * A rubber-hose person. Bell body, round head, pie eyes, hose arms with gloves, bouncing shoes.
 * wave: right arm waves; talk: mouth flaps; arm: right hand target override.
 */
const Toon: React.FC<{ who: Who; f: number; x: number; y: number; s?: number; talk?: boolean; wave?: boolean; sad?: boolean; arm?: [number, number]; o?: number; look?: number; dance?: boolean }> = ({ who, f, x, y, s = 1, talk, wave, sad, arm, o = 0, look = 0, dance }) => {
  const b = bnc(f, o);
  const sq = 1 - b * 0.06, st = 1 + b * 0.05;
  const hop = dance ? -b * 26 : -b * 8;
  const mouth = talk ? 4 + 12 * Math.abs(Math.sin(f * 0.9)) : 3;
  const sway = dance ? Math.sin((f + o) * PI / BEAT / 2) * 8 : 0;
  const ra: [number, number] = arm ?? (wave ? [70 + Math.sin(f * 0.4) * 22, -170 + Math.cos(f * 0.4) * 10] : [62, -40 + b * 10]);
  const la: [number, number] = dance ? [-80, -150 + b * 20] : [-60, -36 + b * 10];
  const body = {
    sunita: "M-58,0 Q-62,-90 -38,-130 L38,-130 Q62,-90 58,0 Z",
    mummy: "M-62,0 Q-66,-90 -40,-128 L40,-128 Q66,-90 62,0 Z",
    papa: "M-50,0 L-46,-130 L46,-130 L50,0 Z",
    vinay: "M-44,0 L-42,-126 L42,-126 L44,0 Z",
    sharma: "M-60,0 Q-70,-80 -46,-126 L46,-126 Q70,-80 60,0 Z",
  }[who];
  return (
    <g transform={`translate(${x},${y + hop}) rotate(${sway}) scale(${s * st},${s * sq})`}>
      <ellipse cx={0} cy={6 - hop / s} rx={70} ry={10} fill={INK} opacity={0.18} />
      {/* legs and shoes */}
      <Hose x1={-20} y1={-6} x2={-30} y2={0} bend={0} />
      <Hose x1={20} y1={-6} x2={30} y2={0} bend={0} />
      <ellipse cx={-38} cy={2} rx={26} ry={13} fill={INK} />
      <ellipse cx={38} cy={2} rx={26} ry={13} fill={INK} />
      <ellipse cx={-44} cy={-3} rx={8} ry={3} fill="#fff" opacity={0.5} />
      {/* body */}
      <path d={body} fill={who === "papa" || who === "sharma" ? "#fff" : INK} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      {(who === "sunita" || who === "mummy") && <path d="M-38,-128 Q10,-70 50,-8" stroke="#fff" strokeWidth={12} fill="none" />}
      {(who === "sunita" || who === "mummy") && <path d="M-38,-128 Q10,-70 50,-8" stroke={INK} strokeWidth={3} fill="none" strokeDasharray="2 10" />}
      {who === "papa" && <path d="M0,-128 L0,-40 M-8,-110 h4 M-8,-86 h4 M-8,-62 h4" stroke={INK} strokeWidth={4} />}
      {who === "vinay" && <path d="M-16,-126 L0,-100 L16,-126" fill="#fff" stroke={INK} strokeWidth={4} />}
      {who === "sharma" && <rect x={-40} y={-90} width={80} height={70} rx={8} fill={SH} stroke={INK} strokeWidth={4} />}
      {/* arms */}
      <Hose x1={-36} y1={-110} x2={-36 + la[0]} y2={-110 + la[1] + 40} bend={-30} />
      <Glove x={-36 + la[0]} y={-110 + la[1] + 40} r={-20} />
      <Hose x1={36} y1={-110} x2={36 + ra[0]} y2={-110 + ra[1] + 40} bend={wave ? 30 : 30} />
      <Glove x={36 + ra[0]} y={-110 + ra[1] + 40} r={wave ? 10 + Math.sin(f * 0.4) * 25 : 20} />
      {/* head */}
      <g transform={`translate(0,${-190 + b * 4})`}>
        {who === "sunita" && <circle cx={0} cy={-62} r={26} fill={INK} />}
        {who === "mummy" && <><circle cx={0} cy={-58} r={30} fill="#fff" stroke={INK} strokeWidth={W} /><path d="M-30,-58 q30,-14 60,0" stroke={INK} strokeWidth={3} fill="none" /></>}
        <circle cx={0} cy={0} r={60} fill="#fff" stroke={INK} strokeWidth={W} />
        {who === "sunita" && <path d="M-60,-6 Q-58,-60 0,-62 Q58,-60 60,-6 Q40,-36 0,-34 Q-40,-36 -60,-6Z" fill={INK} />}
        {who === "mummy" && <path d="M-60,-4 Q-56,-58 0,-60 Q56,-58 60,-4 Q40,-30 0,-30 Q-40,-30 -60,-4Z" fill={MID} stroke={INK} strokeWidth={3} />}
        {who === "vinay" && <path d="M-58,-14 Q-50,-66 6,-64 Q60,-60 58,-14 Q30,-44 -10,-34 Q-40,-30 -58,-14Z" fill={INK} />}
        {who === "papa" && <path d="M-60,-10 Q-60,-40 -46,-48 M60,-10 Q60,-40 46,-48" stroke={INK} strokeWidth={8} fill="none" />}
        {who === "sharma" && <path d="M-56,-24 Q0,-90 56,-24 Q30,-40 0,-40 Q-30,-40 -56,-24Z" fill="#fff" stroke={INK} strokeWidth={4} />}
        <Eyes x={0} y={-6} f={f} look={look} sad={sad} />
        {who === "sunita" && <circle cx={0} cy={-34} r={5} fill={INK} />}
        {(who === "papa" || who === "sharma") && <path d="M-34,26 Q-16,14 0,22 Q16,14 34,26 Q16,32 0,28 Q-16,32 -34,26Z" fill={INK} />}
        {who === "papa" && <><circle cx={-15} cy={-6} r={22} fill="none" stroke={INK} strokeWidth={3} /><circle cx={15} cy={-6} r={22} fill="none" stroke={INK} strokeWidth={3} /></>}
        <ellipse cx={0} cy={36} rx={sad ? 12 : 16} ry={mouth} fill={INK} />
        {!talk && !sad && <path d="M-22,30 Q0,48 22,30" stroke={INK} strokeWidth={4} fill="none" />}
        {sad && <path d="M-18,44 Q0,30 18,44" stroke={INK} strokeWidth={4} fill="none" />}
        <circle cx={-34} cy={22} r={7} fill={MID} opacity={0.7} />
        <circle cx={34} cy={22} r={7} fill={MID} opacity={0.7} />
      </g>
    </g>
  );
};

/** A face on any round thing: cooker, moon, sun, clock, padlock, truck. */
const Face: React.FC<{ x: number; y: number; f: number; s?: number; mood?: "happy" | "sad" | "shock" | "sleep" }> = ({ x, y, f, s = 1, mood = "happy" }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {mood === "sleep" ? (
      <><path d="M-30,-4 q10,10 20,0 M10,-4 q10,10 20,0" stroke={INK} strokeWidth={4} fill="none" /><path d="M-8,26 q8,6 16,0" stroke={INK} strokeWidth={4} fill="none" /></>
    ) : (
      <>
        <Eyes x={0} y={-8} f={f} s={0.9} sad={mood === "sad"} />
        {mood === "happy" && <path d="M-26,22 Q0,48 26,22 Q0,32 -26,22Z" fill={INK} />}
        {mood === "sad" && <path d="M-18,38 Q0,22 18,38" stroke={INK} strokeWidth={4} fill="none" />}
        {mood === "shock" && <ellipse cx={0} cy={32} rx={12} ry={16} fill={INK} />}
      </>
    )}
  </g>
);

/** Classic rubber-hose impact star / sparkle burst. */
const Burst: React.FC<{ x: number; y: number; f: number; a: number; r?: number; fill?: string }> = ({ x, y, f, a, r = 90, fill = "#fff" }) => {
  const p = spring(f, a, 12);
  if (p <= 0) return null;
  const pts = Array.from({ length: 24 }, (_, i) => {
    const rr = (i % 2 ? r * 0.62 : r) * (1 + (rnd(i + a) - 0.5) * 0.25);
    const t = (i / 24) * PI * 2 + f * 0.01;
    return `${Math.cos(t) * rr},${Math.sin(t) * rr}`;
  }).join(" ");
  return <polygon points={pts} transform={`translate(${x},${y}) scale(${p})`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />;
};

/** Text in a sign or balloon, pops in on a spring. */
const Pop: React.FC<{ t: string; x: number; y: number; f: number; a: number; size?: number; font?: string; c?: string; rot?: number; box?: boolean; w?: number; tail?: [number, number] }> = ({ t, x, y, f, a, size = 54, font = POP, c = INK, rot = 0, box, w, tail }) => {
  const p = spring(f, a, 14);
  if (p <= 0) return null;
  const wob = Math.sin((f - a) * 0.25) * 1.2;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot + wob}deg) scale(${p})`, fontFamily: font, fontSize: size, color: c, letterSpacing: font === POP ? 2 : 0, whiteSpace: w ? "normal" : "nowrap", width: w, textAlign: "center", lineHeight: 1.05, ...(box ? { background: "#fff", border: `${W}px solid ${INK}`, borderRadius: 40, padding: "14px 30px", boxShadow: `8px 8px 0 ${INK}` } : {}) }}>
      {t}
      {box && tail && <svg width={60} height={60} style={{ position: "absolute", left: tail[0], top: tail[1], overflow: "visible" }}><path d="M0,0 L40,50 L36,0Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" /><path d="M2,-6 L36,-6" stroke="#fff" strokeWidth={8} /></svg>}
    </div>
  );
};

/** Deco sunburst behind title moments, turning slowly. */
const Rays: React.FC<{ f: number; x?: number; y?: number; o?: number; n?: number }> = ({ f, x = 960, y = 540, o = 1, n = 28 }) => (
  <g transform={`translate(${x},${y}) rotate(${f * 0.25})`} opacity={o}>
    {Array.from({ length: n }, (_, i) => {
      const t0 = (i / n) * PI * 2, t1 = ((i + 0.5) / n) * PI * 2;
      return i % 2 === 0 ? <path key={i} d={`M0,0 L${Math.cos(t0) * 1600},${Math.sin(t0) * 1600} L${Math.cos(t1) * 1600},${Math.sin(t1) * 1600}Z`} fill={SH} /> : null;
    })}
  </g>
);

/** The floor line every toon stands on, plus a wallpaper of tiny diamonds. */
const Room: React.FC<{ f: number; floor?: number; dark?: boolean }> = ({ f, floor = 820, dark }) => (
  <>
    <rect width={1920} height={1080} fill={dark ? "#2b241c" : PAPER} />
    {Array.from({ length: 13 }, (_, i) => Array.from({ length: 6 }, (_, j) => (
      <path key={`${i}-${j}`} d={`M${i * 160 + (j % 2) * 80},${j * 150 + 40} l10,14 l-10,14 l-10,-14Z`} fill={dark ? "#3a3126" : SH} />
    )))}
    <rect y={floor} width={1920} height={1080 - floor} fill={dark ? "#1d1812" : MID} />
    <path d={`M0,${floor} L1920,${floor}`} stroke={INK} strokeWidth={W + 1} />
    {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 130 - 40 + ((f * 0) % 130)},${floor} L${i * 130 - 200},1080`} stroke={INK} strokeWidth={2} opacity={0.35} />)}
  </>
);

/**
 * The phone mascot: an iPhone with noodle arms, gloves and big shoes. Its screen is the real app,
 * crisp, the only colour in the film. x,y is the top-left of the screen.
 */
const PW = 380;
const PhoneToon: React.FC<{ f: number; x: number; y: number; src: string; from: number; rate?: number; w?: number; a?: number; wave?: boolean; point?: [number, number]; noLegs?: boolean }> = ({ f, x, y, src, from, rate, w = PW, a = 0, wave, point, noLegs }) => {
  const h = w * (844 / 390);
  const p = spring(f, a, 20);
  const b = bnc(f, 4);
  const dy = (1 - p) * 900 - b * 10;
  const k = w / PW;
  const bx = 22 * k;
  const R: [number, number] = point ?? (wave ? [90 + Math.sin(f * 0.35) * 30, -h * 0.55 + Math.cos(f * 0.35) * 20] : [70, -h * 0.25 + b * 10]);
  return (
    <div style={{ position: "absolute", left: x - bx, top: y - bx + dy, width: w + bx * 2, height: h + bx * 2 }}>
      <World>
        <svg width={w + bx * 2} height={h + bx * 2} style={{ position: "absolute", overflow: "visible" }}>
          {!noLegs && (
            <g>
              <Hose x1={w * 0.35} y1={h + bx * 2 - 6} x2={w * 0.3} y2={h + bx * 2 + 70 + b * 6} bend={-14} w={10} />
              <Hose x1={w * 0.65 + bx * 2} y1={h + bx * 2 - 6} x2={w * 0.7 + bx * 2} y2={h + bx * 2 + 70 + b * 6} bend={14} w={10} />
              <ellipse cx={w * 0.24} cy={h + bx * 2 + 80 + b * 6} rx={46} ry={20} fill={INK} />
              <ellipse cx={w * 0.76 + bx * 2} cy={h + bx * 2 + 80 + b * 6} rx={46} ry={20} fill={INK} />
            </g>
          )}
          <Hose x1={0} y1={h * 0.45} x2={-70} y2={h * 0.45 - 40 + b * 12} bend={-30} w={10} />
          <Glove x={-70} y={h * 0.45 - 40 + b * 12} r={-30} s={1.2} />
          <Hose x1={w + bx * 2} y1={h * 0.45} x2={w + bx * 2 + R[0]} y2={h * 0.45 + R[1]} bend={30} w={10} />
          <Glove x={w + bx * 2 + R[0]} y={h * 0.45 + R[1]} r={wave ? 20 + Math.sin(f * 0.35) * 25 : 30} s={1.2} />
          <rect x={10} y={14} width={w + bx * 2} height={h + bx * 2} rx={60 * k} fill={INK} opacity={0.9} />
          <rect x={0} y={0} width={w + bx * 2} height={h + bx * 2} rx={60 * k} fill="#fff" stroke={INK} strokeWidth={W + 1} />
          <rect x={bx - 6} y={bx - 6} width={w + 12} height={h + 12} rx={40 * k} fill={INK} />
          <rect x={-5} y={h * 0.18} width={6} height={40} rx={3} fill={INK} />
          <rect x={w + bx * 2 - 1} y={h * 0.22} width={6} height={60} rx={3} fill={INK} />
        </svg>
      </World>
      <Screen src={src} from={from} rate={rate} w={w} r={36 * k} style={{ left: bx, top: bx }} fill="#f4efe4" />
    </div>
  );
};

/* ---------- scenes ---------- */
const Cooker: React.FC<{ f: number; x: number; y: number; s?: number; whistle?: boolean; mood?: "happy" | "sad" | "shock" | "sleep" }> = ({ f, x, y, s = 1, whistle, mood = "happy" }) => {
  const b = bnc(f, 8);
  const jig = whistle ? Math.sin(f * 1.7) * 4 : 0;
  return (
    <g transform={`translate(${x + jig},${y}) scale(${s * (1 + b * 0.04)},${s * (1 - b * 0.04)})`}>
      <path d="M-110,0 L-100,-150 Q0,-170 100,-150 L110,0 Z" fill="#fff" stroke={INK} strokeWidth={W} />
      <path d="M-104,-150 Q0,-196 104,-150" fill={INK} />
      <rect x={-14} y={-210 - (whistle ? Math.abs(Math.sin(f * 0.8)) * 16 : 0)} width={28} height={40} rx={8} fill={INK} />
      <path d="M100,-120 L220,-140 L224,-118 L104,-96" fill={INK} />
      <Face x={0} y={-74} f={f} s={1.1} mood={mood} />
      {whistle && [0, 1, 2].map((i) => {
        const t = ((f + i * 12) % 36) / 36;
        return <circle key={i} cx={Math.sin(t * 6 + i) * 20} cy={-230 - t * 180} r={18 + t * 40} fill="#fff" stroke={INK} strokeWidth={4} opacity={1 - t} />;
      })}
    </g>
  );
};

const Clock: React.FC<{ f: number; x: number; y: number; h: number; m: number; s?: number; ring?: boolean }> = ({ f, x, y, h, m, s = 1, ring }) => {
  const sh = ring ? Math.sin(f * 2.2) * 6 : 0;
  return (
    <g transform={`translate(${x},${y}) rotate(${sh}) scale(${s})`}>
      <circle cx={-60} cy={-96} r={30} fill={INK} /><circle cx={60} cy={-96} r={30} fill={INK} />
      <circle r={110} fill="#fff" stroke={INK} strokeWidth={W + 2} />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={Math.cos((i / 12) * PI * 2) * 88} cy={Math.sin((i / 12) * PI * 2) * 88} r={5} fill={INK} />)}
      <Face x={0} y={30} f={f} s={0.7} mood={ring ? "shock" : "happy"} />
      <path d={`M0,0 L${Math.sin((h / 12) * PI * 2) * 50},${-Math.cos((h / 12) * PI * 2) * 50}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <path d={`M0,0 L${Math.sin((m / 60) * PI * 2) * 76},${-Math.cos((m / 60) * PI * 2) * 76}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M-70,100 L-90,130 M70,100 L90,130" stroke={INK} strokeWidth={10} strokeLinecap="round" />
    </g>
  );
};

/** Title card: art deco frame with a banner, the way the old shorts named each reel. */
const Card: React.FC<{ f: number; top: string; big: string; deva?: string; d?: number }> = ({ f, top, big, deva, d = 60 }) => {
  const p = spring(f, 0, 16), q = ez(f, d - 10, d);
  return (
    <World>
      <AbsoluteFill style={{ background: INK, opacity: 1 - q }}>
        <Svg f={f}>
          <Rays f={f} o={0.12} />
          <rect x={360} y={200} width={1200} height={600} rx={30} fill="none" stroke={PAPER} strokeWidth={6} transform={`translate(960,500) scale(${p}) translate(-960,-500)`} />
          <rect x={384} y={224} width={1152} height={552} rx={20} fill="none" stroke={PAPER} strokeWidth={2} transform={`translate(960,500) scale(${p}) translate(-960,-500)`} />
        </Svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", fontFamily: DECO, fontSize: 44, color: MID, letterSpacing: 8, opacity: ez(f, 4, 12) }}>{top}</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: DECO, fontSize: 130, color: PAPER, transform: `scale(${spring(f, 6, 14)})` }}>{big}</div>
        {deva && <div style={{ position: "absolute", left: 0, right: 0, top: 580, textAlign: "center", fontFamily: DEVA, fontWeight: 800, fontSize: 60, color: MID, opacity: ez(f, 14, 22) }}>{deva}</div>}
      </AbsoluteFill>
    </World>
  );
};

const Open: React.FC<PP> = ({ f }) => {
  const k = f - 70;
  return (
    <>
      <World>
        <Svg f={f}>
          <Room f={f} />
          <rect x={300} y={560} width={900} height={260} fill="#fff" stroke={INK} strokeWidth={W} />
          <rect x={300} y={540} width={900} height={30} fill={INK} />
          {k > 0 && <Cooker f={f} x={1000} y={540} whistle={k % 140 < 40} />}
          {k > 0 && <Clock f={f} x={1500} y={260} h={7} m={50 + Math.min(10, k / 30)} s={0.9} />}
          {k > 0 && <Toon who="sunita" f={f} x={560} y={820} s={1.3} talk={speaking(f + 0, "SUNITA")} look={1} wave={k > 40 && k < 120} />}
          {k > 120 && <Burst x={1000} y={170} f={f} a={120 + 70} r={190} />}
        </Svg>
        {k > 0 && <Pop t="आज क्या बनेगा?" x={1000} y={170} f={f} a={190} size={58} font={DEVA} />}
        {k > 0 && <Pop t="SUNITA" x={300} y={420} f={f} a={30} size={46} font={DECO} box rot={-4} />}
      </World>
      {f < 72 && <Card f={f} top="BAARI TOONS PRESENT" big="Kuch Bhi" deva="कुछ भी" d={72} />}
    </>
  );
};

const Family: React.FC<PP> = ({ f, d }) => {
  const C = ["C1", "C2", "C3"].map((id) => SCENES.find((s) => s.s === "family")!.lines.find((l) => l.id === id)!.at - SCENES.find((s) => s.s === "family")!.from);
  return (
    <World>
      <Svg f={f}>
        <Room f={f} />
        <Toon who="mummy" f={f} x={460} y={820} s={1.15} talk={f > C[0] && f < C[1]} o={0} />
        <Toon who="papa" f={f} x={960} y={820} s={1.2} talk={f > C[1] && f < C[2]} o={5} />
        <Toon who="vinay" f={f} x={1460} y={820} s={1.1} talk={f > C[2]} o={10} />
      </Svg>
      <Pop t="kuch bhi!" x={460} y={250} f={f} a={C[0]} box tail={[60, 70]} size={58} rot={-5} />
      <Pop t="jo mann kare!" x={960} y={210} f={f} a={C[1]} box tail={[80, 70]} size={58} rot={3} />
      <Pop t="kuch bhi!!" x={1460} y={250} f={f} a={C[2]} box tail={[60, 70]} size={58} rot={-3} />
      <div style={{ opacity: ez(f, d - 8, d) }} />
    </World>
  );
};

const KuchBhi: React.FC<PP> = ({ f }) => {
  const rain = f > 200;
  return (
    <World>
      <Svg f={f}>
        <Room f={f} />
        <g transform={`translate(1240,580)`}>
          <ellipse cx={0} cy={0} rx={160} ry={50} fill="#fff" stroke={INK} strokeWidth={W} />
          <path d="M-160,0 Q-150,110 0,120 Q150,110 160,0" fill="#fff" stroke={INK} strokeWidth={W} />
          <ellipse cx={0} cy={0} rx={140} ry={38} fill={MID} />
          <Face x={0} y={66} f={f} s={0.9} mood="sad" />
          {f > 120 && <text x={-60} y={-80} fontFamily={POP} fontSize={50} fill={INK}>ठंडी...</text>}
          {f > 120 && <path d="M-120,-30 q10,-20 0,-40 M0,-30 q10,-20 0,-40 M120,-30 q10,-20 0,-40" stroke={INK} strokeWidth={3} fill="none" opacity={0.4} />}
        </g>
        <Toon who="sunita" f={f} x={560} y={820} s={1.3} sad={rain} talk={speaking(f + SCENES[2].from, "SUNITA")} look={1} />
        {rain && (
          <g transform={`translate(560,${130 + Math.sin(f * 0.1) * 6})`}>
            {[-90, -30, 30, 90].map((cx, i) => <circle key={i} cx={cx} cy={i % 2 ? -10 : 10} r={60} fill={INK} />)}
            {Array.from({ length: 9 }, (_, i) => {
              const t = ((f * 3 + i * 37) % 120);
              return <path key={i} d={`M${-110 + i * 28},${60 + t} l-6,22`} stroke={INK} strokeWidth={4} strokeLinecap="round" />;
            })}
          </g>
        )}
      </Svg>
      <Pop t="KUCH BHI?" x={1240} y={300} f={f} a={20} size={90} box rot={-6} />
      <Pop t="galti: Sunita ki" x={560} y={140} f={f} a={260} size={46} font={DECO} c="#fff" rot={-3} />
    </World>
  );
};

const Reveal: React.FC<PP> = ({ f }) => (
  <>
    <World>
      <Svg f={f}>
        <rect width={1920} height={1080} fill={PAPER} />
        <Rays f={f} x={1260} y={460} />
        <Burst x={1260} y={460} f={f} a={6} r={430} fill={PAPER} />
        <path d="M0,900 L1920,900" stroke={INK} strokeWidth={W + 1} />
        <rect y={900} width={1920} height={180} fill={MID} />
      </Svg>
      <div style={{ position: "absolute", left: 140, top: 300, fontFamily: DECO, fontSize: 210, color: INK, transform: `rotate(-4deg) scale(${spring(f, 24, 16)})`, textShadow: `8px 8px 0 ${MID}` }}>Baari</div>
      <div style={{ position: "absolute", left: 160, top: 560, fontFamily: DEVA, fontWeight: 800, fontSize: 64, color: INK, opacity: ez(f, 40, 52) }}>बारी · whose turn</div>
    </World>
    <PhoneToon f={f} x={1070} y={70} src="vote" from={0.4} a={6} wave w={360} />
  </>
);

const Vote: React.FC<PP> = ({ f }) => (
  <>
    <World>
      <Svg f={f}>
        <rect width={1920} height={1080} fill="#2b241c" />
        {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={rnd(i) * 1920} cy={rnd(i + 50) * 600} r={2 + rnd(i + 9) * 3} fill={PAPER} opacity={0.4 + 0.6 * bnc(f, i * 3)} />)}
        <circle cx={1580} cy={190} r={110} fill={PAPER} stroke={INK} strokeWidth={W} />
        <Face x={1580} y={200} f={f} s={1} mood="sleep" />
        <rect y={860} width={1920} height={220} fill="#1d1812" />
        {[0, 1, 2, 3].map((i) => {
          const a = 40 + i * 30, p = spring(f, a, 14);
          return (
            <g key={i} transform={`translate(${200 + i * 170},${860}) scale(${0.55 * p})`}>
              <Toon who={(["sunita", "mummy", "papa", "vinay"] as Who[])[i]} f={f} x={0} y={0} o={i * 4} />
            </g>
          );
        })}
      </Svg>
      <div style={{ position: "absolute", left: 140, top: 140, fontFamily: DECO, fontSize: 96, color: PAPER }}>Itvaar, 8:30 pm</div>
      {[0, 1, 2, 3].map((i) => <Pop key={i} t="DING!" x={200 + i * 170} y={600} f={f} a={60 + i * 30} size={44} c={PAPER} rot={i % 2 ? 8 : -8} />)}
    </World>
    <PhoneToon f={f} x={1060} y={80} src="vote" from={1.6} a={0} w={340} />
  </>
);

const Papa: React.FC<PP> = ({ f }) => (
  <>
    <World>
      <Svg f={f}>
        <Room f={f} />
        <Toon who="papa" f={f} x={420} y={820} s={1.35} talk={speaking(f + SCENES[5].from, "PAPA")} arm={[60, -160]} />
        <g transform={`translate(700,${520})`}>
          <ellipse rx={150} ry={42} fill="#fff" stroke={INK} strokeWidth={W} />
          <circle cx={-50} cy={-8} r={26} fill={MID} stroke={INK} strokeWidth={3} />
          <circle cx={30} cy={-12} r={30} fill={MID} stroke={INK} strokeWidth={3} />
          {f > 200 && <path d="M-120,-60 L120,40 M120,-60 L-120,40" stroke={INK} strokeWidth={14} strokeLinecap="round" opacity={ez(f, 200, 210)} />}
        </g>
        {Array.from({ length: 14 }, (_, i) => {
          const h = 10 + 40 * Math.abs(Math.sin(f * 0.5 + i));
          return f > 10 && f < 150 ? <rect key={i} x={560 + i * 22} y={260 - h / 2} width={12} height={h} rx={6} fill={INK} /> : null;
        })}
      </Svg>
      <Pop t="aloo puri, pakka!" x={720} y={180} f={f} a={10} box size={56} tail={[40, 66]} rot={-3} />
      <Pop t="no aloo · no meetha" x={700} y={660} f={f} a={210} size={50} font={DECO} />
      <Pop t="→ vote counts for RAJMA" x={700} y={730} f={f} a={260} size={50} />
    </World>
    <PhoneToon f={f} x={1240} y={70} src="tour" from={57} rate={0.72} a={20} w={340} point={[-20, -200]} />
  </>
);

const Lock: React.FC<PP> = ({ f }) => {
  const shut = ez(f, 18, 26, (t) => t);
  return (
    <>
      <World>
        <Svg f={f}>
          <rect width={1920} height={1080} fill={PAPER} />
          <Rays f={f} x={560} y={500} o={0.8} />
          <g transform={`translate(560,560) scale(${1 + (f > 26 && f < 34 ? 0.08 : 0)})`}>
            <path d={`M-90,-60 L-90,${-170 + shut * 0} Q-90,-260 0,-260 Q90,-260 90,-170 L90,${-60 - (1 - shut) * 90}`} fill="none" stroke={INK} strokeWidth={34} transform={`translate(0,${-(1 - shut) * 70})`} />
            <rect x={-160} y={-80} width={320} height={260} rx={40} fill="#fff" stroke={INK} strokeWidth={W + 2} />
            <Face x={0} y={40} f={f} s={1.4} mood={f < 26 ? "shock" : "happy"} />
          </g>
          {f > 26 && <Burst x={560} y={300} f={f} a={26} r={80} />}
        </Svg>
        <Pop t="CLICK!" x={560} y={300} f={f} a={27} size={60} />
        <Pop t="LOCKED · 9:30" x={560} y={850} f={f} a={36} size={80} font={DECO} box rot={-3} />
        <Pop t="Rajma chawal" x={560} y={980} f={f} a={60} size={50} font={DECO} />
      </World>
      <PhoneToon f={f} x={1240} y={70} src="lock" from={0.2} a={4} w={340} />
    </>
  );
};

const Khata: React.FC<PP> = ({ f }) => {
  const sc = SCENES.find((s) => s.s === "khata")!;
  const v1 = sc.lines.find((l) => l.id === "V1")!.at - sc.from, n9 = sc.lines.find((l) => l.id === "N09")!.at - sc.from;
  const slam = f > n9 + 6;
  return (
    <>
      <World>
        <Svg f={f}>
          <Room f={f} />
          <g transform={`translate(560,820) scale(${1 + (slam && f < n9 + 14 ? 0.06 : 0)})`}>
            <rect x={-170} y={-380} width={340} height={380} rx={20} fill="#fff" stroke={INK} strokeWidth={W + 2} />
            <circle cx={0} cy={-250} r={56} fill="none" stroke={INK} strokeWidth={8} />
            <path d={`M0,-250 L${Math.cos(f * 0.2) * 40},${-250 + Math.sin(f * 0.2) * 40}`} stroke={INK} strokeWidth={8} />
            <Face x={0} y={-110} f={f} s={1.2} mood={slam ? "happy" : f > v1 ? "shock" : "happy"} />
          </g>
          <Toon who="vinay" f={f} x={1000} y={820} s={1.1} talk={f > v1 && f < n9} arm={f > v1 && f < n9 ? [-280, -60] : undefined} sad={slam} />
          {slam && <Burst x={760} y={560} f={f} a={n9 + 6} r={70} />}
        </Svg>
        <Pop t="KHATA ₹5,000" x={560} y={360} f={f} a={10} size={64} font={DECO} box />
        <Pop t="₹400 a day · one shop" x={560} y={900} f={f} a={60} size={44} />
        <Pop t="cap bhool jao!" x={1050} y={330} f={f} a={v1} box size={54} tail={[30, 66]} rot={4} />
        <Pop t="NOPE." x={760} y={560} f={f} a={n9 + 8} size={70} />
      </World>
      <PhoneToon f={f} x={1380} y={90} src="tour" from={3} a={6} w={320} />
    </>
  );
};

const MOON: [number, number] = [1500, 230];
const Night: React.FC<PP> = ({ f, d }) => {
  const tx = interpolate(f, [20, 140], [-300, 620], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stall = f > 140;
  const sx = interpolate(f, [170, 240], [1960, 1150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <World>
      <Svg f={f}>
        <rect width={1920} height={1080} fill="#2b241c" />
        {Array.from({ length: 50 }, (_, i) => <circle key={i} cx={rnd(i + 3) * 1920} cy={rnd(i + 70) * 560} r={2 + rnd(i) * 3} fill={PAPER} opacity={0.3 + 0.7 * bnc(f, i * 5)} />)}
        <circle cx={MOON[0]} cy={MOON[1]} r={120} fill={PAPER} stroke={INK} strokeWidth={W} />
        <Face x={MOON[0]} y={MOON[1] + 10} f={f} s={1.1} mood={stall ? "shock" : "sleep"} />
        <rect y={760} width={1920} height={320} fill="#1d1812" />
        <path d="M0,820 L1920,820" stroke={PAPER} strokeWidth={6} strokeDasharray="60 40" opacity={0.5} />
        <g transform={`translate(${tx},${stall ? 760 + Math.sin(f * 1.4) * 3 : 760 - bnc(f) * 8})`}>
          <rect x={-150} y={-160} width={220} height={160} rx={10} fill={PAPER} stroke={INK} strokeWidth={W} />
          <path d="M70,-110 L140,-110 L170,-50 L170,0 L70,0Z" fill={PAPER} stroke={INK} strokeWidth={W} />
          <Face x={-40} y={-80} f={f} s={0.8} mood={stall ? "sad" : "happy"} />
          <circle cx={-90} cy={4} r={30} fill={INK} /><circle cx={120} cy={4} r={30} fill={INK} />
          {stall && [0, 1, 2].map((i) => { const t = ((f + i * 10) % 30) / 30; return <circle key={i} cx={170 + t * 60} cy={-60 - t * 140} r={20 + t * 30} fill="#5b5145" opacity={1 - t} />; })}
        </g>
        <g transform={`translate(${sx},760)`}>
          <circle cx={-70} cy={-20} r={30} fill="none" stroke={PAPER} strokeWidth={8} /><circle cx={70} cy={-20} r={30} fill="none" stroke={PAPER} strokeWidth={8} />
          <path d="M-70,-20 L-20,-80 L50,-80 L70,-20 M-20,-80 L-30,-130 L-60,-130" stroke={PAPER} strokeWidth={8} fill="none" />
        </g>
      </Svg>
      <div style={{ position: "absolute", left: 120, top: 110, fontFamily: DECO, fontSize: 84, color: PAPER }}>Baari, on the night shift</div>
      <Pop t="LATE!" x={tx + 600 > 0 ? 640 : -999} y={470} f={f} a={150} size={84} c={PAPER} rot={-8} />
      <Pop t="no rider?!" x={1150} y={560} f={f} a={240} size={64} c={PAPER} rot={6} />
      <Pop t="Plan B → Sharma Kirana" x={960} y={950} f={f} a={300} size={60} box />
    </World>
  );
};

const Dawn: React.FC<PP> = ({ f }) => (
  <World>
    <Svg f={f}>
      <rect width={1920} height={1080} fill={PAPER} />
      <Rays f={f} x={MOON[0]} y={MOON[1]} />
      <circle cx={MOON[0]} cy={MOON[1]} r={120 + spring(f, 0, 16) * 20} fill="#fff" stroke={INK} strokeWidth={W} />
      <Face x={MOON[0]} y={MOON[1] + 10} f={f} s={1.2} mood="happy" />
      <rect y={760} width={1920} height={320} fill={MID} />
      <path d="M0,760 L1920,760" stroke={INK} strokeWidth={W} />
    </Svg>
    <div style={{ position: "absolute", left: 140, top: 300, fontFamily: DECO, fontSize: 120, color: INK, transform: `scale(${spring(f, 4, 14)})` }}>Somvaar, 7:45</div>
  </World>
);

const Brief: React.FC<PP> = ({ f }) => {
  const sc = SCENES.find((s) => s.s === "brief")!;
  const b1 = sc.lines.find((l) => l.id === "B1")!.at - sc.from;
  return (
    <>
      <World>
        <Svg f={f}>
          <Room f={f} />
          <rect x={160} y={120} width={520} height={360} fill="#fff" stroke={INK} strokeWidth={W} />
          <path d="M420,120 L420,480 M160,300 L680,300" stroke={INK} strokeWidth={W} />
          <circle cx={600} cy={200} r={50} fill={PAPER} stroke={INK} strokeWidth={4} />
          <Toon who="sunita" f={f} x={520} y={820} s={1.3} look={1} talk={speaking(f + sc.from, "SUNITA")} />
          {f > b1 && Array.from({ length: 6 }, (_, i) => {
            const t = ((f - b1 + i * 14) % 84) / 84;
            return <text key={i} x={1180 - t * 420 + Math.sin(t * 9) * 20} y={480 - Math.sin(t * PI) * 200} fontSize={60} fontFamily={SANS} fill={INK} opacity={Math.sin(t * PI)}>{i % 2 ? "♪" : "♫"}</text>;
          })}
        </Svg>
        <Pop t="a voice note, in Hindi" x={930} y={600} f={f} a={10} size={46} font={DECO} />
        <Pop t="no app · no typing" x={930} y={670} f={f} a={40} size={40} />
      </World>
      <PhoneToon f={f} x={1260} y={70} src="tour" from={Math.max(39, 42.5 - b1 / 30)} a={0} w={340} />
    </>
  );
};

const Reply: React.FC<PP> = ({ f }) => {
  const sc = SCENES.find((s) => s.s === "reply")!;
  const L = (id: string) => sc.lines.find((l) => l.id === id)!.at - sc.from;
  return (
    <>
      <World>
        <Svg f={f}>
          <Room f={f} />
          <Toon who="sunita" f={f} x={480} y={820} s={1.3} look={1} talk={speaking(f + sc.from, "SUNITA")} wave={f > L("S2")} />
        </Svg>
        <Pop t="haan haan!" x={480} y={250} f={f} a={L("S1")} box size={60} tail={[50, 70]} rot={-4} />
        <Pop t="...kitne log?" x={900} y={420} f={f} a={L("N12") + 10} size={56} rot={3} />
        {["4 log", "2 pyaaz", "300 g tamatar"].map((t, i) => <Pop key={t} t={t} x={900} y={560 + i * 90} f={f} a={L("S2") + 8 + i * 8} size={40} box />)}
      </World>
      <PhoneToon f={f} x={1260} y={70} src="tour" from={48.5} rate={0.55} a={0} w={340} />
    </>
  );
};

const Kirana: React.FC<PP> = ({ f }) => {
  const cx = interpolate(f, [40, 80], [1180, 640], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = 420 - Math.sin(ez(f, 40, 80, (t) => t) * PI) * 220;
  return (
    <>
      <World>
        <Svg f={f}>
          <Room f={f} />
          <rect x={200} y={360} width={760} height={460} fill="#fff" stroke={INK} strokeWidth={W} />
          {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${200 + i * 95},300 L${295 + i * 95},300 L${295 + i * 95},380 Q${247 + i * 95},${410 + bnc(f, i) * 10} ${200 + i * 95},380Z`} fill={i % 2 ? INK : "#fff"} stroke={INK} strokeWidth={4} />)}
          <Toon who="sharma" f={f} x={580} y={820} s={1.1} wave={f > 80} />
          {f > 40 && f < 82 && <g transform={`translate(${cx},${cy}) rotate(${f * 12})`}><circle r={40} fill="#fff" stroke={INK} strokeWidth={W} /><text x={-26} y={14} fontFamily={POP} fontSize={40} fill={INK}>₹45</text></g>}
          {f > 82 && <Burst x={640} y={420} f={f} a={82} r={70} />}
        </Svg>
        <Pop t="शर्मा किराना" x={580} y={250} f={f} a={0} size={64} font={DEVA} box />
        <Pop t="₹45 PAID!" x={640} y={420} f={f} a={84} size={56} />
        <Pop t="Sunita's pocket: ₹0" x={580} y={950} f={f} a={120} size={50} font={DECO} />
      </World>
      <PhoneToon f={f} x={1260} y={70} src="tour" from={19} rate={0.75} a={0} w={340} />
    </>
  );
};

const Eight: React.FC<PP> = ({ f }) => (
  <>
    <World>
      <Svg f={f}>
        <Room f={f} />
        <Clock f={f} x={960} y={190} h={8} m={0} s={0.8} ring={f < 40} />
        <rect x={260} y={640} width={1400} height={40} fill="#fff" stroke={INK} strokeWidth={W} />
        {(["mummy", "papa", "vinay", "sunita"] as Who[]).map((w, i) => (
          <g key={w}>
            <Toon who={w} f={f} x={420 + i * 360} y={820} s={0.95} o={i * 4} dance={f > 60} />
            <ellipse cx={420 + i * 360} cy={640} rx={90} ry={20} fill="#fff" stroke={INK} strokeWidth={4} />
            <ellipse cx={420 + i * 360} cy={636} rx={70 * (1 - ez(f, 90 + i * 20, 180 + i * 20))} ry={12 * (1 - ez(f, 90 + i * 20, 180 + i * 20))} fill={MID} />
          </g>
        ))}
        <Cooker f={f} x={1700} y={640} s={0.6} whistle={f > 16 && f < 70} />
      </Svg>
      <Pop t="DING!" x={1180} y={130} f={f} a={2} size={70} rot={8} />
      <Pop t="khana taiyaar!" x={430} y={160} f={f} a={60} size={60} font={DECO} />
    </World>
  </>
);

const Agent: React.FC<PP> = ({ f }) => {
  const s = 0.9;
  const tw = 1840 * s, th = 1100 * s;
  return (
    <>
      <World>
        <Svg f={f}>
          <Room f={f} floor={900} />
          <path d={`M520,120 L420,10 M640,120 L760,20`} stroke={INK} strokeWidth={8} />
          <circle cx={420} cy={10} r={14} fill={INK} /><circle cx={760} cy={20} r={14} fill={INK} />
          <rect x={60} y={110} width={tw + 120} height={th + 120} rx={50} fill="#fff" stroke={INK} strokeWidth={W + 2} />
          <rect x={110} y={160} width={tw + 20} height={th + 20} rx={20} fill="#f4f2ee" stroke={INK} strokeWidth={6} />
          <path d="M200,840 L160,900 M1040,840 L1080,900" stroke={INK} strokeWidth={12} strokeLinecap="round" />
        </Svg>
      </World>
      <Crisp>
        <div style={{ position: "absolute", left: 120, top: 170, width: tw, height: th, overflow: "hidden", borderRadius: 14, transform: `scale(${spring(f, 4, 16)})` }}>
          <div style={{ transform: `scale(${s})`, transformOrigin: "0 0", position: "absolute", left: 0, top: 0, width: 1840, height: 1100 }}>
            <AgentPage f={f} style={{ left: 0, top: 0 }} />
          </div>
        </div>
      </Crisp>
      <PhoneToon f={f} x={1440} y={110} src="tour" from={54.5} a={20} w={300} point={[-60, -160]} />
    </>
  );
};

const Evals: React.FC<PP> = ({ f }) => {
  const bars: [string, number][] = [["GPT-4o", 0], ["prompt v3", 2], ["v4", 4], ["v5", 8]];
  return (
    <World>
      <Svg f={f}>
        <rect width={1920} height={1080} fill={PAPER} />
        <Rays f={f} x={700} y={1100} o={0.7} />
        {bars.map(([n, v], i) => {
          const h = ez(f, 30 + i * 20, 70 + i * 20, (t) => 1 - Math.pow(1 - t, 3)) * v * 64;
          const x = 200 + i * 260;
          return (
            <g key={n}>
              <rect x={x} y={300} width={120} height={540} rx={60} fill="#fff" stroke={INK} strokeWidth={W} />
              <rect x={x + 18} y={822 - h} width={84} height={h} rx={42} fill={INK} />
              <circle cx={x + 60} cy={870} r={70} fill={i === 3 ? INK : "#fff"} stroke={INK} strokeWidth={W} />
              {i === 3 && f > 120 && <Face x={x + 60} y={240 - bnc(f) * 20} f={f} s={0.9} />}
            </g>
          );
        })}
      </Svg>
      <div style={{ position: "absolute", left: 120, top: 60, fontFamily: DECO, fontSize: 80, color: INK }}>10 cases. graded every round.</div>
      {bars.map(([n, v], i) => <Pop key={n} t={`${v}/10`} x={260 + i * 260} y={872} f={f} a={70 + i * 20} size={44} c={i === 3 ? PAPER : INK} />)}
      {bars.map(([n], i) => <Pop key={n + "l"} t={n} x={260 + i * 260} y={262} f={f} a={36 + i * 20} size={40} font={SANS} />)}
      <Pop t="still failing, shown on purpose:" x={1520} y={340} f={f} a={150} size={40} font={DECO} w={640} />
      <Pop t="E04 · E05" x={1520} y={460} f={f} a={190} size={110} box rot={-4} />
      <Pop t="partners: Gnani · Pine Labs · Delhivery" x={1520} y={640} f={f} a={230} size={40} w={640} />
    </World>
  );
};

const End: React.FC<PP> = ({ f, d }) => {
  const iris = interpolate(f, [d - 70, d - 30], [1300, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <World>
      <Svg f={f}>
        <rect width={1920} height={1080} fill={PAPER} />
        <Rays f={f} x={960} y={330} />
        <circle cx={960} cy={330} r={190 * spring(f, 0, 18)} fill="#fff" stroke={INK} strokeWidth={W + 2} />
      </Svg>
      <div style={{ position: "absolute", left: 960 - 120, top: 210, width: 240, height: 240, transform: `scale(${spring(f, 10, 16)})` }}><Img src={staticFile("app/icon.svg")} style={{ width: 240, height: 240 }} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center", fontFamily: DECO, fontSize: 170, color: INK, transform: `scale(${spring(f, 24, 16)})`, textShadow: `8px 8px 0 ${MID}` }}>Baari</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 750, textAlign: "center", fontFamily: DEVA, fontWeight: 800, fontSize: 60, color: INK, opacity: ez(f, 40, 50) }}>आज किसकी बारी?</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 36, color: INK, opacity: ez(f, 60, 70) }}>baari.pages.dev · github.com/wafflebytes/baari</div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><mask id="endiris"><rect width={1920} height={1080} fill="#fff" /><circle cx={960} cy={330} r={iris} fill="#000" /></mask></defs>
        {f > d - 70 && <rect width={1920} height={1080} fill={INK} mask="url(#endiris)" />}
      </svg>
      {f > d - 30 && <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", fontFamily: DECO, fontSize: 90, color: PAPER, opacity: ez(f, d - 26, d - 16) }}>Bas, itna hi!</div>}
    </World>
  );
};

const MAP: Record<string, React.FC<PP>> = { open: Open, family: Family, kuchbhi: KuchBhi, reveal: Reveal, vote: Vote, papa: Papa, lock: Lock, khata: Khata, night: Night, dawn: Dawn, brief: Brief, reply: Reply, kirana: Kirana, eight: Eight, agent: Agent, evals: Evals, end: End };

/**
 * Cuts. Each boundary is a black iris that closes on a point in the old scene and opens on the
 * matching point in the new one (moon to sun, cooker to stamp, phone to phone). Phone-to-phone
 * boundaries keep the phone where it is and only swap the world around it.
 */
const IRIS: Record<string, [number, number]> = {
  family: [560, 500], kuchbhi: [960, 400], reveal: [560, 400], vote: [1250, 500], papa: [1250, 500], lock: [1410, 500],
  khata: [1410, 500], night: [1550, 500], dawn: MOON, brief: MOON, reply: [1430, 500], kirana: [1430, 500], eight: [960, 190],
  agent: [960, 190], evals: [1590, 400], end: [960, 330],
};
const N = 12;
const Iris: React.FC = () => {
  const F = useCurrentFrame();
  const k = SCENES.findIndex((s) => Math.abs(F - s.from) <= N && s.from > 0);
  if (k < 0) return null;
  const sc = SCENES[k];
  const pt = IRIS[sc.s];
  if (!pt) return null;
  const g = F - sc.from;
  const r = g < 0 ? interpolate(g, [-N, -1], [1300, 0], { easing: (t) => t * t }) : interpolate(g, [0, N], [0, 1300], { easing: (t) => 1 - (1 - t) * (1 - t) });
  return (
    <World>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><mask id="irism"><rect width={1920} height={1080} fill="#fff" /><circle cx={pt[0]} cy={pt[1]} r={Math.max(0, r)} fill="#000" /></mask></defs>
        <rect width={1920} height={1080} fill={INK} mask="url(#irism)" />
      </svg>
    </World>
  );
};

/** Film stock: grain, dust, scratches and a soft vignette, under the crisp layer only. */
const Stock: React.FC = () => {
  const f = useCurrentFrame();
  const g = Math.floor(f / 2);
  return (
    <World>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, backgroundPosition: `${rnd(g) * 400}px ${rnd(g + 3) * 400}px`, mixBlendMode: "multiply", opacity: 0.35 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 60%, rgba(23,18,13,.55) 100%)" }} />
      {rnd(g * 7) > 0.8 && <div style={{ position: "absolute", left: `${rnd(g) * 100}%`, top: 0, width: 2, height: "100%", background: "rgba(23,18,13,.35)" }} />}
      {rnd(g * 11) > 0.7 && <div style={{ position: "absolute", left: `${rnd(g + 5) * 100}%`, top: `${rnd(g + 6) * 100}%`, width: 6, height: 4, borderRadius: 3, background: INK }} />}
      <AbsoluteFill style={{ background: "#fff8e6", opacity: (rnd(g * 3) - 0.5) * 0.06 + 0.03 }} />
    </World>
  );
};

/** One reel: the current scene, centred, no pans. Cuts are irises. */
const Reel: React.FC = () => {
  const F = useCurrentFrame();
  const i = Math.max(0, SCENES.findIndex((s) => F >= s.from && F < s.from + s.dur));
  const sc = SCENES[i];
  const C = MAP[sc.s];
  const lf = F - sc.from;
  // a gentle camera push-in on the beat, never on the phone layer's crispness
  const push = 1 + 0.025 * ez(lf, 0, sc.dur);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>
      <C f={lf} d={sc.dur} />
    </div>
  );
};

const Subs: React.FC = () => {
  const f = useCurrentFrame();
  const c = currentLine(f);
  if (!c) return null;
  const o = ez(f, c.l.at, c.l.at + 4);
  return (
    <Crisp>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: o }}>
        <div style={{ background: INK, color: PAPER, padding: "12px 30px 14px", borderRadius: 12, maxWidth: 1600, fontFamily: SANS, fontWeight: 600, fontSize: c.v.sub.length > 110 ? 27 : 31, lineHeight: 1.3, textAlign: "center", border: `3px solid ${PAPER}` }}>
          <span style={{ fontFamily: DECO, fontSize: 28, color: MID, marginRight: 14 }}>{NAMES[c.who]}</span>
          {c.v.sub}
        </div>
      </div>
    </Crisp>
  );
};

export const Toons: React.FC<{ layer: "world" | "crisp" | "full" }> = ({ layer }) => (
  <Root2 layer={layer}>
    <World><AbsoluteFill style={{ background: PAPER }} /></World>
    <Reel />
    <Stock />
    <Iris />
    <Subs />
    {layer !== "world" && <Soundtrack />}
  </Root2>
);
void at;
