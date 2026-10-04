import React from "react";
import { AbsoluteFill, interpolate, staticFile, Img } from "remotion";
import { C, F, Curtain, CutTitle, Speech, Phone, Paper, Tag, cut, land, twos, wob, ease, fade, bounce, smooth, Grain } from "./kit";
import { Puppet } from "./puppets";
import { Chat, AgentPage } from "./ui";
import { at, len } from "./timeline";

type P = { f: number; d: number };
const W = 1740, H = 800;

/* ---------- sets ---------- */
const Kitchen: React.FC<{ f: number; clock?: string }> = ({ f, clock = "8:00" }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: "#efe0bf" }}><Grain o={0.25} /></AbsoluteFill>
    {/* tiles */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 360, height: 220, backgroundImage: "linear-gradient(#d8cdb5 2px, transparent 2px), linear-gradient(90deg, #d8cdb5 2px, transparent 2px)", backgroundSize: "60px 60px", background: undefined }} />
    <Paper bg="#f6f0e2" style={{ left: 0, top: 360, width: W, height: 220 }} r={0} m={0} sh={0}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#ddd2b8 3px, transparent 3px), linear-gradient(90deg, #ddd2b8 3px, transparent 3px)", backgroundSize: "62px 62px" }} />
    </Paper>
    {/* window */}
    <Paper bg="#9fd0e0" style={{ left: 1180, top: 70, width: 300, height: 230 }}>
      <div style={{ position: "absolute", left: 145, top: 0, width: 10, height: "100%", background: "#6b4a2b" }} />
      <div style={{ position: "absolute", top: 110, left: 0, width: "100%", height: 10, background: "#6b4a2b" }} />
    </Paper>
    {/* clock */}
    <div style={{ position: "absolute", left: 820, top: 70, width: 150, height: 150, filter: cut(4, 10) }}>
      <svg viewBox="0 0 100 100" width={150} height={150}>
        <circle cx="50" cy="50" r="48" fill="#fff" stroke={C.red} strokeWidth="6" />
        {[...Array(12)].map((_, i) => <rect key={i} x="49" y="8" width="2" height="7" fill="#333" transform={`rotate(${i * 30} 50 50)`} />)}
        <rect x="48" y="22" width="4" height="30" rx="2" fill="#222" transform={`rotate(${clock === "8:30" ? 255 : 240} 50 50)`} />
        <rect x="49" y="12" width="2" height="40" rx="1" fill="#222" transform={`rotate(${clock === "8:30" ? 180 : 0} 50 50)`} />
      </svg>
    </div>
    {/* shelf + masala dabba */}
    <Paper bg="#8a5a33" style={{ left: 120, top: 250, width: 420, height: 22 }} r={3} />
    {[0, 1, 2, 3].map((i) => <Paper key={i} bg={["#c0392b", "#e1b54a", "#2f6f73", "#6b4a2b"][i]} style={{ left: 150 + i * 92, top: 176 + (i % 2) * 14, width: 70, height: 74 - (i % 2) * 14 }} r={8} m={3} sh={6} />)}
    {/* counter */}
    <Paper bg="#7a7f86" style={{ left: 0, top: 580, width: W, height: 230 }} r={0} m={0}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 26, background: "#5d6168" }} />
    </Paper>
    {/* stove + cooker */}
    <Paper bg="#2b2b2b" style={{ left: 1230, top: 540, width: 360, height: 50 }} r={8} />
    <div style={{ position: "absolute", left: 1290, top: 380, filter: cut(4, 10), transform: `rotate(${wob(f, 4, 1.5)}deg)` }}>
      <svg width="200" height="170" viewBox="0 0 200 170">
        <rect x="20" y="60" width="160" height="100" rx="20" fill="#c9ccd1" />
        <rect x="10" y="44" width="180" height="26" rx="12" fill="#a9adb3" />
        <rect x="150" y="50" width="70" height="14" rx="7" fill="#222" />
        <rect x="92" y="16" width="16" height="30" rx="6" fill="#333" />
      </svg>
    </div>
  </AbsoluteFill>
);

const Steam: React.FC<{ f: number; x: number; y: number; start: number }> = ({ f, x, y, start }) => {
  const g = twos(f) - start;
  if (g < 0 || g > 70) return null;
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const k = g - i * 8;
        if (k < 0) return null;
        const o = interpolate(k, [0, 10, 40], [0, 0.9, 0], { extrapolateRight: "clamp" });
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(k / 6 + i) * 18, top: y - k * 4, width: 40 + k, height: 40 + k, borderRadius: "50%", background: "#fff", opacity: o, filter: "blur(2px)" }} />;
      })}
    </>
  );
};

const NightSky: React.FC<{ f: number; moon?: boolean }> = ({ f, moon = true }) => (
  <AbsoluteFill style={{ background: `linear-gradient(${C.night}, ${C.night2})` }}>
    <Grain o={0.3} blend="overlay" />
    {[...Array(26)].map((_, i) => {
      const x = (i * 337) % W, y = (i * 151) % 360 + 20;
      const tw = 0.5 + 0.5 * Math.sin(twos(f) / 7 + i);
      return <div key={i} style={{ position: "absolute", left: x, top: y, width: 10, height: 10, background: C.gold, opacity: 0.4 + tw * 0.6, clipPath: "polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)" }} />;
    })}
    {moon ? <MoonStick f={f} x={1450} y={40} /> : null}
  </AbsoluteFill>
);
const MoonStick: React.FC<{ f: number; x: number; y: number; flip?: number }> = ({ f, x, y, flip = 0 }) => {
  const ang = flip * 180;
  const sun = ang > 90;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 160, height: 320 }}>
      <div style={{ position: "absolute", left: 76, top: -400, width: 8, height: 560, background: "#6b4a2b" }} />
      <div style={{ position: "absolute", left: 0, top: 100, width: 160, height: 160, transform: `rotateY(${ang}deg) rotate(${wob(f, 9, 3)}deg)`, filter: cut(4, 10) }}>
        {sun ? (
          <svg viewBox="0 0 100 100" width={160} height={160} style={{ transform: "scaleX(-1)" }}>
            {[...Array(12)].map((_, i) => <polygon key={i} points="50,0 56,18 44,18" fill="#f2a23a" transform={`rotate(${i * 30} 50 50)`} />)}
            <circle cx="50" cy="50" r="30" fill={C.haldi} />
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" width={160} height={160}>
            <path d="M60 8 A42 42 0 1 0 92 70 A34 34 0 1 1 60 8Z" fill="#f4e7b8" />
          </svg>
        )}
      </div>
    </div>
  );
};

const Calendar: React.FC<{ f: number; x: number; y: number; day: string; tear?: number; label?: string }> = ({ f, x, y, day, tear = -1, label = "OCT 2026" }) => {
  const g = tear >= 0 ? f - tear : -1;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 170, height: 200, filter: cut(4, 10), transform: `rotate(${wob(f, 2, 2)}deg)` }}>
      <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 6 }}>
        <div style={{ background: C.red, color: "#fff", fontFamily: F.mono, fontSize: 20, textAlign: "center", padding: 8, borderRadius: "6px 6px 0 0" }}>{label}</div>
        <div style={{ fontFamily: F.rozha, fontSize: 96, textAlign: "center", lineHeight: 1.25 }}>{g >= 0 ? "5" : day}</div>
        <div style={{ fontFamily: F.mono, fontSize: 18, textAlign: "center" }}>{g >= 0 ? "SOMVAAR" : "ITVAAR"}</div>
      </div>
      {g >= 0 && g < 24 ? (
        <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 6, transformOrigin: "0 0", transform: `rotate(${twos(g) * 5}deg) translate(${twos(g) * 6}px, ${twos(g) * twos(g) * 0.9}px)`, opacity: 1 - g / 24 }}>
          <div style={{ background: C.red, color: "#fff", fontFamily: F.mono, fontSize: 20, textAlign: "center", padding: 8 }}>{label}</div>
          <div style={{ fontFamily: F.rozha, fontSize: 96, textAlign: "center", lineHeight: 1.25 }}>{day}</div>
        </div>
      ) : null}
    </div>
  );
};

const Stamp: React.FC<{ f: number; start: number; text: string; x: number; y: number; color?: string; size?: number; rot?: number; solid?: boolean }> = ({ f, start, text, x, y, color = C.red, size = 56, rot = -12, solid }) => {
  if (f < start) return null;
  const g = f - start;
  const s = g < 4 ? 1.8 - g * 0.2 : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${s})`, opacity: Math.min(1, g / 2), border: `7px solid ${color}`, color, fontFamily: F.rozha, fontSize: size, padding: "4px 26px", borderRadius: 12, letterSpacing: 2, mixBlendMode: solid ? "normal" : "multiply", whiteSpace: "nowrap", background: solid ? color : "rgba(255,255,255,.08)", ...(solid ? { color: "#111", borderColor: "#111", filter: cut(3, 10) } : {}) }}>
      {text}
    </div>
  );
};

const Caption: React.FC<{ f: number; start: number; text: string; x: number; y: number; size?: number; color?: string; bg?: string; font?: string }> = ({ f, start, text, x, y, size = 40, color = C.ink, bg = C.paper, font }) => (
  <div style={{ position: "absolute", left: x, top: y, ...land(f, start, { from: -50, seed: x + y, dur: 6 }) }}>
    <div style={{ filter: cut(3, 8), transform: "rotate(-1.5deg)" }}>
      <div style={{ background: bg, color, fontFamily: font ?? F.rozha, fontSize: size, padding: "10px 24px", borderRadius: 8, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  </div>
);

/** The haldi Baari disc on a stick: the hand that moves the pieces. */
const Disc: React.FC<{ f: number; x: number; y: number; s?: number }> = ({ f, x, y, s = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 140 * s, height: 140 * s, transform: `rotate(${wob(f, 5, 4)}deg)` }}>
    <div style={{ position: "absolute", left: 66 * s, top: 120 * s, width: 8 * s, height: 600, background: "#6b4a2b" }} />
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.haldi, filter: cut(4, 10), display: "grid", placeItems: "center", fontFamily: F.rozha, fontSize: 80 * s, color: "#111" }}>ब</div>
  </div>
);

/* ---------- scenes ---------- */

export const Open: React.FC<P> = ({ f }) => {
  const up = ease(f, 40, 66, Easing2);
  const n1 = at("N01"), n2 = at("N02");
  const talking = (f >= n1 && f < n1 + len("N01")) || (f >= n2 && f < n2 + len("N02"));
  return (
    <AbsoluteFill>
      <Kitchen f={f} />
      <Steam f={f} x={1370} y={360} start={0} />
      <Puppet who="sunita" f={f} x={560} y={300} s={1.25} arm={f < n1 + 30 ? 1 : 0} talk={talking} seed={2} />
      {f >= n2 ? <Caption f={f} start={n2 + 4} text="सुनीता · Sunita" x={180} y={380} size={56} /> : null}
      {f >= n2 ? <Caption f={f} start={n2 + 18} text="cook · Sharma ghar, Rohini · 8:00 am" x={180} y={480} size={30} font={F.mono} /> : null}
      <Curtain p={up}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 220 }}>
          <CutTitle text="Aaj kya banega?" size={150} f={f} start={-40} color={C.gold} />
          <CutTitle text="आज क्या बनेगा?" size={110} f={f} start={-40} color="#fff" style={{ marginTop: 20 }} />
        </div>
      </Curtain>
    </AbsoluteFill>
  );
};
const Easing2 = smooth;

export const Family: React.FC<P> = ({ f }) => {
  const c1 = at("C1"), c2 = at("C2"), c3 = at("C3");
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#e8d6b0" }}><Grain o={0.25} /></AbsoluteFill>
      <Paper bg="#c9a46a" style={{ left: 0, top: 620, width: W, height: 200 }} r={0} m={0} />
      {/* frame on wall */}
      <Paper bg="#fff" style={{ left: 760, top: 60, width: 220, height: 160 }}><div style={{ position: "absolute", inset: 14, background: C.teal }} /></Paper>
      <div style={{ ...land(f, c1 - 8, { seed: 1 }) }}><Puppet who="mummy" f={f} x={240} y={300} s={1.1} talk={f >= c1 && f < c1 + len("C1")} seed={3} arm={f >= c1 && f < c1 + 20 ? 1 : 0} mood="flat" /></div>
      <div style={{ ...land(f, c2 - 8, { seed: 2 }) }}><Puppet who="papa" f={f} x={760} y={300} s={1.1} talk={f >= c2 && f < c2 + len("C2")} seed={4} mood="flat" /></div>
      <div style={{ ...land(f, c3 - 8, { seed: 3 }) }}><Puppet who="vinay" f={f} x={1260} y={300} s={1.1} talk={f >= c3 && f < c3 + len("C3")} seed={5} arm={f >= c3 ? 1 : 0} /></div>
      <Speech f={f} start={c1} text="Kuch bhi bana do." x={90} y={150} w={420} />
      <Speech f={f} start={c2} text="Jo mann kare." x={640} y={140} w={360} />
      <Speech f={f} start={c3} text="Kuch bhi chalega!" x={1150} y={150} w={420} tail="r" />
    </AbsoluteFill>
  );
};

export const KuchBhi: React.FC<P> = ({ f }) => {
  const n = at("N03"), L = len("N03");
  const bag = n + Math.round(L * 0.42), stamp = n + Math.round(L * 0.9), dal = n + Math.round(L * 0.25);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#efe0bf" }}><Grain o={0.25} /></AbsoluteFill>
      <Paper bg="#7a7f86" style={{ left: 0, top: 560, width: W, height: 260 }} r={0} m={0} />
      {/* the menu card nobody can cook */}
      <div style={{ position: "absolute", left: 120, top: 120, ...land(f, n + 6, { seed: 7 }) }}>
        <Paper bg={C.paper} style={{ position: "relative", width: 460, height: 300 }}>
          <div style={{ padding: 30, fontFamily: F.mono, fontSize: 24, color: "#555" }}>AAJ KA MENU</div>
          <div style={{ paddingLeft: 30, fontFamily: F.rozha, fontSize: 78, color: C.red, lineHeight: 1 }}>“Kuch bhi”</div>
          <div style={{ padding: "16px 30px", fontFamily: F.hand, fontSize: 30, color: "#333" }}>recipe: ??? · samaan: ???</div>
        </Paper>
      </div>
      {/* dal katori, untouched */}
      <div style={{ position: "absolute", left: 760, top: 420, ...land(f, dal, { seed: 8 }) }}>
        <div style={{ width: 240, height: 240, borderRadius: "50%", background: "#c9ccd1", filter: cut(4, 12), display: "grid", placeItems: "center" }}>
          <div style={{ width: 170, height: 170, borderRadius: "50%", background: "#e0a63a", boxShadow: "inset 0 -10px 0 rgba(0,0,0,.12)" }} />
        </div>
        {f > bag + 20 ? <div style={{ position: "absolute", left: 40, top: -60, fontFamily: F.hand, fontSize: 34, color: "#333", transform: "rotate(-6deg)" }}>…thandi</div> : null}
      </div>
      {/* generic delivery bag */}
      {f >= bag ? (
        <div style={{ position: "absolute", left: interpolate(twos(f), [bag, bag + 14], [1800, 1120], { extrapolateRight: "clamp", easing: smooth }), top: 300, transform: `rotate(${wob(f, 11, 3)}deg)` }}>
          <Paper bg="#8b5e34" style={{ position: "relative", width: 280, height: 320 }} r={10}>
            <div style={{ position: "absolute", top: -2, left: 70, width: 140, height: 60, border: "14px solid #6b4526", borderBottom: "none", borderRadius: "70px 70px 0 0" }} />
            <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", fontFamily: F.tight, fontWeight: 800, fontSize: 40, color: "#f4ead5" }}>ORDER IN</div>
          </Paper>
        </div>
      ) : null}
      <Puppet who="sunita" f={f} x={1380} y={300} s={1.05} talk={f >= n && f < n + L} seed={9} mood={f > stamp ? "flat" : "smile"} />
      <Stamp f={f} start={stamp} text="GALTI: SUNITA KI" x={1180} y={240} size={52} />
    </AbsoluteFill>
  );
};

export const Reveal: React.FC<P> = ({ f, d }) => {
  const push = ease(f, 26, 74, Easing3);
  const cutAt = 74;
  return (
    <AbsoluteFill>
      {f < cutAt ? (
        <>
          <Kitchen f={f} clock="8:30" />
          <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + push * 9})`, transformOrigin: "870px 330px" }}>
            <div style={{ position: "absolute", left: 800, top: interpolate(twos(f), [0, 16], [900, 260], { extrapolateRight: "clamp", easing: smooth }) }}>
              <Disc f={f} x={0} y={0} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 110, background: C.red, filter: cut(0, 12), transform: `translateY(${interpolate(twos(f), [4, 18], [-130, 0], { extrapolateRight: "clamp" })}px)` }}>
            <div style={{ textAlign: "center", fontFamily: F.rozha, fontSize: 80, color: C.gold, lineHeight: "120px" }}>BAARI</div>
          </div>
        </>
      ) : (
        <AppIconToPhone f={f - cutAt} d={d - cutAt} />
      )}
    </AbsoluteFill>
  );
};
const Easing3 = Easing2;

const AppIconToPhone: React.FC<P> = ({ f }) => {
  const p = ease(f, 6, 34);
  const iconS = interpolate(p, [0, 1], [5.2, 0.6]);
  return (
    <AbsoluteFill style={{ background: "#0d0d0e" }}>
      <AbsoluteFill style={{ background: "#f6f5f1", opacity: p }}><Grain o={0.12} /></AbsoluteFill>
      <div style={{ position: "absolute", left: 870 - 128, top: 400 - 128, width: 256, height: 256, transform: `translate(${p * -520}px, ${p * -250}px) scale(${iconS})`, opacity: 1 - ease(f, 30, 40) }}>
        <Img src={staticFile("app/icon.svg")} style={{ width: 256, height: 256 }} />
      </div>
      {f > 22 ? (
        <div style={{ position: "absolute", left: 1040, top: interpolate(twos(f), [22, 40], [900, 30], { extrapolateRight: "clamp", easing: smooth }) }}>
          <Phone src="vote" from={0.4} scale={0.86} style={{ left: 0, top: 0 }} />
        </div>
      ) : null}
      {f > 36 ? (
        <div style={{ position: "absolute", left: 110, top: 230 }}>
          <CutTitle text="Baari" size={150} f={f} start={36} color={C.ink} style={{ justifyContent: "flex-start" }} />
          <div style={{ opacity: fade(f, 52, 62), fontFamily: F.tight, fontWeight: 700, fontSize: 46, color: C.ink, marginTop: 10, maxWidth: 760, lineHeight: 1.15 }}>
            Tomorrow's meal, agreed tonight.<br />Kitchen ready by eight.
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Vote: React.FC<P> = ({ f }) => {
  const n = at("N05");
  return (
    <AbsoluteFill>
      <NightSky f={f} />
      <Calendar f={f} x={90} y={70} day="4" />
      <Caption f={f} start={6} text="Itvaar · 8:30 pm" x={300} y={110} size={44} bg={C.gold} />
      <div style={{ position: "absolute", left: 120, top: 220, ...land(f, 10, { seed: 21, from: -200 }) }}>
        <Phone src="vote" from={1.6} scale={0.66} style={{ left: 0, top: 0 }} />
      </div>
      <div style={{ position: "absolute", left: 520, top: 30, ...land(f, 18, { seed: 22, from: -300 }) }}>
        <Chat f={f} title="Sharma ghar" sub="Baari, Mummy, Papa, Vinay" w={470} h={770} msgs={[
          { at: 30, side: "in", from: "Baari", dishes: true, buttons: ["Rajma chawal", "Lauki chana dal", "Kuch bhi"], press: n + 150 },
          { at: n + 158, side: "out", text: "Kuch bhi", from: "Mummy" },
        ]} />
      </div>
      <Puppet who="mummy" f={f} x={1060} y={430} s={0.85} seed={23} arm={f > n + 140 ? 1 : 0} />
      <Puppet who="papa" f={f} x={1260} y={430} s={0.85} seed={24} />
      <Puppet who="vinay" f={f} x={1460} y={430} s={0.85} seed={25} />
      {[0, 1, 2].map((i) => f > 34 + i * 6 ? <div key={i} style={{ position: "absolute", left: 1130 + i * 200, top: 420, width: 40, height: 64, borderRadius: 8, background: "#111", boxShadow: `0 0 30px 10px rgba(242,183,5,${0.35 + 0.25 * Math.sin(twos(f) / 4 + i)})`, filter: cut(3, 6) }} /> : null)}
    </AbsoluteFill>
  );
};

export const Papa: React.FC<P> = ({ f }) => {
  const p1 = at("P1"), n6 = at("N06"), L6 = len("N06");
  const reply = n6 + Math.round(L6 * 0.42), whisper = n6 + Math.round(L6 * 0.8);
  const bars = [20, 40, 60, 34, 70, 50, 80, 44, 62, 30, 56, 74, 40, 24, 52, 66, 36, 20];
  const strip = f >= p1 && f < p1 + len("P1") + 14;
  return (
    <AbsoluteFill>
      <NightSky f={f} />
      <Puppet who="papa" f={f} x={160} y={320} s={1.15} talk={f >= p1 && f < p1 + len("P1")} arm={f >= p1 - 6 && f < p1 + len("P1") ? 0.7 : 0} seed={31} mood={f > reply + 10 ? "o" : "smile"} />
      {strip ? (
        <div style={{ position: "absolute", left: 470, top: 330, display: "flex", gap: 10, alignItems: "center" }}>
          {bars.map((b, i) => {
            const show = twos(f) - p1 > i * 2;
            return <div key={i} style={{ width: 16, height: show ? b * (0.7 + 0.3 * Math.sin(twos(f) / 3 + i)) : 0, background: C.haldi, borderRadius: 4, filter: cut(2, 4) }} />;
          })}
        </div>
      ) : null}
      {f > p1 + 6 ? <Tag text="GNANI · speech to text" style={{ left: 480, top: 470 }} bg={C.paper} /> : null}
      <div style={{ position: "absolute", left: 1060, top: 15 }}>
        <Chat f={f} title="Baari" sub="Papa ki chat · sirf Papa dekhte hain" w={470} h={780} msgs={[
          { at: 0, side: "in", from: "Baari", dishes: true },
          { at: p1 + len("P1") + 6, side: "out", voice: 70 },
          { at: reply, side: "in", hi: true, text: "Papa ki thali mein aloo aur meetha nahi. Aapka vote Rajma chawal par gaya." },
        ]} />
      </div>
      <Caption f={f} start={n6 + 20} text="Ghar ka niyam: no aloo, no meetha" x={420} y={130} size={36} bg={C.paper} />
      {f >= whisper ? <Stamp f={f} start={whisper} text="BAHAS: CANCEL" x={470} y={560} color={C.teal} size={50} rot={-8} /> : null}
      {f >= whisper ? <Puppet who="mummy" f={f} x={-60} y={480} s={0.75} seed={32} mood="o" /> : null}
    </AbsoluteFill>
  );
};

export const Lock: React.FC<P> = ({ f, d }) => {
  const cutAt = Math.round(d * 0.42);
  if (f >= cutAt) return <LockApp f={f - cutAt} d={d - cutAt} />;
  const push = ease(f, cutAt - 18, cutAt);
  return (
    <AbsoluteFill>
      <NightSky f={f} />
      <Caption f={f} start={2} text="9:30 pm · votes band" x={90} y={70} size={44} bg={C.gold} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + push * 2.2})`, transformOrigin: "640px 430px" }}>
        <div style={{ position: "absolute", left: 960, top: 230, transform: `translateX(${interpolate(twos(f), [24, 36], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px) rotate(6deg)` }}>
          <DishCard dish="lauki-chana-dal" name="Lauki chana dal" hi="लौकी चना दाल" f={f} />
          {f > 36 ? <Tag text="BACKUP · first in line next time" style={{ left: 0, top: 470 }} /> : null}
        </div>
        <div style={{ position: "absolute", left: 420, top: 180, transform: "rotate(-3deg)" }}>
          <DishCard dish="rajma" name="Rajma chawal" hi="राजमा चावल" f={f} />
          <Stamp f={f} start={14} text="LOCKED · 9:30" x={40} y={230} color={C.haldi} size={64} solid />
        </div>
      </div>
    </AbsoluteFill>
  );
};
const DishCard: React.FC<{ dish: string; name: string; hi: string; f: number }> = ({ dish, name, hi }) => (
  <Paper bg="#141414" style={{ position: "relative", width: 420, height: 460 }} r={26}>
    <Img src={staticFile(`app/img/dishes/${dish}.png`)} style={{ width: 360, height: 300, objectFit: "contain", margin: "20px 30px 0" }} />
    <div style={{ fontFamily: F.tight, fontWeight: 800, fontSize: 44, color: "#fff", paddingLeft: 30 }}>{name}</div>
    <div style={{ fontFamily: F.deva, fontSize: 26, color: "#bbb", paddingLeft: 30 }}>{hi}</div>
  </Paper>
);
const LockApp: React.FC<P> = ({ f }) => (
  <AbsoluteFill style={{ background: "#f6f5f1" }}>
    <Grain o={0.12} />
    <div style={{ position: "absolute", left: 160, top: interpolate(f, [0, 10], [60, 10], { extrapolateRight: "clamp", easing: smooth }) }}>
      <Phone src="lock" from={0.2} scale={0.9} style={{ left: 0, top: 0 }} />
    </div>
    <div style={{ position: "absolute", left: 700, top: 120 }}>
      <CutTitle text="Kal: Rajma chawal" size={88} f={f} start={4} color={C.ink} style={{ justifyContent: "flex-start" }} />
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 26 }}>
        {[
          ["Rajma 250 g", "Delhivery parcel, tonight", "MOCK"],
          ["Tomato 300 g", "Sunita picks it up, Sharma Kirana, 7:40", ""],
          ["4 log · 50 min", "Sunita aati hain 8:00 baje", ""],
        ].map(([a, b, t], i) => (
          <div key={a} style={{ ...land(f, 18 + i * 10, { seed: 40 + i, from: -40, dur: 6 }) }}>
            <Paper bg="#fff" style={{ position: "relative", width: 820, height: 110 }} r={18} m={3} sh={6}>
              <div style={{ padding: "18px 28px", fontFamily: F.tight, fontWeight: 700, fontSize: 38 }}>{a} {t ? <span style={{ fontFamily: F.mono, fontSize: 20, background: "#eee", padding: "4px 10px", borderRadius: 6, verticalAlign: "middle" }}>{t}</span> : null}</div>
              <div style={{ padding: "0 28px", marginTop: -12, fontFamily: F.inter, fontSize: 24, color: "#666" }}>{b}</div>
            </Paper>
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

export const Khata: React.FC<P> = ({ f }) => {
  const n8 = at("N08"), v1 = at("V1"), n9 = at("N09");
  return (
    <AbsoluteFill style={{ background: "#f6f5f1" }}>
      <Grain o={0.12} />
      <div style={{ position: "absolute", left: 160, top: 10 }}>
        <Phone src="tour" from={1.2} scale={0.9} style={{ left: 0, top: 0 }} />
      </div>
      <div style={{ position: "absolute", left: 700, top: 90 }}>
        <CutTitle text="Khata" size={100} f={f} start={4} color={C.ink} style={{ justifyContent: "flex-start" }} />
        <div style={{ opacity: fade(f, 16, 26), fontFamily: F.tight, fontWeight: 700, fontSize: 40, lineHeight: 1.25, marginTop: 10, maxWidth: 880 }}>
          UPI Reserve Pay block: <span style={{ color: C.green }}>Rs 5,000</span>.<br />Rs 400 a day. One shop. Above Rs 300 waits for Vinay.
        </div>
        <Tag text="PINE LABS · MOCK" style={{ left: 0, top: 300 }} />
      </div>
      {f >= v1 - 10 ? (
        <div style={{ position: "absolute", left: 1290, top: 300, ...land(f, v1 - 10, { seed: 51, from: -300 }) }}>
          <Puppet who="vinay" f={f} x={0} y={0} s={1.05} talk={f >= v1 && f < v1 + len("V1")} arm={f < n9 ? 1 : 0} seed={52} mood={f > n9 + 20 ? "o" : "smile"} />
        </div>
      ) : null}
      <Speech f={f} start={v1} text="Aaj 1000 tak kharch kar lo, cap bhool jao!" x={760} y={420} w={520} size={36} tail="r" />
      {f >= n9 + 10 ? (
        <div style={{ position: "absolute", left: 720, top: 600, ...land(f, n9 + 10, { seed: 53, from: -40, dur: 4 }) }}>
          <Paper bg="#fff" style={{ position: "relative", width: 560, height: 150 }} r={20} m={3}>
            <div style={{ padding: "16px 22px", fontFamily: F.inter, fontSize: 24, lineHeight: 1.35 }}><b>Baari:</b> Vinay, cap Rs 400 hi rahega. Woh ghar ne tay kiya hai, main use nahi badal sakta.</div>
          </Paper>
        </div>
      ) : null}
      <Stamp f={f} start={n9 + 30} text="CAP: RS 400" x={1060} y={560} color={C.red} size={60} />
    </AbsoluteFill>
  );
};

const RAILS: [string, string, string][] = [
  ["TELEGRAM", "REAL", "telegram.svg"],
  ["GNANI", "REAL", "gnani.svg"],
  ["PINE LABS", "MOCK", "pinelabs.svg"],
  ["DELHIVERY", "MOCK", "delhivery.png"],
];
export const Night: React.FC<P> = ({ f }) => {
  const n = at("N10"), L = len("N10");
  const stop = n + Math.round(L * 0.33), rider = n + Math.round(L * 0.45), lever = n + Math.round(L * 0.6), tell = n + Math.round(L * 0.8);
  return (
    <AbsoluteFill>
      <NightSky f={f} />
      <Caption f={f} start={4} text="Raat bhar, Baari jaagta hai" x={90} y={50} size={44} bg={C.gold} />
      {/* sleeping house */}
      <div style={{ position: "absolute", left: 1250, top: 70 }}>
        {f > stop - 20 ? <Caption f={f} start={stop - 20} text="6:30 am" x={0} y={0} size={40} bg="#fff" font={F.mono} /> : null}
      </div>
      {RAILS.map(([name, kind, logo], i) => {
        const y = 230 + i * 140;
        const isD = name === "DELHIVERY";
        const speed = [5, 7, 4, 6][i];
        let x = ((twos(f) * speed + i * 300) % 1900) - 200;
        if (isD) x = f < stop ? interpolate(twos(f), [0, stop], [-200, 900], { extrapolateRight: "clamp" }) : 900;
        return (
          <React.Fragment key={name}>
            <div style={{ position: "absolute", left: 0, right: 0, top: y + 70, height: 10, background: "#6b4a2b", filter: cut(2, 4) }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: y + 74, height: 30, backgroundImage: "repeating-linear-gradient(90deg, #8a6a45 0 12px, transparent 12px 44px)", opacity: 0.8 }} />
            <Tag text={`${name} · ${kind}`} style={{ left: 30, top: y + 10 }} bg={kind === "REAL" ? "#d6f5e4" : "#ffe9c2"} size={22} />
            <div style={{ position: "absolute", left: x, top: y + 12, filter: cut(3, 8), transform: `rotate(${wob(f, i + 60, 2)}deg)` }}>
              <div style={{ width: 170, height: 64, background: "#fff", borderRadius: 12, display: "grid", placeItems: "center" }}>
                <Img src={staticFile(`app/img/brands/${logo}`)} style={{ height: 34, maxWidth: 130, objectFit: "contain" }} />
              </div>
            </div>
            {isD ? (
              <div style={{ position: "absolute", left: 1110, top: y - 60 }}>
                <div style={{ width: 14, height: 140, background: "#333", margin: "0 auto" }} />
                <div style={{ position: "absolute", top: -10, left: -18, width: 50, height: 50, borderRadius: 25, background: f >= stop ? "#e11900" : "#3a3a3a", boxShadow: f >= stop ? "0 0 30px 8px rgba(225,25,0,.6)" : "none", filter: cut(3, 6) }} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {f >= stop ? <Stamp f={f} start={stop} text="PARCEL LATE" x={760} y={600} size={46} /> : null}
      {f >= rider ? (
        <div style={{ position: "absolute", left: interpolate(twos(f), [rider, rider + 30], [1700, 1250], { extrapolateRight: "clamp" }), top: 640, filter: cut(3, 8) }}>
          <div style={{ width: 210, height: 64, background: "#fff", borderRadius: 12, fontFamily: F.mono, fontSize: 22, display: "grid", placeItems: "center", color: C.red }}>NO RIDER</div>
        </div>
      ) : null}
      {f >= lever ? (
        <div style={{ position: "absolute", left: 1480, top: 360, ...land(f, lever, { seed: 70 }) }}>
          <Paper bg="#f2c14e" style={{ position: "relative", width: 220, height: 170 }}>
            <div style={{ height: 40, backgroundImage: `repeating-linear-gradient(90deg, ${C.red} 0 22px, #fff 22px 44px)` }} />
            <div style={{ fontFamily: F.rozha, fontSize: 30, textAlign: "center", marginTop: 14 }}>Sharma Kirana</div>
            <div style={{ fontFamily: F.mono, fontSize: 18, textAlign: "center" }}>pickup 7:40</div>
          </Paper>
        </div>
      ) : null}
      {f >= tell ? <Speech f={f} start={tell} text="Vinay: parcel late, rider nahi. Sunita kirana se le aayengi." x={560} y={120} w={640} size={30} font={F.inter} /> : null}
      <Disc f={f} x={f >= lever ? 1350 : 1900} y={f >= lever ? 520 : 900} s={0.7} />
    </AbsoluteFill>
  );
};

export const Dawn: React.FC<P> = ({ f, d }) => {
  const flip = ease(f, 6, 24);
  const day = ease(f, 14, 34);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(${C.night}, ${C.night2})` }} />
      <AbsoluteFill style={{ background: "linear-gradient(#ffe7b0, #fbd38a)", opacity: day }}><Grain o={0.2} /></AbsoluteFill>
      <MoonStick f={f} x={790} y={140} flip={flip} />
      <Calendar f={f} x={300} y={260} day="4" tear={26} label="OCT 2026" />
      <div style={{ position: "absolute", left: 1150, top: 330, opacity: fade(f, 30, 40) }}>
        <CutTitle text="Somvaar, 7:45" size={90} f={f} start={30} color={C.ink} />
      </div>
    </AbsoluteFill>
  );
};

export const Brief: React.FC<P> = ({ f }) => {
  const b1 = at("B1");
  const walkX = -twos(f) * 3;
  // play was pressed in the recording at ~40.6 s: line it up with B1
  const from = 42.5 - b1 / 30;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(#ffe7b0, #fbe3b2)" }}><Grain o={0.2} /></AbsoluteFill>
      {/* ground rows slide past */}
      <div style={{ position: "absolute", left: walkX % 1200, top: 260, display: "flex", gap: 60 }}>
        {[...Array(8)].map((_, i) => (
          <Paper key={i} bg={["#d98c5f", "#9fb7a0", "#e3c17a", "#b9a3c9"][i % 4]} style={{ position: "relative", width: 260, height: 330 - (i % 3) * 40, marginTop: (i % 3) * 40 }}>
            <div style={{ position: "absolute", left: 40, top: 50, width: 60, height: 70, background: "#4a6b8a" }} />
            <div style={{ position: "absolute", right: 40, top: 50, width: 60, height: 70, background: "#4a6b8a" }} />
          </Paper>
        ))}
      </div>
      <Paper bg="#a88a64" style={{ left: 0, top: 600, width: W, height: 220 }} r={0} m={0} />
      <Puppet who="sunita" f={f} x={170} y={300} s={1.05} seed={81} talk={f < b1} arm={f > b1 - 10 ? 0.6 : 0} />
      <Caption f={f} start={6} text="7:45 · Baari ka voice note" x={80} y={60} size={42} bg={C.gold} />
      <div style={{ position: "absolute", left: 1160, top: 10, ...land(f, 10, { seed: 82, from: -300 }) }}>
        <Phone src="tour" from={from} scale={0.9} style={{ left: 0, top: 0 }} />
      </div>
      {f > b1 ? <Tag text="Sunita tab · voice brief in Hindi" style={{ left: 600, top: 140 }} /> : null}
    </AbsoluteFill>
  );
};

export const Reply: React.FC<P> = ({ f }) => {
  const s1 = at("S1"), n12 = at("N12"), s2 = at("S2");
  const ask = n12 + Math.round(len("N12") * 0.55);
  const chip = f >= s2 + 10 ? ["Counts mil gaye", C.green, "#e6f9ef"] : f >= s1 + 10 ? ["Sirf haan", "#7A5A00", "#FFF6D6"] : null;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(#ffe7b0, #fbe3b2)" }}><Grain o={0.2} /></AbsoluteFill>
      <Puppet who="sunita" f={f} x={220} y={300} s={1.15} seed={91} talk={(f >= s1 && f < s1 + len("S1")) || (f >= n12 && f < n12 + len("N12")) || (f >= s2 && f < s2 + len("S2"))} arm={f > n12 && f < n12 + 30 ? 1 : 0} />
      {chip ? (
        <div style={{ position: "absolute", left: 600, top: 260, ...land(f, f >= s2 + 10 ? s2 + 10 : s1 + 10, { seed: 92, from: -40, dur: 4 }) }}>
          <div style={{ filter: cut(3, 8), transform: "rotate(-4deg)" }}>
            <div style={{ background: chip[2], color: chip[1], fontFamily: F.tight, fontWeight: 800, fontSize: 48, padding: "12px 30px", borderRadius: 999 }}>{chip[0]}</div>
          </div>
        </div>
      ) : null}
      {f > s2 + 10 ? <Caption f={f} start={s2 + 14} text="Pyaaz 4 · Adrak lehsun haan" x={600} y={400} size={36} font={F.mono} /> : null}
      <div style={{ position: "absolute", left: 1160, top: 15 }}>
        <Chat f={f} title="Baari" sub="Sunita ji ki chat" w={470} h={780} msgs={[
          { at: 0, side: "in", from: "Baari", voice: 330 },
          { at: s1, side: "out", voice: len("S1") },
          { at: ask, side: "in", from: "Baari", voice: 90, hi: true },
          { at: s2, side: "out", voice: len("S2") },
        ]} />
      </div>
      <Tag text="GNANI · household_reply" style={{ left: 600, top: 560 }} />
    </AbsoluteFill>
  );
};

export const Kirana: React.FC<P> = ({ f }) => {
  const k1 = at("K1"), n13 = at("N13");
  const slip = k1 + 2;
  const slipY = interpolate(twos(f), [slip, slip + 20], [0, 210], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#fbe3b2" }}><Grain o={0.2} /></AbsoluteFill>
      {/* shop front */}
      <Paper bg="#e9c46a" style={{ left: 200, top: 40, width: 1000, height: 560 }} r={4}>
        <div style={{ height: 110, backgroundImage: `repeating-linear-gradient(90deg, ${C.red} 0 60px, #fff 60px 120px)` }} />
        <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", fontFamily: F.rozha, fontSize: 56, marginLeft: -260 }}>शर्मा किराना</div>
        {[...Array(9)].map((_, i) => (
          <div key={i} style={{ position: "absolute", top: 210 + (i % 2) * 20, left: 60 + i * 100, width: 50, height: 120, background: ["#e63946", "#2a9d8f", "#f4a261", "#457b9d"][i % 4], borderRadius: 6, transform: `rotate(${wob(f, i + 100, 6)}deg)`, transformOrigin: "50% 0" }} />
        ))}
      </Paper>
      <Paper bg="#8a5a33" style={{ left: 160, top: 560, width: 1080, height: 120 }} r={6} />
      <Puppet who="sharma" f={f} x={560} y={215} s={0.95} seed={101} talk={f >= k1 && f < k1 + len("K1")} arm={f >= k1 ? 1 : 0} />
      <Puppet who="sunita" f={f} x={1260} y={330} s={1.1} seed={102} talk={f >= n13 && f < n13 + len("N13")} flip />
      {/* the UPI box and its slip */}
      <div style={{ position: "absolute", left: 340, top: 470, width: 200, height: 90, background: "#222", borderRadius: 14, filter: cut(3, 8), color: C.green, fontFamily: F.mono, fontSize: 22, display: "grid", placeItems: "center" }}>UPI</div>
      {f >= slip ? (
        <div style={{ position: "absolute", left: 330, top: 560, width: 250, height: slipY, overflow: "hidden", filter: cut(2, 6) }}>
          <div style={{ background: "#fff", padding: 12, fontFamily: F.mono, fontSize: 17, lineHeight: 1.4, height: 210 }}>
            Rs 45.00 · PAID<br />to Sharma Kirana<br />Baari · Flat 402 · Sunita<br />UPI Reserve Pay
          </div>
        </div>
      ) : null}
      {f >= slip + 22 ? <Stamp f={f} start={slip + 22} text="PAID" x={430} y={690} color={C.green} size={52} rot={8} /> : null}
      {f >= n13 + 20 ? <Caption f={f} start={n13 + 20} text="Sunita ki jeb se: Rs 0" x={1190} y={150} size={44} bg="#fff" /> : null}
    </AbsoluteFill>
  );
};

export const Eight: React.FC<P> = ({ f }) => {
  const n = at("N14"), L = len("N14");
  const table = 34, empty = n + Math.round(L * 0.62);
  if (f < table) {
    return (
      <AbsoluteFill>
        <Kitchen f={f} />
        <Steam f={f} x={1370} y={360} start={16} />
        <div style={{ position: "absolute", left: interpolate(twos(f), [0, 18], [-300, 380], { extrapolateRight: "clamp" }), top: 0 }}>
          <Puppet who="sunita" f={f} x={0} y={300} s={1.2} seed={111} arm={1} />
        </div>
        <Caption f={f} start={2} text="8:00 am · ding dong" x={80} y={60} size={44} bg={C.gold} />
      </AbsoluteFill>
    );
  }
  const g = f - table;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#7b5233" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 3px, transparent 3px 90px)" }} />
        <Grain o={0.35} />
      </AbsoluteFill>
      {[0, 1, 2, 3].map((i) => {
        const x = 160 + (i % 2) * 520, y = 40 + Math.floor(i / 2) * 380;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, ...land(g, i * 4, { seed: 120 + i, from: -80 }) }}>
            <div style={{ width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #f1f2f4, #b9bcc2 70%, #9ea2a8)", filter: cut(4, 12), display: "grid", placeItems: "center" }}>
              {f < empty ? <Img src={staticFile("app/img/dishes/rajma.png")} style={{ width: 300, height: 300, objectFit: "contain" }} /> : <div style={{ width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, #e9eaec, #c9ccd1)", boxShadow: "inset 0 0 0 6px rgba(160,90,40,.12)" }} />}
            </div>
          </div>
        );
      })}
      {/* the receipt slides up */}
      <div style={{ position: "absolute", left: 1220, top: interpolate(g, [10, 30], [900, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smooth }) }}>
        <Paper bg="#fff" style={{ position: "relative", width: 440, height: 720 }} r={18}>
          <div style={{ padding: "28px 30px", fontFamily: F.inter }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.tight, fontWeight: 800, fontSize: 26 }}><div style={{ width: 30, height: 30, borderRadius: 8, background: "#000", display: "grid", placeItems: "center" }}><div style={{ width: 12, height: 12, borderRadius: 6, background: C.haldi }} /></div>Baari</div>
            <div style={{ fontFamily: F.tight, fontWeight: 800, fontSize: 44, marginTop: 18 }}>Aaj ki thali</div>
            <div style={{ color: "#666", fontSize: 20 }}>Somvaar, 5 Oct 2026</div>
            <div style={{ fontFamily: F.tight, fontWeight: 700, fontSize: 30, marginTop: 16 }}>Rajma chawal · 4 log</div>
            <div style={{ borderTop: "3px dashed #ddd", margin: "20px 0" }} />
            <div style={{ fontFamily: F.mono, fontSize: 17, color: "#888" }}>HAR RUPAYA</div>
            {[["Baari staples hub", "106.26"], ["Sharma Kirana", "45.00"]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 21, marginTop: 10 }}><span>{a}</span><span style={{ fontFamily: F.mono }}>Rs {b}</span></div>
            ))}
            <div style={{ borderTop: "3px dashed #ddd", margin: "20px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.tight, fontWeight: 800, fontSize: 30 }}><span>Total</span><span style={{ fontFamily: F.mono }}>Rs 151.26</span></div>
            <div style={{ color: "#666", fontSize: 18, marginTop: 8 }}>Rs 400 mein se Rs 248.74 bache.</div>
            <div style={{ fontFamily: F.tight, fontWeight: 800, fontSize: 30, marginTop: 30, lineHeight: 1.15 }}>Aaj kya banega? Kisi ko poochna nahi pada.</div>
          </div>
        </Paper>
      </div>
    </AbsoluteFill>
  );
};

export const Agent: React.FC<P> = ({ f }) => (
  <AbsoluteFill style={{ background: "#ecebe6" }}>
    <Grain o={0.12} />
    <AgentPage f={f} style={{ left: 50, top: 50 }} />
    <div style={{ position: "absolute", left: 1265, top: 10, ...land(f, 30, { seed: 130, from: -300 }) }}>
      <Phone src="tour" from={54.5} scale={0.9} style={{ left: 0, top: 0 }} />
    </div>
    <Caption f={f} start={70} text="Why tab: har decision, uska rule" x={420} y={700} size={36} bg={C.gold} />
  </AbsoluteFill>
);

const CASES = [
  ["E01", "Papa votes aloo puri by voice note"], ["E02", "Nobody votes by 9:30"], ["E03", "Votes split, Vinay breaks the tie"],
  ["E04", "Block has Rs 50 left"], ["E05", "Pine Labs debit times out once"], ["E06", "Tracking returns a cut-off body"],
  ["E07", "Parcel late, no rider"], ["E08", "Sunita says haan haan"], ["E09", "Vinay asks to ignore the cap"], ["E10", "Sunita replies at 8:25"],
];
export const Evals: React.FC<P> = ({ f }) => {
  const n = at("N16"), L = len("N16");
  const steps = [["GPT-4o", 0], ["v3", 2], ["v4", 4], ["v5", 8]] as const;
  const si = Math.min(3, Math.max(0, Math.floor((f - n - L * 0.18) / (L * 0.1))));
  const red = f > n + L * 0.5;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#2f6f73" }}><Grain o={0.3} /></AbsoluteFill>
      {CASES.map(([id, t], i) => {
        const x = 60 + (i % 5) * 225, y = 90 + Math.floor(i / 5) * 300;
        const bad = red && (id === "E04" || id === "E05");
        return (
          <div key={id} style={{ position: "absolute", left: x, top: y, ...land(f, i * 3, { seed: 140 + i }) }}>
            <Paper bg={bad ? "#e8524a" : C.paper} style={{ position: "relative", width: 200, height: 260 }}>
              <div style={{ padding: 16, fontFamily: F.rozha, fontSize: 48, color: bad ? "#fff" : C.ink }}>{id}</div>
              <div style={{ padding: "0 16px", fontFamily: F.inter, fontWeight: 600, fontSize: 21, lineHeight: 1.25, color: bad ? "#fff" : "#333" }}>{t}</div>
              <div style={{ position: "absolute", bottom: 14, left: 16, fontFamily: F.mono, fontSize: 18, color: bad ? "#fff" : f > n + L * 0.48 ? C.green : "#999" }}>{bad ? "FAIL" : f > n + L * 0.48 ? "PASS" : "…"}</div>
            </Paper>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1240, top: 90 }}>
        <div style={{ fontFamily: F.mono, fontSize: 24, color: "#fff", marginBottom: 12 }}>RUN ON THE PLATFORM</div>
        <Paper bg="#141414" style={{ position: "relative", width: 420, height: 260 }} r={16}>
          <div style={{ fontFamily: F.mono, fontSize: 26, color: "#aaa", padding: "18px 24px" }}>{f > n ? steps[si][0] : "…"}</div>
          <div style={{ fontFamily: F.rozha, fontSize: 130, color: C.haldi, padding: "0 24px", lineHeight: 1 }}>{f > n ? steps[si][1] : 0}<span style={{ fontSize: 60, color: "#777" }}>/10</span></div>
        </Paper>
        {red ? (
          <div style={{ marginTop: 40, fontFamily: F.inter, fontSize: 24, color: "#fff", lineHeight: 1.4, ...land(f, Math.round(n + L * 0.5), { from: -30, seed: 150, dur: 4 }) }}>
            <b>E04</b> books the parcel before reading the balance.<br /><b>E05</b> right retry, wrong rule cited.
          </div>
        ) : null}
        <div style={{ marginTop: 40, display: "flex", gap: 14 }}>
          {[["Gnani", 6], ["Pine Labs", 4], ["Delhivery", 3]].map(([a, b], i) => (
            <div key={a as string} style={{ ...land(f, Math.round(n + L * 0.7) + i * 4, { seed: 160 + i, from: -50 }) }}>
              <Paper bg={C.gold} style={{ position: "relative", width: 128, height: 128 }} r={64}>
                <div style={{ textAlign: "center", fontFamily: F.rozha, fontSize: 54, marginTop: 10 }}>{b}</div>
                <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 15 }}>{a}</div>
              </Paper>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const End: React.FC<P> = ({ f }) => (
  <AbsoluteFill>
    <Curtain p={1 - ease(f, 0, 16)}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 130, height: 130, borderRadius: 32, background: "#000", filter: cut(5, 12), ...land(f, 14, { seed: 170 }) }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: C.haldi, margin: "38px auto" }} />
        </div>
        <CutTitle text="BAARI" size={170} f={f} start={18} color={C.gold} />
        <CutTitle text="आज किसकी बारी?" size={70} f={f} start={34} color="#fff" />
        <div style={{ opacity: fade(f, 56, 66), marginTop: 26, fontFamily: F.mono, fontSize: 30, color: "#fff" }}>baari.pages.dev · github.com/wafflebytes/baari</div>
        <div style={{ opacity: fade(f, 62, 72), marginTop: 12, fontFamily: F.inter, fontWeight: 600, fontSize: 28, color: C.gold }}>Vinay · Chaitanya · Keshav · The Ken × Pine Labs AgenticOrg, Round 3</div>
        <div style={{ opacity: fade(f, 70, 80), marginTop: 26, fontFamily: F.inter, fontSize: 19, color: "rgba(255,255,255,.85)" }}>
          Phone footage is the real app at baari.pages.dev on demo data. Paper scenes are dramatised. Telegram and Gnani are real; Pine Labs and Delhivery are mocks. Voices by ElevenLabs.
        </div>
      </div>
    </Curtain>
  </AbsoluteFill>
);

export { bounce, Kitchen };
