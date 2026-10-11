// The case study cut's clock (a copy of p/timeline.ts). One voice track lays the film out, as in the Round 3 film:
// each scene owns its lines, and a scene lasts as long as its lines plus its air.
import vo from "./vo.json";

export const FPS = 30;
export type Line = { src: string | null; dur: number; who: string; sub: string };
export const V = vo as unknown as Record<string, Line>;

// A string is one line; an array is a group said almost together (the four "Haan!"), 5 frames apart.
type Beat = { s: string; lines: (string | string[])[]; pre?: number; gap?: number; post?: number; min?: number };

// The 60 s case study cut: the trailer's beats, shortened. "vote" has no line, it is the app and
// the two dishes on the music. "end" is the card, with Baari's last line said over it; it fills
// to CAP, so the whole film is under a minute.
export const CAP = 59 * 30;

const BEATS: Beat[] = [
  { s: "hook", pre: 4, lines: ["RN01c"], post: 2 },
  { s: "mummy", pre: 2, lines: ["RC1", "RC2", "RC3", "K03"], gap: 3, post: 4 },
  { s: "baari", pre: 2, lines: ["C02"], post: 14 },
  { s: "vote", pre: 0, lines: [], min: 52 },
  { s: "call", pre: 2, lines: ["L10a", "L10b", "L10c", "L10d"], gap: 3, post: 4 },
  { s: "pakka", pre: 4, lines: ["L11", ["L11b-papa", "L11b-behen", "L11b-mummy", "L11b-vinay"], "L12"], gap: 4, post: 6 },
  { s: "money", pre: 4, lines: ["C07", "L15"], gap: 6, post: 4 },
  { s: "brief", pre: 6, lines: ["C09"], post: 8 },
  { s: "lunch", pre: 4, lines: ["E11", "L19"], gap: 8, post: 6 },
  { s: "end", pre: 6, lines: ["L20"], post: 0 },
];

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
// the end card holds to the cap
SCENES[SCENES.length - 1].dur = CAP - SCENES[SCENES.length - 1].from;
export const TOTAL = CAP;

/** Frame, relative to its scene, at which a line starts. */
export const at = (id: string) => {
  const sc = SCENES.find((x) => x.lines.some((l) => l.id === id))!;
  return sc.lines.find((l) => l.id === id)!.at;
};
export const len = (id: string) => LINE_AT[id].len;
/** True while the line is being said (scene-relative frame). */
export const saying = (f: number, id: string) => f >= at(id) && f < at(id) + len(id);
