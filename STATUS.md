# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 18:10
Done: V1 (bc617e6). Bridge on elevenlabs_gnanibaari (00397f7), results now in labels and voice_id (660ef45). Rails ops (b3e3773): reset-day, presets, cast and solo mode, inject, run-output, health, recording tag, max_daily_debit. Sim sink and eval cast for platform evals (660ef45). C3 baari_extract on STT (ef55568). Smoke 45/45. Household mandate v1-sub-baari-sharma402.
Doing: /app/state and /app/events with CORS
Next: baari-clock Worker (POST /fire, GET /status, crons, R2 baari-media), then solo-mode rehearsal of run 1 (cast C) before 21:00
Blocked on: nothing
Shared rails: I write here before any reset-day, preset or recording change on live. No resets planned before 19:30.
Needs from W2: put the cast back with {"eval":false} after each eval round. Cap sim TTS at 1 at a time (Gnani gave us 429s around 17:50).

## W2 brain and evals (Chaitanya), updated 18:20
Thanks for 660ef45: labels, voice_id outcomes, sim sink and eval cast are exactly what v5 needs.
Done: prompt v5 (agent/prompts/v5.md): Telegram and Pine Labs as real bridge calls, task text is only PHASE, NOW, DATE_FOR, PEOPLE, HANDOFF. No OUTBOX, no relay. So baari-clock /fire only needs to send that task (buildTask({..., bridge:true}) in agent/relay/core.js) and save the output to /admin/run-output. I am not building fire.js or /api/fire; the clock is the trigger.
Done: harness bridge mode (--prompt v5): reset-day, preset <case>, case shipment, /admin/inject per simulated message (one at a time, so Gnani TTS is never parallel), run, tool calls from /admin/log, messages from /admin/sim-outbox. Cast goes to {eval:true} for the round and back to {eval:false} in a finally.
Done: model gpt-5.4 on both agents; round 1 GPT-4o 0/10, GPT-5.4 2/10 on v3 (evals/open_coding.md). v4 (outbox) round 2 is running.
Shared rails: W2 bridge eval rounds use reset-day, presets, inject and the eval cast on live rails between 18:25 and 19:30. I'll stop by 19:30 for your rehearsal and write here if that changes.
Heads-up: our KB files were deleted again during round 2 (someone else in the org). agent/kb/ensure.js restores them before every case; the recording run should call it too (node agent/kb/ensure.js) right before 21:00.
Needs from W1:
(0) [ask] STILL OPEN, blocks every voice case: platform speech_to_text only takes file_base64. Patch in the previous STATUS version (git show 74078f7:STATUS.md): eleven_gnani.js stt() reads a short file whose content is an https URL as that audio, and bridge.js trimUpdate adds file_base64 = base64(voice.audio_url) to voice updates. v5's stt line copies that field.
Not touching: connectors, rails, ao.js, workers/baari-clock

## W3 household app, updated 16:50
Done: design brief
Doing:
Next: Ghar and Khata screens on fixture JSON
