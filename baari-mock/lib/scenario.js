// Scenario control. Each mock decides its answer from the request data first
// (pincode, amount, balance), then from an override the team sets before a
// recording through /admin/scenario.
//
// An override is { scenario, remaining }. remaining = -1 sticks until cleared;
// a positive number fires that many times, then the endpoint goes back to
// normal. The second form is how we test retries: one timeout, then success.

const store = require("./store");

async function takeOverride(endpoint) {
  for (const key of [`ov:${endpoint}`, "ov:*"]) {
    const ov = await store.get(key);
    if (!ov || ov.remaining === 0) continue;
    if (ov.remaining > 0) {
      ov.remaining -= 1;
      if (ov.remaining === 0) await store.del(key);
      else await store.set(key, ov);
    }
    return ov.scenario;
  }
  return null;
}

async function setOverride(endpoint, scenario, times) {
  await store.set(`ov:${endpoint}`, { scenario, remaining: times ? Number(times) : -1 });
}

async function clearOverride(endpoint) {
  if (endpoint === "all") {
    for (const k of await store.keys("ov:*")) await store.del(k);
    return;
  }
  await store.del(`ov:${endpoint}`);
}

async function listOverrides() {
  const out = {};
  for (const k of await store.keys("ov:*")) out[k.slice(3)] = await store.get(k);
  return out;
}

module.exports = { takeOverride, setOverride, clearOverride, listOverrides };
