import React from "react";
import { Sequence } from "remotion";
import { Ground, Drop, Token, Callout, punch, Cutout, Label, Bubble, Phone, Paper, B, FONT, cut } from "./look";
import { at, len, saying } from "./timeline";
import { Puppet } from "../puppets";

type P = { f: number; d: number };
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
const Pop: React.FC<{ f: number; at: number; x: number; y: number; w: number; h: number; rot?: number; z?: number; out?: number; children: React.ReactNode }> = ({ f, at, x, y, w, h, rot = 0, z, out, children }) => {
  if (f < at) return null;
  if (out !== undefined && f >= out + 6) return null;
  const k = Math.floor((f - at) / 2);
  let sc = [0.25, 0.7, 1.06, 1.0][Math.min(3, k)];
  if (out !== undefined && f >= out) sc = [1.04, 0.7, 0.3][Math.min(2, Math.floor((f - out) / 2))];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, zIndex: z, transformOrigin: "50% 100%", transform: `rotate(${rot}deg) scale(${k >= 2 ? 1 + (sc - 1) * 0.5 : 0.9 + sc * 0.1}, ${sc})` }}>{children}</div>
  );
};


/** One clock per scene: the visuals and SOUNDS both read these, so a sound is always on its landing frame. */
const TC = [6, 10, 14, 18].map((a) => ({ at: a, dur: 14 }));
const TP = { rajma: 6, out: at("L12") - 3, lab: { at: at("L11") + 4, dur: 10 }, hit: at("L12") + 8, tok: at("L12") + 8 - 10 };
const TM = (() => {
  // C07: "Tamatar? | Baari chupchaap mangaa leta hai. | Aur bill? | Pine Labs se... | seedha Vinay bhaiya ko."
  const a = at("C07"), n = len("C07"), split = a + Math.round(n * 0.45);
  const whisper = a + Math.round(n * 0.78), bill = at("L15");
  return { split, bag: a + 6, lab: { at: a + 16, dur: 10 }, call2: a + Math.round(n * 0.56), whisper, bill: { at: bill, dur: 12 }, tok: bill + 12 + 4 - 12 };
})();

const Tile: React.FC<{ f: number; who: Who; id: string; x: number; y: number; at0: number; rot: number; name: string; bg: string; seed: number; flip?: boolean }> = ({ f, who, id, x, y, at0, rot, name, bg, seed, flip }) => (
  <Slide f={f} at={at0} x={x} y={y} dy={700} rot={rot} dur={14}>
    <div style={{ position: "relative", width: 400, height: 520 }}>
      <Paper bg={B.card} style={{ width: 400, height: 520 }} seed={who} />
      <div style={{ position: "absolute", left: 16, top: 16, width: 368, height: 488, borderRadius: 14, overflow: "hidden", background: bg }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", transform: f >= at(id) && f < at(id) + 2 ? "scale(1.03, 0.96)" : undefined }}><Puppet who={who} f={f} x={32} y={60} s={1.2} talk={saying(f, id)} flip={flip} seed={seed} /></div>
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

export const Call: React.FC<P> = ({ f }) => (
  <Ground bg={B.night}>
    <Tile f={f} who="papa" id="L10a" x={100} y={330} at0={TC[0].at} rot={-1.5} name="PAPA" bg={B.kraft} seed={1} flip={f >= at("L10b") + 3 && f < at("L10c")} />
    <Tile f={f} who="behen" id="L10b" x={540} y={350} at0={TC[1].at} rot={1.2} name="BEHEN" bg={B.blush} seed={2} />
    <Tile f={f} who="mummy" id="L10c" x={980} y={330} at0={TC[2].at} rot={-1} name="MUMMY" bg={B.sage} seed={3} />
    <Tile f={f} who="vinay" id="L10d" x={1420} y={350} at0={TC[3].at} rot={1.5} name="VINAY" bg={B.tint} seed={4} />
    <Bubble f={f} at={at("L10a")} text="Rajma!" x={170} y={150} size={72} rot={-3} />
    <Bubble f={f} at={at("L10b")} text="Ramen!" x={610} y={170} size={72} rot={3} />
    <Bubble f={f} at={at("L10c")} text="Pichhle hafte bhi rajma tha" x={1010} y={90} size={44} w={380} rot={-2} />
    <Bubble f={f} at={at("L10d")} text="Pasta bana lo na..." x={1450} y={110} size={44} w={360} rot={2} tail="r" />
  </Ground>
);

/** A small round paper head: the puppet's face, clipped. */
const Head: React.FC<{ f: number; who: Who; at0: number; out?: number; x: number; y: number; rot: number; seed: number; bg: string }> = ({ f, who, at0, out, x, y, rot, seed, bg }) => (
  <Pop f={f} at={at0} out={out} x={x} y={y} w={230} h={230} rot={rot}>
    <div style={{ width: 230, height: 230, borderRadius: "50%", background: bg, border: `8px solid ${B.card}`, overflow: "hidden", position: "relative", filter: cut(4, 10) }}>
      <Puppet who={who} f={f} x={-12} y={16} s={1} talk seed={seed} />
    </div>
  </Pop>
);

export const Pakka: React.FC<P> = ({ f }) => {
  const hit = TP.hit;
  const jolt = f >= hit && f < hit + 2 ? 6 : 0;
  return (
    <Ground>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, TP.hit, 0.05)})` }}>
      <div style={{ position: "absolute", left: 0, top: 790, filter: cut(4, 12) }}><div style={{ width: 1920, height: 300, background: B.kraft }} /></div>
      <Drop f={f} at={TP.rajma} x={620} y={290 + jolt} rot={-3} seed={1}><Cutout src="img/rajma.png" w={680} /></Drop>
      {f < TP.out + 4 ? <Slide f={f} at={TP.lab.at} x={700} y={110} dx={-900} rot={-4} dur={TP.lab.dur}><Label text="Rajma final?" size={64} /></Slide> : null}
      <Head f={f} who="papa" at0={at("L11b-papa")} out={TP.out} x={340} y={240} rot={-4} seed={11} bg={B.kraft} />
      <Head f={f} who="behen" at0={at("L11b-behen")} out={TP.out} x={1350} y={240} rot={4} seed={12} bg={B.blush} />
      <Head f={f} who="mummy" at0={at("L11b-mummy")} out={TP.out} x={1350} y={540} rot={-3} seed={13} bg={B.sage} />
      <Head f={f} who="vinay" at0={at("L11b-vinay")} out={TP.out} x={340} y={540} rot={3} seed={14} bg={B.tint} />
      <Drop f={f} at={at("L12")} x={800} y={590} rot={-10} seed={9} from={-300}>
        <div style={{ filter: cut(4, 14) }}>
          <div style={{ border: `14px solid ${B.haldi}`, borderRadius: 32, background: "rgba(255,255,255,0.88)", padding: "4px 48px 14px", fontFamily: FONT.deva, fontWeight: 700, fontSize: 150, color: B.haldiText, lineHeight: 1.2 }}>पक्का</div>
        </div>
      </Drop>
      <Token f={f} at={TP.tok} x={1250} y={625} size={96} x0={1250} y0={-80} travel={10} />
      </div>
    </Ground>
  );
};

const zig = (() => { const n = 12; const p = ["0% 0%", "100% 0%", "100% 96%"]; for (let i = n - 1; i >= 0; i--) p.push(`${(i / n) * 100 + 100 / n / 2}% ${i % 2 ? 96 : 100}%`); p.push("0% 96%"); return `polygon(${p.join(",")})`; })();

export const Money: React.FC<P> = ({ f }) => {
  const split = TM.split;
  if (f < split) {
    return (
      <Ground>
        <div style={{ position: "absolute", left: 0, top: 850, filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div>
        <Phone f={f} take="own/groceries_samaan" from={0.4} x={300} y={150} scale={0.9} rot={-2} seed={3} />
        <Pop f={f} at={TM.bag} x={820} y={290} w={420} h={400}><Cutout src="img/kirana-bag.png" w={420} /></Pop>
        <Slide f={f} at={TM.lab.at} x={1040} y={700} dx={700} rot={-3} dur={TM.lab.dur}><Label text="Tamatar · order ho gaye" size={50} dot /></Slide>
      </Ground>
    );
  }
  const tR = TM.bill.at;
  const push = f >= TM.whisper ? 1 + 0.07 * eo(tw(f - TM.whisper) / 16) : 1;
  return (
    <Ground>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "1300px 520px", transform: `scale(${push})` }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, TM.bill.at + TM.bill.dur, 0.05)})` }}>
      <div style={{ position: "absolute", left: 0, top: 850, filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div>
      <Sequence from={split} layout="none">
        <Phone f={f} at={split} take="own/khata" from={0} rate={0.6} x={300} y={150} scale={0.9} rot={-2} seed={5} />
        <Callout f={f} at={split} show={TM.call2} hide={TM.call2 + 40} take="own/khata" from={0} rate={0.6} region={{ x: 10, y: 528, w: 373, h: 168 }} zoom={1.5} x={920} y={520} rot={-2} />
      </Sequence>
      <Puppet who="vinay" f={f} x={1100} y={200} s={1.6} talk={saying(f, "L15")} mood="flat" seed={6} />
      <Slide f={f} at={tR} x={1210} y={440} dy={600} rot={3} dur={TM.bill.dur} z={6}>
        <div style={{ filter: cut(4, 12) }}>
          <div style={{ width: 340, height: 470, background: B.card, clipPath: zig, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 34 }}>
            <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 18, color: B.mute, letterSpacing: 3 }}>BILL</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 130, color: B.ink, lineHeight: 1.1, marginTop: 10 }}>₹520</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 72, color: B.ink, marginTop: 14 }}>Vinay</div>
            <div style={{ width: 210, height: 14, background: B.haldi, borderRadius: 4, marginTop: 6 }} />
          </div>
        </div>
      </Slide>
      <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}><Token f={f} at={TM.tok} x={1490} y={800} size={84} x0={430} y0={500} travel={12} /></div>
      </div>
      </div>
    </Ground>
  );
};

const land = (o: { at: number; dur: number }) => o.at + o.dur;
export const SOUNDS: [string, string, number, number][] = [
  ...TC.map((t, i): [string, string, number, number] => ["call", "paper-slide", land(t), 0.3]),
  ...["L10a", "L10b", "L10c", "L10d"].map((id): [string, string, number, number] => ["call", "paper-tap", at(id) + 4, 0.4]),
  ["pakka", "paper-tap", TP.rajma + 8, 0.4], ["pakka", "paper-slide", land(TP.lab), 0.4],
  ...["L11b-papa", "L11b-behen", "L11b-mummy", "L11b-vinay"].map((id): [string, string, number, number] => ["pakka", "pop", at(id) + 4, 0.4]),
  ["pakka", "stamp", TP.hit, 0.8], ["pakka", "paper-flip", TP.tok, 0.4],
  ["money", "pop", TM.bag + 4, 0.4], ["money", "paper-slide", land(TM.lab), 0.4],
  ["money", "pop", TM.call2, 0.35], ["money", "paper-slide", land(TM.bill), 0.45], ["money", "paper-flip", TM.tok, 0.4], ["money", "paper-tap", TM.tok + 12, 0.4],
];
