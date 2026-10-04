import React from "react";
import { wob, twos } from "./kit";
import { Canvas } from "./anidoodle/host";
import { drawPuppet, type Who } from "./anidoodle/theatre";

const M = 50;
/** A gouache paper puppet (anidoodle paperCraft pieces). arm: 0 down, 1 raised. */
export const Puppet: React.FC<{ who: Who; f: number; x: number; y: number; s?: number; arm?: number; talk?: boolean; flip?: boolean; seed?: number; prop?: React.ReactNode; mood?: "smile" | "flat" | "o" }> = ({ who, f, x, y, s = 1, arm = 0, talk, flip, seed = 1, prop, mood = "smile" }) => {
  const g = twos(f);
  const open = !!talk && Math.floor(g / 4) % 2 === 0;
  const a = arm ? Math.round((arm * (1 + Math.sin(g / 3) * 0.16)) * 20) / 20 : 0;
  const bob = talk ? Math.round(Math.sin(g / 2.5) * 2) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 240 * s, height: 420 * s, transform: `rotate(${wob(f, seed, 2)}deg) scaleX(${flip ? -1 : 1})`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "absolute", left: -M * s, top: -M * s, width: (240 + 2 * M), height: (420 + 2 * M), transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <Canvas w={240 + 2 * M} h={420 + 2 * M} k={`${who}${a}${open}${bob}${mood}${seed}`} draw={(c, e) => drawPuppet(c, e, { who, arm: a, open, bob, mood, seed }, M)} />
      </div>
      {prop}
    </div>
  );
};
