// The 15 retrieval checks (ENGINEERING 5.4): each query must return its
// chunk in the top 5, from our file. Also counts foreign chunks.
const fs = require("fs");
const path = require("path");
const { api } = require("./ao_client");

(async () => {
  const checks = JSON.parse(fs.readFileSync(path.join(__dirname, "../retrieval_checks.json"), "utf8"));
  const rows = [];
  for (const c of checks) {
    const r = await api("POST", "/knowledge/search", { query: c.q, top_k: 5 });
    const results = r.results || r.chunks || r.items || [];
    const hitAt = results.findIndex((x) => (x.document_name || "").startsWith("BAARI_") && (x.chunk_text || "").includes(c.expect));
    const foreign = results.filter((x) => !(x.document_name || "").startsWith("BAARI_")).length;
    rows.push({ query: c.q, pass: hitAt >= 0, rank: hitAt + 1, foreign_in_top5: foreign });
  }
  const pass = rows.filter((r) => r.pass).length;
  const out = { at: new Date().toISOString(), pass, total: rows.length, rows };
  fs.mkdirSync(path.join(__dirname, "../out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "../out/retrieval.json"), JSON.stringify(out, null, 2));
  for (const r of rows) console.log(`${r.pass ? "PASS" : "FAIL"} rank=${r.rank} foreign=${r.foreign_in_top5}  ${r.query}`);
  console.log(`${pass}/${rows.length}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
