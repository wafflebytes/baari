# Handoff: Chaitanya's lane (W3 and W2) to Vinay

Written 8 October 2026, about 21:45 IST, when Chaitanya's session ran out. This
covers the state of the work, what's left, and how the work has been done, so
a fresh Claude Code session can pick it up cold. Paste the prompt at the
bottom into a new session.

## Where things stand

About 35% of the finale plan in `prd/FINALE_HANDOFF.md` is done (that file is
gitignored; get it from Chaitanya person to person).

| Phase | State |
|---|---|
| P0 tests | About 40%. T1 partial, T2 partial (vote night locked Kadhi chawal 2 to 1 at 21:30; brief and vote privacy in the outbox not checked yet), T3 pass, T4 partial, T15 pass, T17 half (old admin key from 4 October still works; rotate it on Vercel). Not run: T6 to T14, T16, T19 to T22, T24 to T26 |
| P1 sync basics | About 90% built. App side is live. Rails side is committed but **not deployed** |
| P2 kitchen and money | About 75%. Who's eating, night tasks (prep), three new dishes, kirana and Pine Labs cards in the island, pick and veto on the hero, call card, prompt v13 draft. Left: push v13 to Baari-eval, write and run E11 to E20, KB update with the new dishes |
| P3 one product | About 30%. Rails has pairing (`lib/pair.js`), `/app/pair`, `/app/say`, live run steps. App has the run steps in the island. Left: the "Telegram se judo" button in the app, the island mic and text thread, Kyun (S7), Baari calls to ask (S8) |
| P4 to P6 | Not started |

### The one blocker

Rails does not deploy from git. Every rails commit since bf04d0b (bf04d0b,
302d65d, d2b24ea and the P3 commit on top) is waiting on:

```bash
cd baari-mock && vercel --prod
```

Until then live `/app/state` takes about 7 seconds, and the app's new cards
(who's eating, kirana order, night task, run steps, event feed) stay hidden on
production because the fields aren't there. They all render in the fixture:
`https://baari.pages.dev/?fixture=sync`.

After the deploy, check:

```bash
curl -s -o /dev/null -w "%{time_total}\n" https://baari-rails.vercel.app/app/state
```

It should be under 1 second on the second call (2 second cache in memory and
in Redis under `app:state:cache`).

### Also not deployed

The app's last deploy is service worker v41 (`e7074583.baari.pages.dev`). The
P3 commit adds the island run steps to `app/app.js` and `app/app.css`. To ship
it: bump `CACHE` in `app/sw.js` to v42, then run `app/deploy.sh`.

### Cast and phones

All real roles were cleared. The cast is the eval sim cast (`POST /admin/cast
{eval:true}`): every role goes to a `sim-*` chat and messages land in
`GET /admin/sim-outbox`. We have three Telegram accounts at most, so the real
phone plan is Vinay (also plays Papa through solo mode), Mummy and Sunita.
Bind them with `/start role_<Name>` or, after the deploy, with the app's pair
code (`POST /app/pair {member}` returns a `t.me/Baari_ken_bot?start=p_CODE`
link, 10 minutes, works once).

## What was built (rails, `baari-mock/lib/`)

| File | What it does |
|---|---|
| `store.js` | `mget`, `setPx` added |
| `appfeed.js` | `state()` reads everything in one `Promise.all`, cached 2 s. Adds `approvals`, `run` (live steps), `attendance`, `prep`. `events()` passes event fields through |
| `events.js` (new) | `emit(kind, fields)` writes to `log` and `hh:events`. Telegram updates map to pick, ok, veto, vote, wish, pass, voice, msg, approve, deny |
| `attendance.js` (new) | Who's eating per date. EATING line for the task text. Sunita can't mark anyone; Mehmaan only themselves. A change after SHORTLIST, BUY or BRIEF wakes INBOX |
| `prep.js` (new) | Night tasks: soak rajma, chole, urad; set curd. PREP line, `hh.task` sends a "Soaked ✓" button, one reminder, missed wakes INBOX with a quick plan |
| `pair.js` (new) | Pair codes and deep links, claimed in `telegram.js` before the role picker |
| `household.js` | NEEDS line (scaled by headcount), potato rule only if Papa eats, new dishes and pantry items |
| `wake.js` | Task text gets EATING, NEEDS, PREP. `run:current` for live steps. Order card in English |
| `bridge.js` | `hh.away`, `hh.guests`, `hh.task`. Stores `hh:ask` for approvals. Reply events |
| `app.js` | POST `/app/away`, `/app/guests`, `/app/approve`, `/app/prep`, `/app/pair`, `/app/say`. `/admin/inject` now wakes rails |
| `kirana.js` | Drops 0 qty lines |

Tests: `node test/attendance.js` (12), `node test/prep.js` (9). Smoke passes
60 of 61; the one failure is old and sits in Pine Labs code. Run smoke against
a local server:

```bash
cd baari-mock && env -i PATH="$PATH" PORT=3939 MCP_API_KEY=t ADMIN_KEY=t HOUSEHOLD_KEY=hk node server.js
```

## What was built (app, `app/`)

- `functions/api/[[path]].js` proxies POSTs on an allow list, caps bodies at
  32 KB and adds `x-household-key` from the Pages secret `HOUSEHOLD_KEY`. No
  key ever reaches the browser.
- `app.js`: the turn comes from rails (`railTurn`, `duty()` reads
  `turn.holder`), optimistic writes with undo (`turnWrite`), who's eating
  (`att()`, `headcount()`, `facesRow`, `eatSheet`), kirana card
  (`kiranaCard`), demo night badge and sheet, night task card (`.ntk`), Diary
  feed "Ghar mein kya hua" (`feedHtml`, `evKind` covers every event kind),
  island asks for Pine Labs, approvals and tasks, island run steps
  (`runLive`, `.islx-run`).
- Copy pass so Baari speaks as a woman everywhere.
- Fixture `app/fixtures/sync.json` holds every new field.

## Prompt

`agent/prompts/v13.md` is a committed draft and has not been pushed to any
agent. It adds the EATING, NEEDS, PREP and EVENT lines, the `hh_away`,
`hh_guests`, `hh_task` tools and rules A1 to A4, P1 to P3, K1, M1, M3, V6.
Push it to **Baari-eval** (4156793c-783d-493d-98f9-f363f32e26c5) only, never
the live Baari agent, and run evals there:

```bash
node evals/harness/run.js --round R --target platform --prompt v13 all
```

The harness patches Baari-eval and uses rails presets, so don't run it while
a live night is running.

Known agent bugs from T1 and T4, fixed in rails or v13 but not live:
- It missed besan and rice for kadhi chawal. Fixed by the NEEDS line.
- It ordered "tomato 0 g". Rails drops 0 qty lines now.
- It said "Papa picked" when the dish was the default. v13 needs a line for this.
- Gnani labels a counts reply `vague_yes`. Open.

## How to run a test night

Scripts are in `baari-mock/scripts/`. Both read `RAILS_BASE` and `ADMIN_KEY`
from the environment (source `.env.shared`; never print it).

```bash
set -a; source .env.shared; set +a; python3 baari-mock/scripts/drive.py vote
```

Scenarios: `veto`, `vote`. The driver starts a demo night (`/admin/demo`),
waits for the shortlist, injects taps (`/admin/inject`), calls
`/admin/wake/run` and prints the lock and the outbox. `watch.sh` polls the
demo and wake state. Log each result as a row in `docs/DEMO_TESTS.md`.

## How the work has been done

- **Lanes.** Chaitanya's lane is `app/`, `workers/`, `agent/`, `evals/`,
  `submission/`, `film/`. Rails (`baari-mock/`) changes by W3 are titled
  `[W1 by W3] ...`. Never touch `lib/pinelabs*.js` or the bridge's `pl.*`
  handlers.
- **Commits.** `[W3] ...` or `[W1 by W3] ...`, ending with the Co-Authored-By
  line. Scan the staged diff for secrets before every commit.
- **Pulling.** `git pull --rebase --autostash`. `film/src/v/hose.tsx` stays
  uncommitted. `submission/Baari_build_session.html` is never committed.
- **Docs.** `STATUS.md` (W3 section) after each chunk. `prd/PRODUCT.md` when
  a shipped change alters what the product does (not yet updated for P1 to
  P3; do it after the rails deploy). `docs/DEMO_TESTS.md` for test rows.
- **Approach.** Rails owns facts and guards; the agent owns decisions. Rails
  writes a plain English line into the task text (EATING, NEEDS, PREP) so the
  agent never does arithmetic or clock maths. Every write emits an event so
  the app's Diary and island show everything that happened. New app features
  render from a fixture first, then hide on production until the field exists.
- **Language.** The app is Hinglish by default. Anything new on Telegram is
  plain English (prompt v12 and later). Sunita's lines are Hindi. Baari
  speaks as a woman.
- **Writing.** The unslop skill on everything: no em dashes, sentence case
  headings, no filler.
- **Design.** `design/DESIGN.md`. Motion uses transitions.dev tokens
  (`--duration-*`, `--ease-smooth-out` and so on); no ad hoc durations. Dark
  island, Family font (licensed files in `app/fonts/` are gitignored). Check
  every screen at 375x812 and on a real iPhone 15: centering, corner radius,
  nav pill on the active tab. The local preview is `.claude/launch.json`
  entry `baari-app` on port 4174.
- **Deploys.** App only via `app/deploy.sh` (Cloudflare Pages project `baari`,
  `--branch main`) and bump the service worker cache every time. Rails via
  `vercel --prod` from `baari-mock/`.
- **Secrets.** `.env.shared` is shared person to person and gitignored. Never
  commit or print keys, tokens, chat ids or phone numbers. Never type the
  AgenticOrg password. The ElevenLabs key lives only in `film/.env`.

## Next steps, in order

1. Deploy rails (`vercel --prod`), check `/app/state` timing, rotate the old
   admin key (T17).
2. Bump sw to v42, deploy the app, open `baari.pages.dev` and check the new
   cards show with live data.
3. Finish P0: T2 (vote privacy in the outbox), T6, T10, T11, T7, T8 (simulated
   call via `POST /admin/call {sim:true}`), then the real phone rows T9 and
   T12 to T14, T19 to T22, T24 to T26. Then T16 (E01 to E10 on Baari-eval).
4. Push v13 to Baari-eval, write E11 to E20, run them.
5. P3 app side: the pair button, the island mic and thread (`/api/say`,
   `/api/stt`), Kyun, Baari calls to ask.
6. Update `prd/PRODUCT.md` and the W3 section of `STATUS.md`.
7. P4 to P6 if time allows: judge households, cuisine, quiet log, voice
   prefs, the clip pipeline and a shot list for real phone clips.

## Prompt for a new Claude Code session

```
You're picking up Chaitanya's lane (W3 and W2) of Baari on wafflebytes/baari.
Read CLAUDE.md, COORDINATION.md, STATUS.md, prd/PRODUCT.md,
prd/FINALE_HANDOFF.md (gitignored, ask Vinay if missing) and
docs/HANDOFF_W3.md, in that order. HANDOFF_W3.md says what's built, what's
not deployed, how the work has been done and the next steps. Follow its
rules on lanes, commits, secrets, language, design and deploys exactly.

Start with "Next steps, in order" step 1. Rails deploys only by hand with
`vercel --prod` from baari-mock/. After each step, update STATUS.md and
docs/DEMO_TESTS.md, scan the staged diff for secrets, commit, and push.
Ask me before anything that sends a real Telegram message to a family
phone, places a real order or payment, or changes the live Baari agent's
prompt (v13 goes to Baari-eval only).
```
