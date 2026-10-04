# Writing style

Apply the `unslop` skill (.claude/skills/unslop/SKILL.md) to every response and every
file you write. No em dashes, no AI vocabulary, no inline-header lists that restate
themselves, sentence case headings, no chatbot filler. Have opinions, be specific.

Judge-facing answers (anything in `submission/`) also go through the `/humanizer` skill
before they're final.

# Working in this repo

Two Claude Code sessions (Chaitanya's and Vinay's) build Baari in parallel on
`wafflebytes/baari`. Before any work, and every 30 minutes:

1. Read `COORDINATION.md` and follow it: lanes, commit format, commit-comment tags.
2. `git pull --rebase`, read recent commits and commit comments, read `STATUS.md`.
3. Stay in your lane's folders. Ask the other lane through a commit comment.

The plan is `prd/PRD.md` with `prd/ENGINEERING.md`. Evals: `evals/EVAL_PLAN.md`.
App design: `design/DESIGN.md`. Answers: `submission/ANSWERS_PLAN.md`.
Platform facts: the `agenticorg-prd` skill in `.claude/skills/`. Its tags ([live],
[docs], [ours], [unverified]) matter; test anything unverified before depending on it.

Never commit secrets (`.env`, `.ao-session.json`, keys, tokens, real phone numbers).

Deadline: Sunday 4 October 2026, 23:59 IST. Prompt freezes at 21:00 IST.
