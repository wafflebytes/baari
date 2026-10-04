import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "BaariLaunch" });
for (const f of frames) { try { await renderStill({ composition, serveUrl, frame: f, output: `out/stills/${String(f).padStart(5, "0")}.jpg`, imageFormat: "jpeg", jpegQuality: 70, scale: 0.5 }); } catch (e) { console.log("FAIL", f, String(e.message).slice(0, 200)); } }
console.log("done");
