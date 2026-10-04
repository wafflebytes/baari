// The Knowledge Base is shared by every team in the org, and our files have
// already been deleted once by someone else's cleanup (2026-10-04 ~17:30).
// Before a run: if our index query finds nothing, re-upload every BAARI_ file.
const fs = require("fs");
const path = require("path");
const { api } = require("../../evals/harness/ao_client");

const DIR = path.join(__dirname, "split");

async function ensureKb({ quiet } = {}) {
  const r = await api("POST", "/knowledge/search", { query: "BAARI dishes all Sharma", top_k: 3 });
  const ours = (r.results || []).filter((x) => (x.document_name || "").startsWith("BAARI_"));
  if (ours.length) return { ok: true, reuploaded: 0 };
  let n = 0;
  for (const f of fs.readdirSync(DIR).filter((f) => f.startsWith("BAARI_") && f.endsWith(".md"))) {
    const fd = new FormData();
    fd.append("file", new Blob([fs.readFileSync(path.join(DIR, f))], { type: "text/markdown" }), f);
    await api("POST", "/knowledge/upload?replace=true", fd);
    n++;
  }
  if (!quiet) console.log(`KB: our files were missing, re-uploaded ${n}`);
  return { ok: true, reuploaded: n };
}

module.exports = { ensureKb };
if (require.main === module) ensureKb().then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
