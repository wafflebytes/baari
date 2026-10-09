import React from "react";
import { AbsoluteFill } from "remotion";
import { Puppet } from "../puppets";
import { B, FONT, Ground, Drop, Cutout, Words, Label, Bubble, Phone, Tag, cut } from "./look";
import { at, len, saying } from "./timeline";

type P = { f: number; d: number };
const frac = (id: string, k: number) => at(id) + Math.round(len(id) * k);

/** Open: the question lands, big. */
export const Open: React.FC<P> = ({ f }) => {
  const talk = saying(f, "N01");
  const q = frac("N01", 0.5);
  return (
    <Ground>
      <div style={{ position: "absolute", left: 0, top: 800, width: 1920, height: 280, background: B.kraft, filter: cut(4, 10) }} />
      <div style={{ position: "absolute", left: 0, top: 780, width: 1920, height: 30, background: B.ink }} />
      <Drop f={f} at={6} x={600} y={560} seed={3} rot={-3}><Cutout src="img/pressure-cooker.png" w={230} /></Drop>
      <Puppet who="sunita" f={f} x={180} y={70} s={1.75} talk={talk} arm={talk && f > q ? 1 : 0} seed={2} />
      {f >= q - 4 && (
        <div style={{ position: "absolute", left: 990, top: 180, width: 880 }}>
          <Drop f={f} at={q - 4} x={-30} y={-30} seed={9} rot={2}>
            <div style={{ width: 920, height: 540, background: B.haldi, borderRadius: 18, filter: cut(5, 14) }} />
          </Drop>
        </div>
      )}
      <div style={{ position: "absolute", left: 990, top: 250, width: 880 }}>
        <Words f={f} at={q} text="आज क्या बनेगा?" size={200} stagger={5} weight={700} />
        <div style={{ marginTop: 40 }}>
          <Words f={f} at={q + 18} text="Aaj kya banega?" size={78} stagger={4} />
        </div>
      </div>
    </Ground>
  );
};

/** Mummy: she answers every day. */
export const Mummy: React.FC<P> = ({ f }) => {
  const talk = saying(f, "N02");
  const chips: [string, number, number, number, number][] = [
    ["Aaj kya?", 330, 200, -5, 0.08],
    ["Papa: aloo nahi", 1230, 150, 4, 0.2],
    ["Vrat hai?", 260, 560, 3, 0.34],
    ["Sabzi khatam?", 1290, 560, -3, 0.5],
  ];
  return (
    <Ground>
      <Puppet who="mummy" f={f} x={960 - 195} y={110} s={1.65} talk={talk} seed={4} />
      {chips.map(([t, x, y, r, k], i) => (
        <Drop key={t} f={f} at={frac("N02", k)} x={x} y={y} seed={i + 2} rot={r}><Label text={t} size={52} /></Drop>
      ))}
      <Drop f={f} at={frac("N02", 0.8)} x={1180} y={800} seed={11} rot={-4}>
        <Label text="Roz. Akele." size={56} bg={B.haldi} />
      </Drop>
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
        <div>
          <Drop f={f} at={hero + 2} x={810} y={130} seed={5} rot={-3} from={-200}>
            <Cutout src="img/baari-mark.png" w={300} m={10} />
          </Drop>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 500 }}>
          <Words f={f} at={hero + 14} text="Baari" size={190} weight={600} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 760 }}>
          <Words f={f} at={turn} text="Ab kisi aur ki baari." size={84} stagger={4} />
        </div>
      </Ground>
    );
  }
  return (
    <Ground>
      <Puppet who="vinay" f={f} x={620} y={110} s={1.65} talk={talk} arm={1} seed={6} />
      <Drop f={f} at={at("N03") + 6} x={1080} y={230} seed={7} rot={6}>
        <div style={{ width: 230, height: 440, background: B.ink, borderRadius: 34, filter: cut(5, 14), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 130, height: 130, borderRadius: 30, background: B.haldi, color: B.ink, fontFamily: FONT.deva, fontWeight: 700, fontSize: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>ब</div>
        </div>
      </Drop>
    </Ground>
  );
};

/** Rules: the house rules land as cards next to the app. */
export const Rules: React.FC<P> = ({ f }) => {
  const stung = frac("N04", 0.8);
  return (
    <Ground>
      <Tag text="App, demo data" />
      <Phone f={f} at={0} take="CA20-01" from={21} x={1150} y={70} scale={0.9} rot={2} />
      <Drop f={f} at={frac("N04", 0.25)} x={90} y={110} seed={3}><Puppet who="papa" f={f} x={0} y={0} s={0.62} mood="flat" seed={3} /></Drop>
      <Drop f={f} at={frac("N04", 0.27)} x={280} y={230} seed={4} rot={-3}><Label text="Papa: aloo nahi" size={50} /></Drop>
      <Drop f={f} at={frac("N04", 0.42)} x={150} y={400} seed={5} rot={3}><Label text="Mummy: meetha kam" size={50} /></Drop>
      {f >= stung && <Puppet who="sunita" f={f} x={60} y={520} s={0.9} mood="flat" seed={8} />}
      <Bubble f={f} at={stung + 4} text="Hmph." x={330} y={570} size={52} tail="l" />
    </Ground>
  );
};

/** Vote: night, two dishes, one call. */
export const Vote: React.FC<P> = ({ f }) => {
  const stars: [number, number, number][] = [[80, 60, 22], [700, 90, 16], [1000, 50, 24], [1500, 70, 18], [1820, 160, 20], [640, 900, 16], [1780, 880, 22], [960, 600, 14]];
  return (
    <Ground bg={B.night}>
      {stars.map(([x, y, s], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s, background: B.ground, transform: `rotate(${45 + i * 13}deg)`, filter: cut(2, 4), opacity: 0.9 }} />
      ))}
      <Tag text="App, demo data" />
      <Phone f={f} at={2} take="CA15-01" from={0} x={190} y={80} scale={0.95} rot={-2} />
      <Drop f={f} at={frac("N05", 0.3)} x={900} y={170} seed={3} rot={-3}><Cutout src="img/rajma.png" w={340} /></Drop>
      <Drop f={f} at={frac("N05", 0.3) + 6} x={920} y={560} seed={4} rot={2}><Label text="Rajma chawal" size={50} /></Drop>
      <Drop f={f} at={frac("N05", 0.5)} x={1380} y={290} seed={5} rot={3}><Cutout src="img/lauki-chana-dal.png" w={340} /></Drop>
      <Drop f={f} at={frac("N05", 0.5) + 6} x={1330} y={680} seed={6} rot={-2}><Label text="Lauki chana dal" size={50} /></Drop>
      <Drop f={f} at={frac("N05", 0.78)} x={960} y={790} seed={7} rot={-3}><Label text="9:30 pm" size={60} dot /></Drop>
    </Ground>
  );
};
