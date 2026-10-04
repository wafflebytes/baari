import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { TOTAL } from "./timeline";
import { Toons } from "./v/hose";
export const Root: React.FC = () => (
  <>
    <Composition id="BaariLaunch" component={Film} durationInFrames={TOTAL} fps={30} width={1920} height={1080} defaultProps={{ look: "paper" as const }} />
    <Composition id="BaariBare" component={Film} durationInFrames={TOTAL} fps={30} width={1920} height={1080} defaultProps={{ look: "bare" as const }} />
    <Composition id="BaariMask" component={Film} durationInFrames={TOTAL} fps={30} width={1920} height={1080} defaultProps={{ look: "mask" as const }} />
    <Composition id="V4Full" component={Toons} durationInFrames={TOTAL} fps={30} width={1920} height={1080} defaultProps={{ layer: "full" as const }} />
  </>
);
