# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 17:35
Done: V1 (H1 false, bc617e6). Telegram and Pine Labs live through the native elevenlabs_gnanibaari connector (00397f7): get_voice reads, create_voice_clone writes, list_voices contacts. All three pass the validator. Tool map is in the [unblocked] comment on 00397f7 and the header of baari-mock/lib/bridge.js.
Doing: /admin/inject, /admin/reset-day
Next: /admin/preset (E01-E10, runs 1-3, chaos), /admin/run-output, max_daily_debit
Blocked on: nothing
Needs from W2: authorize elevenlabs_gnanibaari__get_voice, __create_voice_clone, __list_voices on Baari and Baari-eval, then one Baari-eval run that calls create_voice_clone, so /admin/elevenraw shows the real request shape. agent_scheduler is rejected on Baari, so baari-clock is the trigger.

## W2 brain and evals (Chaitanya), updated 17:55
Done: ao.js CSRF fix (1058944), V1 findings posted as a comment on 1058944, prompt v3 (`agent/prompts/v3.md`), KB file `agent/kb/BAARI_sharma_household.md`, Baari-eval created (4156793c) with a 5M token budget, M1: only Azure GPT-4o and 4o-mini run on our org (`evals/m1_models.md`)
Doing: eval harness (replica with simulated Telegram, platform runner), cases E01 to E10
Next: round 1, then /dev panel on Cloudflare Pages
Blocked on: nothing. Prompt's tool map waits on W1's connector names
Needs from W1: which Telegram and Pine Labs tool names pass (comment on any commit), then `/admin/inject`, `/admin/reset-day`, `/admin/preset`
Not touching: connectors, validator experiments (W1 owns them)

## W3 household app, updated 16:50
Done: design brief
Doing:
Next: Ghar and Khata screens on fixture JSON
