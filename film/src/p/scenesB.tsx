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

/** One video-call tile: a white paper card, the puppet's bust clipped inside it. */
const Tile: React.FC<{ f: number; who: Who; id: string; x: number; y: number; at0: number; rot: number; name: string; bg: string; seed: number }> = ({ f, who, id, x, y, at0, rot, name, bg, seed }) => (
  <Drop f={f} at={at0} x={x} y={y} seed={seed} rot={rot} from={-200}>
    <div style={{ position: "relative", width: 400, height: 520 }}>
      <Paper bg={B.card} style={{ width: 400, height: 520 }} seed={who} />
      <div style={{ position: "absolute", left: 16, top: 16, width: 368, height: 488, borderRadius: 14, overflow: "hidden", background: bg }}>
        <Puppet who={who} f={f} x={32} y={60} s={1.2} talk={saying(f, id)} seed={seed} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, background: B.card, opacity: 0.92, fontFamily: FONT.mono, fontWeight: 500, fontSize: 24, color: B.ink, display: "flex", alignItems: "center", paddingLeft: 20, letterSpacing: 1 }}>{name}</div>
      </div>
    </div>
  </Drop>
);

export const Call: React.FC<P> = ({ f }) => (
  <Ground bg={B.night}>
    <Tile f={f} who="papa" id="L10a" x={100} y={330} at0={0} rot={-1.5} name="PAPA" bg={B.kraft} seed={1} />
    <Tile f={f} who="behen" id="L10b" x={540} y={350} at0={2} rot={1.2} name="BEHEN" bg={B.blush} seed={2} />
    <Tile f={f} who="mummy" id="L10c" x={980} y={330} at0={4} rot={-1} name="MUMMY" bg={B.sage} seed={3} />
    <Tile f={f} who="vinay" id="L10d" x={1420} y={350} at0={6} rot={1.5} name="VINAY" bg={B.tint} seed={4} />
    <Bubble f={f} at={at("L10a")} text="Rajma!" x={170} y={150} size={72} rot={-3} />
    <Bubble f={f} at={at("L10b")} text="Ramen!" x={610} y={170} size={72} rot={3} />
    <Bubble f={f} at={at("L10c")} text="Pichhle hafte bhi rajma tha" x={1010} y={90} size={44} w={380} rot={-2} />
    <Bubble f={f} at={at("L10d")} text="Pasta bana lo na..." x={1450} y={110} size={44} w={360} rot={2} tail="r" />
  </Ground>
);

export const Japan: React.FC<P> = ({ f }) => {
  const a = at("N06"), n = len("N06");
  return (
    <Ground>
      <Puppet who="sunita" f={f} x={160} y={250} s={1.6} talk={saying(f, "N06")} mood="flat" seed={5} />
      <Drop f={f} at={a + 2} x={720} y={170} rot={-5} seed={2}><Cutout src="img/korean-ramen.png" w={380} /></Drop>
      <Drop f={f} at={mid("N06", 0.14)} x={1180} y={210} rot={4} seed={3}><Cutout src="img/arrabbiata.png" w={380} /></Drop>
      <Drop f={f} at={a + 8} x={800} y={600} rot={-3} seed={4}><Label text="Ramen" size={44} /></Drop>
      <Drop f={f} at={mid("N06", 0.14) + 6} x={1260} y={640} rot={3} seed={5}><Label text="Pasta" size={44} /></Drop>
      <Drop f={f} at={mid("N06", 0.7)} x={930} y={800} rot={-7} seed={6} from={-260}><Label text="✈ Japan tour" size={60} bg={B.haldi} /></Drop>
    </Ground>
  );
};

/** A small round paper head: the puppet's face, clipped. */
const Head: React.FC<{ f: number; who: Who; at0: number; x: number; y: number; rot: number; seed: number; bg: string }> = ({ f, who, at0, x, y, rot, seed, bg }) => (
  <Drop f={f} at={at0} x={x} y={y} rot={rot} seed={seed} from={-160}>
    <div style={{ width: 230, height: 230, borderRadius: "50%", background: bg, border: `8px solid ${B.card}`, overflow: "hidden", position: "relative", filter: cut(4, 10) }}>
      <Puppet who={who} f={f} x={-12} y={16} s={1} talk seed={seed} />
    </div>
  </Drop>
);

export const Pakka: React.FC<P> = ({ f }) => (
  <Ground>
    <Drop f={f} at={0} x={620} y={190} rot={-3} seed={1}><Cutout src="img/rajma.png" w={680} /></Drop>
    <Drop f={f} at={at("L11") + 6} x={140} y={130} rot={-5} seed={2}><Label text="Rajma final?" size={64} /></Drop>
    <Head f={f} who="papa" at0={at("L11b-papa")} x={250} y={420} rot={-4} seed={11} bg={B.kraft} />
    <Head f={f} who="behen" at0={at("L11b-behen")} x={1400} y={170} rot={4} seed={12} bg={B.blush} />
    <Head f={f} who="mummy" at0={at("L11b-mummy")} x={1440} y={560} rot={-3} seed={13} bg={B.sage} />
    <Head f={f} who="vinay" at0={at("L11b-vinay")} x={330} y={700} rot={3} seed={14} bg={B.tint} />
    <Drop f={f} at={at("L12")} x={700} y={440} rot={-12} seed={9} from={-300}>
      <div style={{ filter: cut(4, 14) }}>
        <div style={{ border: `18px solid ${B.haldi}`, borderRadius: 40, background: "rgba(255,255,255,0.88)", padding: "6px 60px 18px", fontFamily: FONT.deva, fontWeight: 700, fontSize: 190, color: B.haldiText, lineHeight: 1.2 }}>पक्का</div>
      </div>
    </Drop>
  </Ground>
);

export const Soak: React.FC<P> = ({ f, d }) => (
  <Ground>
    <HoldPhone f={f} d={d} take="CA68-01" from={0} span={66} x={190} y={80} seed={3} />
    <Puppet who="vinay" f={f} x={1180} y={200} s={1.6} talk={saying(f, "L14")} mood={f >= at("L14") ? "o" : "smile"} seed={6} />
    <Drop f={f} at={mid("N07", 0.62)} x={690} y={760} rot={-4} seed={7}><Label text="Raat ka kaam: Vinay" size={48} bg={B.haldi} /></Drop>
    <Bubble f={f} at={at("L14")} text="Main?!" x={840} y={130} size={110} rot={-3} tail="r" />
    <Tag text="App, demo data" />
  </Ground>
);

export const Money: React.FC<P> = ({ f, d }) => {
  const split = at("N08") + Math.round(len("N08") * 0.5);
  if (f < split) {
    return (
      <Ground>
        <Phone f={f} take="CA51-01" from={4} x={250} y={80} scale={0.95} rot={-2} seed={3} />
        <Drop f={f} at={at("N08") + 8} x={800} y={200} rot={5} seed={2}><Cutout src="img/kirana-bag.png" w={420} /></Drop>
        <Drop f={f} at={at("N08") + 24} x={780} y={740} rot={-3} seed={4}><Label text="₹28 · chupchaap" size={54} /></Drop>
        <Tag text="App, demo data" />
      </Ground>
    );
  }
  return (
    <Ground>
      <HoldPhone f={f} d={d} take="CA35-01" from={1} span={90} at0={split} x={250} y={80} seed={5} />
      <Puppet who="vinay" f={f} x={1100} y={200} s={1.6} talk={saying(f, "L15")} mood="flat" seed={6} />
      <Bubble f={f} at={at("L15")} text="Setup maine kiya..." x={880} y={110} size={56} rot={-2} />
      <Drop f={f} at={mid("L15", 0.72)} x={780} y={800} rot={-5} seed={8} from={-260}><Label text="Bill: Vinay" size={72} bg={B.haldi} /></Drop>
      <Tag text="Pine Labs sandbox" />
    </Ground>
  );
};
