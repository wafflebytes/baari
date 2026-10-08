// The Chrome the helper scripts drive: $CHROME if set, else the one HyperFrames
// renders with (`hyperframes browser path`), so both see the same fonts and layout.
import { execSync } from "node:child_process";
export const chrome = () =>
  process.env.CHROME || execSync("npx hyperframes browser path", { stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1" } }).toString().trim().split("\n").pop();
