// The Knowledge Base is shared by every team in the org, and other teams keep
// deleting every document in it (seen 17:30, 18:15, 18:20, 18:30 on 4 Oct).
// We can't leave the org, so we heal fast:
//
//   node agent/kb/ensure.js            one check, re-upload what's missing
//   node agent/kb/ensure.js --watch 20 check every 20 s until stopped
//
// The check reads GET /knowledge/documents and compares filenames, because
// search keeps returning stale chunks of deleted files for a while, so a
// search hit doesn't prove the file exists. Only missing files are uploaded,
// six at a time. The harness calls ensureKb() before every case, and the
// prompt carries a fallback copy of the facts for a run that starts in the
// gap between a delete and the next heal.
const fs = require("fs");
const path = require("path");
const { api } = require("../../evals/harness/ao_client");

const DIR = path.join(__dirname, "split");
const ts = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 19);

function localFiles() {
  return fs.readdirSync(DIR).filter((f) => f.startsWith("BAARI_") && f.endsWith(".md")).sort();
}

async function present() {
  const names = new Set();
  let offset = 0;
  for (let page = 0; page < 20; page++) {
    const r = await api("GET", `/knowledge/documents?limit=200&offset=${offset}`);
    const items = Array.isArray(r) ? r : r.items || r.documents || [];
    for (const d of items) if (!d.deleted && d.status !== "deleted") names.add(d.filename || d.name || d.document_name);
    offset += items.length;
    if (!items.length || offset >= (r.total || 0)) break;
  }
  return names;
}

async function upload(f) {
  const fd = new FormData();
  fd.append("file", new Blob([fs.readFileSync(path.join(DIR, f))], { type: "text/markdown" }), f);
  await api("POST", "/knowledge/upload?replace=true", fd);
}

async function ensureKb({ quiet } = {}) {
  const want = localFiles();
  const have = await present();
  const missing = want.filter((f) => !have.has(f));
  if (!missing.length) return { ok: true, reuploaded: 0, total: want.length };
  const failed = [];
  for (let i = 0; i < missing.length; i += 6) {
    await Promise.all(missing.slice(i, i + 6).map((f) => upload(f).catch((e) => failed.push(`${f}: ${e.message.slice(0, 80)}`))));
  }
  if (!quiet) console.log(`[${ts()} IST] KB: ${missing.length} of ${want.length} BAARI_ files were missing, re-uploaded${failed.length ? `, ${failed.length} failed: ${failed.join("; ")}` : ""}`);
  return { ok: !failed.length, reuploaded: missing.length - failed.length, failed, total: want.length };
}

async function watch(seconds) {
  console.log(`[${ts()} IST] KB watchdog: checking ${localFiles().length} files every ${seconds}s`);
  let heals = 0;
  let refreshed = Date.now();
  const refresh = (why) => {
    const r = require("child_process").spawnSync("node", [path.join(__dirname, "../../agenticorg-cli/ao.js"), "refresh"], { encoding: "utf8" });
    console.log(`[${ts()} IST] session refresh (${why}): ${r.status === 0 ? "ok" : (r.stderr || r.stdout).trim().slice(0, 160)}`);
    if (r.status === 0) refreshed = Date.now();
  };
  for (;;) {
    // Refresh only works while the session is still valid, so do it early.
    if (Date.now() - refreshed > 40 * 60 * 1000) refresh("every 40 min");
    try {
      const r = await ensureKb();
      if (r.reuploaded) heals++;
    } catch (e) {
      console.log(`[${ts()} IST] KB check failed: ${e.message.slice(0, 160)}`);
      if (e.status === 401) refresh("401");
    }
    await new Promise((r) => setTimeout(r, seconds * 1000));
  }
}

module.exports = { ensureKb, present, localFiles };
if (require.main === module) {
  const i = process.argv.indexOf("--watch");
  if (i > 0) watch(Number(process.argv[i + 1]) || 20);
  else ensureKb().then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
