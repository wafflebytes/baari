# Kickoff prompt for Vinay's Claude Code session

Paste everything below the line into a fresh Claude Code session opened in your clone of `wafflebytes/baari`, after you've put `.env.shared` (sent by Chaitanya) in the repo root.

---

You're the W1 session (rails and platform) for Baari, our Round 3 build for The Ken x Pine Labs. Chaitanya's session is W2 (agent brain, evals) and W3 (household app on Cloudflare). We build in parallel on this repo and talk through commit comments. Deadline is today, Sunday 4 October 2026, 23:59 IST. Prompt freeze 21:00 IST.

Before anything else:

1. `git pull --rebase`, then read, in order: `CLAUDE.md`, `COORDINATION.md`, `STATUS.md`, `prd/PRD.md` (all of it), `prd/ENGINEERING.md` sections 1.4, 2.2 and 3.3, and the `agenticorg-prd` skill in `.claude/skills/`. Follow COORDINATION.md for the whole session without being reminded: your lane is `baari-mock/`, `agenticorg-cli/`, `recording/`, `workers/baari-clock/`, plus all connector changes on AgenticOrg. Don't edit agent prompts or other lanes' folders.
2. Set up env from `.env.shared`: copy the AgenticOrg lines into `agenticorg-cli/.env` (I'll type the password myself, then run `node ao.js login`), and fill `RAILS_ADMIN_KEY`, `RAILS_MCP_KEY` and `TELEGRAM_BOT_USERNAME` in `.env.shared` from Vercel. Then tell me to send the updated file to Chaitanya directly (never via git).

Then work this list in order. Post a commit comment with the right tag after each item, and update your section of STATUS.md.

1. **V1, the validator experiment (PRD 6.2). Do this first, it decides everyone's next three hours.** Check `GET /tools?detail=true` for a native delhivery connector, run `check-tools` on the native-shaped names, and if H1 holds, add the alias tools in `baari-mock/lib/tools.js`, deploy, re-discover the MCP connectors, and prove one live call per alias reaches our server (`/admin/mcplog`). Probe `pinelabs_payment` with our Base URL in parallel. Post `[unblocked]` with the exact tool names W2 should authorize, or `[blocked]` with the evidence and the fallback you're starting (F1 email to the organisers today regardless).
2. Rails admin endpoints from PRD 7: `/admin/inject` (with Gnani TTS for `audio_text`), `/admin/reset-day`, `/admin/preset` (E01 to E10, the three recorded runs, the five chaos presets from PRD 17), `/admin/run-output`, and `max_daily_debit` with `DAILY_LIMIT_EXCEEDED` on the Pine Labs mock. Add the trimmed MCP tool views. Extend `test/smoke.js` for each and keep it green.
3. Capability C3 on the STT adapter (PRD 8): the `baari_extract` fields exactly as specified, with OpenRouter (`OPENROUTER_MODEL_SIM`) for extraction and `commitment: "unclear"` on any failure.
4. `/app/state` and `/app/events` with CORS on GET (PRD 7 and 11.3), so the Cloudflare app can read them.
5. The `baari-clock` Worker on Cloudflare (PRD 16 and 18.3): `POST /fire` and `GET /status` behind a key, cron triggers for each phase, R2 bucket `baari-media`.
6. One-person demo support (PRD 18): `/admin/cast` with `/start role_<name>` deep links, solo-mode routing in the Telegram relay (role prefix out, `reply_to_message_id` in), `/admin/health`, and the `RECORDING` tag through to the logs. You're the one who'll record alone with your mom joining, so test it the way you'll use it: rehearse run 1 from `/dev` with cast C (you alone) before 21:00.
7. Recording prep: Telegram bot started on three phones, presets rehearsed, then the three recordings (PRD US-16 and 17.1) after the 21:00 freeze.

How to work:
- Simulate humans yourself when testing. Don't ask me to send Telegram messages for checks; use `/admin/inject`. Ask me only for things that need my hands (passwords, Vercel, phones for the recording).
- Every 30 minutes run the loop in COORDINATION.md. When Chaitanya's session ships something you can use, use it and leave a `[used]` comment with evidence. When you finish a task, read their last three commits and leave one real `[idea]` or `[review]` if you have one.
- Never commit secrets. Never touch agent prompts. Anything unverified in the skill gets tested before you build on it.
- Writing follows the unslop rules in CLAUDE.md.

Start with step 1 of "Before anything else", then V1.
