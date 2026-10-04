# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 17:40
Done: V1 (H1 false, bc617e6). Telegram and Pine Labs through the native elevenlabs_gnanibaari connector (00397f7). Rails ops live (b3e3773): reset-day, presets E01-E10, runs 1-3, chaos, cast with solo mode and role routing, inject, run-output, handoff, health, recording tag, max_daily_debit, trimmed MCP views. Smoke 31/31. Household mandate is v1-sub-baari-sharma402.
Doing: C3 baari_extract on STT
Next: /app/state and /app/events with CORS, then the baari-clock Worker
Blocked on: nothing
Heads-up: reset-day and presets are global on rails. I'll write it here before I reset for a rehearsal.
Needs from W2: authorize elevenlabs_gnanibaari__get_voice, __create_voice_clone, __list_voices on Baari and Baari-eval, then one Baari-eval run that calls create_voice_clone, so /admin/elevenraw shows the real request shape. agent_scheduler is rejected on Baari, so baari-clock is the trigger.

## W2 brain and evals (Chaitanya), updated 17:40
Done: model fixed on both agents: `azure_openai / deployment:gpt-5.4`. gpt-6.1-sol saves but every run fails with OpenAIModelNotFoundError (Baari run msg_70f014e67fc1); the box accepts any name. gpt-5.4 runs (msg_813481cb7e4b). Table in evals/m1_models.md, PRD section 10 updated. Please don't change the model again without a ping run; agent config is W2 (COORDINATION lanes). GPT-4o round 1 was 0/10.
Done: your ask. Authorized elevenlabs_gnanibaari__get_voice, __create_voice_clone, __list_voices (and knowledge_base_search) on Baari and Baari-eval. 17 tools each.
Doing: round 1 on gpt-5.4 (v3, outbox). Then prompt v4 on your bridge: Telegram and Pine Labs become real tool calls, the OUTBOX relay goes away (PRD 6.2 outcome written up). Then platform evals on rails presets.
Needs from W1, in order:
(1) [ask] a sim sink, by 18:15: tg.send / tg.voice to a role whose cast chat_id starts with `sim-` (or any chat_id starting `sim-`) is recorded in /admin/log and a readable list (GET /admin/sim-outbox?since=), returns ok with a fake message_id, and never calls Telegram. Plus a cast preset `{"eval":true}` that maps all four roles to sim-vinay, sim-mummy, sim-papa, sim-sunita and a way to restore your real cast. Without it, platform evals either error ("no Telegram chat") or message real phones. If it doesn't come I run evals on the replica only, where I serve the same bridge tool names with a local sink.
(2) Heads-up: evals use /admin/preset and /admin/reset-day on the shared household mandate. I saw a reset at 17:32 mid-run. Tell me in STATUS before you reset or record, and I'll do the same before eval rounds.
(3) Does get_voice tg.updates return injected sim updates with role set? I'll read the code, but say if there's a catch.
Not touching: connectors, rails, ao.js

## W3 household app, updated 16:50
Done: design brief
Doing:
Next: Ghar and Khata screens on fixture JSON
