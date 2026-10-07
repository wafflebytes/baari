// Key/value storage. Upstash Redis when its env vars are present (Vercel
// forgets memory between invocations), plain memory otherwise (local dev).

const memory = new Map();
const lists = new Map();

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(cmd) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const json = await res.json();
  if (json.error) throw new Error(`redis: ${json.error}`);
  return json.result;
}

async function get(key) {
  if (URL_) {
    const raw = await redis(["GET", key]);
    return raw == null ? null : JSON.parse(raw);
  }
  return memory.has(key) ? memory.get(key) : null;
}

async function set(key, value, ttlSeconds) {
  if (URL_) {
    const cmd = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) cmd.push("EX", String(ttlSeconds));
    return redis(cmd);
  }
  memory.set(key, value);
}

async function del(key) {
  if (URL_) return redis(["DEL", key]);
  memory.delete(key);
}

async function keys(pattern) {
  if (URL_) return redis(["KEYS", pattern]);
  const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return [...memory.keys()].filter((k) => re.test(k));
}

// Newest first, capped.
async function push(key, value, cap = 1000) {
  if (URL_) {
    await redis(["LPUSH", key, JSON.stringify(value)]);
    return redis(["LTRIM", key, "0", String(cap - 1)]);
  }
  const l = lists.get(key) || [];
  l.unshift(value);
  lists.set(key, l.slice(0, cap));
}

async function range(key, n = 100) {
  if (URL_) {
    const raw = await redis(["LRANGE", key, "0", String(n - 1)]);
    return raw.map((r) => JSON.parse(r));
  }
  return (lists.get(key) || []).slice(0, n);
}

async function incr(key) {
  if (URL_) return redis(["INCR", key]);
  const v = (memory.get(key) || 0) + 1;
  memory.set(key, v);
  return v;
}

// Set only if the key is new. True when this call created it.
async function setnx(key, value, ttlSeconds) {
  if (URL_) {
    const cmd = ["SET", key, JSON.stringify(value), "NX"];
    if (ttlSeconds) cmd.push("EX", String(ttlSeconds));
    return (await redis(cmd)) === "OK";
  }
  if (memory.has(key)) return false;
  memory.set(key, value);
  return true;
}

module.exports = { get, set, del, keys, push, range, incr, setnx, usingRedis: Boolean(URL_) };
