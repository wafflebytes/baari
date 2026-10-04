// Real Google Sheet, reached through the Apps Script web app in sheets/Code.gs.

const URL_ = process.env.SHEETS_URL;
const SECRET = process.env.SHEETS_SECRET;

async function call(payload) {
  if (!URL_) return { ok: false, error: "SHEETS_URL is not configured" };
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids a CORS preflight Apps Script cannot answer
    body: JSON.stringify({ secret: SECRET, ...payload }),
    redirect: "follow",
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Sheet returned a non-JSON body", raw: text.slice(0, 300) };
  }
}

module.exports = {
  tabs: () => call({ action: "tabs" }),
  read: ({ tab, match }) => call({ action: "read", tab, match }),
  append: ({ tab, row }) => call({ action: "append", tab, row }),
  update: ({ tab, match, set }) => call({ action: "update", tab, match, set }),
};
