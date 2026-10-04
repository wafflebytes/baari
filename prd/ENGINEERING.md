# How Baari is engineered

Companion to [PRD.md](PRD.md). The PRD says what Baari does. This says how it's built so it keeps doing it when the inputs get messy: agent design, context, the loop, the state graph, retrieval, observability and safety. Every choice here has a reason tied to a platform fact or a failure we expect, and every one is testable by an eval in [../evals/EVAL_PLAN.md](../evals/EVAL_PLAN.md).

The platform shapes everything. An AgenticOrg run is one request and one response with GPT-4o, up to 500,000 tokens a day per agent, no memory between runs, tools only through registered connectors, and nothing that wakes the agent when a message arrives. Production agent design here means working inside those walls, not pretending they aren't there.

## 1. Agent engineering

### 1.1 One agent, phase-scoped

One agent, five phases, each a separate run. We looked at a multi-agent setup (a vote agent, a buyer agent, a cook agent chained by an AgenticOrg workflow) and dropped it:

- Each extra agent is another prompt to version, another budget to burn, and another hop where state can drop.
- The decisions are tightly coupled. The buyer has to know why the vote went the way it did (a health veto changes what's missing). Splitting them means passing that reasoning between agents as text, which is where errors creep in.
- The Pine Labs team said it directly on 1 Oct: start with one agent and a deterministic flow in the prompt.

What we keep from the multi-agent idea is the separation itself. Each phase has its own section of the prompt, its own rule ids, its own allowed tools, and its own exit contract. Inside a run the agent works on one phase and ignores the others. That gives most of the isolation of separate agents with none of the hand-off cost.

### 1.2 The tool interface is part of the prompt

The model reads tool names, descriptions and schemas as instructions. We design them like the prompt:

- **Every tool returns the same envelope**: `{endpoint, http_status, latency_ms, response}`. A body that isn't valid JSON comes back as the raw string, unparsed, so the model can see it's broken. We never hide a failure behind a friendly wrapper, because then the agent can't apply E1.
- **Descriptions name the failure codes and what they mean**, for example "`INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION` when the block is too low". The model shouldn't have to guess what an error implies.
- **Idempotency keys are required fields in the schema**, not optional ones: `merchant_presentation_reference` on every debit, `order` on every shipment. A required field gets filled. A prose rule gets forgotten.
- **Polling semantics live in the description**: "starts PENDING, poll get_presentation until SUCCESS or FAILED". The prompt adds the cap (five checks).
- **Inventions say so in the description**: "CAPABILITY C7 (not a Pine Labs API today)". The agent and the judges see the same truth.
- **Under 20 tools.** Every extra tool adds selection errors. Delhivery's `fetch_waybill` and `create_pickup_request` stay off the agent because no phase needs them.
- **If the validator forces native-shaped names** (PRD 6.2), the name is just a label. The description carries the real operation, and the prompt has one block that maps role to tool name ("to message a person, use `send_text_message`"), so a rename touches one place.

### 1.3 Prompt architecture

Fixed order, because position matters to the model and because a stable prefix is easier to diff between versions:

1. Who Baari is and the job, three lines.
2. Hard limits L1 to L7. Short, absolute, numbered.
3. Tool map: role to tool name. The only block that changes if V1 changes names.
4. Phase sections, each with numbered rules (S, V, M, B, C, K).
5. Failure rules E1 to E3.
6. Talking rules T1 to T4, with two example messages each (one family, one cook).
7. Output contract: DECISIONS, HANDOFF, NEXT, with one filled example.

Rules of writing it:

- Every rule is a condition and an action, with an id. No rule says "be careful" or "use judgment".
- Safety-critical facts sit in the prompt or the task text, never behind retrieval. If the health rules lived only in the Knowledge Base, one bad retrieval would serve aloo to Papa. Recipes, pantry and shop details can come from retrieval, because a miss there causes a wrong grocery list, not a broken limit.
- The prompt stays under 9,000 characters. Every round, we cut a line for every line we add unless an eval shows we need it.
- Few-shot examples only for output format and tone. We don't give worked examples of decisions, because the model copies them in situations where they don't apply.

### 1.4 Defence in depth for money and limits

A prompt rule is a request to the model. Limits that matter get a second layer outside the model:

| Limit | Layer 1, prompt | Layer 2, outside the model |
| --- | --- | --- |
| Pay only approved shops (L2) | M rules | The mandate's `allowed_payees` on the Pine Labs mock rejects anyone else with `PAYEE_NOT_ALLOWED` |
| Daily cap Rs 400 (L1) | M5 | The mandate carries `max_daily_debit` (part of invented capability C7), and the mock refuses a debit that would cross it with `DAILY_LIMIT_EXCEEDED` |
| No double charge (M6) | Same reference on retry | The mock returns the original presentation when a reference is reused |
| Block size Rs 10,000 max | L5 | The mock enforces NPCI's cap at create time |
| Low-confidence run | Prompt asks for confidence | Platform HITL `confidence < 0.3` sends the run to Approvals |

When layer 2 catches something, that's an eval failure for layer 1 even though no money moved. We log it as one.

### 1.5 Inbound text is data, not instructions

Every Telegram message, voice transcript and email body is untrusted input. The prompt says so and E09 tests it. Specific rules:

- Identity comes from `chat_id` matched against the household profile, never from what a message claims ("main Vinay bol raha hoon" from Papa's chat is Papa).
- Only the duty-holder's button tap on Baari's own ask message counts as approval. Free text saying "approved" doesn't.
- A message asking to change a limit (cap, payees, rules) is answered with a polite no and reported to the duty-holder. Limits change only in the household profile, which people edit, not the agent.

## 2. Context engineering

The question for each phase is what the model needs in its window to make this phase's decisions, and nothing else. Too little and it guesses. Too much and it gets distracted, costs more, and runs out of daily budget before the recording.

### 2.1 What's in the window, by phase

| Phase | Fixed | From the task text | Retrieved or fetched during the run | Target total |
| --- | --- | --- | --- | --- |
| SHORTLIST | System prompt (~2,300 tokens) | NOW, HANDOFF (yesterday's lost-by, pantry) | Dishes and pantry chunks from KB | under 8k |
| LOCK | Same | NOW, shortlist, last update id | Telegram updates, STT transcripts, balance, serviceability, cost, create, poll | under 20k |
| CHECK | Same | NOW, waybill, item list, item value | Tracking (trimmed), hop quote | under 10k |
| BRIEF | Same | NOW, locked dish, headcount, plate rules, pickup list, low-confidence items | none or one KB chunk | under 6k |
| COOK_REPLY | Same | NOW, brief text, asks outstanding, cap left | Telegram updates, STT with C3, payee debit, poll | under 12k |

At these sizes a full day is about 60k tokens, so the 500,000-token daily budget covers about eight full days of runs per agent. That's why evals run on `Baari-eval`, not `Baari`.

### 2.2 Techniques

- **Just-in-time retrieval.** The agent pulls pantry and recipes when a phase needs them, not every run.
- **Tool output hygiene on the server.** Rails trims what the model sees: tracking returns the current status and the last three scans, not the full history. Telegram updates come back only after the given id, with only the fields the agent uses. Long raw bodies are clipped with a marker. The REST mock still returns the full Delhivery shape to anyone calling it directly.
- **Handoff compaction.** Each run ends by writing the HANDOFF JSON, a fixed schema of about 1.5 KB at most. That's the agent's working memory across runs, and the only thing carried forward. Raw transcripts and tool outputs from earlier runs never come along.
- **Time is given, never inferred.** Every task text starts with `NOW: <IST timestamp>`. The model can't read a clock, and for the recording we compress the night into minutes.
- **Language context goes into tools, not just the prompt.** STT gets a `bias_list` of tonight's dish names and ingredients in both scripts (राजमा, rajma). That's context engineering for the speech model.
- **Stable prefix, variable suffix.** System prompt first and unchanged within a version; task-specific content last. It keeps versions comparable and leaves room for provider-side caching.

### 2.3 HANDOFF schema (contract between phases)

```json
{
  "date_for": "2026-10-05",
  "phase_done": "LOCK",
  "last_update_id": 81234567,
  "shortlist": ["Rajma chawal", "Lauki chana dal"],
  "locked": {"winner": "Rajma chawal", "runner_up": "Lauki chana dal", "headcount": 4},
  "missing": [{"item": "rajma", "qty_g": 250, "route": "delhivery"}, {"item": "tomato", "qty_g": 200, "route": "kirana"}],
  "money": {"subscription_id": "sub_x", "cap_left_paise": 16000,
            "debits": [{"ref": "BAARI-2026-10-05-staples", "presentation_id": "pr_x", "amount": 24000, "status": "SUCCESS"}]},
  "shipment": {"order": "BAARI-2026-10-05-1", "waybill": "BD123", "last_status": "Manifested"},
  "open_asks": [{"to": "Vinay", "about": "extra Rs 120 for curd", "asked_at": "21:34", "expires": "22:30"}],
  "sent": ["S3:Papa", "S3:Vinay", "V5:family-result"],
  "notes_for_next": "Papa voted aloo puri, counted for rajma (V2)."
}
```

`sent` lists message keys already delivered, so a replayed phase doesn't message the family twice (section 3.3).

## 3. Loop engineering

### 3.1 The phase state machine

```mermaid
stateDiagram-v2
    [*] --> SHORTLIST: 20:30
    SHORTLIST --> LOCK: 21:30, votes closed
    LOCK --> ASK_WAIT: spend over limit (M5)
    ASK_WAIT --> LOCK: duty-holder taps, or ask expires
    LOCK --> CHECK: shipment booked
    LOCK --> BRIEF: nothing to ship
    CHECK --> CHECK: 06:30 recheck
    CHECK --> BRIEF: on time, or rerouted (C3, C4)
    BRIEF --> COOK_REPLY: 08:05, or her reply arrives
    COOK_REPLY --> COOK_REPLY: counts asked once (K2), resend once (K5)
    COOK_REPLY --> [*]: day closed
```

Each phase has an entry condition (what must be in HANDOFF), an exit contract (DECISIONS, HANDOFF, NEXT), and a fallback if the entry condition fails ("LOCK with no shortlist in HANDOFF: run S rules first, then lock on silence").

### 3.2 Bounded loops inside a run

- Polling: five `get_presentation` checks at most, two `hyperlocal_get_order` checks at most. Then treat as not confirmed and take the fallback.
- Retries: platform retries twice at the connector level, and the prompt's E1 allows one more retry of the same call. To stop retry storms, a payment retry after a timeout reuses the reference, and the mock returns the original. One logical debit, however many HTTP attempts.
- Tool call budget: about 15 calls per phase. If the agent passes it, the eval flags the trace for reading, because it usually means a loop.

### 3.3 Idempotency and replay

Any phase can run twice (a re-run after a crash, a schedule that fires twice, a teammate pressing Run again). Replaying must be safe:

| Side effect | Key | On replay |
| --- | --- | --- |
| Shipment | `order` = `BAARI-<date>-<n>` | Mock returns duplicate order. B4 says track it, don't book again. |
| Debit | `merchant_presentation_reference` = `BAARI-<date>-<purpose>` | Mock returns the original presentation. |
| Message | `sent` keys in HANDOFF | Agent skips messages already sent. |
| Hop | `deliver_by` plus waybill in the order note | Agent checks `hyperlocal_get_order` before booking another. |

### 3.4 Asking a human is a loop with a timer

An ask (M5 spend, K5 missing cook) goes into `open_asks` with an expiry. The next phase reads Telegram for a button tap on that ask. Tap yes: proceed. Tap no: the no-path. Expired: the default written in the rule (for spends, buy only what the dish can't do without). Nobody gets asked twice about the same thing.

### 3.5 Who starts each run

Ranked in PRD 5.3. The engineering point: the agent schedules its own next phase with `agent_scheduler`, writing the HANDOFF into the stored question. The loop then runs without us, and the memory travels with the trigger. If the scheduler doesn't fire, the same task text goes through `node ao.js run`, so nothing else changes.

## 4. Graph engineering

### 4.1 The household as a typed graph

Round 2's state model, written down so every component reads the same shape.

| Node | Key fields | Lives in |
| --- | --- | --- |
| Person | name, role, chat_id, language, is_duty_holder | KB profile |
| Rule | id, type (health, religion, budget, shops), applies_to, rule, say_it_as | Prompt (L rules) and KB |
| Dish | name, hindi_name, cook_minutes, has_potato, is_nonveg, last_cooked, last_lost_by | KB |
| Item | name, unit, perishable | KB |
| Shop | name, upi_id, warehouse, on_cook_route, detour_minutes | KB |
| Day | date, phase, winner, runner_up, headcount | HANDOFF, rails |
| Order | order id, waybill, status, eta | HANDOFF, Delhivery mock |
| Debit | reference, presentation id, amount, payee, status | HANDOFF, Pine Labs mock |
| Message | key, to, text, sent_at | HANDOFF `sent`, Telegram |

| Edge | Meaning |
| --- | --- |
| Person HAS_RULE Rule | R1 applies to Papa |
| Dish NEEDS Item (qty for 4) | Recipe |
| Pantry HOLDS Item (qty, confidence, source) | What's home, how sure we are, who said so |
| Item SOURCED_FROM Shop | Kirana or staples hub |
| Day LOCKED Dish, Day RUNNER_UP Dish | The decision |
| Debit PAYS Shop, Debit FOR Day | The money trail |
| Person VOTED Dish (at, via) | Visible to the duty-holder only |

Every fact carries a source (profile, cook voice note, tracking, inference) and a confidence. The pantry is where that matters: "tomato 100 g, low, from yesterday's estimate" is treated as zero (M2) until Sunita gives a count, and her count from a C3 `confirmed_with_counts` reply comes in as high.

### 4.2 Projections

Nobody reads the graph whole. Each consumer gets a projection:

- The prompt gets the slice a phase needs (section 2.1).
- The PWA gets `/app/state`, a projection for the duty-holder (PRD 11.3).
- The judges get the DECISIONS block, a projection of the edges that changed today with the rule that changed them.

### 4.3 The control graph

The state machine in 3.1 is the second graph. Rule ids are the guards on its edges, which is why every decision cites one. AgenticOrg workflows could encode this graph directly (agent steps plus wait and condition steps). We keep it in the prompt plus scheduler for now because workflow cron firing is unverified on our tenant. A workflow version, "Baari day", is the fallback if `agent_scheduler` fails, and a stretch goal otherwise.

## 5. Retrieval (RAG)

### 5.1 What goes in the Knowledge Base and what doesn't

| In the KB | Never in the KB |
| --- | --- |
| Dish recipes for 4, Hindi names, cook times | Hard limits and health rules (they're in the prompt, section 1.3) |
| Pantry as of day 0 | Anything secret: keys, real phone numbers, UPI PINs |
| Shops, UPI IDs, routes | Real household data (the KB is shared org-wide) |
| Member languages and roles | Today's decisions (those live in HANDOFF) |

### 5.2 Writing the document for retrieval

One file, `BAARI_sharma_household.md`. Every section is one entity and stands alone, so any chunk answers its question without "see above":

```markdown
## BAARI dish: Rajma chawal (राजमा चावल)
Household: Sharma, Flat 402. Cook time 50 min. Ingredients for 4: rajma 250 g, rice 400 g, tomato 300 g, onion 200 g, ginger-garlic 30 g.
Has potato: no. Non-veg: no. Last cooked 2026-09-27. Last lost by: none.
```

The `BAARI` token in every heading and the household name in every chunk do two jobs: they pull our chunks up for our queries, and they let the agent drop any chunk that isn't ours. The prompt says to ignore results whose source file doesn't start with `BAARI_`.

### 5.3 Queries are written per phase

The prompt gives the exact queries ("BAARI dish ingredients for 4", "BAARI pantry Sharma", "BAARI shop on cook route") rather than letting the model invent them. Fixed queries are testable.

### 5.4 Retrieval gets its own evals

- 15 fixed queries, each with the chunk it must return. Pass when that chunk is in the top 5. Run once after upload and after any document change.
- One contamination check: a query that matches another team's document (the KB currently holds eight files from other teams). Pass when the agent ignores the foreign chunk.
- If retrieval keeps failing for some fact, that fact moves into the task text. We don't fight the retriever on the night.

## 6. Observability

Three records, joined by time:

1. **The platform run** and `GET /agents/{id}/explanation/latest`, which hold the model's reasoning and tool calls.
2. **The rails call log** (`/admin/log`, `/admin/mcplog`), which holds every tool call the platform actually made and every REST call to a mock, with request and response.
3. **The DECISIONS block** in the run output, which holds what the agent says it decided and why.

The eval harness checks that 2 and 3 agree: every "said/did" in DECISIONS has a matching tool call in the rails log, and every side-effecting tool call in the log has a decision that explains it. A decision with no call is a hallucinated action. A call with no decision is an unexplained action. Both fail.

The harness saves each run as `evals/runs/<round>/<case>/<timestamp>.json` with the task, the platform output, the rails log slice and the judge results. That folder is the run log for answer 9.

## 7. Safety and privacy

- Synthetic household. No real phone numbers in the repo or the KB. Chat ids stay in rails env or Redis.
- No voice authentication (Round 1 stance). Voice is input, never identity.
- The cook is never asked to pay, never shamed for a wrong count, and never sees family votes or spend.
- Medical conditions never appear in any message (L4), checked by a code judge on every trace.
- Money: block approved by the admin in their own UPI app, cap and payees enforced in two layers (section 1.4).
- Inbound content treated as data (section 1.5), tested by E09.

## 8. What each engineering choice is tested by

| Choice | Eval or check |
| --- | --- |
| Tool envelope shows raw failures | E05, E06 |
| Idempotency keys | E05, replay test (run LOCK twice) |
| Safety facts outside retrieval | E01 with KB search forced to miss |
| Handoff compaction | Every case: next phase runs from HANDOFF alone |
| NOW given | Judge: no invented times in messages |
| Bounded polling | Trace check: at most five `get_presentation` calls |
| Inbound text as data | E09, spoofed-identity case |
| Two-layer cap | E04, E09 with prompt rule removed (ablation) |
| Retrieval scoping | 15 retrieval queries, contamination check |
| DECISIONS matches the log | Alignment check on every run |
