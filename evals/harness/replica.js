// The replica: the same system prompt and task text as the platform agent,
// with the same tool names the platform agent has today (Delhivery MCP,
// Gnani through the ElevenLabs-shaped connector, the Knowledge Base). Model
// through OpenRouter. Tools run for real on rails; knowledge_base_search hits
// the real AgenticOrg Knowledge Base. Off-platform only (EVAL_PLAN 3.3).
const { chat, mcpTools, mcpCall } = require("./lib");
const { api } = require("./ao_client");

// platform tool name -> how the replica serves it
const ROUTES = {};
let defs = null;

const DELHIVERY = ["pincode_serviceability", "calculate_shipping_cost", "create_shipment", "track_shipment", "cancel_shipment", "hyperlocal_create_order", "hyperlocal_get_order"];

async function tools() {
  if (defs) return defs;
  defs = [];
  for (const t of await mcpTools("delhivery")) {
    if (!DELHIVERY.includes(t.name)) continue;
    const name = `mcp_baari_delhivery__${t.name}`;
    ROUTES[name] = { rail: "delhivery", tool: t.name };
    defs.push({ type: "function", function: { name, description: t.description, parameters: t.inputSchema } });
  }
  // The platform's ElevenLabs connector shapes, served by Gnani through rails.
  ROUTES.elevenlabs_gnanibaari__speech_to_text = { rail: "gnani", tool: "speech_to_text", map: (a) => ({ audio_url: a.cloud_storage_url || a.audio_url, language_code: /^hi/.test(a.language_code || "hi") ? "hi-IN" : a.language_code }) };
  defs.push({
    type: "function",
    function: {
      name: "elevenlabs_gnanibaari__speech_to_text",
      description: "Transcribe audio to text (Gnani speech through the ElevenLabs connector). Pass a voice note URL as cloud_storage_url.",
      parameters: { type: "object", properties: { cloud_storage_url: { type: "string" }, language_code: { type: "string" }, model_id: { type: "string" } }, required: ["cloud_storage_url"] },
    },
  });
  ROUTES.elevenlabs_gnanibaari__text_to_speech = { rail: "gnani", tool: "text_to_speech", map: (a) => ({ text: a.text, language: "hi-IN" }) };
  defs.push({
    type: "function",
    function: {
      name: "elevenlabs_gnanibaari__text_to_speech",
      description: "Convert text to speech (Gnani voice through the ElevenLabs connector). Returns an audio_url.",
      parameters: { type: "object", properties: { text: { type: "string" }, voice_id: { type: "string" }, model_id: { type: "string" } }, required: ["text"] },
    },
  });
  ROUTES.knowledge_base_search = { rail: "kb" };
  defs.push({
    type: "function",
    function: {
      name: "knowledge_base_search",
      description: "Search the organisation's Knowledge Base. Returns chunks with the source document name and a score.",
      parameters: { type: "object", properties: { query: { type: "string" }, top_k: { type: "integer" } }, required: ["query"] },
    },
  });
  return defs;
}

async function execTool(name, args) {
  const r = ROUTES[name];
  if (!r) return { ok: false, error: `Unknown tool ${name}` };
  if (r.rail === "kb") {
    const res = await api("POST", "/knowledge/search", { query: args.query, top_k: args.top_k || 5 });
    return { results: (res.results || []).map((x) => ({ document_name: x.document_name, score: x.score, chunk_text: x.chunk_text })) };
  }
  const { result } = await mcpCall(r.rail, r.tool, r.map ? r.map(args) : args);
  return result;
}

function clip(v, n) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + `...[clipped ${s.length - n} chars]` : s;
}

async function runReplica({ system, task, model, maxTurns = 24 }) {
  const d = await tools();
  const messages = [
    { role: "system", content: system },
    { role: "user", content: task },
  ];
  const calls = [];
  const usage = { prompt: 0, completion: 0, llm_calls: 0 };
  const t0 = Date.now();
  let final = "";
  for (let turn = 0; turn < maxTurns; turn++) {
    const r = await chat({ model, messages, tools: d, max_tokens: 3000 });
    usage.llm_calls++;
    usage.prompt += r.usage.prompt_tokens || 0;
    usage.completion += r.usage.completion_tokens || 0;
    const m = r.message;
    const tcs = m.tool_calls || [];
    messages.push({ role: "assistant", content: m.content || "", ...(tcs.length ? { tool_calls: tcs } : {}) });
    if (!tcs.length) {
      final = m.content || "";
      break;
    }
    for (const tc of tcs) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = { _unparsed: tc.function.arguments };
      }
      const at = Date.now();
      let result;
      try {
        result = await execTool(tc.function.name, args);
      } catch (e) {
        result = { ok: false, error: String(e.message || e) };
      }
      calls.push({ name: tc.function.name, args, result, ms: Date.now() - at, via: "agent" });
      messages.push({ role: "tool", tool_call_id: tc.id, content: clip(result, 6000) });
    }
  }
  return { output: final, tool_calls: calls, usage, ms: Date.now() - t0 };
}

module.exports = { runReplica, tools };
