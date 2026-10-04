import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { SCENES, LINE_AT, V, TOTAL } from "./timeline";
import { Theatre, F, C, cut } from "./kit";
import * as S from "./scenes";
import { Breathe, Transitions, Finish, weave } from "./look";

const MAP: Record<string, React.FC<{ f: number; d: number }>> = {
  open: S.Open, family: S.Family, kuchbhi: S.KuchBhi, reveal: S.Reveal, vote: S.Vote, papa: S.Papa, lock: S.Lock, khata: S.Khata,
  night: S.Night, dawn: S.Dawn, brief: S.Brief, reply: S.Reply, kirana: S.Kirana, eight: S.Eight, agent: S.Agent, evals: S.Evals, end: S.End,
};
const Scene: React.FC<{ s: string; d: number }> = ({ s, d }) => {
  const f = useCurrentFrame();
  const C2 = MAP[s];
  const i = SCENES.findIndex((x) => x.s === s);
  return <Breathe i={i} f={f} d={d}><C2 f={f} d={d} /></Breathe>;
};

const NAMES: Record<string, string> = { SUNITA: "Sunita", MUMMY: "Mummy", PAPA: "Papa", VINAY: "Vinay", SHARMA: "Sharma ji", BAARI: "Baari, voice note" };
const Subs: React.FC = () => {
  const f = useCurrentFrame();
  const cur = Object.entries(LINE_AT).find(([, l]) => f >= l.at && f < l.at + l.len + 6);
  if (!cur) return null;
  const [id, l] = cur;
  const v = V[id];
  const o = interpolate(f, [l.at, l.at + 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 934, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ filter: cut(3, 6), maxWidth: 1600 }}>
        <div style={{ background: "#fbf6ea", borderRadius: 8, padding: "10px 28px", fontFamily: F.inter, fontWeight: 600, fontSize: v.sub.length > 110 ? 26 : 30, color: C.ink, lineHeight: 1.3, textAlign: "center" }}>
          <span style={{ fontFamily: F.mono, fontSize: 18, color: v.who === "SUNITA" && id.startsWith("N") ? "#2f6f73" : "#b8302c", marginRight: 14, letterSpacing: 1 }}>{(id.startsWith("N") ? "SUNITA" : NAMES[v.who].toUpperCase())}</span>
          {v.sub}
        </div>
      </div>
    </div>
  );
};

const CUES: [string, string, number, number?][] = [
  // [scene, sfx, frame offset in scene, volume]
  ["open", "whistle", 0, 0.5], ["open", "curtain", 38, 0.5], ["family", "pop", 0, 0.6], ["kuchbhi", "whoosh", 60, 0.5],
  ["reveal", "pop", 6, 0.6], ["reveal", "whoosh", 70, 0.6], ["vote", "msg", 30, 0.6], ["vote", "crickets", 0, 0.25],
  ["papa", "msg", 120, 0.6], ["lock", "stamp", 14, 0.8], ["lock", "whoosh", 120, 0.5], ["khata", "click", 40, 0.5],
  ["night", "train", 0, 0.35], ["night", "crickets", 0, 0.25], ["night", "clack", 260, 0.7], ["dawn", "birds", 0, 0.5], ["dawn", "whoosh", 6, 0.5],
  ["brief", "msg", 40, 0.6], ["reply", "msg", 0, 0.5], ["kirana", "chime", 8, 0.7], ["kirana", "stamp", 46, 0.7],
  ["eight", "bell", 2, 0.7], ["eight", "whistle", 16, 0.5], ["evals", "pop", 0, 0.5], ["end", "curtain", 0, 0.5],
];

const WIPES = ["kuchbhi", "vote", "papa", "lock", "khata", "night", "brief", "reply", "kirana", "eight", "agent", "evals"];

const Weave: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ transform: weave(f) }}>{children}</AbsoluteFill>;
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: "#b8905f", overflow: "hidden" }}>
    <Weave>
    <Theatre>
      {SCENES.map((sc) => (
        <Sequence key={sc.s} from={sc.from} durationInFrames={sc.dur} layout="none">
          <Scene s={sc.s} d={sc.dur} />
        </Sequence>
      ))}
      <Transitions />
    </Theatre>
    </Weave>
    <Finish />
    <Subs />
    {WIPES.map((w) => (
      <Sequence key={"w" + w} from={SCENES.find((x) => x.s === w)!.from - 10} durationInFrames={60} layout="none">
        <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.35} />
      </Sequence>
    ))}
    {Object.entries(LINE_AT).map(([id, l]) => (
      <Sequence key={id} from={l.at} durationInFrames={l.len + 30} layout="none">
        <Audio src={staticFile(`vo/f/${id}.mp3`)} volume={1} />
      </Sequence>
    ))}
    {CUES.map(([s, k, off, vol], i) => {
      const sc = SCENES.find((x) => x.s === s)!;
      if (k === "click") return null;
      return (
        <Sequence key={i} from={sc.from + off} durationInFrames={150} layout="none">
          <Audio src={staticFile(`sfx/${k}.mp3`)} volume={vol ?? 0.6} />
        </Sequence>
      );
    })}
    <Audio src={staticFile("sfx/music.mp3")} loop volume={(f) => {
      const speaking = Object.values(LINE_AT).some((l) => f >= l.at - 4 && f < l.at + l.len + 4);
      const end = interpolate(f, [TOTAL - 60, TOTAL], [1, 0], { extrapolateLeft: "clamp" });
      return (speaking ? 0.07 : 0.2) * end;
    }} />
  </AbsoluteFill>
);
