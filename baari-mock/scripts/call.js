// Call a deployed connector tool or admin route from the terminal.
//   node scripts/call.js <connector> <tool> '<json args>'
//   node scripts/call.js <connector> list
//   node scripts/call.js admin /admin/scenario '{"endpoint":"...","scenario":"timeout","times":1}'
const fs = require("fs");
const path = require("path");

const text = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
function env(key) {
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && line.slice(0, i).trim() === key) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const BASE = process.env.BASE || "https://baari-rails.vercel.app";
const [conn, tool, args] = process.argv.slice(2);

(async () => {
  if (conn === "admin") {
    const r = await fetch(`${BASE}${tool}?key=${env("ADMIN_KEY")}`, {
      method: args ? "POST" : "GET",
      headers: { "content-type": "application/json" },
      body: args || undefined,
    });
    console.log(await r.text());
    return;
  }
  const list = tool === "list";
  const r = await fetch(`${BASE}/mcp/${conn}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env("MCP_API_KEY")}` },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: list ? "tools/list" : "tools/call",
      params: list ? {} : { name: tool, arguments: JSON.parse(args || "{}") },
    }),
  });
  const j = await r.json();
  if (j.result && j.result.content) console.log(j.result.content[0].text);
  else console.log(JSON.stringify(j.result || j).slice(0, 3000));
})();
