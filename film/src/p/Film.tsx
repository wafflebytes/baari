// The paper cut trailer: one voice track (Sunita, in Gnani), the Round 3 music bed, paper scenes.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { SCENES, LINE_AT, V, TOTAL } from "./timeline";
import { Subs } from "./look";
import * as A from "./scenesA";
import * as Bs from "./scenesB";
import * as Cs from "./scenesC";

type P = { f: number; d: number };
const MAP: Record<string, React.FC<P>> = {
  open: A.Open, mummy: A.Mummy, baari: A.Baari, rules: A.Rules, vote: A.Vote,
  call: Bs.Call, japan: Bs.Japan, pakka: Bs.Pakka, soak: Bs.Soak, money: Bs.Money,
  night: Cs.Night, brief: Cs.Brief, count: Cs.Count, lunch: Cs.Lunch, end: Cs.End,
};
// The camera breathes: every scene pushes in 3% over its length, toward a different corner,
// so no frame is ever dead still (the Round 3 film's Breathe).
const ORIGIN = ["50% 45%", "40% 50%", "60% 40%", "45% 55%", "55% 45%"];
const Scene: React.FC<{ s: string; d: number; i: number }> = ({ s, d, i }) => {
  const f = useCurrentFrame();
  const C = MAP[s];
  const p = interpolate(f, [0, d], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.03 * p})`, transformOrigin: ORIGIN[i % ORIGIN.length] }}>
      <C f={f} d={d} />
    </AbsoluteFill>
  );
};

// [scene, sfx in public/sfx, frame in scene, volume]
const CUES: [string, string, number, number][] = [
  ["open", "pop", 14, 0.5], ["baari", "stamp", 30, 0.7], ["vote", "crickets", 0, 0.2], ["call", "msg", 0, 0.5],
  ["pakka", "stamp", 0, 0.8], ["soak", "pop", 4, 0.5], ["money", "chime", 6, 0.6], ["night", "crickets", 0, 0.3],
  ["brief", "birds", 0, 0.4], ["brief", "msg", 10, 0.6], ["count", "pop", 4, 0.5], ["lunch", "bell", 4, 0.5], ["end", "stamp", 20, 0.8],
];

// Each scenes file may export SOUNDS: [scene, sfx, frame in scene, volume][], timed off at()/len().
const SOUNDS: [string, string, number, number][] = [...((A as any).SOUNDS ?? []), ...((Bs as any).SOUNDS ?? []), ...((Cs as any).SOUNDS ?? [])];

export const PaperTrailer: React.FC = () => {
  const said = Object.entries(LINE_AT);
  return (
    <AbsoluteFill style={{ background: "#F6F4EF", overflow: "hidden" }}>
      {SCENES.map((sc, i) => (
        <Sequence key={sc.s} from={sc.from} durationInFrames={sc.dur} layout="none">
          <Scene s={sc.s} d={sc.dur} i={i} />
        </Sequence>
      ))}
      <Subs lines={LINE_AT} />
      {said.map(([id, l]) => (V[id].src ? (
        <Sequence key={id} from={l.at} durationInFrames={l.len + 20} layout="none">
          <Audio src={staticFile(V[id].src!)} volume={1} />
        </Sequence>
      ) : null))}
      {[...CUES, ...SOUNDS].map(([s, k, off, vol], i) => {
        const sc = SCENES.find((x) => x.s === s)!;
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
