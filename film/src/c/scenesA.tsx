import React from "react";
import { Img, staticFile } from "remotion";
import { Puppet } from "../puppets";
import { B, FONT, Ground, Cutout, Words, Label, Bubble, Phone, Token, punch, cut, twos, wob } from "./look";
import { at, len, saying } from "./timeline";

type P = { f: number; d: number };
const frac = (id: string, k: number) => at(id) + Math.round(len(id) * k);

/** A card that slides in from a frame edge on twos, eases out and settles. */
const Slide: React.FC<{ f: number; at: number; dx?: number; dy?: number; x: number; y: number; rot?: number; seed?: number; dur?: number; z?: number; children: React.ReactNode }> = ({ f, at: a, dx = 0, dy = 0, x, y, rot = 0, seed = 1, dur = 9, z, children }) => {
  if (f < a) return null;
  const t = Math.min(1, twos(f - a) / dur);
  const e = 1 - Math.pow(1 - t, 3);
  const tilt = (1 - e) * (dx + dy > 0 ? 4 : -4);
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: z, transform: `translate(${(1 - e) * dx}px, ${(1 - e) * dy}px) rotate(${rot + tilt + (t >= 1 ? wob(f, seed, 0.6) : 0)}deg)` }}>{children}</div>
  );
};

/** Pop-up book: scaleY from 0, hinged at the bottom, overshoot, settle. */
const Pop: React.FC<{ f: number; at: number; x: number; y: number; rot?: number; z?: number; children: React.ReactNode }> = ({ f, at: a, x, y, rot = 0, z, children }) => {
  if (f < a) return null;
  const g = twos(f - a);
  const sy = g >= 12 ? 1 : [0.15, 0.7, 1.08, 1.04, 0.98, 1][Math.floor(g / 2)] ?? 1;
  const sx = 1 + (sy - 1) * -0.3;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: z, transform: `rotate(${rot}deg)` }}>
      <div style={{ transform: `scale(${sx}, ${sy})`, transformOrigin: "50% 100%" }}>{children}</div>
    </div>
  );
};

/** A stamp that hits: fast from above, one frame of squash, then still. */
const Stamp: React.FC<{ f: number; at: number; x: number; y: number; rot?: number; children: React.ReactNode }> = ({ f, at: a, x, y, rot = -8, children }) => {
  if (f < a) return null;
  const t = f - a;
  const dy = t < 3 ? -(3 - t) * 110 : 0;
  const sq = t === 3 ? "scale(1.12, 0.88)" : "";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(${dy}px) rotate(${rot}deg) ${sq}`, transformOrigin: "50% 100%" }}>{children}</div>
  );
};

const Floor: React.FC<{ y: number; x?: number; color?: string }> = ({ y, x = 0, color = B.kraft }) => (
  <>
    <div style={{ position: "absolute", left: x, top: y, right: 0, bottom: 0, background: color, filter: cut(4, 10) }} />
    <div style={{ position: "absolute", left: x, top: y, right: 0, height: 24, background: "#D6C5A0" }} />
  </>
);

const hop = (f: number, a: number, amt = 18) => { const g = f - a; return g >= 0 && g < 8 ? -Math.sin((g / 8) * Math.PI) * amt : 0; };

const Bubble2: React.FC<{ f: number; at: number; text: string; right?: boolean; y: number; seed: number }> = ({ f, at: a, text, right, y, seed }) => (
  <Slide f={f} at={a} dx={right ? 520 : -520} x={right ? 28 : 30} y={y} dur={4} rot={right ? 1.5 : -1.5} seed={seed}>
    <div style={{ width: 530, display: "flex", justifyContent: right ? "flex-end" : "flex-start" }}>
      <Label text={text} size={31} />
    </div>
  </Slide>
);

const House: React.FC<{ x: number; y: number; bg: string; f: number; at: number; seed: number }> = ({ x, y, bg, f, at: a, seed }) => (
  <Slide f={f} at={a} dx={1200} x={x} y={y} dur={8} seed={seed} rot={0}>
    <div style={{ position: "relative", width: 250, height: 320 }}>
      <div style={{ position: "absolute", left: 124, top: 0, width: 6, height: 84, background: B.ink }} />
      <div style={{ position: "absolute", left: 130, top: 4, width: 54, height: 44, background: B.card, filter: cut(3, 6), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 600, fontSize: 34, color: B.ink }}>?</div>
      <div style={{ filter: cut(4, 10), position: "absolute", left: 0, top: 70, width: 250, height: 250 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 250, height: 100, background: B.ink, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
        <div style={{ position: "absolute", left: 18, top: 100, width: 214, height: 150, background: bg }} />
        <div style={{ position: "absolute", left: 100, top: 160, width: 50, height: 90, background: B.ink, borderRadius: "8px 8px 0 0" }} />
        <div style={{ position: "absolute", left: 38, top: 128, width: 40, height: 40, background: B.ground, border: `4px solid ${B.ink}` }} />
        <div style={{ position: "absolute", left: 172, top: 128, width: 40, height: 40, background: B.ground, border: `4px solid ${B.ink}` }} />
      </div>
    </div>
  </Slide>
);

/** Hook: the Round 3 opener. Sunita laughs, the cooker looks hard, it was never the problem, the real question slams in. */
export const Hook: React.FC<P> = ({ f }) => {
  const talk = saying(f, "RN01c");
  const up = frac("RN01c", 0.14);
  const flat = frac("RN01c", 0.47);
  const slam = frac("RN01c", 0.8);
  const laugh = Math.max(hop(f, frac("RN01c", 0.02), 20), hop(f, frac("RN01c", 0.07), 14));
  if (f >= slam) {
    return (
      <Ground bg={B.haldi}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, slam + 2, 0.08)})` }}>
          <div style={{ position: "absolute", left: 96, right: 96, top: 380 }}>
            <Words f={f} at={slam} text="आज क्या बनेगा?" size={250} stagger={4} weight={700} />
          </div>
        </div>
      </Ground>
    );
  }
  const shaking = f >= flat - 2 && f < flat + 14;
  const flip = shaking && Math.floor((f - flat + 2) / 4) % 2 === 1;
  // cooker: pops up, then is knocked flat
  const g = f - flat;
  const fall = f < flat ? 0 : Math.min(1, twos(g) / 6);
  const rotC = 86 * (1 - Math.pow(1 - fall, 3));
  const puffs = f >= up + 6 && f < flat ? [0, 1, 2].map((i) => ({ i, t: ((f - up - 6 + i * 8) % 24) / 24 })) : [];
  return (
    <Ground>
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 780, backgroundImage: "linear-gradient(#E4DFD2 3px, transparent 3px), linear-gradient(90deg, #E4DFD2 3px, transparent 3px)", backgroundSize: "120px 120px" }} />
      <Puppet who="sunita" f={f} x={250} y={170 + 40 + laugh} s={1.7} talk={talk} flip={flip} mood={f >= flat ? "flat" : "smile"} seed={2} />
      <Floor y={780} />
      <div style={{ position: "absolute", left: 1000, top: 360, width: 420, height: 420, zIndex: 5 }}>
        {f >= up && (
          <div style={{ position: "absolute", left: 0, top: 0, width: 420, height: 420, transformOrigin: "80% 100%", transform: `rotate(${rotC}deg)` }}>
            <Pop f={f} at={up} x={0} y={0}><Cutout src="img/pressure-cooker.png" w={420} /></Pop>
          </div>
        )}
        {puffs.map(({ i, t }) => (
          <div key={i} style={{ position: "absolute", left: 90 + i * 40 + Math.sin(t * 6 + i) * 14, top: 40 - t * 150, width: 50 + t * 40, height: 50 + t * 40, borderRadius: "50%", background: B.card, opacity: 1 - t, filter: cut(3, 6) }} />
        ))}
      </div>
    </Ground>
  );
};

/** Mummy: "kuch bhi", three times, and the crate that has nothing in it. */
export const Mummy: React.FC<P> = ({ f }) => {
  const r1 = at("RC1"), r2 = at("RC2"), r3 = at("RC3"), k = at("K03");
  const crate = k + Math.round(len("K03") * 0.5);
  const out = k;
  const o = f < out ? 0 : Math.min(1, twos(f - out) / 6);
  const winddown = f < out - 3 ? 0 : f < out ? -10 * ((f - (out - 3)) / 3) : 0;
  const exit = f < out ? winddown : -10 + 790 * Math.pow(o, 2);
  const s = 1.2, py = 880 - 420 * s;
  const row: [("mummy" | "papa" | "vinay"), number, number, string, string][] = [
    ["mummy", 300, r1, "RC1", "Kuch bhi bana do."],
    ["papa", 760, r2, "RC2", "Jo mann kare."],
    ["vinay", 1220, r3, "RC3", "Kuch bhi chalega!"],
  ];
  return (
    <Ground>
      <Floor y={860} />
      {f < out + 8 && <div style={{ position: "absolute", inset: 0, transform: `translateY(${exit}px)` }}>
        {row.map(([who, x, a, id, text], i) => (
          <React.Fragment key={who}>
            <Slide f={f} at={a} dy={500} x={x} y={py} dur={6} seed={i + 2}>
              <div style={{ position: "relative", width: 288, height: 504 }}>
                <Puppet who={who} f={f} x={0} y={0} s={s} talk={saying(f, id)} arm={saying(f, id) ? 1 : 0} mood={who === "vinay" ? "smile" : "smile"} seed={i + 4} flip={who === "vinay"} />
              </div>
            </Slide>
            <Bubble f={f} at={a + 4} text={text} x={x - 40 + (i === 2 ? -40 : 0)} y={150 + (i % 2) * 20} size={44} tail="l" rot={i === 1 ? 2 : -2} />
          </React.Fragment>
        ))}
        {f >= r2 + 8 && f < r3 + 8 && <Token f={f} at={r2 + 8} x={674} y={800} size={90} x0={444} y0={640} />}
        {f >= r3 + 8 && <Token f={f} at={r3 + 8} x={1134} y={800} size={90} x0={674} y0={800} />}
      </div>}
      {f >= k + 6 && (
        <Slide f={f} at={k + 6} dx={-700} x={330} y={900 - 420 * 1.6} dur={8} seed={9}>
          <div style={{ position: "relative", width: 384, height: 672 }}>
            <Puppet who="sunita" f={f} x={0} y={0} s={1.6} talk={saying(f, "K03")} mood="flat" seed={8} />
          </div>
        </Slide>
      )}
      {f >= crate && (
        <Pop f={f} at={crate} x={1060} y={600} rot={1}>
          <div style={{ width: 520, height: 280, position: "relative", filter: cut(4, 12) }}>
            <div style={{ position: "absolute", left: 20, top: 0, width: 480, height: 70, background: "#2A2218", borderRadius: 6 }} />
            <div style={{ position: "absolute", left: 0, top: 46, width: 520, height: 234, background: B.kraft, borderRadius: 8 }}>
              {[60, 120, 180].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 4, background: "#D6C5A0" }} />)}
              <div style={{ position: "absolute", left: 90, top: 70 }}><Label text="KUCH BHI" size={60} /></div>
            </div>
          </div>
        </Pop>
      )}
    </Ground>
  );
};

/** Baari: Vinay builds it, then the brand moment. */
export const Baari: React.FC<P> = ({ f }) => {
  const talk = saying(f, "C02");
  // C02: "Phir Vinay bhaiya ne | AgenticOrg pe banaya... | Baari! | Matlab, | ab kisi aur ki baari."
  const org = frac("C02", 0.27);
  const hero = frac("C02", 0.58);
  const turn = frac("C02", 0.83);
  const built = hero + 22;
  if (f >= hero) {
    return (
      <Ground bg={B.haldi}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, hero + 4, 0.05) * punch(f, built + 6, 0.03)})` }}>
          <Pop f={f} at={hero + 2} x={830} y={96}><Img src={staticFile("img/baari-glyph.png")} style={{ width: 260, display: "block", filter: "drop-shadow(0 10px 14px rgba(120,70,0,.35))" }} /></Pop>
          <div style={{ position: "absolute", left: 0, right: 0, top: 360 }}>
            <Words f={f} at={hero + 12} text="Baari" size={180} weight={600} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 572 }}>
            <Words f={f} at={turn} text="Ab kisi aur ki baari." size={76} stagger={4} />
          </div>
          <Slide f={f} at={built} dy={420} x={560} y={736} rot={-1.5} seed={4} dur={8}>
            <div style={{ filter: cut(5, 14) }}>
              <div style={{ background: B.card, borderRadius: 22, padding: "18px 40px", display: "flex", alignItems: "center", gap: 22, fontFamily: FONT.display, fontWeight: 600, fontSize: 50, color: B.ink, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, color: B.mute, letterSpacing: 2 }}>BUILT ON</span>
                <Img src={staticFile("brands/pinelabs.svg")} style={{ height: 50, display: "block" }} />
                <span>AgenticOrg</span>
              </div>
            </div>
          </Slide>
        </div>
      </Ground>
    );
  }
  return (
    <Ground bg={B.blush}>
      <Floor y={860} />
      <Puppet who="vinay" f={f} x={640} y={900 - 420 * 1.7 + hop(f, at("C02") + 8, 14)} s={1.7} talk={talk} arm={1} seed={6} />
      <Slide f={f} at={org} dx={-900} x={560} y={170} rot={-4} seed={5} dur={6} z={6}><Label text="on AgenticOrg" size={54} dot /></Slide>
      <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
        <Phone f={f} at={at("C02") + 6} take="own/island" from={0} x={1110} y={110} scale={0.92} rot={5} seed={4} />
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 9 }}>
        <Token f={f} at={hero - 18} x={1310} y={560} size={96} x0={-80} y0={520} />
      </div>
    </Ground>
  );
};

/** Vote: no words, just the music. 8:30 at night, the app asks, and it is rajma ya lauki. */
export const VOTE = { label: 2, rajma: 8, ya: 14, lauki: 18, tok: 30 };
export const Vote: React.FC<P> = ({ f }) => (
  <Ground>
    <Floor y={820} />
    <Phone f={f} at={0} take="own/cards_inside_island" from={0} rate={0.75} x={250} y={70} scale={0.95} rot={-3} seed={5} />
    <Slide f={f} at={VOTE.label} dx={900} x={1040} y={170} rot={2} seed={3} dur={6}><Label text="8:30 PM · aaj raat?" size={50} dot /></Slide>
    <Pop f={f} at={VOTE.rajma} x={860} y={420} rot={-4} z={4}><Cutout src="img/rajma.png" w={380} /></Pop>
    <div style={{ position: "absolute", left: 1262, top: 520, zIndex: 5 }}><Words f={f} at={VOTE.ya} text="ya" size={110} color={B.haldiText} /></div>
    <Pop f={f} at={VOTE.lauki} x={1400} y={420} rot={4} z={4}><Cutout src="img/lauki-chana-dal.png" w={380} /></Pop>
    <div style={{ position: "absolute", inset: 0, zIndex: 6 }}><Token f={f} at={VOTE.tok} x={1310} y={430} size={84} x0={1310} y0={-80} travel={10} /></div>
  </Ground>
);

export const SOUNDS: [string, string, number, number][] = [
  ["hook", "pop", frac("RN01c", 0.14), 0.4],
  ["hook", "whoosh", frac("RN01c", 0.47), 0.3],
  ["hook", "paper-tap", frac("RN01c", 0.47) + 7, 0.4],
  ["hook", "stamp", frac("RN01c", 0.8) + 2, 0.8],
  ["mummy", "pop", at("RC1") + 4, 0.4],
  ["mummy", "pop", at("RC2") + 4, 0.4],
  ["mummy", "pop", at("RC3") + 4, 0.4],
  ["mummy", "paper-flip", at("RC2") + 8, 0.35],
  ["mummy", "paper-flip", at("RC3") + 8, 0.35],
  ["mummy", "paper-slide", at("K03") + 6, 0.4],
  ["mummy", "pop", at("K03") + Math.round(len("K03") * 0.5), 0.5],
  ["baari", "pop", at("C02") + 8, 0.4],
  ["baari", "paper-flip", frac("C02", 0.58) - 18, 0.4],
  ["baari", "paper-tap", frac("C02", 0.58) - 6, 0.35],
  ["baari", "whoosh", frac("C02", 0.58), 0.3],
  ["baari", "pop", frac("C02", 0.58) + 4, 0.4],
  ["baari", "paper-slide", frac("C02", 0.27) + 6, 0.4],
  ["baari", "paper-slide", frac("C02", 0.58) + 28, 0.45],
  ["baari", "paper-tap", frac("C02", 0.58) + 31, 0.35],
  ["vote", "paper-slide", VOTE.label + 6, 0.35],
  ["vote", "pop", VOTE.rajma + 2, 0.45],
  ["vote", "paper-tap", VOTE.ya + 2, 0.35],
  ["vote", "pop", VOTE.lauki + 2, 0.45],
  ["vote", "paper-flip", VOTE.tok, 0.4],
  ["vote", "paper-tap", VOTE.tok + 10, 0.4],
];
export const Open = Hook;
