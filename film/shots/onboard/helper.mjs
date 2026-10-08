// Recorder fix, loaded before clip.mjs:
//
//   node --import ./shots/onboard/helper.mjs scripts/clip.mjs shots/onboard/CA76.json --base http://localhost:4174
//
// Puppeteer's page.screencast (24.x) turns each frame into
// Math.round(25 * gap) video frames. While the page animates, Chrome sends a
// frame every ~30 ms, each rounds up to one 40 ms frame, and the video plays
// about 1.33x slow: CA76 came out 172 s long for 122 s of steps, so the
// taps.json times stopped matching the video. This replaces page.screencast
// with a recorder that puts every frame on a wall clock started when
// screencast() returns (the same instant clip.mjs starts its tap clock), so
// video time = taps.json time. Same output as before: VP9 webm, 25 fps, at
// the viewport's CSS size. film/scripts/ is untouched.
import { spawn } from "node:child_process";
import { Page } from "puppeteer-core";

const FPS = 25;
Page.prototype.screencast = async function ({ path }) {
  const vp = this.viewport();
  const w = vp.width, h = vp.height;
  const ff = spawn(process.env.FFMPEG || "ffmpeg", ["-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-vcodec", "mjpeg", "-i", "pipe:0", "-an",
    "-vf", `scale=${w}:${h}:flags=lanczos,format=yuv420p`, "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "6", "-row-mt", "1", "-crf", "18", "-b:v", "0", "-y", path], { stdio: ["pipe", "ignore", "inherit"] });
  const done = new Promise((r) => ff.once("close", r));
  const cdp = await this.createCDPSession();
  let last = null, written = 0, t0 = 0, stopped = false, chain = Promise.resolve();
  const put = (buf) => new Promise((r) => (ff.stdin.write(buf) ? r() : ff.stdin.once("drain", r)));
  // Fill the video up to wall time t (ms since start) with the last frame.
  const fillTo = (t) => { const n = Math.floor((t / 1000) * FPS) - written; if (!last || n <= 0) return; const b = last; written += n; chain = chain.then(async () => { for (let i = 0; i < n; i++) await put(b); }); };
  cdp.on("Page.screencastFrame", (ev) => {
    cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
    if (!t0 || stopped) return;
    fillTo(Date.now() - t0);
    last = Buffer.from(ev.data, "base64");
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: w * (vp.deviceScaleFactor || 1), maxHeight: h * (vp.deviceScaleFactor || 1), everyNthFrame: 1 });
  // First frame: a fresh screenshot, so the video never starts black.
  last = Buffer.from(await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 }).then((r) => r.data), "base64");
  t0 = Date.now();
  return {
    async stop() {
      const end = Date.now() - t0;
      stopped = true;
      await cdp.send("Page.stopScreencast").catch(() => {});
      fillTo(end); if (!written) { written = 1; chain = chain.then(() => put(last)); }
      await chain; ff.stdin.end(); await done;
      await cdp.detach().catch(() => {});
    },
  };
};
