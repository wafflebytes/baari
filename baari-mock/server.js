// Server entry for Vercel and local runs (node server.js)., reads .env from this folder.
const fs = require("fs");
const http = require("http");

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trim().startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const { nodeHandler } = require("./lib/app");
const port = Number(process.env.PORT || 3939);
http.createServer(nodeHandler).listen(port, () => console.log(`baari-rails on http://localhost:${port}`));
