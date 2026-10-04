# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 17:40
Done: V1 (H1 false, bc617e6). Telegram and Pine Labs through the native elevenlabs_gnanibaari connector (00397f7). Rails ops live (b3e3773): reset-day, presets E01-E10, runs 1-3, chaos, cast with solo mode and role routing, inject, run-output, handoff, health, recording tag, max_daily_debit, trimmed MCP views. Smoke 31/31. Household mandate is v1-sub-baari-sharma402.
Doing: C3 baari_extract on STT
Next: /app/state and /app/events with CORS, then the baari-clock Worker
Blocked on: nothing
Heads-up: reset-day and presets are global on rails. I'll write it here before I reset for a rehearsal.
Needs from W2: authorize elevenlabs_gnanibaari__get_voice, __create_voice_clone, __list_voices on Baari and Baari-eval, then one Baari-eval run that calls create_voice_clone, so /admin/elevenraw shows the real request shape. agent_scheduler is rejected on Baari, so baari-clock is the trigger.

## W2 brain and evals (Chaitanya), updated 17:38
Done: model fixed on both agents: `azure_openai / deployment:gpt-5.4`. gpt-6.1-sol saves but every run fails with OpenAIModelNotFoundError (Baari run msg_70f014e67fc1); the box accepts any name. gpt-5.4 runs (msg_813481cb7e4b). Table in evals/m1_models.md, PRD section 10 updated. Please don't change the model again without a ping run; agent config is W2 (COORDINATION lanes). GPT-4o round 1 was 0/10.
Done: your ask. Authorized elevenlabs_gnanibaari__get_voice, __create_voice_clone, __list_voices (and knowledge_base_search) on Baari and Baari-eval. 17 tools each.
Doing: round 1 on gpt-5.4 (v3, outbox). Then prompt v4 on your bridge: Telegram and Pine Labs become real tool calls, the OUTBOX relay goes away (PRD 6.2 outcome written up). Then platform evals on rails presets.
Bridge test on the platform, 17:35 (Baari runs msg_5c541d899e8e, msg_4b59a8effa17; see /admin/elevenraw):
- The platform gives every native tool the same generic parameter list (repository, branch, jql...), so the model won't send voice_id or labels unless the prompt says to. With that line in the prompt, both tools reach rails. v4 carries it.
- create_voice_clone: the connector refuses before sending unless samples is non-empty. A dummy {"filename":"baari.txt","content_base64":"YmFhcmk=","content_type":"text/plain"} works. tg.send reached your phone ("Baari bridge check from W2"). The model gets back only {"voice_id":"3","name":"tg.send","status":"created"}; baari_result is dropped.
- get_voice: reaches rails, but the model gets back only {voice_id, name, category, labels, settings, samples}. baari_result is dropped, so balance and updates never reach the model.
Needs from W1, in order (all rails, all blocking v4):
(1) [ask] get_voice: put the result where the connector keeps it. `labels` passes through as a dict, so labels = {"baari": "<JSON string of the result>"} (or flatten key fields as strings). Keep `name` = the command. By 18:15 if you can.
(2) [ask] create_voice_clone: voice_id is all the model sees, so make it carry the outcome: tg.send/tg.voice -> "msg:<message_id>" or "fail:<short error>"; pl.debit/pl.payee -> "<presentation_id>:<status>" (e.g. "pres_abc:PENDING") or "fail:DAILY_LIMIT_EXCEEDED". A failed write should still return 200 with voice_id "fail:...", or the connector may just raise.
(3) [ask] sim sink for evals: tg.send/tg.voice to a chat_id starting "sim-" is logged, readable at GET /admin/sim-outbox?since=<ts>, returns a fake message_id, never calls Telegram. Plus POST /admin/cast {"eval":true} mapping all four roles to sim-vinay/sim-mummy/sim-papa/sim-sunita, and {"eval":false} restoring your cast. Without it, platform evals either fail ("no Telegram chat") or message real phones. Fallback: replica-only evals with a local sink.
(4) Shared rails state: evals use /admin/preset and /admin/reset-day on the household mandate. I saw a reset at 17:32 mid-run. Say in STATUS before you reset or record; I'll do the same before eval rounds.
Not touching: connectors, rails, ao.js

## W3 household app, updated 16:50
Done: design brief
Doing:
Next: Ghar and Khata screens on fixture JSON
