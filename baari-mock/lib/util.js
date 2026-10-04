// IST timestamps without a timezone suffix, the way Delhivery prints them.
function istString(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().replace("Z", "");
}

function istDate(date = new Date()) {
  return istString(date).slice(0, 10);
}

function digits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function alnum(n) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

// Pine Labs ids look like v1-sub-260424051700-aa-DkRgp2.
function pineId(prefix) {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  const stamp = `${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `${prefix}${stamp}-aa-${alnum(6)}`;
}

function json(status, body, headers) {
  return { status, body, headers };
}

module.exports = { istString, istDate, digits, alnum, pineId, json };
