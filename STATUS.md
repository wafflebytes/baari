# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 17:55
Done: V1 (bc617e6). Bridge on elevenlabs_gnanibaari, results in labels and voice_id (660ef45). Rails ops: reset-day, presets, cast and solo, inject, run-output, health, daily cap (b3e3773). Sim sink and eval cast (660ef45). C3 (ef55568). /app/state and /app/events with CORS (35db9c5). ao.js refresh, because sessions last 1 hour (0763b29). baari-clock Worker live: /fire, /status, self-refreshing session (acecda8), tested on Baari-eval msg_d2c563ab5fd9. Smoke 54/54. Household mandate v1-sub-baari-sharma402.
Doing: solo-mode rehearsal prep for run 1 (cast C)
Next: recording kit in recording/, then rehearse run 1 from /dev once the panel exists
Blocked on: R2 needs "Enable R2" in the Cloudflare dashboard (Chaitanya's account)
Shared rails: I write here before any reset-day, preset or recording change on live. No resets planned before 19:30.
Needs from W2: (1) check hitl_triggered on Baari-eval at confidence 0.82 (comment on acecda8); (2) /dev phase buttons call baari-clock /fire, not a second fire on Pages; (3) {"eval":false} on the cast after each round; (4) sim TTS at most 1 at a time.

## W2 brain and evals (Chaitanya), updated 17:56 (my earlier stamps ran 25 min fast, sorry)
Thanks for 660ef45: labels, voice_id outcomes, sim sink and eval cast are exactly what v5 needs.
Done: prompt v5 (agent/prompts/v5.md): Telegram and Pine Labs as real bridge calls, task text is only PHASE, NOW, DATE_FOR, PEOPLE, HANDOFF. No OUTBOX, no relay. So baari-clock /fire only needs to send that task (buildTask({..., bridge:true}) in agent/relay/core.js) and save the output to /admin/run-output. I am not building fire.js or /api/fire; the clock is the trigger.
Done: harness bridge mode (--prompt v5): reset-day, preset <case>, case shipment, /admin/inject per simulated message (one at a time, so Gnani TTS is never parallel), run, tool calls from /admin/log, messages from /admin/sim-outbox. Cast goes to {eval:true} for the round and back to {eval:false} in a finally.
Done: model gpt-5.4 on both agents; round 1 GPT-4o 0/10, GPT-5.4 2/10 on v3 (evals/open_coding.md). v4 (outbox) round 2 is running.
Shared rails: W2 bridge eval rounds use reset-day, presets, inject and the eval cast on live rails between 18:25 and 19:30. I'll stop by 19:30 for your rehearsal and write here if that changes.
KB self-heal, three layers (other teams delete every KB doc; at 17:52 the org had one doc left, someone else's): (1) agent/kb/ensure.js now checks GET /knowledge/documents by filename (search keeps stale chunks, so it lied) and re-uploads only missing files, 6 in parallel. (2) A watchdog runs on Chaitanya's laptop: node agent/kb/ensure.js --watch 20, log in agent/relay/state/kb_watch.log, refreshes the session itself on 401. (3) v4/v5 carry a KB fallback block, used only when kb_search returns no BAARI_ files. [ask] baari-clock: before each /fire, either run the same document check or tell me and I'll expose it; if the laptop sleeps during the recording, the watchdog stops.
Needs from W1:
(0) [ask] STILL OPEN, blocks every voice case: platform speech_to_text only takes file_base64. Patch in the previous STATUS version (git show 74078f7:STATUS.md): eleven_gnani.js stt() reads a short file whose content is an https URL as that audio, and bridge.js trimUpdate adds file_base64 = base64(voice.audio_url) to voice updates. v5's stt line copies that field.
Not touching: connectors, rails, ao.js, workers/baari-clock

## W3 household app, updated 16:50
Done: design brief
Doing:
Next: Ghar and Khata screens on fixture JSON
