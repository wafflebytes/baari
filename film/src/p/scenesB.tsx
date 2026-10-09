import React from "react";
import { Sequence } from "remotion";
import { Ground, Drop, Cutout, Words, Label, Bubble, Phone, Tag, Paper, B, FONT, cut } from "./look";
import { at, len, saying } from "./timeline";
import { Puppet } from "../puppets";

type P = { f: number; d: number };
/** The take only holds still for `span` frames: replay its first stretch so the phone keeps showing the same screen. */
const HoldPhone: React.FC<{ f: number; d: number; take: string; from: number; span: number; at0?: number; x: number; y: number; seed: number }> = ({ f, d, take, from, span, at0 = 0, x, y, seed }) => {
  const n = Math.ceil(Math.max(1, d - at0) / span);
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <Sequence key={k} from={at0 + k * span} durationInFrames={k === n - 1 ? Infinity : span}>
          <Phone f={f} at={k === 0 ? at0 : 0} take={take} from={from} x={x} y={y} scale={0.95} rot={-2} seed={seed} />
        </Sequence>
      ))}
    </>
  );
};
type Who = "sunita" | "mummy" | "papa" | "vinay" | "behen";
const mid = (id: string, k: number) => at(id) + Math.round(len(id) * k);


const eo = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const tw = (f: number) => Math.floor(f / 2) * 2;

/** A piece that slides in from `dy`/`dx` away, on twos, and settles with a small tilt. */
const Slide: React.FC<{ f: number; at: number; x: number; y: number; dy?: number; dx?: number; rot?: number; dur?: number; z?: number; children: React.ReactNode }> = ({ f, at, x, y, dy = 0, dx = 0, rot = 0, dur = 12, z, children }) => {
  if (f < at) return null;
  const t = tw(f - at) / dur, e = eo(t);
  const settle = t < 1 ? (1 - e) * 2.5 : 0;
  return (
    <div style={{ position: "absolute", left: x + (1 - e) * dx, top: y + (1 - e) * dy, zIndex: z, transform: `rotate(${rot + settle}deg)` }}>{children}</div>
  );
};

/** A pop-up book piece: scaleY from 0 hinged at the bottom, overshoot, settle. Its box is x,y,w,h. */
const Pop: React.FC<{ f: number; at: number; x: number; y: number; w: number; h: number; rot?: number; z?: number; children: React.ReactNode }> = ({ f, at, x, y, w, h, rot = 0, z, children }) => {
  if (f < at) return null;
  const k = Math.floor((f - at) / 2);
  const sc = [0.25, 0.7, 1.06, 1.0][Math.min(3, k)];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, zIndex: z, transformOrigin: "50% 100%", transform: `rotate(${rot}deg) scale(${k >= 2 ? 1 + (sc - 1) * 0.5 : 0.9 + sc * 0.1}, ${sc})` }}>{children}</div>
  );
};

const Pin: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: x - 16, top: y - 16, filter: cut(3, 6), zIndex: 9 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: B.ink, border: `5px solid ${B.card}`, boxSizing: "border-box" }} />
    </div>
  );
};

const Tile: React.FC<{ f: number; who: Who; id: string; x: number; y: number; at0: number; rot: number; name: string; bg: string; seed: number; flip?: boolean }> = ({ f, who, id, x, y, at0, rot, name, bg, seed, flip }) => (
  <Slide f={f} at={at0} x={x} y={y} dy={700} rot={rot} dur={14}>
    <div style={{ position: "relative", width: 400, height: 520 }}>
      <Paper bg={B.card} style={{ width: 400, height: 520 }} seed={who} />
      <div style={{ position: "absolute", left: 16, top: 16, width: 368, height: 488, borderRadius: 14, overflow: "hidden", background: bg }}>
        <Puppet who={who} f={f} x={32} y={60} s={1.2} talk={saying(f, id)} flip={flip} seed={seed} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, background: B.card, opacity: 0.94, fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, color: B.ink, display: "flex", alignItems: "center", paddingLeft: 20, letterSpacing: 1 }}>
          {name}
          <span style={{ marginLeft: "auto", display: "flex", gap: 14, paddingRight: 18, alignItems: "center" }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: saying(f, id) ? B.ink : B.mute, display: "inline-block" }} />
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#D63B2F", display: "inline-block" }} />
          </span>
        </div>
      </div>
    </div>
  </Slide>
);

const callTiles = [0, 4, 8, 12];
export const Call: React.FC<P> = ({ f }) => (
  <Ground bg={B.night}>
    <Tile f={f} who="papa" id="L10a" x={100} y={330} at0={callTiles[0]} rot={-1.5} name="PAPA" bg={B.kraft} seed={1} flip={f >= at("L10b") + 3 && f < at("L10c")} />
    <Tile f={f} who="behen" id="L10b" x={540} y={350} at0={callTiles[1]} rot={1.2} name="BEHEN" bg={B.blush} seed={2} />
    <Tile f={f} who="mummy" id="L10c" x={980} y={330} at0={callTiles[2]} rot={-1} name="MUMMY" bg={B.sage} seed={3} />
    <Tile f={f} who="vinay" id="L10d" x={1420} y={350} at0={callTiles[3]} rot={1.5} name="VINAY" bg={B.tint} seed={4} />
    <Bubble f={f} at={at("L10a")} text="Rajma!" x={170} y={150} size={72} rot={-3} />
    <Bubble f={f} at={at("L10b")} text="Ramen!" x={610} y={170} size={72} rot={3} />
    <Bubble f={f} at={at("L10c")} text="Pichhle hafte bhi rajma tha" x={1010} y={90} size={44} w={380} rot={-2} />
    <Bubble f={f} at={at("L10d")} text="Pasta bana lo na..." x={1450} y={110} size={44} w={360} rot={2} tail="r" />
  </Ground>
);

const blob = (l: number, t: number, w: number, h: number, r = "46% 54% 52% 48% / 55% 45% 55% 45%", rot = 0): React.CSSProperties => ({ position: "absolute", left: l, top: t, width: w, height: h, borderRadius: r, background: B.ground, transform: `rotate(${rot}deg)` });

export const Japan: React.FC<P> = ({ f }) => {
  const a = at("N06");
  const tRam = a + 2, tPas = mid("N06", 0.16), tTag = mid("N06", 0.72);
  const MX = 740, MY = 110; // map card origin
  const jp = { x: MX + 925, y: MY + 250 }, it = { x: MX + 435, y: MY + 270 };
  const ts = tw(f - tTag);
  const sw = f >= tTag ? Math.sin(ts / 3) * 14 * Math.max(0, 1 - ts / 40) : 0;
  return (
    <Ground bg={B.kraft}>
      <Slide f={f} at={0} x={MX} y={MY} dx={900} rot={1} dur={12}>
        <div style={{ position: "relative", width: 1100, height: 680 }}>
          <Paper bg="#CFE3EE" style={{ width: 1100, height: 680 }} seed="map" />
          <div style={{ position: "absolute", left: 14, top: 14, width: 1072, height: 652, overflow: "hidden", borderRadius: 8 }}>
            <div style={blob(260, 60, 620, 250, undefined, -4)} />
            <div style={blob(640, 120, 380, 200, "40% 60% 50% 50% / 50% 40% 60% 50%", 6)} />
            <div style={blob(300, 320, 200, 260, "40% 60% 55% 45% / 35% 45% 55% 65%", 8)} />
            <div style={blob(60, 100, 190, 230, "50% 50% 60% 40% / 40% 50% 50% 60%", -8)} />
            <div style={blob(150, 400, 120, 220, "50% 50% 40% 60% / 40% 40% 60% 60%", 10)} />
            <div style={blob(880, 180, 60, 150, "50%", 20)} />
            <div style={blob(900, 420, 160, 90, "50%", -6)} />
          </div>
        </div>
      </Slide>
      <Puppet who="sunita" f={f} x={150} y={310} s={1.5} talk={saying(f, "N06")} mood="flat" seed={5} />
      <Pop f={f} at={tRam} x={jp.x - 130} y={jp.y - 230} w={260} h={230} z={5}><Cutout src="img/korean-ramen.png" w={260} /></Pop>
      <Pin f={f} at={tRam + 6} x={jp.x} y={jp.y} />
      <Pop f={f} at={tPas} x={it.x - 130} y={it.y - 230} w={260} h={230} z={5}><Cutout src="img/arrabbiata.png" w={260} /></Pop>
      <Pin f={f} at={tPas + 6} x={it.x} y={it.y} />
      {f >= tTag ? (
        <div style={{ position: "absolute", left: 1370, top: 0, zIndex: 8, transformOrigin: "0 0", transform: `translateY(${-Math.round((1 - eo(ts / 10)) * 700)}px) rotate(${sw}deg)` }}>
          <div style={{ width: 4, height: 600, background: B.ink, marginLeft: 100 }} />
          <div style={{ position: "relative", top: -4 }}><Label text="Japan tour" size={52} bg={B.haldi} /></div>
        </div>
      ) : null}
    </Ground>
  );
};

/** A small round paper head: the puppet's face, clipped. */
const Head: React.FC<{ f: number; who: Who; at0: number; x: number; y: number; rot: number; seed: number; bg: string }> = ({ f, who, at0, x, y, rot, seed, bg }) => (
  <Pop f={f} at={at0} x={x} y={y} w={230} h={230} rot={rot}>
    <div style={{ width: 230, height: 230, borderRadius: "50%", background: bg, border: `8px solid ${B.card}`, overflow: "hidden", position: "relative", filter: cut(4, 10) }}>
      <Puppet who={who} f={f} x={-12} y={16} s={1} talk seed={seed} />
    </div>
  </Pop>
);

export const Pakka: React.FC<P> = ({ f }) => {
  const hit = at("L12") + 8;
  const jolt = f >= hit && f < hit + 2 ? 6 : 0;
  return (
    <Ground>
      <Slide f={f} at={0} x={0} y={790} dx={-1920} dur={10}>
        <div style={{ filter: cut(4, 12) }}><div style={{ width: 1920, height: 300, background: B.kraft }} /></div>
      </Slide>
      <Drop f={f} at={2} x={620} y={290 + jolt} rot={-3} seed={1}><Cutout src="img/rajma.png" w={680} /></Drop>
      <Slide f={f} at={at("L11") + 4} x={140} y={130} dx={-700} rot={-5} dur={10}><Label text="Rajma final?" size={64} /></Slide>
      <Head f={f} who="papa" at0={at("L11b-papa")} x={250} y={420} rot={-4} seed={11} bg={B.kraft} />
      <Head f={f} who="behen" at0={at("L11b-behen")} x={1400} y={170} rot={4} seed={12} bg={B.blush} />
      <Head f={f} who="mummy" at0={at("L11b-mummy")} x={1440} y={560} rot={-3} seed={13} bg={B.sage} />
      <Head f={f} who="vinay" at0={at("L11b-vinay")} x={330} y={700} rot={3} seed={14} bg={B.tint} />
      <Drop f={f} at={at("L12")} x={700} y={420} rot={-12} seed={9} from={-300}>
        <div style={{ filter: cut(4, 14) }}>
          <div style={{ border: `18px solid ${B.haldi}`, borderRadius: 40, background: "rgba(255,255,255,0.88)", padding: "6px 60px 18px", fontFamily: FONT.deva, fontWeight: 700, fontSize: 190, color: B.haldiText, lineHeight: 1.2 }}>पक्का</div>
        </div>
      </Drop>
    </Ground>
  );
};

/** A steel bowl of soaking rajma, built from paper shapes. */
const Bowl: React.FC = () => (
  <div style={{ position: "relative", width: 380, height: 230 }}>
    <div style={{ position: "absolute", left: 0, top: 40, width: 380, height: 190, background: "#B9BDC2", borderRadius: "0 0 190px 190px", filter: cut(4, 10) }} />
    <div style={{ position: "absolute", left: 0, top: 20, width: 380, height: 56, background: "#D5D8DB", borderRadius: "50%", filter: cut(3, 6) }} />
    <div style={{ position: "absolute", left: 22, top: 32, width: 336, height: 36, background: "#7FA6C8", borderRadius: "50%" }} />
    {[[70, 40], [120, 46], [170, 38], [220, 46], [270, 40], [95, 34], [245, 34]].map(([l, t], i) => (
      <div key={i} style={{ position: "absolute", left: l, top: t, width: 34, height: 20, background: "#6E1F1A", borderRadius: "50%", transform: `rotate(${(i * 37) % 60 - 30}deg)` }} />
    ))}
  </div>
);

export const Soak: React.FC<P> = ({ f, d }) => {
  const tB = mid("N07", 0.3);
  const L = at("L14");
  return (
    <Ground>
      <Slide f={f} at={0} x={0} y={850} dy={300} dur={10}><div style={{ filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div></Slide>
      <HoldPhone f={f} d={d} take="CA68-01" from={0} span={66} x={190} y={70} seed={3} />
      <Pop f={f} at={tB} x={700} y={600} w={380} h={230}><Bowl /></Pop>
      <Puppet who="vinay" f={f} x={1180} y={200} s={1.6} flip talk={saying(f, "L14")} mood={f >= L ? "o" : "smile"} arm={f >= L ? 1 : 0} seed={6} />
      <Slide f={f} at={mid("N07", 0.62)} x={660} y={400} dx={-500} rot={-4} dur={10}><Label text="Raat ka kaam: Vinay" size={48} bg={B.haldi} /></Slide>
      <Bubble f={f} at={L} text="Main?!" x={800} y={100} size={150} rot={-3} tail="r" />
      <Tag text="App, demo data" />
    </Ground>
  );
};

const zig = (() => { const n = 12; const p = ["0% 0%", "100% 0%", "100% 96%"]; for (let i = n - 1; i >= 0; i--) p.push(`${(i / n) * 100 + 100 / n / 2}% ${i % 2 ? 96 : 100}%`); p.push("0% 96%"); return `polygon(${p.join(",")})`; })();

export const Money: React.FC<P> = ({ f, d }) => {
  const split = at("N08") + Math.round(len("N08") * 0.5);
  if (f < split) {
    return (
      <Ground>
        <Slide f={f} at={0} x={0} y={850} dy={300} dur={10}><div style={{ filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div></Slide>
        <Phone f={f} take="CA51-01" from={4} x={250} y={80} scale={0.95} rot={-2} seed={3} />
        <Pop f={f} at={at("N08") + 8} x={800} y={290} w={420} h={400}><Cutout src="img/kirana-bag.png" w={420} /></Pop>
        <Slide f={f} at={at("N08") + 24} x={780} y={740} dx={700} rot={-3} dur={10}><Label text="₹28 · chupchaap" size={54} /></Slide>
        <Tag text="App, demo data" />
      </Ground>
    );
  }
  const tR = mid("L15", 0.55);
  return (
    <Ground>
      <Slide f={f} at={split} x={0} y={850} dy={300} dur={6}><div style={{ filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div></Slide>
      <HoldPhone f={f} d={d} take="CA35-01" from={1} span={90} at0={split} x={250} y={80} seed={5} />
      <Puppet who="vinay" f={f} x={1100} y={200} s={1.6} talk={saying(f, "L15")} mood="flat" arm={f >= tR ? 1 : 0} seed={6} />
      <Bubble f={f} at={at("L15")} text="Setup maine kiya..." x={880} y={110} size={56} rot={-2} />
      <Slide f={f} at={tR} x={1210} y={440} dy={600} rot={3} dur={12} z={6}>
        <div style={{ filter: cut(4, 12) }}>
          <div style={{ width: 340, height: 470, background: B.card, clipPath: zig, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 34 }}>
            <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, color: B.mute, letterSpacing: 3 }}>BILL</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 130, color: B.ink, lineHeight: 1.1, marginTop: 10 }}>₹520</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 72, color: B.ink, marginTop: 14 }}>Vinay</div>
            <div style={{ width: 210, height: 14, background: B.haldi, borderRadius: 4, marginTop: 6 }} />
          </div>
        </div>
      </Slide>
      <Tag text="Pine Labs sandbox" />
    </Ground>
  );
};

export const SOUNDS: [string, string, number, number][] = [
  ["call", "paper-slide", callTiles[0] + 2, 0.4], ["call", "paper-slide", callTiles[1] + 2, 0.35], ["call", "paper-slide", callTiles[2] + 2, 0.35], ["call", "paper-slide", callTiles[3] + 2, 0.35],
  ["call", "paper-tap", at("L10a") + 2, 0.4], ["call", "paper-tap", at("L10b") + 2, 0.4], ["call", "paper-tap", at("L10c") + 2, 0.4], ["call", "paper-tap", at("L10d") + 2, 0.4],
  ["japan", "paper-slide", 2, 0.4], ["japan", "pop", at("N06") + 4, 0.4], ["japan", "paper-pin", at("N06") + 10, 0.4],
  ["japan", "pop", mid("N06", 0.16) + 2, 0.4], ["japan", "paper-pin", mid("N06", 0.16) + 8, 0.4], ["japan", "whoosh", mid("N06", 0.72), 0.3],
  ["pakka", "paper-slide", 2, 0.35], ["pakka", "paper-tap", 4, 0.4], ["pakka", "paper-slide", at("L11") + 6, 0.4],
  ["pakka", "pop", at("L11b-papa") + 1, 0.4], ["pakka", "pop", at("L11b-behen") + 1, 0.4], ["pakka", "pop", at("L11b-mummy") + 1, 0.4], ["pakka", "pop", at("L11b-vinay") + 1, 0.4],
  ["pakka", "stamp", at("L12") + 8, 0.8],
  ["soak", "paper-slide", 2, 0.35], ["soak", "pop", mid("N07", 0.3) + 1, 0.4], ["soak", "paper-slide", mid("N07", 0.62) + 4, 0.4],
  ["money", "paper-slide", 2, 0.35], ["money", "pop", at("N08") + 9, 0.4], ["money", "paper-slide", at("N08") + 28, 0.4],
  ["money", "paper-slide", mid("L15", 0.55) + 4, 0.45],
];
