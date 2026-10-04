import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { TOTAL } from "./timeline";
export const Root: React.FC = () => <Composition id="BaariLaunch" component={Film} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />;
