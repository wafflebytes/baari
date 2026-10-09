import React from "react";
import { Img, staticFile } from "remotion";
import { B, FONT, Ground, Drop, Cutout, Words, Label, Bubble, Phone, Tag, Paper, Token, Callout, punch, cut, land, wob, twos } from "./look";
import { Puppet } from "../puppets";
import { at, len, saying } from "./timeline";
type P = { f: number; d: number };

/** A card slides in from a frame edge on twos, eases out, settles a couple of degrees. */
const Slide: React.FC<{ f: number; at: number; x: number; y: number; dx?: number; dy?: number; rot?: number; z?: number; children: React.ReactNode }> = ({ f, at: a, x, y, dx = 0, dy = 0, rot = 0, z, children }) => {
  if (f < a) return null;
  const p = Math.min(1, (twos(f) - a) / 10);
  const e = 1 - Math.pow(1 - p, 3);
  return <div style={{ position: "absolute", left: x, top: y, zIndex: z, transform: `translate(${(1 - e) * dx}px, ${(1 - e) * dy}px) rotate(${rot + (1 - e) * 2 + wob(f, x + y, 0.5)}deg)` }}>{children}</div>;
};
/** A piece pops up like a pop-up book: scaleY hinged at the bottom, overshoot, settle. */
const Pop: React.FC<{ f: number; at: number; x: number; y: number; rot?: number; z?: number; children: React.ReactNode }> = ({ f, at: a, x, y, rot = 0, z, children }) => {
  if (f < a) return null;
  const sc = [0.15, 0.6, 1.08, 1.0][Math.min(3, Math.floor((twos(f) - a) / 2))];
  return <div style={{ position: "absolute", left: x, top: y, zIndex: z, transformOrigin: "50% 100%", transform: `rotate(${rot + wob(f, x, 0.6)}deg) scaleY(${sc})` }}>{children}</div>;
};
const Strip: React.FC<{ y: number; h: number; bg: string; z?: number }> = ({ y, h, bg, z }) => (
  <div style={{ position: "absolute", left: -40, top: y, width: 2000, height: h, zIndex: z, filter: cut(4, 8) }}>
    <div style={{ width: "100%", height: "100%", background: bg }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: "rgba(21,19,15,.12)" }} />
  </div>
);

/* ---------- Night ---------- */
const STARS = [[140, 80], [360, 190], [560, 70], [780, 300], [980, 60], [250, 330], [640, 300], [90, 520], [1090, 230]];
const Star: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <div style={{ position: "absolute", left: x, top: y, width: s, height: s, background: c, clipPath: "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)" }} />
);
const Door: React.FC<{ f: number }> = ({ f }) => (
  <Drop f={f} at={6} x={830} y={300} seed={5}>
    <div style={{ position: "relative", width: 360, height: 510 }}>
      <Paper bg={B.mute} style={{ width: 360, height: 510 }} />
      <div style={{ position: "absolute", left: 30, top: 38, width: 300, height: 472 }}>
        <Paper bg={B.kraft} style={{ width: 300, height: 472 }}>
          {[22, 160].map((x) => (
            <div key={x} style={{ position: "absolute", left: x, top: 30, width: 118, height: 390, border: "6px solid rgba(21,19,15,.14)", borderRadius: 8, background: "rgba(21,19,15,.07)" }}>
              <div style={{ position: "absolute", left: 18, top: 20, right: 18, bottom: 20, border: "4px solid rgba(21,19,15,.1)", borderRadius: 4 }} />
            </div>
          ))}
          <div style={{ position: "absolute", left: 140, top: 230, width: 20, height: 20, borderRadius: "50%", background: B.ink }} />
        </Paper>
      </div>
      {/* toran: a string of little paper triangles hung from the lintel */}
      <div style={{ position: "absolute", left: 30, top: 38, width: 300, height: 2, background: B.ink, opacity: 0.6 }} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 30 + i * 50, top: 40, width: 0, height: 0, borderLeft: "25px solid transparent", borderRight: "25px solid transparent", borderTop: `54px solid ${i % 2 ? B.ground : B.mute}`, filter: "drop-shadow(1px 2px 1px rgba(0,0,0,.35))" }} />
      ))}
    </div>
  </Drop>
);

export const Night: React.FC<P> = ({ f }) => {
  const a = at("N09");
  const morning = a + Math.round(len("N09") * 0.62);
  const day = f >= morning;
  const t0 = a + 4, t1 = morning;
  const prog = Math.min(1, Math.max(0, (Math.floor(f / 4) * 4 - t0) / (t1 - t0)));
  const px = -20 + (day ? 1 : prog) * 640;
  const dots = Array.from({ length: 16 }, (_, i) => 40 + i * 52);
  return (
    <Ground bg={day ? B.blush : B.night}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, morning, 0.05)})` }}>
      {!day && STARS.map(([x, y], i) => (f >= 2 + i ? <Star key={i} x={x} y={y} s={20 + (i % 3) * 8} c={i % 2 ? B.ground : B.kraft} /> : null))}
      {!day && f >= 2 && (
        <div style={{ position: "absolute", left: 760, top: 80, width: 170, height: 170, filter: "drop-shadow(4px 8px 8px rgba(0,0,0,.35))", ...land(f, 2, { from: -80, seed: 4 }) }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: B.kraft, WebkitMaskImage: "radial-gradient(circle 80px at 126px 62px, transparent 79px, #000 80px)" }} />
        </div>
      )}
      {day && (
        <div style={{ position: "absolute", left: 700, top: 50, width: 220, height: 220 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 100, top: -26, width: 20, height: 56, background: B.haldi, borderRadius: 4, transformOrigin: "10px 136px", transform: `rotate(${i * 30 + wob(f, 3, 3)}deg)` }} />
          ))}
          <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: B.haldi, filter: cut(4, 8) }} />
        </div>
      )}
      <Strip y={810} h={200} bg={day ? B.kraft : B.night2} />
      {dots.map((x, i) => (f >= 8 + i ? <div key={i} style={{ position: "absolute", left: x, top: 822, width: 18, height: 18, borderRadius: "50%", background: day ? B.ink : B.kraft, opacity: day ? 0.5 : 0.8 }} /> : null))}
      <Door f={f} />
      <Drop f={f} at={8} x={850} y={812} seed={7} from={-40} z={2}><Paper bg={B.mute} style={{ width: 320, height: 26 }} /></Drop>
      {f >= 12 && <div style={{ position: "absolute", left: px, top: 566, zIndex: 3 }}><Cutout src="img/parcel.png" w={270} m={8} /></div>}
      <Phone f={f} at={4} take="CA50-01" from={4} x={1250} y={80} scale={0.88} rot={2} seed={6} />
      <Callout f={f} at={4} show={a + 14} hide={morning - 8} take="CA50-01" from={4} region={{ x: 20, y: 318, w: 240, h: 90 }} x={420} y={300} rot={-2} />
      <Tag text="Delhivery mock" />
      </div>
    </Ground>
  );
};

/* ---------- Brief ---------- */
export const Brief: React.FC<P> = ({ f }) => {
  const b = at("N10b");
  return (
    <Ground>
      <Drop f={f} at={2} x={-40} y={500} seed={3} from={-60}>
        <div style={{ position: "relative" }}>
          <Paper bg={B.sage} style={{ width: 620, height: 310 }} />
          <div style={{ position: "absolute", left: -6, top: -6, width: 640, height: 34, background: B.kraft, borderRadius: 6, filter: cut(3, 6) }} />
        </div>
      </Drop>
      <Strip y={810} h={200} bg={B.kraft} />
      <Slide f={f} at={4} x={90} y={70} dx={-300} rot={-2}><Label text="7:45 AM" size={44} dot /></Slide>
      <Phone f={f} at={10} take="CA52-01" from={14} x={1180} y={80} scale={0.9} rot={2} seed={7} />
      <Puppet who="sunita" f={f} x={300} y={170} s={1.5} talk={saying(f, "N10b")} seed={2} />
      <Pop f={f} at={b} x={730} y={400} rot={-6} z={4}><Cutout src="img/voice-note.png" w={210} /></Pop>
      <Bubble f={f} at={b + 10} text="हाँ दीदी, प्याज़ चार है!" x={690} y={190} size={46} tail="l" />
      <Callout f={f} at={10} show={b + 18} take="CA52-01" from={14} region={{ x: 50, y: 625, w: 290, h: 100 }} zoom={1.8} x={930} y={770} rot={-1.5} />
      <Tag text="App, demo data" />
    </Ground>
  );
};

/* ---------- Count ---------- */
const Onion: React.FC = () => (
  <div style={{ position: "relative", width: 130, height: 150 }}>
    <div style={{ position: "absolute", left: 52, top: 0, width: 26, height: 40, background: "#B7A77F", clipPath: "polygon(50% 0, 100% 100%, 0 100%)", filter: cut(2, 2) }} />
    <div style={{ position: "absolute", left: 0, top: 26, width: 130, height: 124, borderRadius: "50% 50% 46% 46% / 58% 58% 42% 42%", background: "#B0507F", filter: cut(4, 8) }} />
    <div style={{ position: "absolute", left: 24, top: 52, width: 10, height: 52, borderRadius: 6, background: "rgba(255,255,255,.55)", transform: "rotate(18deg)" }} />
    <div style={{ position: "absolute", left: 60, top: 40, width: 4, height: 100, borderRadius: 2, background: "rgba(21,19,15,.14)" }} />
  </div>
);
export const Count: React.FC<P> = ({ f }) => {
  const a = at("N11");
  const papa = a + Math.round(len("N11") * 0.6);
  const ons = [0, 1, 2, 3].map((i) => a + 8 + i * 16);
  return (
    <Ground>
      <div style={{ position: "absolute", left: -40, top: 700, width: 2000, height: 420, background: B.kraft, filter: cut(4, 8) }}>
        <div style={{ height: 14, background: "rgba(21,19,15,.12)" }} />
      </div>
      <div style={{ position: "absolute", left: 385, top: 140, width: 600 }}>
        <Words f={f} at={ons[3] + 6} text="4" size={420} />
      </div>
      {ons.map((t, i) => <Pop key={i} f={f} at={t} x={340 + i * 170} y={560} rot={(i - 1.5) * 2} z={2}><Onion /></Pop>)}
      <Slide f={f} at={a + 2} x={420} y={760} dx={-400}><Label text="Pyaaz" size={46} dot /></Slide>
      <Phone f={f} at={a + 6} take="CA52-01" from={42.2} x={1150} y={50} scale={0.75} rot={-2} seed={8} />
      <Pop f={f} at={papa} x={1570} y={500} z={5}><Puppet who="papa" f={f} x={0} y={0} s={1.1} mood="o" flip seed={4} /></Pop>
      <Bubble f={f} at={papa + 8} text="Hain?" x={1520} y={400} size={44} tail="r" rot={3} />
      <Callout f={f} at={a + 6} show={a + 36} hide={papa - 6} take="CA52-01" from={42.2} region={{ x: 80, y: 635, w: 300, h: 50 }} x={1050} y={830} rot={1.5} />
      <Tag text="App, demo data" />
    </Ground>
  );
};

/* ---------- Lunch ---------- */
const Chai: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "relative", width: 160, height: 150 }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ position: "absolute", left: 40 + i * 28, top: 0 + ((twos(f) / 2 + i) % 2) * 3, width: 8, height: 38, borderRadius: 8, border: `5px solid ${B.mute}`, borderColor: `transparent ${B.mute} transparent transparent`, transform: `rotate(${i % 2 ? 12 : -10}deg)`, opacity: 0.7 }} />
    ))}
    <div style={{ position: "absolute", left: 30, top: 60, width: 100, height: 76, filter: cut(3, 5) }}>
      <div style={{ width: 100, height: 76, background: B.card, borderRadius: "8px 8px 38px 38px" }} />
      <div style={{ position: "absolute", left: 6, top: 6, width: 88, height: 14, background: B.kraft, borderRadius: 7 }} />
      <div style={{ position: "absolute", right: -26, top: 14, width: 34, height: 34, borderRadius: "50%", border: `7px solid ${B.card}` }} />
    </div>
    <div style={{ position: "absolute", left: 10, top: 132, width: 140, height: 16, background: B.card, borderRadius: 8, filter: cut(3, 4) }} />
  </div>
);
export const Lunch: React.FC<P> = ({ f }) => {
  const cutAt = at("N12") + Math.round(len("N12") * 0.66);
  const l19 = at("L19");
  const aaram = l19 + Math.round(len("L19") * 0.55);
  if (f < cutAt) {
    return (
      <Ground>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 700, background: B.blush }} />
        <Strip y={690} h={50} bg={B.mute} />
        <Slide f={f} at={2} x={-40} y={730} dy={400}>
          <div style={{ width: 2000, height: 300, background: B.card, filter: cut(3, 8), position: "relative" }}>
            {[60, 140].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y - 60, height: 18, background: B.blush }} />)}
          </div>
        </Slide>
        <Pop f={f} at={10} x={600} y={190} z={3}><Cutout src="img/rajma.png" w={720} m={9} /></Pop>
        <Slide f={f} at={4} x={1260} y={130} dy={-300} rot={4} z={4}>
          <Label text="1:00 PM" size={52} dot />
        </Slide>
        {f >= 14 && <div style={{ position: "absolute", left: 1500, top: 118, width: 26, height: 26, borderRadius: "50%", background: B.ink, zIndex: 5, boxShadow: "inset 5px 5px 0 rgba(255,255,255,.35)" }} />}
      </Ground>
    );
  }
  const T = cutAt;
  return (
    <Ground bg={B.kraft}>
      <Strip y={830} h={250} bg="#CDBF9F" />
      <Drop f={f} at={T} x={720} y={130} seed={5} from={-50}><Paper bg="#7C776D" r={120} style={{ width: 520, height: 640 }} /></Drop>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "960px 740px", transform: `rotate(${f >= aaram ? -6 : 0}deg)` }}><Puppet who="mummy" f={f} x={780} y={110} s={1.5} talk={saying(f, "L19")} seed={3} /></div>
      <Drop f={f} at={T + 2} x={630} y={470} seed={8} from={-40} z={4}><Paper bg="#6B675F" r={70} style={{ width: 150, height: 340 }} /></Drop>
      <Drop f={f} at={T + 3} x={1170} y={470} seed={9} from={-40} z={4}><Paper bg="#6B675F" r={70} style={{ width: 150, height: 340 }} /></Drop>
      <Drop f={f} at={T + 4} x={700} y={640} seed={10} from={-40} z={5}><Paper bg="#8D887D" r={44} style={{ width: 520, height: 150 }} /></Drop>
      {[680, 1210].map((x, i) => <Drop key={x} f={f} at={T + 5} x={x} y={796} seed={30 + i} from={-20} z={3}><Paper bg={B.ink} r={8} style={{ width: 44, height: 56 }} /></Drop>)}
      <Drop f={f} at={T + 6} x={1380} y={640} seed={11} from={-30} z={4}><Paper bg="#6B675F" r={14} style={{ width: 300, height: 26 }} /></Drop>
      <Drop f={f} at={T + 6} x={1510} y={664} seed={12} from={-30} z={3}><Paper bg="#6B675F" r={6} style={{ width: 40, height: 170 }} /></Drop>
      <Drop f={f} at={T + 8} x={1450} y={490} seed={13} from={-60} z={5}><Chai f={f} /></Drop>
      <Token f={Math.min(f, T + 14 + 10)} at={T + 14} x={1430} y={600} size={80} travel={8} seed={9} />
      <Slide f={f} at={aaram} x={130} y={300} dx={-500} rot={-4} z={6}><Label text="Meri baari: aaram" size={60} bg={B.haldi} /></Slide>
    </Ground>
  );
};

/* ---------- End: beat 1 the ask on haldi, beat 2 the QR card, then stillness ---------- */
const END_OUT = 21; // frames after "Aapki." lands (its start + 21) that the type sheet leaves
export const End: React.FC<P> = ({ f }) => {
  const a = at("L20");
  const half = a + Math.round(len("L20") * 0.5);
  const s = half + END_OUT;
  const ease = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const out = f < s ? 0 : ease((twos(f) - s) / 10);
  const inn = f < s + 6 ? 1 : ease((twos(f) - (s + 6)) / 10);
  const chips: [string, number, number][] = [["gnani.svg", 800, 159], ["pinelabs.svg", 983, 183], ["delhivery.png", 1190, 319]];
  return (
    <Ground bg={B.haldi}>
      {f < s + 12 && (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${f < s ? (f >= s - 4 ? 10 : 0) : -out * 1250}px) scale(${punch(f, half, 0.05)})` }}>
          <Drop f={f} at={Math.max(2, a - 8)} x={850} y={40} seed={2} from={-160}>
            <Cutout src="img/baari-mark.png" w={220} m={8} />
          </Drop>
          <div style={{ position: "absolute", left: 0, right: 0, top: 262 }}><Words f={f} at={a} text="Baari" size={90} /></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 388 }}><Words f={f} at={a + 8} text="Aaj ki baari?" size={110} /></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 505 }}><Words f={f} at={half} text="Aapki." size={230} /></div>
        </div>
      )}
      {f >= s + 6 && (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - inn) * 1000}px) scale(${punch(f, s + 16, 0.04)})` }}>
          <div style={{ position: "absolute", left: 270, top: 240 }}>
            <Paper bg={B.card} style={{ width: 1380, height: 580 }} />
          </div>
          <Img src={staticFile("img/qr.png")} style={{ position: "absolute", left: 360, top: 360, width: 340, height: 340, display: "block" }} />
          <div style={{ position: "absolute", left: 800, top: 381, fontFamily: FONT.body, fontWeight: 600, fontSize: 28, color: B.mute }}>Aaj ki baari aapki.</div>
          <div style={{ position: "absolute", left: 800, top: 421, fontFamily: FONT.display, fontWeight: 600, fontSize: 64, letterSpacing: -1.3, color: B.ink, whiteSpace: "nowrap" }}>Scan karo, try karo</div>
          <div style={{ position: "absolute", left: 800, top: 516, fontFamily: FONT.mono, fontWeight: 500, fontSize: 34, color: B.ink }}>baari.pages.dev</div>
          {chips.map(([src, x, w]) => (
            <div key={src} style={{ position: "absolute", left: x, top: 596, filter: cut(3, 6) }}>
              <div style={{ background: B.card, border: `2px solid ${B.kraft}`, borderRadius: 14, width: w, height: 82, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Img src={staticFile(`brands/${src}`)} style={{ height: 44, display: "block" }} />
              </div>
            </div>
          ))}
          <div style={{ position: "absolute", left: 270, width: 1380, top: 768, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 21, color: B.ink }}>Voices by Gnani · Pine Labs sandbox · Delhivery mock</div>
        </div>
      )}
      <Token f={Math.min(f, s + 14 + 16)} at={s + 14} x={300} y={262} size={140} x0={960} y0={1200} travel={14} seed={6} />
    </Ground>
  );
};

/* ---------- Sounds: [scene, sfx, frame in scene, volume] ---------- */
const night = at("N09"), nMorning = night + Math.round(len("N09") * 0.62);
const brief = at("N10b");
const cnt = at("N11");
const lunchCut = at("N12") + Math.round(len("N12") * 0.66);
const lAaram = at("L19") + Math.round(len("L19") * 0.55);
const endHalf = at("L20") + Math.round(len("L20") * 0.5);
export const SOUNDS: [string, string, number, number][] = [
  ["night", "paper-slide", 4, 0.4],
  ["night", "paper-tap", 8, 0.4],
  ["night", "paper-tap", nMorning - 14, 0.3],
  ["night", "chime", nMorning + 4, 0.4],
  ["night", "pop", night + 14, 0.35],
  ["brief", "paper-slide", 4, 0.4],
  ["brief", "paper-slide", 10, 0.4],
  ["brief", "pop", brief, 0.4],
  ["brief", "paper-tap", brief + 10, 0.35],
  ["brief", "pop", brief + 18, 0.35],
  ["count", "pop", cnt + 8, 0.4],
  ["count", "pop", cnt + 24, 0.4],
  ["count", "pop", cnt + 40, 0.4],
  ["count", "pop", cnt + 56, 0.4],
  ["count", "paper-tap", cnt + 62, 0.45],
  ["count", "pop", cnt + 36, 0.35],
  ["count", "pop", cnt + Math.round(len("N11") * 0.6), 0.4],
  ["lunch", "paper-tap", 2, 0.4],
  ["lunch", "pop", 10, 0.4],
  ["lunch", "paper-slide", 4, 0.4],
  ["lunch", "paper-pin", 16, 0.4],
  ["lunch", "paper-tap", lunchCut, 0.4],
  ["lunch", "paper-tap", lunchCut + 6, 0.35],
  ["lunch", "paper-flip", lunchCut + 14, 0.4],
  ["lunch", "paper-tap", lunchCut + 22, 0.4],
  ["lunch", "paper-slide", lAaram, 0.4],
  ["end", "whoosh", at("L20") - 8, 0.3],
  ["end", "paper-tap", at("L20"), 0.35],
  ["end", "stamp", endHalf, 0.8],
  ["end", "paper-slide", endHalf + 21, 0.3],
  ["end", "paper-pin", endHalf + 29, 0.5],
  ["end", "paper-flip", endHalf + 35, 0.4],
  ["end", "paper-tap", endHalf + 49, 0.4],
];
