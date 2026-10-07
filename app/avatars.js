// Faces. Every person in the house is a Personas avatar (by Draftbit, CC BY
// 4.0, drawn through DiceBear and bundled in vendor/personas.js so it works
// offline). A look is a handful of plain choices: skin, hair, hair colour,
// beard, eyes, mouth, clothes. The tint behind the face stays a CSS class.
import { createAvatar, personas } from "./vendor/personas.js";

export const PARTS = {
  skin: ["eeb4a4", "e7a391", "e5a07e", "d78774", "b16a5b", "92594b", "623d36"],
  hair: ["shortCombover", "fade", "buzzcut", "curly", "sideShave", "bald", "balding", "long", "extraLong", "straightBun", "curlyBun", "bunUndercut", "bobCut", "bobBangs", "pigtails", "curlyHighTop", "shortComboverChops", "mohawk", "cap", "beanie"],
  hairColor: ["362c47", "6c4545", "dee1f5", "f29c65", "e15c66", "e16381", "f27d65"],
  beard: ["none", "shadow", "beardMustache", "walrus", "goatee", "pyramid", "soulPatch"],
  eyes: ["open", "happy", "glasses", "wink", "sleep", "sunglasses"],
  mouth: ["smile", "bigSmile", "smirk", "lips", "surprise", "frown"],
  cloth: ["456dff", "54d7c7", "7555ca", "6dbb58", "e24553", "f3b63a", "f55d81"],
  body: ["rounded", "squared", "small", "checkered"],
};
export const TINTS = ["sand", "rose", "sky", "mint", "clay", "stone"];

const L = (skin, hair, hairColor, beard, eyes, mouth, cloth, body = "rounded") => ({ skin, hair, hairColor, beard, eyes, mouth, cloth, body });
// The Sharmas, and a sensible first face for everyone onboarding can add.
export const LOOKS = {
  Vinay: L("b16a5b", "shortCombover", "362c47", "shadow", "open", "smile", "456dff"),
  Mummy: L("d78774", "straightBun", "362c47", "none", "happy", "smile", "f55d81"),
  Papa: L("b16a5b", "balding", "dee1f5", "walrus", "glasses", "smile", "6dbb58", "squared"),
  Sunita: L("92594b", "curlyBun", "362c47", "none", "happy", "bigSmile", "f3b63a"),
  main: L("b16a5b", "shortCombover", "362c47", "shadow", "open", "smile", "456dff"),
  mummy: L("d78774", "straightBun", "362c47", "none", "happy", "smile", "f55d81"),
  papa: L("b16a5b", "balding", "dee1f5", "walrus", "glasses", "smile", "6dbb58", "squared"),
  didi: L("e5a07e", "long", "362c47", "none", "happy", "lips", "7555ca"),
  bhaiya: L("d78774", "fade", "362c47", "shadow", "open", "smirk", "54d7c7"),
  dadi: L("b16a5b", "straightBun", "dee1f5", "none", "glasses", "smile", "e24553"),
  dadaji: L("92594b", "bald", "dee1f5", "walrus", "glasses", "smile", "f3b63a", "squared"),
  beta: L("d78774", "curly", "362c47", "none", "open", "bigSmile", "456dff", "small"),
  beti: L("e5a07e", "pigtails", "362c47", "none", "happy", "bigSmile", "f55d81", "small"),
  bachche: L("e7a391", "bobBangs", "6c4545", "none", "happy", "bigSmile", "6dbb58", "small"),
};

// Anyone else gets a stable face from their name, so it never flickers
// between redraws.
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function lookFor(seed) {
  if (LOOKS[seed]) return { ...LOOKS[seed] };
  const h = hash(seed), p = (k, n) => PARTS[k][(h >>> n) % PARTS[k].length];
  return { skin: PARTS.skin[1 + (h % 5)], hair: p("hair", 3), hairColor: PARTS.hairColor[(h >>> 7) % 2], beard: (h >>> 9) % 3 ? "none" : p("beard", 11), eyes: p("eyes", 13).replace("sunglasses", "open"), mouth: ["smile", "bigSmile", "smirk"][(h >>> 15) % 3], cloth: p("cloth", 17), body: "rounded" };
}
export function shuffleLook() {
  const r = (k) => PARTS[k][Math.floor(Math.random() * PARTS[k].length)];
  return { skin: r("skin"), hair: r("hair"), hairColor: Math.random() < 0.7 ? PARTS.hairColor[Math.floor(Math.random() * 3)] : r("hairColor"), beard: Math.random() < 0.6 ? "none" : r("beard"), eyes: r("eyes"), mouth: ["smile", "bigSmile", "smirk", "lips"][Math.floor(Math.random() * 4)], cloth: r("cloth"), body: r("body") };
}

const cache = new Map();
export function faceUri(look) {
  const k = JSON.stringify(look);
  if (cache.has(k)) return cache.get(k);
  const uri = createAvatar(personas, {
    seed: "baari",
    skinColor: [look.skin], hair: [look.hair], hairColor: [look.hairColor],
    facialHair: look.beard && look.beard !== "none" ? [look.beard] : ["shadow"], facialHairProbability: look.beard && look.beard !== "none" ? 100 : 0,
    eyes: [look.eyes], mouth: [look.mouth], clothingColor: [look.cloth], body: [look.body || "rounded"], nose: ["mediumRound"],
  }).toDataUri();
  cache.set(k, uri);
  return uri;
}
// The face as markup: an image on its tint. cls carries the size (xs, sm,
// lg, xl...), exactly like the old emoji faces, so every caller still fits.
export function faceHtml(look, tint = "sand", cls = "") {
  return `<span class="av pf t-${tint} ${cls}" aria-hidden="true"><img src="${faceUri(look)}" alt="" decoding="async"></span>`;
}
