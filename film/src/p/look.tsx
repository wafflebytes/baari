// The paper cut trailer's look: the Round 3 paper kit (cut-outs with a white sticker margin,
// stop-motion on twos, gouache cards, puppets) in Baari's brand: cream ground, ink, one haldi
// accent, Family for display, Inter for body, Noto in Devanagari. Phones are the real app,
// recorded the README's way (clip.mjs --ios), in an ink bezel.
import React from "react";
import { AbsoluteFill, OffthreadVideo, Img, staticFile, continueRender, delayRender, useCurrentFrame, interpolate, Easing } from "remotion";
import { cut, land, twos, wob, Paper } from "../kit";
import { V } from "./timeline";

export const B = {
  ground: "#F6F4EF", ink: "#15130F", mute: "#6B675F", haldi: "#F2B705", haldiText: "#855C00", tint: "#FDF2D3",
  card: "#FFFFFF", night: "#1B2238", night2: "#2A3354", ok: "#0B6E49", kraft: "#E9DFCB", blush: "#F6D9CF", sage: "#DCE8D3",
};
export const FONT = { display: "Family", body: "Inter", deva: "Noto Sans Devanagari", mono: "JetBrains Mono" };

const FACES: [string, string, string][] = [
  ["Family", "fonts/Family-Medium.woff2", "500"], ["Family", "fonts/Family-SemiBold.woff2", "600"], ["Family", "fonts/Family-Regular.woff2", "400"],
  ["Inter", "fonts/inter-500.woff2", "500"], ["Inter", "fonts/inter-600.woff2", "600"], ["Inter", "fonts/inter-700.woff2", "700"],
  ["Noto Sans Devanagari", "fonts/deva-600.woff2", "600"], ["Noto Sans Devanagari", "fonts/deva-700.woff2", "700"], ["JetBrains Mono", "fonts/jbm-500.woff2", "500"],
];
if (typeof document !== "undefined") {
  const h = delayRender("fonts");
  Promise.all(FACES.map(([fam, src, w]) => new FontFace(fam, `url(${staticFile(src)})`, { weight: w }).load().then((ff) => (document.fonts as any).add(ff))))
    .then(() => continueRender(h)).catch(() => continueRender(h));
}

const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The ground: a sheet of cream card with paper grain and a faint fibre. */
export const Ground: React.FC<{ bg?: string; children?: React.ReactNode }> = ({ bg = B.ground, children }) => (
  <AbsoluteFill style={{ background: bg }}>
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, backgroundSize: "256px", opacity: 0.22, mixBlendMode: "multiply" }} />
    {children}
  </AbsoluteFill>
);

/** A cut-out piece that lands on its frame (stop-motion, on twos) and then sits with a slight wobble. */
export const Drop: React.FC<{ f: number; at: number; x: number; y: number; seed?: number; from?: number; rot?: number; children: React.ReactNode; z?: number }> = ({ f, at, x, y, seed = 1, from = -120, rot = 0, children, z }) => {
  if (f < at) return null;
  const l = land(f, at, { from, seed, dur: 8 });
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: z, ...l }}>
      <div style={{ transform: `rotate(${rot + wob(f, seed, 0.8)}deg)` }}>{children}</div>
    </div>
  );
};

/** An image cut out of paper: white sticker margin and a card shadow. */
export const Cutout: React.FC<{ src: string; w: number; m?: number; style?: React.CSSProperties }> = ({ src, w, m = 6, style }) => (
  <Img src={staticFile(src)} style={{ width: w, display: "block", filter: cut(m, 14), ...style }} />
);

/** Big display words, cut from paper one word at a time. */
export const Words: React.FC<{ f: number; at: number; text: string; size: number; color?: string; stagger?: number; font?: string; weight?: number; align?: "left" | "center"; style?: React.CSSProperties }> = ({ f, at, text, size, color = B.ink, stagger = 3, font, weight = 600, align = "center", style }) => {
  const deva = /[ऀ-ॿ]/.test(text);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", gap: `0 ${size * 0.26}px`, fontFamily: font ?? (deva ? FONT.deva : FONT.display), fontWeight: weight, fontSize: size, lineHeight: 1.08, color, letterSpacing: deva ? 0 : -size * 0.02, ...style }}>
      {text.split(" ").map((w, i) => (f >= at + i * stagger ? (
        <span key={i} style={{ display: "inline-block", filter: cut(Math.max(3, size / 26), size / 10), ...land(f, at + i * stagger, { from: -50, seed: i + 7, dur: 6 }) }}>{w}</span>
      ) : <span key={i} style={{ display: "inline-block", visibility: "hidden" }}>{w}</span>))}
    </div>
  );
};

/** A paper label: white card, ink type, optional haldi dot. */
export const Label: React.FC<{ text: string; size?: number; bg?: string; color?: string; dot?: boolean; style?: React.CSSProperties; font?: string }> = ({ text, size = 34, bg = B.card, color = B.ink, dot, style, font }) => (
  <div style={{ filter: cut(4, 10), ...style }}>
    <div style={{ background: bg, color, fontFamily: font ?? (/[ऀ-ॿ]/.test(text) ? FONT.deva : FONT.body), fontWeight: 600, fontSize: size, padding: `${size * 0.32}px ${size * 0.62}px`, borderRadius: size * 0.4, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: size * 0.35 }}>
      {dot ? <span style={{ width: size * 0.36, height: size * 0.36, borderRadius: "50%", background: B.haldi, display: "inline-block" }} /> : null}
      {text}
    </div>
  </div>
);

/** A paper speech bubble with a tail. */
export const Bubble: React.FC<{ f: number; at: number; text: string; x: number; y: number; size?: number; tail?: "l" | "r"; bg?: string; color?: string; rot?: number; w?: number }> = ({ f, at, text, x, y, size = 48, tail = "l", bg = B.card, color = B.ink, rot = -2, w }) => {
  if (f < at) return null;
  const deva = /[ऀ-ॿ]/.test(text);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...land(f, at, { from: -30, seed: x + y, dur: 4 }) }}>
      <div style={{ transform: `rotate(${rot}deg)`, filter: cut(4, 10) }}>
        <div style={{ background: bg, borderRadius: size * 0.6, padding: `${size * 0.36}px ${size * 0.56}px`, fontFamily: deva ? FONT.deva : FONT.display, fontWeight: 600, fontSize: size, color, lineHeight: 1.15, position: "relative", whiteSpace: w ? "normal" : "nowrap" }}>
          {text}
          <div style={{ position: "absolute", bottom: -size * 0.46, [tail === "l" ? "left" : "right"]: size * 0.9, width: 0, height: 0, borderLeft: `${size * 0.32}px solid transparent`, borderRight: `${size * 0.32}px solid transparent`, borderTop: `${size * 0.52}px solid ${bg}` } as any} />
        </div>
      </div>
    </div>
  );
};

export const PW = 393, PH = 852;
/**
 * The real app, recorded by clip.mjs --ios (status bar drawn in, safe areas, no notch, no home bar),
 * in an ink bezel cut out of paper. `from` is seconds into the take; takes run 1.25x slow, so they
 * play at 1.25. `at` is the frame (scene-relative) it lands on.
 */
export const Phone: React.FC<{ f: number; at?: number; take: string; from: number; x: number; y: number; scale?: number; rot?: number; seed?: number; children?: React.ReactNode }> = ({ f, at = 0, take, from, x, y, scale = 1, rot = -2, seed = 3, children }) => {
  if (f < at) return null;
  const bez = 14;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: (PW + bez * 2) * scale, height: (PH + bez * 2) * scale, ...land(f, at, { from: -160, seed, dur: 8 }) }}>
      <div style={{ transform: `rotate(${rot + wob(f, seed, 0.5)}deg) scale(${scale})`, transformOrigin: "0 0", width: PW + bez * 2, height: PH + bez * 2, filter: cut(7, 22) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 66, background: B.ink }} />
        <div style={{ position: "absolute", left: bez, top: bez, width: PW, height: PH, borderRadius: 54, overflow: "hidden", background: "#fff" }}>
          <OffthreadVideo src={staticFile(`rec/ios/${take}.webm`)} startFrom={Math.round(from * 30)} playbackRate={1.25} muted style={{ width: PW, height: PH, display: "block" }} />
          {children}
        </div>
      </div>
    </div>
  );
};

/** A gouache paper card (the Round 3 kit), re-exported so scenes take everything from here. */
export { Paper, cut, land, twos, wob };

/** A torn strip of paper with a tag on it, top right: "App, real speed", "demo data", ... */
export const Tag: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", right: 72, top: 54, filter: cut(3, 6) }}>
    <div style={{ background: B.ink, color: B.ground, fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, padding: "8px 16px", borderRadius: 6, letterSpacing: 0.5 }}>{text}</div>
  </div>
);

const WHO: Record<string, string> = { sunita: "Sunita", baari: "Baari", vinay: "Vinay", papa: "Papa", mummy: "Mummy", behen: "Behen" };
/** Captions: one paper strip at the bottom, the speaker's name in mono, as in the Round 3 film. */
export const Subs: React.FC<{ lines: Record<string, { at: number; len: number }> }> = ({ lines }) => {
  const f = useCurrentFrame();
  const cur = Object.entries(lines).filter(([id]) => !id.startsWith("L11b")).find(([, l]) => f >= l.at && f < l.at + l.len + 8);
  const haan = Object.entries(lines).some(([id, l]) => id.startsWith("L11b") && f >= l.at && f < l.at + l.len + 8);
  if (!cur && !haan) return null;
  const [id, l] = cur ?? ["haan", { at: lines["L11b-papa"].at, len: 0 }];
  const v = cur ? V[id] : { who: "family", sub: "Haan! Haan! Haan! Haan!" };
  const o = interpolate(f, [l.at, l.at + 3], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ filter: cut(3, 6), maxWidth: 1500 }}>
        <div style={{ background: B.card, borderRadius: 10, padding: "10px 26px", fontFamily: FONT.body, fontWeight: 600, fontSize: v.sub.length > 90 ? 28 : 32, color: B.ink, lineHeight: 1.3, textAlign: "center" }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 20, color: v.who === "sunita" ? B.haldiText : B.mute, marginRight: 14, letterSpacing: 1 }}>{(WHO[v.who] ?? "Family").toUpperCase()}</span>
          {v.sub}
        </div>
      </div>
    </div>
  );
};

export { rnd, twos as onTwos };
