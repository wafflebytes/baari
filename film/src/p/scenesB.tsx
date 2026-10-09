import React from "react";
import { Sequence } from "remotion";
import { Ground, Drop, Token, Callout, punch, Cutout, Words, Label, Bubble, Phone, Tag, Paper, B, FONT, cut } from "./look";
import { at, len, saying } from "./timeline";
import { Puppet } from "../puppets";

type P = { f: number; d: number };
/** The take only holds still for `span` frames: replay its first stretch so the phone keeps showing the same screen. */
const HoldPhone: React.FC<{ f: number; d: number; take: string; from: number; span: number; at0?: number; x: number; y: number; seed: number; extra?: React.ReactNode }> = ({ f, d, take, from, span, at0 = 0, x, y, seed, extra }) => {
  const n = Math.ceil(Math.max(1, d - at0) / span);
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <Sequence key={k} from={at0 + k * span} durationInFrames={k === n - 1 ? Infinity : span}>
          <Phone f={f} at={k === 0 ? at0 : 0} take={take} from={from} x={x} y={y} scale={0.95} rot={-2} seed={seed} />
          {extra}
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
const TJ = (() => {
  const ram = at("N06") + 12, pas = Math.max(mid("N06", 0.16), at("N06") + 22);
  return { board: { at: 0, dur: 12 }, c1: { at: ram - 6, dur: 10 }, ram, c2: { at: pas - 6, dur: 10 }, pas, hold: mid("N06", 0.5), tag: mid("N06", 0.72) };
})();
const TP = { rajma: 6, out: at("L12") - 3, lab: { at: at("L11") + 4, dur: 10 }, hit: at("L12") + 8, tok: at("L12") + 8 - 10 };
const TS = { bowl: mid("N07", 0.3), tok: at("L14") - 6 - 14, land: at("L14") - 6, call: at("N07") + Math.round(len("N07") * 0.74) };
const TM = (() => { const split = at("N08") + Math.round(len("N08") * 0.5); return { split, bag: at("N08") + 8, lab: { at: at("N08") + 24, dur: 10 }, call1: at("N08") + 40, call2: split + 8, bill: { at: at("N08") + Math.round(len("N08") * 0.78), dur: 12 }, tok: at("N08") + Math.round(len("N08") * 0.78) + 12 + 4 - 12 }; })();

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

const Postcard: React.FC<{ town: string; rot: number }> = ({ town, rot }) => (
  <div style={{ transform: `rotate(${rot}deg)`, position: "relative", width: 500, height: 330 }}>
    <Paper bg={B.card} style={{ width: 500, height: 330 }} seed={town} />
    <div style={{ position: "absolute", left: 34, top: 26, fontFamily: FONT.display, fontWeight: 600, fontSize: 56, color: B.ink }}>{town}</div>
    <div style={{ position: "absolute", right: 30, top: 28, width: 70, height: 84, border: `4px solid ${B.ink}`, borderRadius: 4, boxSizing: "border-box" }}>
      <div style={{ margin: 8, height: 54, border: `3px dashed ${B.ink}`, borderRadius: 2 }} />
    </div>
    <div style={{ position: "absolute", right: 96, top: 44, width: 70, height: 70, border: `3px solid ${B.mute}`, borderRadius: "50%", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 8, right: 8, top: 24, height: 3, background: B.mute }} />
      <div style={{ position: "absolute", left: 8, right: 8, top: 36, height: 3, background: B.mute }} />
    </div>
  </div>
);

export const Japan: React.FC<P> = ({ f }) => {
  const tRam = TJ.ram, tPas = TJ.pas, tHold = TJ.hold, tTag = TJ.tag;
  const ts = tw(f - tTag);
  const sw = f >= tTag ? Math.sin(ts / 3) * 14 * Math.max(0, 1 - ts / 40) : 0;
  const C1 = { x: 690, y: 330 }, C2 = { x: 1290, y: 350 };
  return (
    <Ground>
      <div style={{ position: "absolute", left: 560, top: 170, filter: cut(4, 12) }}><div style={{ width: 1320, height: 640, background: B.kraft }} /></div>
      <Slide f={f} at={TJ.c1.at} x={C1.x} y={C1.y} dy={-700} rot={-3} dur={TJ.c1.dur}><Postcard town="Tokyo" rot={0} /></Slide>
      <Pop f={f} at={tRam + 4} x={C1.x + 120} y={C1.y + 90} w={260} h={240} z={5}><Cutout src="img/korean-ramen.png" w={260} /></Pop>
      <Slide f={f} at={TJ.c2.at} x={C2.x} y={C2.y} dy={-700} rot={3} dur={TJ.c2.dur}><Postcard town="Roma" rot={0} /></Slide>
      <Pop f={f} at={tPas + 4} x={C2.x + 120} y={C2.y + 90} w={260} h={240} z={5}><Cutout src="img/arrabbiata.png" w={260} /></Pop>
      <Puppet who="sunita" f={f} x={150} y={310} s={1.5} talk={saying(f, "N06")} mood="flat" seed={5} />
      <Pop f={f} at={tHold} x={270} y={640} w={240} h={190} z={6}><Cutout src="img/rajma.png" w={240} /></Pop>
      {f >= tTag ? (
        <div style={{ position: "absolute", left: 1000, top: 0, zIndex: 8, transformOrigin: "0 0", transform: `translateY(${-Math.round((1 - eo(ts / 10)) * 700)}px) rotate(${sw}deg)` }}>
          <div style={{ width: 4, height: 150, background: B.ink, marginLeft: 100 }} />
          <div style={{ position: "relative", top: -4 }}><Label text="Japan tour" size={52} bg={B.haldi} /></div>
        </div>
      ) : null}
    </Ground>
  );
};

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
  const tB = TS.bowl;
  const L = at("L14");
  return (
    <Ground>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, TS.land, 0.05)})` }}>
      <div style={{ position: "absolute", left: 0, top: 850, filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div>
      <HoldPhone f={f} d={d} take="CA68-01" from={0} span={66} x={190} y={70} seed={3} extra={<Callout f={f} show={TS.call} hide={TS.tok} take="CA68-01" from={0} region={{ x: 14, y: 625, w: 365, h: 95 }} zoom={1.6} x={920} y={380} rot={-2} />} />
      <Pop f={f} at={tB} out={TS.call - 2} x={700} y={600} w={380} h={230}><Bowl /></Pop>
      <Puppet who="vinay" f={f} x={1180} y={200 - (f >= L && f < L + 2 ? 18 : f >= L + 2 && f < L + 4 ? 8 : 0)} s={1.6} flip talk={saying(f, "L14")} mood={f >= L ? "o" : "smile"} seed={6} />
      <Bubble f={f} at={L} text="Main?!" x={640} y={40} size={130} rot={-3} tail="r" />
      <Token f={f} at={TS.tok} x={1380} y={600} size={104} x0={430} y0={420} travel={14} />
      <Tag text="App, demo data" />
      </div>
    </Ground>
  );
};

const zig = (() => { const n = 12; const p = ["0% 0%", "100% 0%", "100% 96%"]; for (let i = n - 1; i >= 0; i--) p.push(`${(i / n) * 100 + 100 / n / 2}% ${i % 2 ? 96 : 100}%`); p.push("0% 96%"); return `polygon(${p.join(",")})`; })();

export const Money: React.FC<P> = ({ f, d }) => {
  const split = TM.split;
  if (f < split) {
    return (
      <Ground>
        <div style={{ position: "absolute", left: 0, top: 850, filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div>
        <Phone f={f} take="CA51-01" from={4} x={250} y={80} scale={0.95} rot={-2} seed={3} />
        <Callout f={f} show={TM.call1} hide={TM.split} take="CA51-01" from={4} region={{ x: 20, y: 485, w: 353, h: 70 }} zoom={1.8} x={1480} y={330} rot={2} />
        <Pop f={f} at={TM.bag} out={TM.call1 - 2} x={800} y={290} w={420} h={400}><Cutout src="img/kirana-bag.png" w={420} /></Pop>
        <Slide f={f} at={TM.lab.at} x={780} y={740} dx={700} rot={-3} dur={TM.lab.dur}><Label text="₹28 · chupchaap" size={54} /></Slide>
        <Tag text="App, demo data" />
      </Ground>
    );
  }
  const tR = TM.bill.at;
  return (
    <Ground>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, TM.bill.at + TM.bill.dur, 0.05)})` }}>
      <div style={{ position: "absolute", left: 0, top: 850, filter: cut(4, 12) }}><div style={{ width: 1920, height: 260, background: B.kraft }} /></div>
      <HoldPhone f={f} d={d} take="CA35-01" from={2.4} span={90} at0={split} x={250} y={80} seed={5} extra={<Callout f={f} show={TM.call2} hide={TM.bill.at} take="CA35-01" from={2.4} region={{ x: 20, y: 395, w: 353, h: 70 }} zoom={1.7} x={900} y={560} rot={-2} />} />
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
      <Tag text="Pine Labs sandbox" />
      </div>
    </Ground>
  );
};

const land = (o: { at: number; dur: number }) => o.at + o.dur;
export const SOUNDS: [string, string, number, number][] = [
  ...TC.map((t, i): [string, string, number, number] => ["call", "paper-slide", land(t), 0.3]),
  ...["L10a", "L10b", "L10c", "L10d"].map((id): [string, string, number, number] => ["call", "paper-tap", at(id) + 4, 0.4]),
    ["japan", "paper-slide", land(TJ.c1), 0.4], ["japan", "pop", TJ.ram + 4, 0.4],
  ["japan", "paper-slide", land(TJ.c2), 0.4], ["japan", "pop", TJ.pas + 4, 0.4],
  ["japan", "pop", TJ.hold + 4, 0.35], ["japan", "whoosh", TJ.tag, 0.3],
  ["pakka", "paper-tap", TP.rajma + 8, 0.4], ["pakka", "paper-slide", land(TP.lab), 0.4],
  ...["L11b-papa", "L11b-behen", "L11b-mummy", "L11b-vinay"].map((id): [string, string, number, number] => ["pakka", "pop", at(id) + 4, 0.4]),
  ["pakka", "stamp", TP.hit, 0.8], ["pakka", "paper-flip", TP.tok, 0.4],
  ["soak", "pop", TS.bowl + 4, 0.4], ["soak", "pop", TS.call, 0.35], ["soak", "paper-flip", TS.tok, 0.4], ["soak", "paper-tap", TS.tok + 14, 0.45],
  ["money", "pop", TM.bag + 4, 0.4], ["money", "paper-slide", land(TM.lab), 0.4],
  ["money", "pop", TM.call1, 0.35], ["money", "pop", TM.call2, 0.35], ["money", "paper-slide", land(TM.bill), 0.45], ["money", "paper-flip", TM.tok, 0.4], ["money", "paper-tap", TM.tok + 12, 0.4],
];
