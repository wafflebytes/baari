// Shared base for the v3 and v4 films: the two-layer split (stylised world, crisp screens),
// the soundtrack, and per-scene timing. The world layer is restyled by ffmpeg; the crisp layer
// (real app recordings and subtitles) is keyed over it untouched.
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { SCENES, LINE_AT, V, TOTAL } from "../timeline";

export type Layer = "world" | "crisp" | "full";
export const LayerCtx = React.createContext<Layer>("full");
export const useLayer = () => React.useContext(LayerCtx);
export const KEY = "#ff00ff";

export const sm = Easing.bezier(0.22, 1, 0.36, 1);
export const ez = (f: number, a: number, b: number, e = sm) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
export const spring = (f: number, a: number, d = 18) => ez(f, a, a + d, Easing.bezier(0.3, 1.5, 0.5, 1));
export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Only renders in the world layer (or full preview). */
export const World: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const l = useLayer();
  return <div style={{ position: "absolute", inset: 0, visibility: l === "crisp" ? "hidden" : "visible", ...style }}>{children}</div>;
};

/**
 * A real app screen. In the world layer it is a flat placeholder (so the stylised body sits around it);
 * in the crisp layer it is the recording, pixel sharp. Same transform in both.
 */
export const Screen: React.FC<{ src: string; from: number; rate?: number; w: number; r?: number; style?: React.CSSProperties; fill?: string }> = ({ src, from, rate = 1, w, r = 34, style, fill = "#fff" }) => {
  const l = useLayer();
  const h = w * (844 / 390);
  return (
    <div style={{ position: "absolute", width: w, height: h, borderRadius: r, overflow: "hidden", visibility: "visible", background: l === "crisp" ? "transparent" : fill, ...style }}>
      {l !== "world" && <OffthreadVideo src={staticFile(`rec/${src}.mp4`)} startFrom={Math.round(from * 30)} playbackRate={rate} muted style={{ width: w, height: h, display: "block" }} />}
    </div>
  );
};

/** Anything that must stay crisp (subtitles, the platform page). */
export const Crisp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const l = useLayer();
  if (l === "world") return null;
  return <div style={{ position: "absolute", inset: 0, visibility: "visible" }}>{children}</div>;
};

export const Root2: React.FC<{ layer: Layer; children: React.ReactNode }> = ({ layer, children }) => (
  <LayerCtx.Provider value={layer}>
    <AbsoluteFill style={{ background: layer === "crisp" ? KEY : undefined, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, visibility: layer === "crisp" ? "hidden" : "visible" }}>{children}</div>
    </AbsoluteFill>
  </LayerCtx.Provider>
);

export const SceneSeqs: React.FC<{ map: Record<string, React.FC<{ f: number; d: number }>> }> = ({ map }) => (
  <>
    {SCENES.map((sc) => {
      const C = map[sc.s];
      if (!C) return null;
      return (
        <Sequence key={sc.s} from={sc.from} durationInFrames={sc.dur} layout="none">
          <Run C={C} d={sc.dur} />
        </Sequence>
      );
    })}
  </>
);
const Run: React.FC<{ C: React.FC<{ f: number; d: number }>; d: number }> = ({ C, d }) => {
  const f = useCurrentFrame();
  return <C f={f} d={d} />;
};

/** Is a line of this speaker being spoken at absolute frame f? */
export const speaking = (f: number, who?: string) =>
  Object.entries(LINE_AT).some(([id, l]) => f >= l.at && f < l.at + l.len && (!who || (id.startsWith("N") ? "SUNITA" : V[id].who) === who));

export const NAMES: Record<string, string> = { SUNITA: "Sunita", MUMMY: "Mummy", PAPA: "Papa", VINAY: "Vinay", SHARMA: "Sharma ji", BAARI: "Baari" };
export const currentLine = (f: number) => {
  const cur = Object.entries(LINE_AT).find(([, l]) => f >= l.at && f < l.at + l.len + 6);
  if (!cur) return null;
  const [id, l] = cur;
  return { id, l, v: V[id], who: id.startsWith("N") ? "SUNITA" : V[id].who };
};

const CUES: [string, string, number, number?][] = [
  ["open", "whistle", 0, 0.5], ["family", "pop", 0, 0.5], ["reveal", "chime", 20, 0.5], ["vote", "msg", 30, 0.6],
  ["papa", "msg", 40, 0.6], ["lock", "stamp", 14, 0.8], ["night", "train", 0, 0.3], ["night", "crickets", 0, 0.25],
  ["dawn", "birds", 0, 0.5], ["brief", "msg", 20, 0.6], ["reply", "msg", 0, 0.5], ["kirana", "chime", 8, 0.7],
  ["eight", "bell", 2, 0.7], ["eight", "whistle", 16, 0.5], ["evals", "pop", 0, 0.5], ["end", "chime", 10, 0.5],
];
export const Soundtrack: React.FC<{ extra?: [string, string, number, number?][] }> = ({ extra = [] }) => (
  <>
    {Object.entries(LINE_AT).map(([id, l]) => (
      <Sequence key={id} from={l.at} durationInFrames={l.len + 30} layout="none">
        <Audio src={staticFile(`vo/f/${id}.mp3`)} />
      </Sequence>
    ))}
    {[...CUES, ...extra].map(([s, k, off, vol], i) => {
      const sc = SCENES.find((x) => x.s === s)!;
      return (
        <Sequence key={i} from={Math.max(0, sc.from + off)} durationInFrames={150} layout="none">
          <Audio src={staticFile(`sfx/${k}.mp3`)} volume={vol ?? 0.6} />
        </Sequence>
      );
    })}
    <Audio src={staticFile("sfx/music.mp3")} loop volume={(f) => {
      const sp = Object.values(LINE_AT).some((l) => f >= l.at - 4 && f < l.at + l.len + 4);
      return (sp ? 0.07 : 0.2) * interpolate(f, [TOTAL - 60, TOTAL], [1, 0], { extrapolateLeft: "clamp" });
    }} />
  </>
);
export { SCENES, TOTAL, LINE_AT, V };
