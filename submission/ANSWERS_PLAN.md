# Submission answers: plan and evidence map

Owner: W4 (both lanes). Final answers go in `submission/ANSWERS.md`.

Rule for every judge-facing answer: write it from evidence (a run id, a log line, a file), then run it through the `/humanizer` skill, then check it against the unslop rules in `CLAUDE.md`. No claim goes in that we can't point at. Exact shapes below are copied from the portal; don't reformat them.

## Q1. One person's story, 100 words at most

- Shape: prose, the order it happens, names, a date, what they see, say, and what Baari does.
- Evidence: recording run 1 (or run 2 if it's the more vivid one).
- Draft direction: Papa, Sunday 4 October 2026. 9:05pm he gets two dishes on Telegram, sends a voice note asking for aloo puri, gets one line back ("Papa ki thali mein aloo nahi, rajma pakka"). Overnight the staples shipment slips and no rider is free, so Baari moves the rajma to Sunita's kirana stop. 7:45am she hears it in Hindi, answers "haan" without counts, gets asked once more, gives counts, the kirana is paid from the family's block. Count words before submitting.

## Q2. Recording link

- Shape: one link, anyone with the link can view.
- Evidence: three runs, per PRD US-16. Run 1 happy path. Run 2: Papa's voice note for aloo puri plus `no_rider`. Run 3: Sunita's "haan haan", a late reply, and Vinay's over-cap ask declined. One video with chapters, or a folder with three files and a README.

## Q3. Agent details

- Shape, exactly:

```
Agent name:
Agent ID:
Agent type:
Domain:
HITL condition:
Confidence floor:
LLM model:
Created:
```

- Evidence: `node ao.js agent Baari` plus the agent page. Copy from the page, not from the PRD.
- The "LLM model" line is whatever M1 picked. Keep one sentence ready on why (the bake-off numbers), in case it's asked in the finale.

## Q4. Every decision in the recording, in order

- Shape, per decision:

```
Decision N
When:
What the agent received:
Where it came from:
What it decided:
Why:
What it did or said, and to whom:
Through what:
```

- "None" where a line doesn't apply.
- Evidence: the DECISIONS blocks from the recorded runs (format fixed in PRD 9.1), matched to the rails log. W2's harness can render the blocks straight into this shape: `node evals/harness/answers.js q4 <run files>`.
- "Why" quotes the rule id and the rule's text from the frozen prompt version.
- "Where it came from" names the connector and the real source: "Telegram via mcp_baari_telegram, a voice note Papa (Chaitanya) recorded on his phone".

## Q5. Every connector

- Shape, per connector:

```
Connector N
Name on the platform:
Real or mock:
What it's used for:
```

- Evidence: `node ao.js connectors` and `node ao.js tools Baari`.
- Be plain about the pipes: the ElevenLabs connector name carries real Gnani traffic, the Telegram MCP connector relays the real Bot API, and if V1 used native-shaped tool names, say why in one sentence.

## Q6. Up to three capabilities

- Shape, per capability:

```
Capability N
Partner:
Endpoint (request and response):
What data the partner already holds that makes it possible:
```

- Evidence: PRD section 8. Paste a real request and response from the rails log for each, from a recorded run.
- Order: Delhivery hyperlocal (C10), Pine Labs payee debit with daily limit (C7), Gnani household reply extraction (C3). If C3 didn't ship, C2 as documented only, marked "not exercised in the recording".

## Q7. Rail scores

- Shape, exactly:

```
Gnani: _/10. Reason:
Pine Labs: _/10. Reason:
Delhivery: _/10. Reason:
```

- Score how agent-ready the rail is today, from what we hit while building. One reason each, the most telling one. Starting view, to be revised with evidence from tonight:
  - Gnani around 6: real, fast STT and TTS that handled Hinglish in our tests, and self-serve keys. Lost points for no AgenticOrg connector, a 60-second REST limit, and extraction living only in the separate Agent Builder.
  - Pine Labs around 4: there are native connectors on the platform, but none covers Reserve Pay, subscriptions or payouts, the Plural one needs UAT keys and ignores a custom URL, and a Reserve Pay debit can't settle to anyone but the merchant.
  - Delhivery around 3: documented REST, but tokens only through a sales contact, no sandbox we could get, no connector on the platform, no time-window or hyperlocal API, and NDR is asynchronous with no push without a 5 to 6 day setup.

## Q8. Ten eval cases

- Shape, per case:

```
Case N
The situation:
What your agent should do:
```

- Evidence: PRD 12.1 and `evals/cases/E01..E10.yaml`. Write the situation the way a person would describe it, not as a scenario name.

## Q9. Run log Sheet

- Shape: one link, anyone can view.
- Evidence: the Google Sheet from EVAL_PLAN 5.2, including failures and what changed in the prompt after each round.

## Q10. Cases we still fail, and why

- Evidence: the Failures tab after R3. Name the case, the trace, what goes wrong, and the honest reason (model behaviour, platform limit, or our own gap). Likely candidates to check: late cook reply ordering (E10), STT on very noisy notes, and anything that depends on `agent_scheduler` firing.

## Q11. Conversation links

- Shape: the tool's own share links.
- Evidence: both Claude Code sessions (Chaitanya's and Vinay's). Export or share before 23:30 so there's time to fix access.

## Also asked in the brief

"Share your final system prompt of your agent, along with the various versions." `agent/prompts/` and `agent/prompts/CHANGELOG.md`, linked from the Sheet's Prompt versions tab.
