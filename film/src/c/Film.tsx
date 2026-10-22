// The 60 s case study cut of the paper trailer, for Pine Labs to show what teams build on AgenticOrg:
// the same voice, music and paper scenes, shorter, with the Baari and Pine Labs marks on every frame.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { SCENES, LINE_AT, V, TOTAL } from "./timeline";
import { Subs, Logos } from "./look";
import * as A from "./scenesA";
import * as Bs from "./scenesB";
import * as Cs from "./scenesC";

type P = { f: number; d: number };
const MAP: Record<string, React.FC<P>> = {
  hook: A.Hook, mummy: A.Mummy, baari: A.Baari, vote: A.Vote,
  call: Bs.Call, pakka: Bs.Pakka, money: Bs.Money,
  brief: Cs.Brief, lunch: Cs.Lunch, end: Cs.End,
};
// Scenes on a night ground, where the marks turn cream
const DARK = ["call"];
// Transitions: every cut is a fresh sheet of paper torn from the pad and slid over the last one on
// the beat, on twos. Its leading edge is ragged, with the sheet's white core showing along the tear
// and a soft shadow under it; the tear flattens as the sheet lands, so the settled frame is clean.
// The outgoing scene keeps playing underneath. Directions rotate so it never feels mechanical.
// The camera breathes inside a scene: a 3% push over its length toward a different corner.
export const SLIDE = 8;
const ORIGIN = ["50% 45%", "40% 50%", "60% 40%", "45% 55%", "55% 45%"];
const DIRS: [number, number][] = [[1, 0], [0, 1], [-1, 0], [1, 0], [0, -1], [-1, 0]];
const W = 1920, H = 1080;
const rnd = (n: number) => { const x = Math.sin(n * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };
/** The sheet's outline with its leading side torn: `deep` px into the sheet at most, `seed` picks the tear. */
const torn = (dx: number, dy: number, deep: number, seed: number) => {
  const along = dx !== 0 ? H : W, n = Math.ceil(along / 26);
  const edge = Array.from({ length: n + 1 }, (_, i) => [Math.min(along, i * 26 + (i && i < n ? (rnd(seed + i) - 0.5) * 14 : 0)), deep * (0.25 + 0.75 * rnd(seed * 7 + i))]);
  const pt = ([t, d]: number[]) => (dx === 1 ? [d, t] : dx === -1 ? [W - d, t] : dy === 1 ? [t, d] : [t, H - d]);
  const far: number[][] = dx === 1 ? [[W, H], [W, 0]] : dx === -1 ? [[0, H], [0, 0]] : dy === 1 ? [[W, H], [0, H]] : [[W, 0], [0, 0]];
  const pts = [...edge.map(pt), ...far];
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
};
const Scene: React.FC<{ s: string; d: number; i: number }> = ({ s, d, i }) => {
  const f = useCurrentFrame();
  const C = MAP[s];
  const p = interpolate(f, [0, d], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
  const k = i === 0 ? 1 : Math.min(1, (f - (f % 2)) / SLIDE);
  const e = 1 - Math.pow(1 - k, 3);
  const [dx, dy] = DIRS[i % DIRS.length];
  const sliding = k < 1;
  const tear = Math.min(1, (1 - e) * 4);
  const inner = (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.03 * p})`, transformOrigin: ORIGIN[i % ORIGIN.length] }}>
      <C f={f} d={d} />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ transform: `translate(${(1 - e) * dx * W}px, ${(1 - e) * dy * H}px) rotate(${(1 - e) * dx * 1.5}deg)`, filter: sliding ? `drop-shadow(${-dx * 22}px ${-dy * 22}px 26px rgba(40,20,0,.38))` : undefined }}>
      {/* one tree whether sliding or not, so the scene (and its videos) never remount */}
      <AbsoluteFill style={{ background: "#FBFAF6", clipPath: sliding ? torn(dx, dy, 22 * tear, i * 13 + 1) : undefined, display: sliding ? undefined : "none" }} />
      <AbsoluteFill style={{ clipPath: sliding ? torn(dx, dy, 31 * tear, i * 13 + 5) : undefined, overflow: "hidden" }}>{inner}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// [scene, sfx in public/sfx, frame in scene, volume]
const CUES: [string, string, number, number][] = [
  ["vote", "crickets", 0, 0.2], ["call", "msg", 0, 0.5],
  ["pakka", "stamp", 0, 0.8], ["money", "chime", 6, 0.6],
  ["brief", "birds", 0, 0.4], ["brief", "msg", 10, 0.6], ["lunch", "bell", 4, 0.5],
];

// Each scenes file may export SOUNDS: [scene, sfx, frame in scene, volume][], timed off at()/len().
const SOUNDS: [string, string, number, number][] = [...((A as any).SOUNDS ?? []), ...((Bs as any).SOUNDS ?? []), ...((Cs as any).SOUNDS ?? [])];

const Marks: React.FC = () => {
  const f = useCurrentFrame();
  const sc = SCENES.find((x) => f >= x.from && f < x.from + x.dur);
  return <Logos dark={!!sc && DARK.includes(sc.s)} />;
};

export const CaseStudy: React.FC = () => {
  const said = Object.entries(LINE_AT);
  return (
    <AbsoluteFill style={{ background: "#F6F4EF", overflow: "hidden" }}>
      {SCENES.map((sc, i) => (
        <Sequence key={sc.s} from={sc.from} durationInFrames={sc.dur + (i < SCENES.length - 1 ? SLIDE : 0)} layout="none">
          <Scene s={sc.s} d={sc.dur} i={i} />
        </Sequence>
      ))}
      <Marks />
      <Subs lines={LINE_AT} />
      {said.map(([id, l]) => (V[id].src ? (
        <Sequence key={id} from={l.at} durationInFrames={l.len + 20} layout="none">
          <Audio src={staticFile(V[id].src!)} volume={1} />
        </Sequence>
      ) : null))}
      {SCENES.slice(1).map((sc, i) => (
        <Sequence key={`cut-${i}`} from={sc.from} durationInFrames={30} layout="none">
          <Audio src={staticFile(`sfx/${i % 2 ? "paper-slide" : "paper-flip"}.mp3`)} volume={0.22} />
        </Sequence>
      ))}
      {[...CUES, ...SOUNDS].map(([s, k, off, vol], i) => {
        const sc = SCENES.find((x) => x.s === s);
        if (!sc) return null;
        return (
          <Sequence key={i} from={sc.from + off} durationInFrames={Math.min(150, sc.dur - off + 20)} layout="none">
            <Audio src={staticFile(`sfx/${k}.mp3`)} volume={vol} />
          </Sequence>
        );
      })}
      <Audio src={staticFile("sfx/music.mp3")} loop volume={(f) => {
        const speaking = said.some(([, l]) => f >= l.at - 4 && f < l.at + l.len + 4);
        const end = interpolate(f, [TOTAL - 45, TOTAL], [1, 0], { extrapolateLeft: "clamp" });
        return (speaking ? 0.07 : 0.22) * end;
      }} />
    </AbsoluteFill>
  );
};
