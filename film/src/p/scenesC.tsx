import React from "react";
import { Img, staticFile } from "remotion";
import { B, FONT, Ground, Drop, Cutout, Words, Label, Bubble, Phone, Tag, Paper, cut, land, wob, rnd } from "./look";
import { Puppet } from "../puppets";
import { at, len, saying } from "./timeline";
type P = { f: number; d: number };

/* ---------- Night: the parcel crosses the dark, then the sun comes up ---------- */
const STARS = [[140, 80], [360, 190], [560, 70], [780, 160], [980, 60], [1100, 230], [250, 330], [640, 300], [900, 340], [90, 520], [1000, 450]];

const Star: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <div style={{ position: "absolute", left: x, top: y, width: s, height: s, background: c, clipPath: "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)" }} />
);

export const Night: React.FC<P> = ({ f, d }) => {
  const a = at("N09");
  const morning = a + Math.round(len("N09") * 0.62);
  const day = f >= morning;
  const t0 = a + 6;
  const t1 = morning - 6;
  const prog = Math.min(1, Math.max(0, (Math.floor(f / 4) * 4 - t0) / (t1 - t0)));
  const px = 90 + (day ? 1 : prog) * 610;
  const dots = Array.from({ length: 14 }, (_, i) => 120 + i * 48);
  return (
    <Ground bg={day ? B.ground : B.night}>
      {!day && STARS.map(([x, y], i) => (f >= 2 + i ? <Star key={i} x={x} y={y} s={20 + (i % 3) * 8} c={i % 2 ? B.ground : B.kraft} /> : null))}
      {!day && f >= 2 && (
        <div style={{ position: "absolute", left: 860, top: 110, width: 170, height: 170, filter: "drop-shadow(4px 8px 8px rgba(0,0,0,.35))", ...land(f, 2, { from: -80, seed: 4 }) }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: B.kraft, WebkitMaskImage: "radial-gradient(circle 80px at 126px 62px, transparent 79px, #000 80px)" }} />
        </div>
      )}
      {day && (
        <div style={{ position: "absolute", left: 760, top: 90, width: 220, height: 220 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 100, top: -26, width: 20, height: 56, background: B.haldi, borderRadius: 4, transformOrigin: "10px 136px", transform: `rotate(${i * 30 + wob(f, 3, 3)}deg)` }} />
          ))}
          <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: B.haldi, filter: cut(4, 8) }} />
        </div>
      )}
      <Drop f={f} at={6} x={880} y={470} seed={5}>
        <Paper bg={B.kraft} style={{ width: 210, height: 330 }}>
          <div style={{ position: "absolute", right: 28, top: 160, width: 22, height: 22, borderRadius: "50%", background: B.haldi }} />
        </Paper>
      </Drop>
      {dots.map((x, i) => (f >= 10 + i ? <div key={i} style={{ position: "absolute", left: x, top: 792, width: 14, height: 14, borderRadius: "50%", background: day ? B.mute : B.kraft, opacity: x < px + 60 && !day ? 0.35 : 1 }} /> : null))}
      {f >= 12 && (
        <div style={{ position: "absolute", left: px, top: 620, zIndex: 3 }}>
          <Cutout src="img/parcel.png" w={170} />
        </div>
      )}
      <Phone f={f} at={4} take="CA50-01" from={4} x={1230} y={80} scale={0.88} rot={2} seed={6} />
      <Tag text="Delhivery mock" />
    </Ground>
  );
};

/* ---------- Brief: 7:45, the plan in Hindi, and Sunita's voice note ---------- */
export const Brief: React.FC<P> = ({ f }) => {
  const b = at("N10b");
  return (
    <Ground>
      <Drop f={f} at={4} x={90} y={70} seed={2}><Label text="7:45 AM" size={44} dot /></Drop>
      <Phone f={f} at={10} take="CA52-01" from={14} x={1060} y={80} scale={0.9} rot={2} seed={7} />
      <Puppet who="sunita" f={f} x={300} y={370} s={1.3} talk={saying(f, "N10b")} seed={2} />
      {f >= b + 4 && <Drop f={f} at={b + 4} x={620} y={560} seed={9} rot={-6}><Cutout src="img/voice-note.png" w={190} /></Drop>}
      <Bubble f={f} at={b + 10} text="हाँ दीदी, प्याज़ चार है!" x={560} y={290} size={50} tail="l" />
      <Tag text="App, demo data" />
    </Ground>
  );
};

/* ---------- Count: a big 4 ---------- */
export const Count: React.FC<P> = ({ f }) => {
  const a = at("N11");
  const papa = a + Math.round(len("N11") * 0.6);
  return (
    <Ground>
      <div style={{ position: "absolute", left: 150, top: 170, width: 520 }}>
        <Words f={f} at={6} text="4" size={420} />
      </div>
      <Drop f={f} at={20} x={260} y={700} seed={3} rot={-3}><Label text="Pyaaz" size={52} dot /></Drop>
      <Phone f={f} at={a + 6} take="CA52-01" from={42.2} x={950} y={110} scale={0.8} rot={-2} seed={8} />
      <Drop f={f} at={papa} x={1640} y={590} seed={4} from={-60}>
        <Puppet who="papa" f={f} x={0} y={0} s={0.7} mood="o" seed={4} />
      </Drop>
      <Bubble f={f} at={papa + 6} text="Hain?" x={1560} y={500} size={34} tail="r" rot={3} />
      <Tag text="App, demo data" />
    </Ground>
  );
};

/* ---------- Lunch: rajma on the table, then Mummy ji rests ---------- */
export const Lunch: React.FC<P> = ({ f }) => {
  const cutAt = at("N12") + Math.round(len("N12") * 0.66);
  const l19 = at("L19");
  if (f < cutAt) {
    return (
      <Ground>
        <Drop f={f} at={4} x={780} y={70} seed={2}><Label text="1:00 PM" size={50} dot /></Drop>
        <Drop f={f} at={2} x={340} y={680} seed={6} from={-60}>
          <Paper bg={B.kraft} style={{ width: 1240, height: 200 }} />
        </Drop>
        <Drop f={f} at={10} x={600} y={250} seed={3}>
          <Cutout src="img/rajma.png" w={720} m={9} />
        </Drop>
      </Ground>
    );
  }
  return (
    <Ground bg={B.kraft}>
      <Drop f={f} at={cutAt} x={690} y={150} seed={5} from={-60}>
        <Paper bg={B.blush} r={90} style={{ width: 480, height: 600 }} />
      </Drop>
      <Puppet who="mummy" f={f} x={780} y={240} s={1.2} talk={saying(f, "L19")} seed={3} />
      <Drop f={f} at={cutAt} x={620} y={640} seed={8} from={-40} z={4}>
        <Paper bg={B.sage} r={70} style={{ width: 600, height: 190 }} />
      </Drop>
      {[560, 1090].map((x, i) => (
        <Drop key={i} f={f} at={cutAt + 2 + i} x={x} y={560} seed={20 + i} from={-40} z={5}>
          <Paper bg={B.sage} r={60} style={{ width: 130, height: 280 }} />
        </Drop>
      ))}
      <Drop f={f} at={l19 + Math.round(len("L19") * 0.5)} x={1200} y={300} seed={4} rot={4} z={6}>
        <Label text="Meri baari: aaram" size={56} bg={B.haldi} />
      </Drop>
    </Ground>
  );
};

/* ---------- End: the finale ---------- */
export const End: React.FC<P> = ({ f }) => {
  const a = at("L20");
  const half = a + Math.round(len("L20") * 0.5);
  const card = half + 14;
  const logo = { w: 44 };
  return (
    <Ground bg={B.haldi}>
      <Drop f={f} at={Math.max(2, a - 6)} x={840} y={26} seed={2} from={-160}>
        <Cutout src="img/baari-mark.png" w={260} m={8} />
      </Drop>
      <div style={{ position: "absolute", left: 0, right: 0, top: 262 }}>
        <Words f={f} at={a} text="Baari" size={104} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380 }}>
        <Words f={f} at={a + 8} text="Aaj ki baari?" size={78} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 462 }}>
        <Words f={f} at={half} text="Aapki." size={170} />
      </div>
      <Drop f={f} at={card} x={460} y={665} seed={5} from={-100} rot={-0.6}>
        <Paper bg={B.card} style={{ width: 1000, height: 270 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 40, color: B.ink }}>baari.pages.dev</div>
        </Paper>
      </Drop>
      {[["gnani.svg", 600, 159], ["pinelabs.svg", 789, 183], ["delhivery.png", 1002, 319]].map(([src, x, w], i) => (
        <Drop key={src as string} f={f} at={card + 10 + i * 8} x={x as number} y={752} seed={10 + i} from={-50} z={5}>
          <div style={{ filter: cut(3, 6) }}>
            <div style={{ background: B.card, border: `2px solid ${B.kraft}`, borderRadius: 14, width: w as number, height: 82, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={staticFile(`brands/${src}`)} style={{ height: logo.w, display: "block" }} />
            </div>
          </div>
        </Drop>
      ))}
      <Drop f={f} at={card + 36} x={0} y={866} seed={14} from={-20} z={5}>
        <div style={{ width: 1920, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 22, color: B.ink }}>Voices by Gnani · Pine Labs sandbox · Delhivery mock</div>
      </Drop>
    </Ground>
  );
};
