# PRD template for an AgenticOrg agent

Fill every section. Where a section asks for a connector, write the exact tool name (`whatsapp__send_media_message`, `mcp_baari_delhivery__track_shipment`) and its tag: real, mock, or invented. If you can't name the tool, the requirement isn't buildable yet; move it to open questions.

## 1. Problem and user

- Who, where, how often. One real household or shop from research, with a quote.
- The job the agent takes over, in one sentence.
- What the user does today and what it costs them (time, money, fights).

## 2. Scope

- In scope: the decisions the agent makes alone.
- Out of scope: decisions it must never make. Write them as refusals.
- Success for the demo, and success for a real user after 30 days.

## 3. The loop

A timeline of one full day, each step with trigger, actor, tool and output.

| Time (IST) | Trigger | What the agent decides | Tool calls | Message out (channel, language) |
| --- | --- | --- | --- | --- |
| 21:00 | `agent_scheduler` re-run | ... | ... | ... |

Say how each run starts: schedule, workflow trigger, outside relay, or a person pressing Run. See the trigger section of [platform.md](platform.md).

## 4. Connectors

| Rail | Connector | Tools used | Real / mock / invented | Why this one |
| --- | --- | --- | --- | --- |
| Voice | `elevenlabs_<name>` to Gnani adapter | `text_to_speech`, `speech_to_text` | Real Gnani | Gnani rule |
| Logistics | `mcp_<name>_delhivery` | ... | Mock | No real sandbox for us |
| Payments | `pinelabs_plural` or mock | ... | ... | ... |
| Chat | `whatsapp` | ... | Real | ... |

Check every tool against [connectors.md](connectors.md) and the validator note in [platform.md](platform.md).

## 5. Invented capabilities (max 3)

For each: name, the gap in Gnani, Delhivery or Pine Labs it fills (cite the vendor file), the mock endpoint and fields, its good and bad responses, and why a real vendor could ship it.

## 6. Decision rules

Number every rule (B1, C2, E1...) so the decision log can cite it. For each: the condition, the action, the tool, and the message. Include the money rules: cap, who approves, what happens above the cap.

## 7. Failure handling

One row per bad case. The brief requires at least: no rider available, balance too low, timeout, malformed reply.

| Case | Rail | How it shows up (code, field) | Rule | What the agent does | What the user hears |
| --- | --- | --- | --- | --- | --- |
| No rider | Delhivery hyperlocal (invented) | `status: NO_RIDER_AVAILABLE` | ... | ... | ... |
| Balance too low | Pine Labs | `INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION` | ... | ... | ... |
| Timeout | any | 504 after 25 s | ... | ... | ... |
| Malformed | any | 200, body won't parse | ... | ... | ... |

Add the vendor-specific ones from [gnani.md](gnani.md), [delhivery.md](delhivery.md) and [pinelabs.md](pinelabs.md).

## 8. Agent configuration

- Model, confidence floor, HITL condition, retries, cost cap.
- Authorized tools (full list, under 20).
- Prompt structure: phases, rule ids, output format.
- What the agent reads at the start of every run (Knowledge Base files with your prefix, Gmail search, tracking state).

## 9. Decision log format

Fixed before the first run: time, input, source, decision, prompt rule, exact output, connector. Say where it is written (the run output, the mock server log, a sheet) and how it lines up with the recording.

## 10. Evaluation

Ten or more cases, each with input, scenario switches on the mock, expected tool calls, expected message, and pass criteria. Cover the happy path, each bad case, an ambiguous voice note, a forbidden request, and a conflict between two family members. Plan at least two test rounds and a prompt version after each.

## 11. Rail scores

Score each rail out of 10 for how real it is (real API, documented mock, invention) and how well the agent handled its failures. Be honest about the workarounds.

## 12. Risks and open questions

Platform limits that could break the demo, credentials still missing, consent and privacy (household data in a shared Knowledge Base, voice cloning, money).
