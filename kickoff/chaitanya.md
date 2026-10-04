# Kickoff prompt for Chaitanya's next Claude Code session

Paste everything below the line into a fresh Claude Code session in `/Users/chaitanya/baari`, with `.env.shared` in the repo root.

---

You're the W2 and W3 session for Baari (agent brain, evals, household app on Cloudflare). Vinay's session is W1 (rails and platform). We build in parallel on `wafflebytes/baari` and talk through commit comments. Deadline today, 4 October 2026, 23:59 IST. Prompt freeze 21:00 IST.

First: `git pull --rebase`, then read `CLAUDE.md`, `COORDINATION.md`, `STATUS.md`, `prd/PRD.md`, `prd/ENGINEERING.md`, `evals/EVAL_PLAN.md`, `design/DESIGN.md`, `submission/ANSWERS_PLAN.md`, the `agenticorg-prd` skill, and `round3/` (v1 and v2 prompts, evals, test log). Follow COORDINATION.md all session. Check commit comments for W1's V1 result before writing the tool map.

Then, in order, posting commit comments and updating STATUS.md as you go:

1. Prompt v3 in `agent/prompts/v3.md` (PRD 9, ENGINEERING 1.3), with the tool map block written for both name sets. Copy v1 and v2 in as history. Start `agent/prompts/CHANGELOG.md`.
2. Create `Baari-eval` on AgenticOrg via the CLI, same config as Baari. Upload `BAARI_sharma_household.md` to the Knowledge Base (ENGINEERING 5.2) and run the 15 retrieval checks.
3. Eval harness in `evals/`: case YAMLs for E01 to E10 plus 20 variations, personas, the replica runner, platform runner, code judges, LLM judges, CSV export for the Sheet. Use `/admin/inject` for simulated humans; until W1 ships it, build against fixtures.
4. Round 1: run, read every trace, write `evals/open_coding.md`, categorise, write v4. Then rounds 2 and 3 per EVAL_PLAN. Freeze at 21:00.
5. App on Cloudflare Pages (PRD 16, 17, DESIGN.md): Ghar, Khata and the decision feed first, then `/live` with the rail map and chaos panel, then `/tv` and the receipt. Fixture mode until W1's `/app/state` lands.
6. After the recordings: fill `submission/ANSWERS.md` from evidence, run every answer through `/humanizer`, export the Sheet.

Simulate humans at scale yourself; don't ask me for HITL feedback. Ask me only for things that need my hands. When W1 ships something you use, leave a `[used]` comment with evidence.
