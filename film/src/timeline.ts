import vo from "./vo.json";

export const FPS = 30;
type VO = Record<string, { dur: number; who: string; sub: string }>;
export const V = vo as unknown as VO;

type Beat = { s: string; lines: string[]; pre?: number; gap?: number; post?: number; min?: number };

// Each scene owns its lines. pre = frames before the first line, post = after the last.
const BEATS: Beat[] = [
  { s: "open", pre: 52, lines: ["N01", "N02"], gap: 8, post: 4 },
  { s: "family", pre: 4, lines: ["C1", "C2", "C3"], gap: 6, post: 8 },
  { s: "kuchbhi", pre: 4, lines: ["N03"], post: 12 },
  { s: "reveal", pre: 6, lines: ["N04"], post: 24 },
  { s: "vote", pre: 8, lines: ["N05"], post: 8 },
  { s: "papa", pre: 6, lines: ["P1", "N06"], gap: 10, post: 10 },
  { s: "lock", pre: 14, lines: ["N07"], post: 16 },
  { s: "khata", pre: 10, lines: ["N08", "V1", "N09"], gap: 10, post: 12 },
  { s: "night", pre: 10, lines: ["N10"], post: 30 },
  { s: "dawn", lines: [], min: 56 },
  { s: "brief", pre: 6, lines: ["N11", "B1"], gap: 10, post: 6 },
  { s: "reply", pre: 4, lines: ["S1", "N12", "S2"], gap: 8, post: 10 },
  { s: "kirana", pre: 10, lines: ["K1", "N13"], gap: 8, post: 10 },
  { s: "eight", pre: 30, lines: ["N14"], post: 16 },
  { s: "agent", pre: 6, lines: ["N15"], post: 24 },
  { s: "evals", pre: 6, lines: ["N16"], post: 24 },
  { s: "end", pre: 10, lines: ["N17"], post: 110 },
];

export type Scene = { s: string; from: number; dur: number; lines: { id: string; at: number; len: number }[] };
export const SCENES: Scene[] = [];
export const LINE_AT: Record<string, { at: number; len: number }> = {};
let t = 0;
for (const b of BEATS) {
  const from = t;
  let c = from + (b.pre ?? 0);
  const lines = b.lines.map((id, i) => {
    const len = Math.ceil(V[id].dur * FPS);
    const at = c;
    c += len + (i < b.lines.length - 1 ? b.gap ?? 8 : 0);
    LINE_AT[id] = { at, len };
    return { id, at: at - from, len };
  });
  c += b.post ?? 0;
  const dur = Math.max(c - from, b.min ?? 0);
  SCENES.push({ s: b.s, from, dur, lines });
  t = from + dur;
}
export const TOTAL = t;
export const sceneOf = (s: string) => SCENES.find((x) => x.s === s)!;
/** Frame (relative to its scene) at which a line starts. */
export const at = (id: string) => {
  const sc = SCENES.find((x) => x.lines.some((l) => l.id === id))!;
  return sc.lines.find((l) => l.id === id)!.at;
};
export const len = (id: string) => LINE_AT[id].len;
