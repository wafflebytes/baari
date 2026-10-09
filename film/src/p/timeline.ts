// The paper cut trailer's clock. One voice track lays the film out, as in the Round 3 film:
// each scene owns its lines, and a scene lasts as long as its lines plus its air.
import vo from "./vo.json";

export const FPS = 30;
export type Line = { src: string | null; dur: number; who: string; sub: string };
export const V = vo as unknown as Record<string, Line>;

// A string is one line; an array is a group said almost together (the four "Haan!"), 5 frames apart.
type Beat = { s: string; lines: (string | string[])[]; pre?: number; gap?: number; post?: number; min?: number };

// Scenes cut to keep the film under 90 s once the real voice lengths are in.
export const DROP: string[] = ["japan", "count"];

const BEATS: Beat[] = [
  { s: "hook", pre: 4, lines: ["RN01"], post: 4 },
  { s: "mummy", pre: 2, lines: ["RC1", "RC2", "RC3", "K03"], gap: 4, post: 6 },
  { s: "baari", pre: 2, lines: ["E02"], post: 8 },
  { s: "flip", pre: 0, lines: [], min: 66 },
  { s: "rules", pre: 4, lines: ["E03"], post: 6 },
  { s: "vote", pre: 4, lines: ["E04"], post: 2 },
  { s: "call", pre: 2, lines: ["L10a", "L10b", "L10c", "L10d"], gap: 3, post: 6 },
  { s: "japan", pre: 2, lines: ["E05"], post: 6 },
  { s: "pakka", pre: 4, lines: ["L11", ["L11b-papa", "L11b-behen", "L11b-mummy", "L11b-vinay"], "L12"], gap: 4, post: 8 },
  { s: "soak", pre: 4, lines: ["E06", "L14"], gap: 4, post: 10 },
  { s: "money", pre: 4, lines: ["E07", "L15"], gap: 6, post: 6 },
  { s: "night", pre: 4, lines: ["E08"], post: 10 },
  { s: "brief", pre: 6, lines: ["E09", "E09b"], gap: 6, post: 4 },
  { s: "count", pre: 2, lines: ["E10"], post: 8 },
  { s: "lunch", pre: 4, lines: ["E11", "L19"], gap: 8, post: 12 },
  { s: "end", pre: 12, lines: ["L20"], post: 78 },
].filter((b) => !DROP.includes(b.s));

export type Said = { id: string; at: number; len: number };
export type Scene = { s: string; from: number; dur: number; lines: Said[] };
export const SCENES: Scene[] = [];
/** Every line's absolute start and length, in frames. */
export const LINE_AT: Record<string, { at: number; len: number }> = {};
const flen = (id: string) => Math.ceil(V[id].dur * FPS);

// The music (public/sfx/music.mp3, the Round 3 bed) is 89.1 BPM with its first beat at 0.6 s and
// loops every 22.0 s. Cuts snap to the nearest beat, never earlier than 3 frames after the
// previous scene's last line ends, so pictures change on the music.
export const BEAT = (30 * 60) / 89.1;
const beatFrames: number[] = [];
for (let loop = 0; loop < 6; loop++) for (let k = 0; 0.6 * 30 + k * BEAT < 660; k++) beatFrames.push(Math.round(loop * 660 + 0.6 * 30 + k * BEAT));
const snap = (t: number, floor: number) => {
  let best = t;
  for (const b of beatFrames) if (b >= floor && Math.abs(b - t) < Math.abs(best - t) + (best === t ? BEAT : 0)) best = b;
  return Math.abs(best - t) <= BEAT / 2 + 1 ? best : t;
};

let t = 0;
let lastEnd = 0;
for (const b of BEATS) {
  const from = SCENES.length ? snap(t, lastEnd + 3) : 0;
  if (SCENES.length) SCENES[SCENES.length - 1].dur = from - SCENES[SCENES.length - 1].from;
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
  if (lines.length) lastEnd = Math.max(...lines.map((l) => from + l.at + l.len));
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
