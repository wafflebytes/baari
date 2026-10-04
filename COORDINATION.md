# How the two sessions work together

Two Claude Code sessions build Baari at the same time: Chaitanya's and Vinay's. They share one GitHub repo, `wafflebytes/baari`, and one AgenticOrg login. This file is how they avoid stepping on each other and how they push each other forward. Both sessions read it at start and follow it without being asked.

The goal isn't to stay out of each other's way. It's that each session's work makes the other's next hour better, and says so.

## Lanes

Each lane owns its folders. Write only in your own. Shared files have owned sections.

| Lane | Person | Owns | Platform rights |
| --- | --- | --- | --- |
| W1 rails and platform | Vinay | `baari-mock/`, `agenticorg-cli/`, `recording/` | Connectors: register, edit, delete. Rails deploys on Vercel. Telegram bot. |
| W2 brain and evals | Chaitanya | `agent/`, `evals/`, `submission/` | Agents `Baari` and `Baari-eval`: prompt, config, tools list, runs. |
| W3 household app | Chaitanya, unless Vinay frees up | `app/`, `workers/` (Cloudflare Pages and Workers, PRD section 16) | none |
| Shared | both | `prd/`, `COORDINATION.md`, `STATUS.md`, `CLAUDE.md` | |

Need something in the other lane? Don't edit their files. Ask (see "Asking" below). The one exception: a one-line fix that unblocks you, in a file nobody touched in the last 30 minutes, with a commit message starting `[cross-lane]` and a commit comment explaining it.

Never both at once on the platform: W1 doesn't edit agent prompts, W2 doesn't edit connectors. Adding a tool to an agent's authorized list is W2, after W1 says the connector is ready.

## The loop every session runs

At session start, then every 30 minutes or before starting any new task:

```bash
git pull --rebase
```

```bash
git log --since="45 minutes ago" --format="%h %an %s"
```

```bash
gh api repos/wafflebytes/baari/comments --jq '.[-15:][] | "\(.commit_id[0:7]) \(.user.login): \(.body)"'
```

Then read `STATUS.md`. Then decide what to do next. If the other lane shipped something you were waiting on, use it now instead of finishing your own plan first.

## Committing

- Small commits, each one working. Pull with rebase before every push.
- Message format: `[W1] what changed, in plain words` (or W2, W3, W4). Add `Refs: US-06` when it moves a user story from the PRD.
- Never commit secrets: `.env` files, `.ao-session.json`, API keys, the AgenticOrg password, bot tokens, real phone numbers. The root `.gitignore` blocks the usual ones. If you see a secret in a diff, stop and remove it before pushing.
- End commit messages with the attribution line your session's instructions give.

## Talking through commit comments

Commit comments are the message bus. They're attached to the exact code they're about, and both sessions read them on every loop.

```bash
gh api repos/wafflebytes/baari/commits/<sha>/comments -f body="[unblocked] ..."
```

Tags, at the start of the body:

| Tag | Use it when | Must include |
| --- | --- | --- |
| `[unblocked]` | Your commit makes something possible for the other lane | What they can do now, the exact command or URL, how you tested it |
| `[ask]` | You need something from the other lane | What, why, by when, and what you'll do if it doesn't come |
| `[blocked]` | You can't proceed | The error text, what you tried, the fallback you're taking meanwhile |
| `[used]` | You built on their commit | What it enabled, with evidence (a run id, a passing case, a screenshot path) |
| `[idea]` | You saw a way to make their work better | One concrete change and why. Not a vague suggestion. |
| `[review]` | You read their commit and found a problem | File and line, the failure it causes, a suggested fix |

### Positive reinforcement, done properly

When the other session's commit helps you, leave a `[used]` comment on that commit within the same loop. Say what it let you do and point at proof. Example: "`[used]` The `/admin/inject` endpoint let me run E01 to E10 on the replica with no phones. Round 1 is in `evals/runs/r1/`, 7 of 10 pass." This tells the other session which kind of work moves the project, so it does more of it.

When you finish a task, before picking your next one, look at the other lane's last three commits and leave at least one `[idea]` or `[review]` if you have a real one. Don't invent praise or filler. One specific useful comment beats three generic ones.

## STATUS.md

One section per lane. Update your own section when you finish a task or at least every hour. Keep it short:

```markdown
## W1 rails and platform (Vinay), updated 18:05
Done: V1 experiment, H1 holds, aliases live (abc1234)
Doing: /admin/preset for E01-E10
Next: C3 on STT
Blocked on: nothing
Needs from W2: final list of tools to authorize on Baari by 18:30
```

## Contracts between lanes

These are fixed in the PRD. Changing one is a two-step thing: commit the change to the PRD section, then leave an `[ask]` on that commit for the other lane to confirm before you build on it.

| Contract | PRD section | Producer | Consumer |
| --- | --- | --- | --- |
| Tool names and aliases | 6.2 | W1 | W2 prompt tool map |
| Admin endpoints (`preset`, `inject`, `reset-day`, `run-output`) | 7 | W1 | W2 harness |
| C3 STT extraction fields | 8 | W1 | W2 prompt K2 |
| `/app/state` JSON | 11.3 | W1 | W3 app |
| HANDOFF schema | ENGINEERING 2.3 | W2 prompt | W1 `run-output` parser, W3 app |
| DECISIONS line format | 9.1 | W2 prompt | W1 parser, W4 answers |

## Secrets

All shared keys live in `.env.shared` at the repo root. It's git-ignored, and `.env.shared.example` lists the names. Copy the lines each tool needs into its own local `.env`. Names each lane needs:

| Where | Keys |
| --- | --- |
| `agenticorg-cli/.env` | `AO_EMAIL`, `AO_PASSWORD` (delete after `node ao.js login`) |
| `baari-mock/.env` and Vercel | `GNANI_API_KEY`, `BOT_TOKEN`, `MCP_API_KEY`, `ADMIN_KEY`, `DELHIVERY_TOKEN`, `SHEETS_URL`, `SHEETS_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `OPENROUTER_API_KEY` (for C3) |
| `evals/.env` | `OPENROUTER_API_KEY`, `RAILS_BASE`, `RAILS_ADMIN_KEY`, `RAILS_MCP_KEY` |
| Cloudflare (`wrangler`, Pages and Worker secrets) | `CLOUDFLARE_API_KEY`, `CLOUDFLARE_EMAIL`, `CLOUDFLARE_ACCOUNT_ID`; Pages secret `RAILS_ADMIN_KEY`; Worker secrets for the AgenticOrg session |

Share keys person to person, not in commits or commit comments.

## When the deadline bites

Cut order is in PRD section 14. If you cut something, say so in STATUS.md and in a commit comment, so the other lane doesn't build on it. Prompt freezes at 21:00 IST. After that, W2 changes nothing on `Baari` until the recordings are done.
