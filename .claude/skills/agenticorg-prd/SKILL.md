---
name: agenticorg-prd
description: Write a buildable PRD for an agent that runs on Pine Labs AgenticOrg (agenticorg.hackathon.pinelabs.com) and talks to Gnani, Delhivery, Pine Labs and real tools like WhatsApp, Telegram, Gmail and Sheets. Use when scoping, writing or reviewing a PRD, feature list, connector plan, eval set or mock-server design for The Ken x Pine Labs build round, or when someone asks "can the platform do X".
---

# AgenticOrg PRD builder

This skill holds what AgenticOrg and the three vendor APIs can and cannot do, checked against the live platform and the vendors' own docs on 2026-10-04. Use it to write a PRD that survives contact with the platform. Most PRDs for this round fail the same way: they assume a connector exists, or that the agent can be woken by a message, and both assumptions are wrong.

## How to use it

1. Read the competition rules below. They are the hard constraints and judges score against them.
2. Read [platform.md](platform.md) before designing any flow. It covers what an agent is, how it runs, and the limits that shape every design.
3. Pick connectors from [connectors.md](connectors.md). It is the full live catalog of 90 native connectors and 579 tools, with notes on which ones a household or SMB agent can use.
4. For each vendor, read its file: [gnani.md](gnani.md), [delhivery.md](delhivery.md), [pinelabs.md](pinelabs.md). Each lists real endpoints, real fields, real error cases, and what to mock.
5. Write the PRD with [prd-template.md](prd-template.md). Every requirement must name the connector and tool that delivers it, or say "mock" and point at the documented endpoint it copies.

Every fact here carries a tag:

- **[live]** checked against the running platform with our account
- **[docs]** read in the vendor's or platform's documentation, not exercised
- **[ours]** built and tested by our team (the `baari-mock` server, the `agenticorg-cli` wrapper)
- **[unverified]** plausible, but nobody has tested it. Test before a PRD depends on it.

## Competition rules (the judge's brief)

These come from the Round 3 brief and override anything else in this skill.

1. The agent is built and run inside AgenticOrg and makes every decision on its own. It reaches the world only through connectors.
2. **Gnani** handles every voice input and every voice reply, called as a connector. No other STT or TTS anywhere in the loop.
3. **Delhivery** is a mock server you host (Vercel or similar), registered as a custom connector. Endpoint paths, request fields and response fields must match Delhivery's documentation exactly.
4. **Pine Labs** uses the platform's own connector where one works. Where it doesn't, mock it the same way as Delhivery.
5. Up to **3 capabilities** that Gnani, Pine Labs or Delhivery don't offer today can live on the mock server. Name them as inventions in the PRD.
6. Every other connector is the **real tool**: WhatsApp, Telegram, Gmail, Google Sheets and so on. A teammate can play the user, but through the actual app.
7. Outside-world signals go through a real tool. Example from the brief: forward a real bank SMS to the agent's Gmail.
8. The mock must behave like the real thing, bad cases included: no rider available, balance too low, timeout, malformed reply. The agent has to handle each one.

Deliverables the PRD has to make possible: a screen recording of one full run plus 2 reruns with different human input, a decision log for every decision (time, input, source, decision, prompt rule, exact output, connector), a connector list, the 3 invented capabilities, rail scores, 10 eval cases, run logs per test round, every system prompt version, and the failures still open.

## The ten limits that shape every design

Each is explained with evidence in [platform.md](platform.md).

1. **An agent run is one request, one response.** `POST /agents/{id}/run` with a task string. Nothing on the platform wakes the agent when a WhatsApp or Telegram message arrives. Inbound messages need an outside relay or a schedule. [live]
2. **Schedules exist and the agent can set its own.** The native `agent_scheduler` tool lets an agent re-run itself later with a stored question. This is the cleanest way to get "every night at 9pm" behaviour. [live catalog, unverified in a run]
3. **Custom MCP tools are rejected on our tenant except Delhivery's names.** The validator only accepts the 11 Delhivery tool names on MCP connectors. Telegram, Sheets and Pine Labs mocks registered as MCP were all rejected. Native connector tools are accepted. Plan every non-Delhivery rail as a native connector. [live]
4. **Native connectors can be pointed at your own server** when they keep a custom Base URL. ElevenLabs does, which is how Gnani runs today: the native ElevenLabs connector points at our adapter, and the adapter calls Gnani. Gmail, WhatsApp, Slack and Twilio throw the Base URL away. Pine Labs Plural ignores it. [live]
5. **No Telegram, no Google Sheets, no Gnani, no Delhivery** in the native catalog. WhatsApp (Meta Cloud API), Gmail, Google Calendar, Twilio SMS and Slack are native. [live]
6. **The Knowledge Base is shared across the whole org**, so every team's uploads are visible to every agent. Today it holds 8 documents from other teams. Household data put there is readable by others, and other teams' files can leak into your retrieval. [live]
7. **Shadow mode is the default and promotion is gated.** Baari shows `shadow_min_samples` 20 and `shadow_accuracy_floor` 0.8. Shadow is an evaluation label, and the docs say plainly that it does not block side effects. [live]
8. **The model is Azure OpenAI GPT-4o** with `max_retries` 2, exponential backoff, a 500,000 token daily budget and a $200 monthly cap that pauses the agent when crossed. [live]
9. **HITL is a confidence rule**, such as `confidence < 0.3`, routed to the Approvals screen. It is not a payment approval. A real user approving a payment has to do it in a real tool (UPI app, WhatsApp reply). [live]
10. **No API keys for our role.** The platform is driven through the website session. Our CLI reuses that session cookie and CSRF token. Developer role cannot use Composio (403). [live]

## What a good PRD looks like here

- One agent with a narrow job, 10 to 20 authorized tools, and refusals written down.
- A trigger story that works: schedule, a relay that calls the run endpoint, or a teammate starting the run. Say which.
- Every money movement goes through a mandate or link the human approves in a real app. The agent never "pays" on its own say-so.
- Every bad case from the brief maps to a mock scenario and an eval case: no rider, low balance, timeout, malformed reply, and the vendor-specific ones in each vendor file.
- Invented capabilities are labelled as invented, sit on the mock server, and are no more than 3.
- A decision log format fixed before the first run, so the recording and the log line up.

## Where our build stands (Baari, 2026-10-04)

- Agent `Baari`, shadow, 13 tools: 11 Delhivery mock tools on `mcp_baari_delhivery` plus Gnani TTS and STT through `elevenlabs_gnanibaari`. [live]
- Mock server `https://baari-rails.vercel.app` serves the Delhivery mock, the Pine Labs Reserve Pay mock, the Gnani adapter, a Telegram bot relay and a Sheets bridge. Scenarios are switched through `/admin/scenario`. [ours]
- CLI `agenticorg-cli/ao.js` reads and edits agents, tools, prompts and connectors, and runs agents, without clicking. [ours]
- Not connected yet: WhatsApp, Gmail, Pine Labs (real or mock) on the agent.
