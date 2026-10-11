import React from "react";
import { Img, staticFile } from "remotion";
import { B, FONT, Ground, Drop, Cutout, Words, Label, Bubble, Phone, Paper, Token, punch, cut, wob, twos } from "./look";
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

/* ---------- Brief: 7:45, the plan as a voice note, in her language ---------- */
const BR = (() => { const a = at("C09"); return { a, bhasha: a + Math.round(len("C09") * 0.68) }; })();
export const Brief: React.FC<P> = ({ f }) => {
  const g = f - BR.bhasha;
  const hopY = g >= 0 && g < 8 ? -Math.sin((g / 8) * Math.PI) * 22 : 0;
  return (
    <Ground>
      <Strip y={810} h={200} bg={B.kraft} />
      <Slide f={f} at={4} x={110} y={150} dx={-300} rot={-2}><Label text="7:45 AM" size={44} dot /></Slide>
      <Phone f={f} at={2} take="own/gnani_voices" from={1.6} x={1180} y={80} scale={0.9} rot={2} seed={7} />
      <Puppet who="sunita" f={f} x={300} y={170 + hopY} s={1.5} talk={saying(f, "C09")} mood="smile" arm={f >= BR.bhasha ? 1 : 0} seed={2} />
      <Pop f={f} at={BR.a + 8} x={730} y={420} rot={-6} z={4}><Cutout src="img/voice-note.png" w={210} /></Pop>
      <Bubble f={f} at={BR.bhasha} text="हिंदी में!" x={700} y={210} size={56} tail="l" />
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
  const cutAt = at("E11") + Math.round(len("E11") * 0.82);
  const l19 = at("L19");
  const aaram = l19 + Math.round(len("L19") * 0.55);
  if (f < cutAt) {
    return (
      <Ground>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 700, background: B.blush }} />
        <Strip y={690} h={50} bg={B.mute} />
        <Slide f={f} at={6} x={-40} y={730} dy={400}>
          <div style={{ width: 2000, height: 300, background: B.card, filter: cut(3, 8), position: "relative" }}>
            {[60, 140].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y - 60, height: 18, background: B.blush }} />)}
          </div>
        </Slide>
        <Pop f={f} at={10} x={600} y={190} z={3}><Cutout src="img/rajma.png" w={720} m={9} /></Pop>
        <Slide f={f} at={8} x={1260} y={130} dy={-300} rot={4} z={4}>
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
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "960px 740px", transform: `rotate(${f >= aaram ? -6 : 0}deg)` }}><Puppet who="mummy" f={f} x={780} y={110} s={1.5} talk={saying(f, "L19")} mood={f >= aaram ? "smile" : "flat"} seed={3} /></div>
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

/* ---------- End: one card, built piece by piece while Baari says the last line ---------- */
const TEAM: [string, string, number][] = [["Chaitanya", "team/chaitanya.jpg", -3], ["Vinay", "team/vinay.jpg", 2], ["Keshav", "team/keshav.jpg", -2]];
const EN = (() => {
  const a = at("L20"), half = a + Math.round(len("L20") * 0.5);
  return { a, half, qr: 10, win1: a + 40, win2: a + 50, prize: a + 62, team: [a + 74, a + 79, a + 84] };
})();
const Polaroid: React.FC<{ src: string; name: string }> = ({ src, name }) => (
  <div style={{ filter: cut(4, 14) }}>
    <div style={{ width: 262, background: B.card, padding: "14px 14px 0", boxSizing: "border-box", borderRadius: 4 }}>
      <Img src={staticFile(src)} style={{ width: 234, height: 234, objectFit: "cover", display: "block", borderRadius: 2 }} />
      <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 600, fontSize: 32, color: B.ink, letterSpacing: -0.5 }}>{name}</div>
    </div>
  </div>
);
/** A paper rosette: a haldi disc with a dashed stitch and two ribbon tails. */
const Rosette: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 124 }) => (
  <div style={{ position: "relative", width: size, height: size * 1.3 }}>
    {[-14, 14].map((r, i) => (
      <div key={r} style={{ position: "absolute", left: size * 0.3 + i * size * 0.17, top: size * 0.66, width: size * 0.24, height: size * 0.64, background: i ? B.ink : B.haldiText, transform: `rotate(${r}deg)`, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)", filter: cut(2, 4) }} />
    ))}
    <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: "50%", background: B.haldi, filter: cut(4, 10), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: size * 0.78, height: size * 0.78, borderRadius: "50%", border: `4px dashed ${B.haldiText}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 600, fontSize: size * 0.4, color: B.ink, letterSpacing: -2 }}>{children}</div>
    </div>
  </div>
);
const Win: React.FC<{ f: number; at: number; badge: React.ReactNode; title: string; sub: string; x: number; y: number; seed: number }> = ({ f, at: a, badge, title, sub, x, y, seed }) => (
  <>
    <Drop f={f} at={a} x={x} y={y} seed={seed} from={-240} rot={-4}><Rosette>{badge}</Rosette></Drop>
    {f >= a + 4 && (
      <div style={{ position: "absolute", left: x + 150, top: y + 14 }}>
        <Words f={f} at={a + 4} text={title} size={60} align="left" stagger={3} />
        <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 27, color: B.mute, marginTop: 6, whiteSpace: "nowrap", opacity: f >= a + 9 ? 1 : 0 }}>{sub}</div>
      </div>
    )}
  </>
);
export const End: React.FC<P> = ({ f }) => {
  const g = f - EN.prize;
  const thump = g >= 0 && g < 3 ? `translateY(${-(3 - g) * 70}px)` : g === 3 ? "scale(1.1, 0.9)" : "none";
  return (
    <Ground bg={B.haldi}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${punch(f, EN.half, 0.025)})` }}>
        <div style={{ position: "absolute", left: 140, top: 140 }}><Paper bg={B.card} style={{ width: 1640, height: 840 }} /></div>
        {/* left: the ask and the QR */}
        <div style={{ position: "absolute", left: 210, width: 520, top: 196 }}>
          <Words f={f} at={EN.a} text="Aaj ki baari?" size={56} align="left" />
          <div style={{ marginTop: 4 }}><Words f={f} at={EN.half} text="Aapki." size={112} align="left" /></div>
          {f >= EN.half + 6 && <div style={{ width: 300 * Math.min(1, (twos(f) - EN.half - 6) / 8), height: 14, background: B.haldi, borderRadius: 4, marginTop: 2 }} />}
        </div>
        <Drop f={f} at={EN.qr} x={214} y={480} seed={3} from={-120} rot={-1.5}>
          <div style={{ filter: cut(4, 10) }}>
            <div style={{ background: B.card, border: `3px solid ${B.kraft}`, borderRadius: 16, padding: 16, display: "flex", gap: 22, alignItems: "center" }}>
              <Img src={staticFile("img/qr.png")} style={{ width: 250, height: 250, display: "block" }} />
              <div>
                <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 26, color: B.mute }}>Scan karo,</div>
                <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 44, color: B.ink, letterSpacing: -1 }}>try karo</div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, color: B.ink, marginTop: 14 }}>baari.pages.dev</div>
              </div>
            </div>
          </div>
        </Drop>
        <div style={{ position: "absolute", left: 214, top: 822, display: "flex", alignItems: "center", gap: 12, fontFamily: FONT.body, fontWeight: 600, fontSize: 24, color: B.mute, whiteSpace: "nowrap", opacity: f >= EN.qr + 10 ? 1 : 0 }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 500, letterSpacing: 1.5 }}>BUILT ON</span>
          <Img src={staticFile("brands/pinelabs.svg")} style={{ height: 34, display: "block" }} />
          <span style={{ color: B.ink }}>AgenticOrg</span>
        </div>
        <div style={{ position: "absolute", left: 790, top: 200, width: 3, height: 720, background: B.kraft }} />
        {/* right: the two wins, the prize, the team */}
        <Win f={f} at={EN.win1} badge={<>1<span style={{ fontSize: 26, marginTop: -16 }}>st</span></>} title="First place" sub="Build track · The Ken × Pine Labs" x={850} y={190} seed={11} />
        <Win f={f} at={EN.win2} badge="★" title="Winner" sub="Pine Labs track" x={850} y={360} seed={12} />
        {f >= EN.prize && (
          <div style={{ position: "absolute", left: 1380, top: 352, transform: `rotate(6deg) ${thump}`, transformOrigin: "50% 100%" }}>
            <div style={{ filter: cut(4, 12) }}>
              <div style={{ border: `8px solid ${B.ink}`, borderRadius: 18, background: B.haldi, padding: "12px 26px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 76, color: B.ink, lineHeight: 1, letterSpacing: -2 }}>₹7.5 lakh</div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 20, color: B.ink, letterSpacing: 2.5, marginTop: 8 }}>IN PRIZES, IN TOTAL</div>
              </div>
            </div>
          </div>
        )}
        {TEAM.map(([name, src, rot], i) => (
          <Drop key={name} f={f} at={EN.team[i]} x={850 + i * 300} y={570} seed={20 + i} rot={rot} from={-200}><Polaroid src={src} name={name} /></Drop>
        ))}
      </div>
      <Token f={Math.min(f, EN.qr + 12 + 14)} at={EN.qr + 12} x={210} y={478} size={96} x0={960} y0={1200} travel={14} seed={6} />
    </Ground>
  );
};

/* ---------- Sounds: [scene, sfx, frame in scene, volume] ---------- */
const lunchCut = at("E11") + Math.round(len("E11") * 0.82);
const lAaram = at("L19") + Math.round(len("L19") * 0.55);
export const SOUNDS: [string, string, number, number][] = [
  ["brief", "paper-slide", 4, 0.4],
  ["brief", "paper-slide", 10, 0.35],
  ["brief", "pop", BR.a + 8, 0.4],
  ["brief", "pop", BR.bhasha, 0.45],
  ["lunch", "paper-tap", 6, 0.4],
  ["lunch", "pop", 10, 0.4],
  ["lunch", "paper-slide", 8, 0.4],
  ["lunch", "paper-pin", 16, 0.4],
  ["lunch", "paper-tap", lunchCut, 0.4],
  ["lunch", "paper-tap", lunchCut + 6, 0.35],
  ["lunch", "paper-flip", lunchCut + 14, 0.4],
  ["lunch", "paper-tap", lunchCut + 22, 0.4],
  ["lunch", "paper-slide", lAaram, 0.4],
  ["end", "paper-slide", EN.qr + 6, 0.35],
  ["end", "paper-flip", EN.qr + 12, 0.35],
  ["end", "paper-tap", EN.a, 0.3],
  ["end", "pop", EN.half, 0.45],
  ["end", "paper-tap", EN.win1 + 8, 0.4],
  ["end", "paper-tap", EN.win2 + 8, 0.4],
  ["end", "stamp", EN.prize + 3, 0.75],
  ["end", "paper-tap", EN.team[0] + 8, 0.35],
  ["end", "paper-tap", EN.team[1] + 8, 0.35],
  ["end", "paper-pin", EN.team[2] + 8, 0.45],
];
