// The paper cut trailer's clock. One voice track lays the film out, as in the Round 3 film:
// each scene owns its lines, and a scene lasts as long as its lines plus its air.
import vo from "./vo.json";

export const FPS = 30;
export type Line = { src: string | null; dur: number; who: string; sub: string };
export const V = vo as unknown as Record<string, Line>;

// A string is one line; an array is a group said almost together (the four "Haan!"), 5 frames apart.
type Beat = { s: string; lines: (string | string[])[]; pre?: number; gap?: number; post?: number; min?: number };

const BEATS: Beat[] = [
  { s: "open", pre: 14, lines: ["N01"], post: 8 },
  { s: "mummy", pre: 4, lines: ["N02"], post: 10 },
  { s: "baari", pre: 4, lines: ["N03"], post: 16 },
  { s: "rules", pre: 6, lines: ["N04"], post: 8 },
  { s: "vote", pre: 6, lines: ["N05"], post: 4 },
  { s: "call", pre: 2, lines: ["L10a", "L10b", "L10c", "L10d"], gap: 3, post: 8 },
  { s: "japan", pre: 2, lines: ["N06"], post: 6 },
  { s: "pakka", pre: 4, lines: ["L11", ["L11b-papa", "L11b-behen", "L11b-mummy", "L11b-vinay"], "L12"], gap: 4, post: 14 },
  { s: "soak", pre: 4, lines: ["N07", "L14"], gap: 4, post: 12 },
  { s: "money", pre: 4, lines: ["N08", "L15"], gap: 8, post: 10 },
  { s: "night", pre: 8, lines: ["N09"], post: 14 },
  { s: "brief", pre: 6, lines: ["N10", "N10b"], gap: 8, post: 6 },
  { s: "count", pre: 2, lines: ["N11"], post: 10 },
  { s: "lunch", pre: 4, lines: ["N12", "L19"], gap: 8, post: 14 },
  { s: "end", pre: 20, lines: ["L20"], post: 96 },
];

export type Said = { id: string; at: number; len: number };
export type Scene = { s: string; from: number; dur: number; lines: Said[] };
export const SCENES: Scene[] = [];
/** Every line's absolute start and length, in frames. */
export const LINE_AT: Record<string, { at: number; len: number }> = {};
const flen = (id: string) => Math.ceil(V[id].dur * FPS);

let t = 0;
for (const b of BEATS) {
  const from = t;
  let c = from + (b.pre ?? 0);
  const lines: Said[] = [];
  b.lines.forEach((item, i) => {
    const group = Array.isArray(item) ? item : [item];
    let end = c;
    group.forEach((id, k) => {
      const at = c + k * 5;
      LINE_AT[id] = { at, len: flen(id) };
      lines.push({ id, at: at - from, len: flen(id) });
      end = Math.max(end, at + flen(id));
    });
    c = end + (i < b.lines.length - 1 ? b.gap ?? 8 : 0);
  });
  c += b.post ?? 0;
  const dur = Math.max(c - from, b.min ?? 0);
  SCENES.push({ s: b.s, from, dur, lines });
  t = from + dur;
}
export const TOTAL = t;

/** Frame, relative to its scene, at which a line starts. */
export const at = (id: string) => {
  const sc = SCENES.find((x) => x.lines.some((l) => l.id === id))!;
  return sc.lines.find((l) => l.id === id)!.at;
};
export const len = (id: string) => LINE_AT[id].len;
/** True while the line is being said (scene-relative frame). */
export const saying = (f: number, id: string) => f >= at(id) && f < at(id) + len(id);
