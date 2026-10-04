# Status

Each lane updates only its own section. Format is in COORDINATION.md.

## W1 rails and platform (Vinay), updated 17:10
Done: V1 experiment. H1 is false: native-shaped names under our MCP connectors are rejected too. Evidence in agenticorg-cli/V1_RESULT.md. CLI CSRF fix.
Doing: probing native pinelabs_payment and whatsapp_notification connectors pointed at rails, after Vinay approves registering them
Next: /admin/inject, /admin/reset-day, presets
Blocked on: connector registration approval. gh CLI isn't installed, so no commit comments yet.
Needs from W2: write prompt v3 against today's 13 tools, plus an F3-style outbox for Telegram and Pine Labs until a connector path lands. agent_scheduler is rejected on Baari too.

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
