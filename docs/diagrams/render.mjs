// Renders every diagram in src/ to PNG, light and dark:
//   node docs/diagrams/render.mjs [name ...]
// Writes docs/diagrams/<name>.png and <name>-dark.png at 1.5x. Needs Playwright
// (PLAYWRIGHT_MODULE overrides where it's imported from).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const mod = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(mod);
const want = process.argv.slice(2);
const files = fs.readdirSync(path.join(here, "src")).filter((f) => f.endsWith(".html") && (!want.length || want.some((w) => f.includes(w))));
const browser = await chromium.launch();
for (const f of files) {
  const name = f.replace(/\.html$/, "");
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ deviceScaleFactor: 1.5, viewport: { width: 1700, height: 1200 }, colorScheme: theme });
    page.on("pageerror", (e) => console.error(f, theme, e.message));
    await page.goto(pathToFileURL(path.join(here, "src", f)).href + (theme === "dark" ? "?theme=dark" : ""));
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await page.waitForTimeout(150);
    const out = path.join(here, `${name}${theme === "dark" ? "-dark" : ""}.png`);
    await page.locator(".canvas").screenshot({ path: out });
    console.log("wrote", path.relative(process.cwd(), out));
    await page.close();
  }
}
await browser.close();
