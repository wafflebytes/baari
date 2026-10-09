import React from "react";
import { Sequence } from "remotion";
import { Puppet } from "../puppets";
import { B, FONT, Ground, Drop, Cutout, Words, Label, Bubble, Phone, Tag, Token, Callout, punch, cut, twos, wob } from "./look";
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
  const sq = t === 3 ? "scale(1.12, 0.88)" : "none";
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

/** Hook: inside the problem (a family chat), then the question, then every home. */
export const Hook: React.FC<P> = ({ f }) => {
  const cutAt = at("H01") + 18;
  const shrink = frac("H01", 0.45);
  const msgs: [string, boolean][] = [["Papa: Aaj kya banega?", false], ["Vinay: aaj kya bana hai??", true], ["Behen: kya bana hai?", false], ["Sunita: Didi, aaj kya banau?", true]];
  if (f < cutAt) {
    return (
      <Ground>
        <div style={{ position: "absolute", left: 650, top: 70, width: 620, height: 960, background: B.ink, borderRadius: 70, filter: cut(7, 22) }}>
          <div style={{ position: "absolute", left: 16, top: 16, right: 16, bottom: 16, borderRadius: 56, background: B.kraft }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 36, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 26, color: B.mute }}>Ghar</div>
            {msgs.map(([t, r], i) => <Bubble2 key={t} f={f} at={6 + i * 4} text={t} right={r} y={130 + i * 150} seed={i + 3} />)}
          </div>
        </div>
      </Ground>
    );
  }
  const sh = Math.min(1, twos(f - shrink) / 8);
  const e = f < shrink ? 0 : 1 - Math.pow(1 - sh, 3);
  const ty = f < shrink - 4 ? 0 : f < shrink ? 10 * (1 - (shrink - f) / 4) : 10 - 300 * e - 10 * (1 - e);
  const sc = 1 - 0.25 * e;
  const houses = [B.card, B.kraft, B.blush, B.sage, B.ground, B.tint];
  return (
    <Ground bg={B.haldi}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, cutAt + 3, 0.08)})` }}>
        <div style={{ position: "absolute", left: 96, right: 96, top: 370, transform: `translateY(${ty}px) scale(${sc})`, transformOrigin: "50% 0" }}>
          <Words f={f} at={cutAt} text="आज क्या बनेगा?" size={250} stagger={3} weight={700} />
        </div>
      </div>
      {f >= shrink + 6 && <Floor y={860} />}
      {houses.map((c, i) => <House key={i} x={96 + i * 290} y={560} bg={c} f={f} at={shrink + 6 + i * 4} seed={i + 2} />)}
    </Ground>
  );
};

/** Mummy: the questions pile on. */
export const Mummy: React.FC<P> = ({ f }) => {
  const talk = saying(f, "N02b");
  const chips: [string, number, number, number, number, number, number][] = [
    ["Aaj kya?", 500, 220, -5, -800, 0, 0.1],
    ["Papa: aloo nahi", 1090, 190, 4, 900, 0, 0.25],
    ["Vrat hai?", 520, 470, 3, -800, 0, 0.4],
    ["Sabzi khatam?", 1110, 450, -3, 900, 0, 0.55],
  ];
  const worry = f >= frac("N02b", 0.55);
  const s = worry ? 1.65 : f >= frac("N02b", 0.25) ? 1.75 : 1.8;
  const stamp = frac("N02b", 0.86);
  const jolt = f >= stamp + 3 && f < stamp + 6 ? 6 : 0;
  const h = hop(f, frac("N02b", 0.55) - 2, 16);
  return (
    <Ground>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, stamp + 3, 0.05)}) translateY(${jolt}px)` }}>
        <Floor y={860} />
        <Puppet who="mummy" f={f} x={960 - 120 * s} y={870 - 420 * s + h} s={s} talk={talk} mood={worry ? "o" : "smile"} seed={4} />
        <Token f={f} at={14} x={960 - 120 * s + 176 * s} y={870 - 420 * s + 323 * s} size={90} x0={-60} y0={600} />
        {chips.map(([t, x, y, r, dx, dy, k], i) => (
          <Slide key={t} f={f} at={frac("N02b", k)} dx={dx} dy={dy} x={x} y={y} rot={r} seed={i + 2} dur={8} z={10 + i}><Label text={t} size={54} /></Slide>
        ))}
        <Stamp f={f} at={stamp} x={1260} y={690} rot={-8}>
          <div style={{ filter: cut(3, 8) }}>
            <div style={{ background: B.haldi, border: `6px solid ${B.ink}`, color: B.ink, fontFamily: FONT.display, fontWeight: 600, fontSize: 72, padding: "8px 36px", borderRadius: 14, whiteSpace: "nowrap" }}>Roz. Akele.</div>
          </div>
        </Stamp>
      </div>
    </Ground>
  );
};

/** Baari: Vinay builds it, then the brand moment. */
export const Baari: React.FC<P> = ({ f }) => {
  const talk = saying(f, "N03");
  const hero = frac("N03", 0.32);
  const turn = frac("N03", 0.6);
  if (f >= hero) {
    return (
      <Ground bg={B.haldi}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, hero + 4, 0.05)})` }}>
          <Pop f={f} at={hero + 2} x={810} y={120}><Cutout src="img/baari-mark.png" w={300} m={10} /></Pop>
          <div style={{ position: "absolute", left: 0, right: 0, top: 500 }}>
            <Words f={f} at={hero + 16} text="Baari" size={190} weight={600} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 760 }}>
            <Words f={f} at={turn} text="Ab kisi aur ki baari." size={84} stagger={4} />
          </div>
        </div>
      </Ground>
    );
  }
  return (
    <Ground bg={B.blush}>
      <Floor y={860} />
      <Puppet who="vinay" f={f} x={640} y={900 - 420 * 1.7 + hop(f, at("N03") + 8, 14)} s={1.7} talk={talk} arm={1} seed={6} />
      <Pop f={f} at={at("N03") + 8} x={1120} y={250} rot={6} z={5}>
        <div style={{ width: 240, height: 440, background: B.ink, borderRadius: 36, filter: cut(5, 14), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 140, height: 140, borderRadius: 32, background: B.haldi, color: B.ink, fontFamily: FONT.deva, fontWeight: 700, fontSize: 104, display: "flex", alignItems: "center", justifyContent: "center" }}>ब</div>
        </div>
      </Pop>
      <div style={{ position: "absolute", inset: 0, zIndex: 9 }}>
        <Token f={f} at={hero - 18} x={1235} y={610} size={96} x0={-80} y0={520} />
      </div>
    </Ground>
  );
};

/** Flip: a fast product flash, four takes of the app. */
export const Flip: React.FC<P> = ({ f, d }) => {
  const cuts: [string, number, string, string][] = [
    ["CA25-01", 14, "Swipe karo, khana chuno", B.blush],
    ["CA70-01", 7, "Lauki ne note kar liya hai", B.sage],
    ["CA20-01", 2, "Har thali alag", B.kraft],
    ["CA50-01", 5, "Saamaan, raat bhar", B.tint],
  ];
  const i = Math.min(3, Math.floor(f / 18));
  const [take, from, label, bg] = cuts[i];
  const lf = f - i * 18;
  const right = i % 2 === 0;
  return (
    <Sequence key={i} from={i * 18} durationInFrames={i === 3 ? Math.max(18, d - 54) : 18} layout="none">
      <Ground bg={bg}>
        <Tag text="App, demo data" />
        <Phone f={lf + 20} at={0} take={take} from={from} x={750} y={100} scale={1} rot={0} seed={i + 3} />
        <Slide f={lf} at={4} dx={right ? 400 : -400} x={right ? 1230 : 150} y={500} rot={right ? 2 : -2} seed={i + 1} dur={6}>
          <Label text={label} size={46} />
        </Slide>
      </Ground>
    </Sequence>
  );
};

const Note: React.FC<{ f: number; at: number; who?: "papa" | "mummy"; text: string; x: number; y: number; rot: number; seed: number }> = ({ f, at: a, who, text, x, y, rot, seed }) => (
  <Drop f={f} at={a} x={x} y={y} seed={seed} rot={rot} from={-80}>
    <div style={{ filter: cut(3, 8) }}>
      <div style={{ width: 640, height: 170, background: B.kraft, display: "flex", alignItems: "center", gap: 26, padding: "0 30px", fontFamily: FONT.body, fontWeight: 600, fontSize: 42, color: B.ink, position: "relative" }}>
        {who && <div style={{ width: 118, height: 118, borderRadius: "50%", background: B.card, overflow: "hidden", position: "relative", flex: "none", border: `4px solid ${B.ink}` }}>
          <Puppet who={who} f={f} x={-8} y={4} s={0.58} mood="smile" seed={seed} />
        </div>}
        <span style={{ whiteSpace: "nowrap" }}>{text}</span>
        {f >= a + 8 && <div style={{ position: "absolute", left: 250, top: -16, width: 100, height: 34, background: "rgba(255,255,255,.7)", border: "2px solid #D6C5A0", transform: "rotate(-3deg)" }} />}
      </div>
    </div>
  </Drop>
);

/** Rules: fridge notes next to the app, the line lifted out. */
export const Rules: React.FC<P> = ({ f }) => {
  const stung = frac("N04", 0.8);
  const co = frac("N04", 0.3);
  return (
    <Ground bg={B.sage}>
      <Tag text="App, demo data" />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, co, 0.04)})` }}>
        <div style={{ position: "absolute", left: 96, top: 200, width: 740, height: 670, background: B.card, borderRadius: 44, filter: cut(5, 14) }}>
          <div style={{ position: "absolute", right: 30, top: 70, width: 18, height: 200, borderRadius: 9, background: B.mute }} />
        </div>
        <Note f={f} at={frac("N04", 0.12)} who="papa" text="Papa: aloo nahi" x={130} y={300} rot={-2} seed={3} />
        <Note f={f} at={frac("N04", 0.5)} who="mummy" text="Mummy: meetha kam" x={130} y={540} rot={2} seed={5} />
        <Phone f={f} at={0} take="CA20-01" from={23.5} x={1260} y={70} scale={0.9} rot={2} />
        <Callout f={f} at={0} show={co} hide={frac("N04", 0.72)} take="CA20-01" from={23.5} region={{ x: 25, y: 498, w: 300, h: 36 }} zoom={2} x={470} y={95} rot={-2} />
      </div>
      {f >= stung && <Slide f={f} at={stung} dy={700} x={865} y={450 + hop(f, stung + 8, 12)} dur={6} seed={8}><div style={{ position: "relative", width: 360, height: 630 }}><Puppet who="sunita" f={f} x={0} y={0} s={1.5} mood="flat" arm={0} seed={8} /></div></Slide>}
      <Bubble f={f} at={stung + 6} text="Hmph." x={880} y={280} size={52} tail="l" />
    </Ground>
  );
};

/** Vote: a room at night, two dishes, one call. */
export const Vote: React.FC<P> = ({ f }) => {
  const r = frac("N05", 0.3), l = frac("N05", 0.5), c = frac("N05", 0.78);
  return (
    <Ground>
      <Tag text="App, demo data" />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, r, 0.04)})` }}>
        <div style={{ position: "absolute", left: 900, top: 110, width: 920, height: 400, background: B.kraft, borderRadius: 20, filter: cut(4, 12) }}>
          <div style={{ position: "absolute", inset: 22, background: B.night, borderRadius: 8, overflow: "hidden" }}>
            <Star x={90} y={60} s={46} /><Star x={330} y={170} s={30} />
          </div>
        </div>
        <Floor y={665} x={820} />
        <Phone f={f} at={2} take="CA15-01" from={0} x={190} y={80} scale={0.95} rot={-2} />
        <Pop f={f} at={r} x={930} y={528} rot={-3} z={5}><Cutout src="img/rajma.png" w={300} /></Pop>
        <Pop f={f} at={l} x={1400} y={528} rot={3} z={5}><Cutout src="img/lauki-chana-dal.png" w={300} /></Pop>
        <Callout f={f} at={2} show={r + 4} take="CA15-01" from={0} region={{ x: 36, y: 440, w: 322, h: 64 }} zoom={2} x={1370} y={845} rot={-1} />
        <Slide f={f} at={c} dx={500} x={1330} y={210} rot={-3} seed={7} z={7}><Label text="9:30 pm" size={54} dot /></Slide>
        <Token f={f} at={frac("N05", 0.62)} x={1290} y={712} size={90} x0={1290} y0={1150} />
      </div>
    </Ground>
  );
};

const Star: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <div style={{ position: "absolute", left: x, top: y, width: s, height: s, background: B.ground, clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />
);

export const SOUNDS: [string, string, number, number][] = [
  ["hook", "paper-tap", 6, 0.4],
  ["hook", "paper-tap", 10, 0.4],
  ["hook", "paper-tap", 14, 0.4],
  ["hook", "paper-tap", 18, 0.4],
  ["hook", "stamp", at("H01") + 21, 0.8],
  ["hook", "whoosh", frac("H01", 0.45) + 6, 0.3],
  ["hook", "paper-slide", frac("H01", 0.45) + 14, 0.4],
  ["mummy", "paper-flip", 14, 0.4],
  ["mummy", "paper-slide", frac("N02b", 0.1) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02b", 0.25) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02b", 0.4) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02b", 0.55) + 2, 0.4],
  ["mummy", "stamp", frac("N02b", 0.86) + 3, 0.8],
  ["baari", "pop", at("N03") + 8, 0.4],
  ["baari", "paper-flip", frac("N03", 0.32) - 18, 0.4],
  ["baari", "paper-tap", frac("N03", 0.32) - 6, 0.35],
  ["baari", "whoosh", frac("N03", 0.32), 0.3],
  ["baari", "pop", frac("N03", 0.32) + 4, 0.4],
  ["flip", "paper-flip", 0, 0.4],
  ["flip", "paper-flip", 18, 0.4],
  ["flip", "paper-flip", 36, 0.4],
  ["flip", "paper-flip", 54, 0.4],
  ["flip", "paper-slide", 4, 0.3],
  ["flip", "paper-slide", 22, 0.3],
  ["flip", "paper-slide", 40, 0.3],
  ["flip", "paper-slide", 58, 0.3],
  ["rules", "paper-pin", frac("N04", 0.12) + 8, 0.4],
  ["rules", "pop", frac("N04", 0.3), 0.4],
  ["rules", "paper-pin", frac("N04", 0.5) + 8, 0.4],
  ["rules", "pop", frac("N04", 0.8) + 4, 0.4],
  ["vote", "pop", frac("N05", 0.3) + 2, 0.4],
  ["vote", "pop", frac("N05", 0.3) + 6, 0.3],
  ["vote", "pop", frac("N05", 0.5) + 2, 0.4],
  ["vote", "paper-slide", frac("N05", 0.78) + 2, 0.4],
  ["vote", "paper-flip", frac("N05", 0.62), 0.4],
  ["vote", "paper-tap", frac("N05", 0.62) + 12, 0.35],
];
export const Open = Hook;
