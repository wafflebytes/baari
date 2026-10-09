import React from "react";
import { Puppet } from "../puppets";
import { B, FONT, Ground, Drop, Cutout, Words, Label, Bubble, Phone, Tag, cut, twos, wob } from "./look";
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

/** Open: a paper kitchen, and the question slides in. */
export const Open: React.FC<P> = ({ f }) => {
  const talk = saying(f, "N01");
  const q = frac("N01", 0.5);
  const dabba = ["#D6C5A0", B.sage, B.blush];
  return (
    <Ground bg={B.card}>
      {/* tile wall */}
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 760, backgroundImage: "linear-gradient(#E4DFD2 3px, transparent 3px), linear-gradient(90deg, #E4DFD2 3px, transparent 3px)", backgroundSize: "120px 120px", opacity: 0.9 }} />
      {/* shelf with masala dabbas */}
      <div style={{ position: "absolute", left: 60, top: 150, width: 520, height: 22, background: B.kraft, filter: cut(3, 8) }} />
      {dabba.map((c, i) => (
        <div key={i} style={{ position: "absolute", left: 100 + i * 150, top: 62, width: 100, height: 88, borderRadius: "14px 14px 8px 8px", background: c, filter: cut(3, 6) }}>
          <div style={{ position: "absolute", left: 6, right: 6, top: -12, height: 16, borderRadius: 8, background: B.ink }} />
        </div>
      ))}
      {/* window card */}
      <div style={{ position: "absolute", left: 760, top: 70, width: 250, height: 280, background: B.kraft, borderRadius: 14, filter: cut(4, 10) }}>
        <div style={{ position: "absolute", inset: 16, background: B.sage, borderRadius: 6 }} />
        <div style={{ position: "absolute", left: 124, top: 16, width: 4, bottom: 16, background: B.kraft }} />
        <div style={{ position: "absolute", top: 138, left: 16, right: 16, height: 4, background: B.kraft }} />
      </div>
      <Puppet who="sunita" f={f} x={290} y={170} s={1.7} talk={talk} seed={2} />
      <Floor y={760} />
      <Drop f={f} at={6} x={600} y={560} seed={3} rot={-3} z={5}><Cutout src="img/pressure-cooker.png" w={240} /></Drop>
      <Slide f={f} at={q - 6} dx={1000} x={990} y={170} rot={2} seed={9} z={6}>
        <div style={{ width: 880, height: 560, background: B.haldi, borderRadius: 20, filter: cut(5, 14), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <Words f={f} at={q} text="आज क्या बनेगा?" size={190} stagger={5} weight={700} />
          <Words f={f} at={q + 18} text="Aaj kya banega?" size={62} stagger={4} />
        </div>
      </Slide>
    </Ground>
  );
};

/** Mummy: the questions pile on, faster and faster. */
export const Mummy: React.FC<P> = ({ f }) => {
  const talk = saying(f, "N02");
  const chips: [string, number, number, number, number, number, number][] = [
    ["Aaj kya?", 520, 200, -5, -800, 0, 0.06],
    ["Papa: aloo nahi", 1090, 160, 4, 900, 0, 0.2],
    ["Vrat hai?", 540, 440, 3, -800, 0, 0.33],
    ["Sabzi khatam?", 1110, 420, -3, 900, 0, 0.44],
    ["Kal kya tha?", 760, 50, 2, 0, -400, 0.53],
    ["Tiffin?", 1060, 640, 5, 900, 0, 0.62],
  ];
  const worry = f >= frac("N02", 0.5);
  const s = worry ? 1.6 : f >= frac("N02", 0.3) ? 1.7 : 1.8;
  const stamp = frac("N02", 0.8);
  return (
    <Ground>
      <Floor y={860} />
      <Puppet who="mummy" f={f} x={960 - 120 * s} y={900 - 420 * s} s={s} talk={talk} mood={worry ? "o" : "smile"} seed={4} />
      {chips.map(([t, x, y, r, dx, dy, k], i) => (
        <Slide key={t} f={f} at={frac("N02", k)} dx={dx} dy={dy} x={x} y={y} rot={r} seed={i + 2} dur={Math.max(5, 9 - i)} z={10 + i}><Label text={t} size={54} /></Slide>
      ))}
      <Stamp f={f} at={stamp} x={1260} y={690} rot={-8}>
        <div style={{ filter: cut(3, 8) }}>
          <div style={{ background: B.haldi, border: `6px solid ${B.ink}`, color: B.ink, fontFamily: FONT.display, fontWeight: 600, fontSize: 72, padding: "8px 36px", borderRadius: 14, whiteSpace: "nowrap" }}>Roz. Akele.</div>
        </div>
      </Stamp>
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
        <Pop f={f} at={hero + 2} x={810} y={120}><Cutout src="img/baari-mark.png" w={300} m={10} /></Pop>
        <div style={{ position: "absolute", left: 0, right: 0, top: 500 }}>
          <Words f={f} at={hero + 16} text="Baari" size={190} weight={600} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 760 }}>
          <Words f={f} at={turn} text="Ab kisi aur ki baari." size={84} stagger={4} />
        </div>
      </Ground>
    );
  }
  return (
    <Ground bg={B.blush}>
      <div style={{ position: "absolute", left: 200, top: 120, width: 1520, height: 640, background: B.card, borderRadius: 24, filter: cut(4, 12), opacity: 0.55 }} />
      <Floor y={860} />
      <Puppet who="vinay" f={f} x={640} y={900 - 420 * 1.7} s={1.7} talk={talk} arm={1} seed={6} />
      <Pop f={f} at={at("N03") + 8} x={1120} y={250} rot={6} z={5}>
        <div style={{ width: 240, height: 440, background: B.ink, borderRadius: 36, filter: cut(5, 14), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 140, height: 140, borderRadius: 32, background: B.haldi, color: B.ink, fontFamily: FONT.deva, fontWeight: 700, fontSize: 104, display: "flex", alignItems: "center", justifyContent: "center" }}>ब</div>
        </div>
      </Pop>
    </Ground>
  );
};

const Note: React.FC<{ f: number; at: number; who: "papa" | "mummy"; text: string; x: number; y: number; rot: number; seed: number }> = ({ f, at: a, who, text, x, y, rot, seed }) => (
  <Drop f={f} at={a} x={x} y={y} seed={seed} rot={rot} from={-80}>
    <div style={{ filter: cut(3, 8) }}>
      <div style={{ width: 640, height: 170, background: B.kraft, display: "flex", alignItems: "center", gap: 26, padding: "0 30px", fontFamily: FONT.body, fontWeight: 600, fontSize: 42, color: B.ink, position: "relative" }}>
        <div style={{ width: 118, height: 118, borderRadius: "50%", background: B.card, overflow: "hidden", position: "relative", flex: "none", border: `4px solid ${B.ink}` }}>
          <Puppet who={who} f={f} x={-8} y={4} s={0.58} mood="smile" seed={seed} />
        </div>
        <span style={{ whiteSpace: "nowrap" }}>{text}</span>
        {f >= a + 8 && <div style={{ position: "absolute", left: 250, top: -16, width: 100, height: 34, background: "rgba(255,255,255,.7)", border: "2px solid #D6C5A0", transform: "rotate(-3deg)" }} />}
      </div>
    </div>
  </Drop>
);

/** Rules: fridge notes next to the app. */
export const Rules: React.FC<P> = ({ f }) => {
  const stung = frac("N04", 0.8);
  return (
    <Ground bg={B.sage}>
      <Tag text="App, demo data" />
      <div style={{ position: "absolute", left: 40, top: 40, width: 790, height: 870, background: B.card, borderRadius: 44, filter: cut(5, 14) }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 280, height: 5, background: "#E4DFD2" }} />
        <div style={{ position: "absolute", right: 34, top: 80, width: 18, height: 140, borderRadius: 9, background: B.mute }} />
        <div style={{ position: "absolute", right: 34, top: 340, width: 18, height: 260, borderRadius: 9, background: B.mute }} />
      </div>
      <Note f={f} at={frac("N04", 0.25)} who="papa" text="Papa: aloo nahi" x={100} y={340} rot={-2} seed={3} />
      <Note f={f} at={frac("N04", 0.45)} who="mummy" text="Mummy: meetha kam" x={110} y={600} rot={2} seed={5} />
      <Phone f={f} at={0} take="CA20-01" from={21} x={1260} y={70} scale={0.9} rot={2} />
      {f >= stung && <Slide f={f} at={stung} dy={700} x={865} y={450} dur={6} seed={8}><div style={{ position: "relative", width: 360, height: 630 }}><Puppet who="sunita" f={f} x={0} y={0} s={1.5} mood="flat" arm={0} seed={8} /></div></Slide>}
      <Bubble f={f} at={stung + 6} text="Hmph." x={880} y={280} size={52} tail="l" />
    </Ground>
  );
};

const Star: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <div style={{ position: "absolute", left: x, top: y, width: s, height: s, background: B.ground, clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />
);

/** Vote: a room at night, two dishes, one call. */
export const Vote: React.FC<P> = ({ f }) => {
  const r = frac("N05", 0.3), l = frac("N05", 0.5), c = frac("N05", 0.78);
  return (
    <Ground>
      <Tag text="App, demo data" />
      <div style={{ position: "absolute", left: 900, top: 110, width: 920, height: 400, background: B.kraft, borderRadius: 20, filter: cut(4, 12) }}>
        <div style={{ position: "absolute", inset: 22, background: B.night, borderRadius: 8, overflow: "hidden" }}>
          <Star x={60} y={50} s={46} /><Star x={260} y={140} s={30} /><Star x={520} y={40} s={38} /><Star x={760} y={110} s={28} /><Star x={650} y={250} s={22} />
        </div>
        <div style={{ position: "absolute", left: 452, top: 22, width: 16, bottom: 22, background: B.kraft }} />
      </div>
      <Floor y={640} x={820} />
      <Phone f={f} at={2} take="CA15-01" from={0} x={190} y={80} scale={0.95} rot={-2} />
      <Pop f={f} at={r} x={930} y={500} rot={-3} z={5}><Cutout src="img/rajma.png" w={300} /></Pop>
      <Slide f={f} at={r + 6} dy={400} x={970} y={780} rot={2} seed={4} z={6}><Label text="Rajma chawal" size={48} /></Slide>
      <Pop f={f} at={l} x={1400} y={500} rot={3} z={5}><Cutout src="img/lauki-chana-dal.png" w={300} /></Pop>
      <Slide f={f} at={l + 6} dy={400} x={1390} y={780} rot={-2} seed={5} z={6}><Label text="Lauki chana dal" size={48} /></Slide>
      <Slide f={f} at={c} dx={500} x={1330} y={190} rot={-3} seed={7} z={7}><Label text="9:30 pm" size={54} dot /></Slide>
    </Ground>
  );
};

export const SOUNDS: [string, string, number, number][] = [
  ["open", "paper-tap", 8, 0.4],
  ["open", "whoosh", frac("N01", 0.5) - 6, 0.3],
  ["open", "paper-slide", frac("N01", 0.5) + 6, 0.4],
  ["mummy", "paper-slide", frac("N02", 0.04) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02", 0.16) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02", 0.26) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02", 0.35) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02", 0.5) + 2, 0.4],
  ["mummy", "paper-slide", frac("N02", 0.61) + 2, 0.4],
  ["mummy", "stamp", frac("N02", 0.8) + 3, 0.8],
  ["baari", "pop", at("N03") + 8, 0.4],
  ["baari", "whoosh", frac("N03", 0.32), 0.3],
  ["baari", "pop", frac("N03", 0.32) + 4, 0.4],
  ["rules", "paper-pin", frac("N04", 0.25) + 8, 0.4],
  ["rules", "paper-pin", frac("N04", 0.45) + 8, 0.4],
  ["rules", "pop", frac("N04", 0.8) + 4, 0.4],
  ["vote", "paper-slide", 2, 0.4],
  ["vote", "pop", frac("N05", 0.3) + 2, 0.4],
  ["vote", "pop", frac("N05", 0.5) + 2, 0.4],
  ["vote", "chime", frac("N05", 0.78) + 6, 0.4],
];
