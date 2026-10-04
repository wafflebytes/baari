# AgenticOrg platform: capabilities and limits

Deployed at `https://agenticorg.hackathon.pinelabs.com`, version 4.8.0, org "Ken's Case Competition". Open-source code and user guide: `github.com/mishrasanjeev/agentic-org`. The deployed build is ahead of the repo, so the live platform wins where they disagree.

## Building blocks

| Block | What it is | Notes |
| --- | --- | --- |
| Agent | A LangGraph worker with a system prompt, a model, authorized tools and connectors | Created in the wizard (persona, role, prompt, behaviour, review) or by `POST /agents`. Starts in Shadow. [live] |
| Connector | Config plus credentials for one outside service | Native (from the catalog) or custom. Tools are named `<connector>__<tool>`. [live] |
| Tool | One callable operation | An agent can only call tools in its `authorized_tools` list. [live] |
| Workflow | JSON steps that chain agents | Step types: agent, condition, human-in-loop, parallel, wait, wait-for-event, notify, transform, collaboration. [docs] |
| Knowledge Base | Uploaded documents, chunked and searchable | Agents read it through the built-in `knowledge_base_search` tool. [live] |
| Approvals | Queue of HITL escalations | A human approves or rejects in the website. [docs] |
| Agent schedule | A stored question the agent re-runs later | `POST /agent-schedules` or the agent's own `agent_scheduler` tool. [live catalog] |

## Agent fields that matter for a PRD

Read from Baari with `GET /agents/{id}` [live]:

| Field | Baari's value | What it controls |
| --- | --- | --- |
| `llm_provider` / `llm_model` | `azure_openai` / `deployment:gpt-4o` | The model. `llm_fallback` exists and is empty. |
| `system_prompt_text` | v1, about 8,400 characters | The prompt. Every save is versioned (`GET /agents/{id}/prompt-history`). |
| `confidence_floor` | 0.5 | Below this the run is flagged as low confidence. |
| `hitl_condition` | `confidence < 0.3` | Expression that sends the run to Approvals. |
| `max_retries` / `retry_backoff` | 2 / exponential | Tool retry policy. |
| `output_schema` | null | A JSON schema can be set to force structured output. [unverified] |
| `shadow_min_samples` / `shadow_accuracy_floor` | 20 / 0.8 | Promotion gate. Baari is at 8 samples, 0.683 accuracy. |
| `cost_controls` | 500,000 tokens a day, $200 a month, `pause_and_alert` | The agent pauses when it crosses a cap. |
| `config.grantex.grantex_scopes` | e.g. `tool:<tenant>__mcp_baari_delhivery:write` | Grantex scopes minted from the tool list. Write tools get write scope. |
| `connector_ids` | UUID list | Connectors bound to the agent. |

## How an agent runs

- `POST /agents/{id}/run` with `{"inputs": {"task": "..."}}` runs one turn and returns the result. [live]
- The model can call several tools inside that one turn, in sequence. Baari has called pincode serviceability, waybill fetch and tracking in one run. [live]
- `GET /agents/{id}/explanation/latest` returns the reasoning record for the last run. [live]
- The run has no memory of earlier runs unless you put state in the task text, the Knowledge Base, or an outside store the agent can read through a tool. [live behaviour, by design]
- Runs can be started from the agent page, the chat panel, a workflow, a schedule, or the API with a session. [docs + live]

### Triggers: the gap every chat-based PRD hits

Nothing in the native connectors listens for incoming WhatsApp, Telegram or Gmail messages and starts a run. The WhatsApp connector only sends. Gmail can read the inbox, but only when a run is already going. Workable patterns:

1. **Schedule.** The agent schedules itself with `agent_scheduler__schedule_agent_task` ("every day at 21:00, check replies and close the vote"). On each run it pulls new messages with a read tool. Best fit for a daily loop. [catalog, unverified in a run]
2. **Workflow trigger.** Workflows accept trigger types `manual`, `webhook`, `email_received`, `api_event` and `schedule`. `email_received` is the brief's "forward the bank SMS to Gmail" path. [trigger list live, firing unverified]
3. **Outside relay.** Your server receives the Telegram or WhatsApp webhook and calls the run endpoint. It needs a platform credential. Our role has no API keys, so the relay would have to hold a session token, which expires. [live constraint]
4. **Human start.** A teammate presses Run with the message pasted in. Fine for the recording, weak as a product story.

## Connectors

### Registering

`POST /connectors` with name, category, base URL, auth type, auth config and rate limit. The Register Connector screen has an **MCP** checkbox. Ticked, the platform calls the URL as an MCP server and pulls the tool list from it. Unticked, a generic connector gets **no tools at all**. So every custom rail is an MCP server in practice. [live]

- Connector names are unique across the org. Prefix them (`baari_`). [live]
- MCP connectors belong to the user who registered them. [live]
- MCP tools get an `mcp_` prefix in the tool name, for example `mcp_baari_delhivery__track_shipment`. [live]

### The validator bug (blocks most custom tools)

When you save an agent, `authorized_tools` is checked against a registry. On our tenant it accepts only the 11 Delhivery tool names on MCP connectors (`pincode_serviceability`, `fetch_waybill`, `create_shipment`, `track_shipment`, `calculate_shipping_cost`, `create_pickup_request`, `cancel_shipment`, `ndr_action`, `ndr_status`, `hyperlocal_create_order`, `hyperlocal_get_order`), whatever the prefix. Every other MCP tool fails with "Invalid authorized_tools ... do not exist in the connector registry". Tested with Telegram, Sheets, Pine Labs and probe servers. Native tools pass. Reported to the organisers, who said to use judgment. [live]

PRD consequence: design non-Delhivery rails around **native** connectors, and disclose the workaround in the submission.

### Pointing native connectors at your own server

Some native connectors keep a custom Base URL, so the platform calls your server with the provider's request shape. Your server translates and calls the real service.

| Native connector | Custom Base URL | Status |
| --- | --- | --- |
| `elevenlabs` | Kept | In use. Our adapter speaks ElevenLabs' API and calls Gnani. TTS verified, voice Chitra, 67 KB mp3. [live] |
| `gmail`, `whatsapp`, `slack`, `twilio` | Dropped in code (`base_url` popped) | Always call the real provider. Use them as real tools. [repo] |
| `pinelabs_plural` | Ignored. Picks UAT or prod from a table | Needs real Pine Labs UAT keys. [repo + live] |
| `pinelabs_payment` | Registry default `https://apigw-test.pinelabs.com` | Not yet probed with our URL. [unverified] |
| `sendgrid`, `microsoft_teams` | Kept | Teams needs the Bot Framework. Not useful here. [repo] |

The adapter is honest only if the PRD says so. Gnani does every byte of speech, and the ElevenLabs connector is just the pipe.

## Knowledge Base

- Upload TXT, MD, CSV, JSON, PDF, DOCX, XLSX, PPTX, HTML, EML, images (OCR). No audio or video. [docs]
- Search through `knowledge_base_search`, which returns chunk text, score and source file name. [live]
- **Shared across the org.** `GET /knowledge/documents` lists 8 files from other teams, for example a wedding glossary and an "operating rules" PDF. Upload with a unique filename prefix, keep personal data synthetic, and tell the agent in the prompt to trust only files with your prefix. [live]
- Uploading is not training. Retrieval quality has to be tested. [docs]

## Workflows

- Create from a description or as JSON. Fields: name, version, domain, trigger type, optional cron, steps. [docs + live]
- Run with `POST /workflows/{id}/run`. Each step's status, output and errors show on the run screen. [live endpoint]
- A saved cron string does not prove a worker is running. Check that a scheduled run actually happens before the demo. [docs]
- We have no workflows yet. [live]

## Human in the loop

- The HITL condition sends a run to **Approvals**, where a platform user approves or rejects. [live]
- This is a platform user clicking a button, not the household member in WhatsApp. For the brief's "a team member approves a payment through an actual tool", use the UPI app (Reserve Pay mandate or payment link) or a WhatsApp/Telegram reply the agent reads on its next run.

## Voice

- The only shipped voice runtime is a signed **Twilio** phone loop using Twilio's own speech, so it breaks the Gnani rule. Don't use it. [docs]
- Voice in this round means: the user sends a voice note in WhatsApp or Telegram, the agent transcribes it through the Gnani connector, decides, synthesises a reply through Gnani, and sends the audio back through a real tool. [design]
- Audio has to reach the STT tool as base64 or a URL. The ElevenLabs STT tool takes `file_base64` and `filename`, and our adapter also accepts `cloud_storage_url`. [live catalog + ours]

## Guardrails and observability

- Guardrail rules (sensitive data, toxicity, pattern, injection, output policy) at input, retrieval, output and action stages. Admin API only, flag-only by default. [docs]
- Observability traces are admin only and off by default. Keep your own decision log on the mock server; ours logs every call at `/admin/log`. [docs + ours]

## Access and auth

- Login gives a session cookie `agenticorg_session` (a JWT) and a signed `agenticorg_csrf` cookie. Writes need the `X-CSRF-Token` header to match. [live]
- Settings > API Keys exists in the docs, but our developer role does not get it. [live]
- Composio (the marketplace connector) returns 403 for developers. [live]
- Our CLI (`agenticorg-cli/ao.js`) uses the session the user creates with `node ao.js login`. It never does HITL approvals; those stay human.

## Useful read-only endpoints

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/auth/me` | User, tenant, role |
| `GET /api/v1/tools?detail=true` | All 579 tools with descriptions |
| `GET /api/v1/connectors/registry` | 101 catalog entries with auth type and default Base URL |
| `GET /api/v1/connectors` | Connectors registered in the org |
| `GET /api/v1/agents?include_builtin=false` | Org agents |
| `GET /api/v1/agents/{id}/prompt-history` | Prompt versions |
| `GET /api/v1/knowledge/documents` | Knowledge Base files |
| `GET /api/v1/workflows`, `GET /api/v1/agent-schedules` | Workflows, schedules |
