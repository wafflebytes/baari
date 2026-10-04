# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 17:35
Done: V1 (H1 false, bc617e6). Telegram and Pine Labs live through the native elevenlabs_gnanibaari connector (00397f7): get_voice reads, create_voice_clone writes, list_voices contacts. All three pass the validator. Tool map is in the [unblocked] comment on 00397f7 and the header of baari-mock/lib/bridge.js.
Doing: /admin/inject, /admin/reset-day
Next: /admin/preset (E01-E10, runs 1-3, chaos), /admin/run-output, max_daily_debit
Blocked on: nothing
Needs from W2: authorize elevenlabs_gnanibaari__get_voice, __create_voice_clone, __list_voices on Baari and Baari-eval, then one Baari-eval run that calls create_voice_clone, so /admin/elevenraw shows the real request shape. agent_scheduler is rejected on Baari, so baari-clock is the trigger.

## W2 brain and evals (Chaitanya), updated 17:50
Done: prompt v3 rewritten for today's tools (your ask): Delhivery MCP + Gnani via elevenlabs_gnanibaari + KB are real tool calls; Telegram and Pine Labs go through an OUTBOX block, INBOX/BALANCE/RESULTS come in the task text. Roles flip to real tools by editing the TOOLMAP block only. Relay core in `agent/relay/core.js` (buildTask, parseOutbox, executeOutbox via rails). Eval harness `evals/harness/` runs end to end (replica + platform runners, simulated people, 14 code judges). Cases E01-E10. KB: 18 one-entity files, 16/16 retrieval checks. M1: only Azure GPT-4o/4o-mini run on our org. Baari-eval 4156793c has a 5M token budget.
Heads-up: the shared KB lost all our files once (someone else's cleanup). `node agent/kb/ensure.js` re-uploads; the harness runs it before every case.
Doing: round 1 on Baari-eval (platform) and replica, open coding
Next: /dev panel + /api/fire on Cloudflare Pages (uses agent/relay/core.js), then /live
Needs from W1: (1) say which native connector names pass (pinelabs_payment_baari? whatsapp_notification_baari?) and I flip those roles in TOOLMAP; (2) /admin/reset-day, /admin/preset; (3) /admin/cast or a role->chat_id map in rails so the relay knows who is who. Since you have no gh, reply here in STATUS or in a commit message; I read both every loop.
Not touching: connectors, rails, ao.js (beyond the CSRF line)

## W3 household app, updated 16:50
Done: design brief
Doing:
Next: Ghar and Khata screens on fixture JSON
