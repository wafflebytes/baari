# Baari

Round 3 build, start here: [prd/PRD.md](prd/PRD.md), then [COORDINATION.md](COORDINATION.md) and [STATUS.md](STATUS.md). Engineering design is in [prd/ENGINEERING.md](prd/ENGINEERING.md), evals in [evals/EVAL_PLAN.md](evals/EVAL_PLAN.md), app design in [design/DESIGN.md](design/DESIGN.md), answers in [submission/ANSWERS_PLAN.md](submission/ANSWERS_PLAN.md).

The rest of this file is the original PRD kit readme.

## Baari PRD kit

Everything needed to write the Baari PRD for The Ken x Pine Labs build round (AgenticOrg) on a fresh machine, plus the code that's already running. No secrets are in this zip.

## Start the PRD in 3 steps

1. Unzip anywhere and open the `baari-prd-kit` folder in Claude Code (desktop app Code tab, or `claude` in a terminal from inside the folder).
2. Check the skill loaded: type `/agenticorg-prd`. If it's listed, you're set.
3. Ask:

   > Use the agenticorg-prd skill. Read context/ and research/, then write the Baari PRD into prd/PRD.md using the template.

That's all the PRD needs. No Node, no keys, no login. The skill already holds the platform's live catalog and the Gnani, Delhivery and Pine Labs docs.

## What's in here

| Path | What it is |
| --- | --- |
| `.claude/skills/agenticorg-prd/` | The skill. Start at `SKILL.md`: competition rules, platform limits, connector catalog, vendor files, PRD template |
| `.claude/skills/unslop/` | Writing-style skill that `CLAUDE.md` applies to every answer |
| `CLAUDE.md` | Project instructions Claude Code loads automatically |
| `context/` | Where the project stands: Round 2 stances, Round 3 rules and platform facts |
| `research/` | Round 1 submission, Round 2 answers, household interview transcripts, synthesis, meeting notes |
| `round3/` | Prompt versions (v1, v2), 13 eval cases, test run log |
| `baari-mock/` | Mock server live at `https://baari-rails.vercel.app`: Delhivery and Pine Labs mocks, Gnani adapter, Telegram relay, Sheets bridge |
| `agenticorg-cli/` | `ao.js`, a command-line wrapper for the AgenticOrg website (agents, tools, prompts, connectors, runs) |

Left out on purpose: `.env` files, the saved login session, Vercel project link, raw chat session dumps, and the 12 MB `Respondent 8.mp3`. Ask Vinay for these if needed.

## Optional: run the code

Needs Node 20 or newer. Neither project has npm dependencies, so there's no `npm install`.

### CLI against the live platform

```bash
cd agenticorg-cli
cp .env.example .env
```

Put your own AgenticOrg email and password in `.env`, then:

```bash
node ao.js login
```

```bash
node ao.js agents
```

`login` saves a session to `.ao-session.json` (git-ignored). After that, delete the password from `.env`. Each teammate logs in with their own account. `node ao.js help` lists every command. Approvals are left to the website on purpose.

### Mock server locally

```bash
cd baari-mock
cp .env.example .env
```

Fill the values (the key names are listed in `.env.example`; get them from Vinay or make your own). Start the server, which listens on port 3939 (set `PORT` to change it):

```bash
npm run dev
```

Then, in a second terminal in the same folder, run the smoke test against it (set `BASE` if you changed the port):

```bash
npm test
```

The server and smoke test also run with an empty `.env`: we checked all 19 checks pass on a clean copy. Without Upstash variables it uses an in-memory store. Gnani, Telegram and Sheets calls need their real keys. The deployed copy at `baari-rails.vercel.app` is the one the agent uses, so you only need this to change the mock.

## Deadline

Submissions close Sun 4 Oct 2026, 11:59pm IST.
