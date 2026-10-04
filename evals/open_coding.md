# Open coding, round 1

Round 1 ran prompt v3 on the ten submission cases, on the platform agent Baari-eval, with simulated people. Messages and debits went through the OUTBOX relay; Delhivery, Gnani speech and the Knowledge Base were real tool calls. Every trace was read in full. Each note is the first thing that went wrong in that trace, written before any category existed. Categories came after.

Traces: `evals/runs/R1/<case>/`. Platform run ids are in `evals/out/runs.csv`.

## Notes per trace

### GPT-4o (`azure_openai/deployment:gpt-4o`), 0 of 10

| Case | First thing that went wrong |
| --- | --- |
| E01 | Never tried STT on Papa's voice note. Asked him to resend, then counted his "no vote" for dish 1 in the same run. |
| E02 | Locked the dish and stopped. No serviceability, no shipping cost, no spend line. The decision line is in English. |
| E03 | Right winner, by V4. Messages are English with Hinglish words ("Kal ke liye dish: ..."), and the HANDOFF dropped the money block. |
| E04 | Plain English to the family ("Rajma chawal wins"). Never looked at the balance before deciding there was nothing to buy. |
| E05 | Stopped after the result messages; no debit queued, so the timeout never got tested. |
| E06 | Tracked once, got the truncated `{"status":"Succ"` body and took it as fine. No retry. |
| E07 | hop_create failed twice on its own missing fields, cited E1 for both, then told Vinay in English. |
| E08 | Didn't call STT. Asked Sunita to repeat by text, though T2 says voice only. |
| E09 | Said no to the cap request (good) in English, and sent Papa's plate line to Vinay. |
| E10 | Sent Sunita her own voice note back: the OUTBOX audio_url was the INBOX URL. |

GPT-4o makes one or two tool calls a run and then writes the output block. Every LOCK stops after the vote.

### GPT-5.4 (`azure_openai/deployment:gpt-5.4`), 2 of 10

| Case | First thing that went wrong |
| --- | --- |
| E01 | Called STT with `file_base64` (the platform shows a generic parameter list), so it failed. Papa's result message lacks the plate line V2 asks for. Sourcing and the debit were right. |
| E02 | No votes, dish 1 by V3, Hinglish messages. Skipped B1: no serviceability call. |
| E03 | Pass. |
| E04 | Wrote "send spend line" as a decision, cited M4, and never queued the message it described. |
| E05 | Cited B1 and B2 without making either call, and queued no debit. |
| E06 | Read the truncated track body correctly as unusable, but didn't retry it (E1). Deferred to 06:30. |
| E07 | hop_create sent flat `pin`/`name`/`address` instead of the `pickup` and `drop` objects; 400. Didn't tell Vinay the plan changed. |
| E08 | STT failed (`file_base64`). Wrote a placeholder audio_url ("REQUIRED_FROM_TTS_FOR: ...") instead of calling TTS. |
| E09 | Pass. Polite no, one line to Vinay, Hinglish. |
| E10 | STT failed the same way, so it couldn't hear the kirana amount and didn't pay. |

GPT-5.4 follows the phase rules much better and keeps Hinglish. Its failures are mostly about tool arguments and skipped steps.

## Categories (axial coding)

| Category | Traces | Fix | Judge |
| --- | --- | --- | --- |
| A. Wrong or missing tool arguments: the platform's generic schema hides the real ones | 5.4: E01, E07, E08, E10. 4o: E07 | v4 tool-argument block | `phase_complete` (stt), `expect:stt_on_voice`, hop_create result |
| B. Phase stops early: LOCK ends at the vote, sourcing skipped | 4o: E02, E04, E05. 5.4: E02, E05 | v4 V5 and B1: "LOCK is not done until sourcing is decided" | `phase_complete` |
| C. Cites a rule for an action it didn't take | 5.4: E04, E05 | v4 sourcing rule; judge already catches it | `decisions_match_log` |
| D. Family messages in English | 4o: E02, E03, E04, E05, E07, E09 | v4 T1 with an example | `family_register` (code), `veto_kindness` (LLM, planned) |
| E. Voice handling: no STT, or a fake or reused audio URL | 4o: E01, E08, E10. 5.4: E08 | v4 K1 and tts argument line | `expect:stt_on_voice`, `phase_complete` (brief needs tts) |
| F. Failure not retried (E1) | 4o: E06. 5.4: E06 | v4 E1: "a body missing the fields you need" | `expect:tool_called:track` 2..3 |
| G. Plan change not told to Vinay | 5.4: E07 | v4 C4 | `expect:message_to:Vinay` |
| H. Plate line to the wrong person, or missing | 4o: E09. 5.4: E01 | v4 V2 | `expect:message_to:Papa` contains aloo/thali |

## Harness bugs found while reading

- `message_to` and `tool_called` with `max: 0` kept `min: 1`, so "nobody gets a message" could never pass (E06, E08). Fixed: `max: 0` means `min: 0`.
- `balance` counted only tool calls, while v3 reads the balance from the task's BALANCE line. Fixed: the BALANCE line counts as the read.
- E05 expected the agent to cite E1 for a debit timeout that happens after its run, in the relay. In OUTBOX mode the relay owns that retry now, and E05 checks the M6 reference instead.

## What round 2 tests

v4 on GPT-5.4. Categories A, B, E and F should drop; C and G should follow. If A remains, the model is still ignoring the argument block, and the next fix is a worked call example per tool.
