# Ambient Baari: the build plan for W1 and W3

Written 8 October 2026, 17:00 IST, for the panel with Gnani, Pine Labs and Delhivery. This replaces `prd/VOICE_HANDOFF.md`. The voice picker work is now step 6 of Vinay's prompt below.

The pitch is an ambient agent: someone says a thing once, anywhere, in any language, and the night changes without anyone opening the app. Baari stays quiet unless it hits something it can't decide. Here's the test we hold ourselves to: at 4pm Mummy sends a Hindi voice note on Telegram, "kal Papa office mein khayenge". Nobody opens anything. By the next morning the shortlist, the kirana order, the bill and Sunita's brief are all for three people. Baari has also noticed that Papa is out every Thursday, and it asks him once whether to remember that.

There are two prompts below, one per session. Both build to the same contract in section 3. Neither changes it without a commit comment to the other.

## 1. Where we are

**Vinay (W1), 7 and 8 October:**
- `lib/wake.js`: a Telegram message starts the phase waiting for it, unknown messages go to the INBOX phase, and phases chain (LOCK, BUY, CHECK, BRIEF).
- `lib/turn.js`: pick and vote modes, plus the rotation and its history.
- `lib/household.js`: a live pantry, last cooked, last lost by, the Rs 300 approval guard, and only the six dishes.
- `lib/kirana.js`: the Sharma Kirana order book.
- `lib/pinelabs_uat.js`: real Pine Labs sandbox pay links.
- `lib/guest.js`: a judge can hold the night as Mehmaan.
- `lib/call.js`: a Twilio phone call with Gnani speaking.
- `lib/testkit.js`: `/test` and `/status`.
- Prompts v6 to v11, plus `/app/turn` and `/app/demo` behind `HOUSEHOLD_KEY`.

**Chaitanya (W3), the same two days:**
- App v2 to v7.3: the island as the hub, agentic onboarding with a visual rules page, Gnani voice input for the rules, the karaoke voice note, 19 island questions, the voice studio, Khata, Diary, TV, the receipt and dark mode.
- `/api/stt` through rails.

**The gap:** almost everything the app learns stays on the phone. The agent still plans for the fixed Sharma four from the KB.

## 2. Where we've drifted from the Round 3 answers

Some of this drift makes the product better and some is a hole. The panel deserves the current truth, so the pitch and any slides should follow this list, not `submission/ANSWERS.md`.

1. **Votes became a turn.** Q1 and Q4 tell a vote story: Papa's aloo puri vote counts for rajma. Since v7 the default is pick mode, where the holder picks and the others can veto. Papa's vote only counts in vote mode. The story still works in vote mode, so say which mode is running.
2. **The kirana gets paid the night before.** Q1 ends with Baari paying Sharma Kirana Rs 45 after Sunita's reply. Since v9, Baari orders from the kirana the night before and pays at once, so Sunita only collects, and K4 settles only a difference she reports. The kirana order book is a fourth invented capability. Q6 listed three. It's marked as an invention in its responses, so show it as the fourth.
3. **Pine Labs is partly real now.** Q5 and Q7 call Pine Labs a mock. v11 sends approvals over Rs 300 as real Pine Labs sandbox pay links. The CHANGELOG says the paid path hasn't run yet. Reserve Pay debits and the payee debit are still the mock. Don't claim real money moved.
4. **Phases aren't only on a clock.** Q5 says the clock Worker starts each phase at its IST time. Rails now wakes on Telegram messages and chains phases. This is the backbone of the ambient story, and it's newer than the answers. `agent_scheduler` is still rejected.
5. **The phone call makes decisions outside AgenticOrg.** The answers don't mention the Twilio call. In `lib/call.js`, a small LLM on rails writes the spoken lines and classifies what the family decided ("chose a dish, yes, no"). The agent still locks and pays. The Round 3 rule was that decisions live in AgenticOrg, and reading "haan" as a yes is a decision. If you show the call, say so. Twilio is also a non-partner carrier, though Gnani does all the speech.
6. **Headcount was never decided.** PRD scope item 3 says Baari decides the headcount. In practice it's fixed at 4: in the KB, in the v10 guest note ("dinner for 4"), in `call.js`, and in the app's fallback `L.headcount || 4`. Nobody can say "Papa won't eat" today. This plan fixes that.
7. **Onboarding stays on the phone.** The names, rules page, vrat days, cook name, language and all 19 island answers never reach the agent. The clock's task text hardcodes `PEOPLE: Vinay (approves money), Mummy, Papa, Sunita (cook)`. The app implies Baari learns from what you tell it, which it doesn't yet. For an ambient pitch this is the biggest honesty gap.
8. **The app is half-wired to the turn.** It reads `local.duty` before `turn.holder`, as `docs/APP_BACKEND_SPEC.md` warned. It also can't write `/app/turn` or `/app/demo`, because the Pages proxy only forwards GETs. These are mine to fix.
9. **Lanes and commit messages.** The last five W1 commits are titled "fix: refactoring", yet they carry the Twilio call, the guest seat, Pine Labs UAT and prompts v9 to v11. They also edit `agent/prompts/` (W2) and `workers/baari-clock/` (W3). The work is good, but the history doesn't say what happened, and the answers point judges to "the W1 commits". From now on: `[W1] what changed`. Prompt changes go to Baari-eval first, then W2 reviews and pushes to Baari.
10. **Leaked keys.** The last W2 STATUS entry says RAILS_ADMIN_KEY and CLOCK_KEY are still the values leaked on 4 October, and Chaitanya pasted the rails MCP key in a chat on 8 October. Rotate all three before the panel. Rotating needs Vercel access, so Vinay does it.
11. **Good news worth telling: E04 is fixed.** Q10 said E04's fix "belongs in the tools". Since v8, rails refuses a big debit without Vinay's tap and refuses a shipment the block can't pay for. Tell the panel that.

## 3. The shared contract

Every write goes from the app through a Pages Function. The function adds `x-household-key` from the Pages secret `HOUSEHOLD_KEY`, so the browser never holds a key. Every write also logs an `/app/events` entry, so the Diary and the quiet log can show it.

### Read: new keys in `GET /app/state`

```json
{
  "attendance": {
    "date_for": "2026-10-09",
    "eating": ["Vinay", "Mummy", "Behen"],
    "away": [{ "name": "Papa", "by": "Mummy", "via": "telegram_voice", "said": "kal Papa office mein khayenge", "at_ist": "2026-10-08 16:02", "auto": false }],
    "guests": 0,
    "headcount": 3,
    "changed_after": null
  },
  "profile": { "home": "", "members": [{ "name": "", "eats": true, "in_baari": true, "lang": "hi-en" }], "cook": { "name": "", "arrives": "08:00", "lang": "hi-IN" }, "updated_at": "", "updated_by": "app" },
  "memory": {
    "facts": [{ "id": "f_12", "who": "Papa", "kind": "routine", "text": "Thursday ko bahar khaate hain", "say_it_as": "", "status": "proposed", "source": { "via": "pattern", "ref": "away 2026-09-25, 2026-10-02", "at_ist": "" }, "evidence": 2 }],
    "asked_week": 2,
    "learned_week": 5
  },
  "quiet": { "date_for": "2026-10-09", "handled": 14, "told": 1, "items": [{ "at_ist": "", "text": "Parcel late, moved tomato to Sharma Kirana", "told": false }] },
  "prefs": { "voice": { "owner": "chitra", "cook": "urmila" }, "lang": { "owner": "hi-IN", "cook": "hi-IN" }, "updated_at": "", "updated_by": "app" }
}
```

- `attendance.changed_after` is the phase already done when the last change came in: `null`, `"LOCK"`, `"BUY"` or `"BRIEF"`. The app uses it to say what happened, for example "Sunita ji ko bata diya: 3 log".
- `memory.facts[].kind` is one of `rule`, `like`, `dislike`, `routine` or `pantry`.
- `memory.facts[].status` is one of `proposed`, `confirmed` or `rejected`.
- `memory.facts[].source.via` is one of `app`, `telegram`, `telegram_voice`, `pattern` or `agent`.
- A missing key means "not built yet". The app hides that feature instead of faking it.

### Write: rails `/app/*`, reached from the app as `/api/*`

| Route | Body | Does |
| --- | --- | --- |
| `POST /app/away` | `{name, date_for?, back?: true, by}` | Marks a member as not eating, or back with `back`. `date_for` defaults to the next meal Baari plans. Returns `attendance`. |
| `POST /app/guests` | `{n, date_for?, by}` | Sets the guest count for that meal. |
| `POST /app/profile` | the onboarding `pick` plus names, cook, mode, langs, `answers: {question_id: value}` | Stores the profile. Rules from onboarding become `confirmed` facts with `via: "app"`. |
| `POST /app/memory` | `{id, action: "confirm" \| "reject" \| "edit", text?, by}` | Confirms, rejects or edits a fact. |
| `POST /app/prefs` | `{voice?, lang?}` | Merges and validates the voice preferences. |
| `POST /app/turn`, `POST /app/demo` | as in `docs/APP_BACKEND_SPEC.md` | Already live. |

Each `/app/*` write needs the household key, the same check `/app/turn` uses today.

### The agent's side

- **New task text lines.** Every task text gains `EATING` and `LEARNED`. `PEOPLE` comes from the profile, with the KB four as the fallback. For example:
  - `EATING 3 for 2026-10-09: Vinay, Mummy, Behen. Away: Papa (Mummy, Telegram voice, 16:02). Guests 0.`
  - `LEARNED: Papa: karela nahi (confirmed, Telegram). Mummy: kadhi pasand (confirmed, app).` This line lists confirmed facts only, at most 12, with the newest first.
  - A CHECK started by an event gets `EVENT: shipment <waybill> went <status> at <time>`.
- **Agent writes go through the bridge.** These names ride `create_voice_clone`, like `tg.send`:
  - `hh.away {name, date_for, back?, said}`
  - `hh.guests {n, date_for}`
  - `hh.learn {who, kind, text, say_it_as}`

## 4. Prompt for Vinay (W1 rails, Telegram, prompt v12 on Baari-eval)

Paste everything in this section into Vinay's Claude Code session.

---

You're in W1: `baari-mock/`, the Telegram bot, and the task text in `workers/baari-clock` (Chaitanya okays that cross-lane edit for the `EATING`, `LEARNED`, `EVENT` and `PEOPLE` lines only). We're turning Baari into an ambient agent for the panel with Gnani, Pine Labs and Delhivery: a person says something once, anywhere, and the plan changes without anyone opening the app.

Read these first: `prd/AMBIENT_HANDOFF.md` (sections 2 and 3 are the contract; build to it exactly), then `lib/wake.js`, `lib/household.js`, `lib/turn.js`, `lib/appfeed.js`, `lib/bridge.js`, `lib/gnani.js`, `lib/telegram.js` and `agent/prompts/v11.md`. Run `git pull --rebase`, and read COORDINATION.md before you start.

House rules for this work:

- Commit messages are `[W1] what changed, in plain words`. Never "fix: refactoring" again.
- Every module gets a smoke or scenario test in `test/`, the way `turn.js` has its 20.
- Before each push, scan the diff for secrets.
- Prompt changes go to `agent/prompts/v12.md` and onto Baari-eval only. Then leave an `[ask]` commit comment for W2 to review, rerun evals and push to Baari.
- Rails keeps the record and the guards. Every decision about food, money and what to say stays inside the AgenticOrg run. That's the Round 3 rule, so don't add another rails-side LLM that decides things.

### Step 1: who's eating (the demo moment, do it first)

1. **Store.** Keep one record per `date_for`: `attendance = {date_for, away: [], guests, changed_after}`. Derive `eating` from `profile.members` where `eats` is true. Until a profile exists, use the KB four: Vinay, Mummy, Papa and the younger sister (label her "Behen" until the profile names her). `headcount` is `eating.length + guests`, and at least 1 unless everyone is away.
2. **Route.** `POST /app/away` and `POST /app/guests`, behind the household key, as in section 3. Each write sets `changed_after` from the night's last finished phase, logs an `/app/events` entry (`kind: "away"` or `"guests"`, who, by whom, via what), and then reacts as follows:
   - **Before SHORTLIST:** nothing to do. The next SHORTLIST reads `EATING`.
   - **Shortlist sent, not locked:** fire INBOX with `extra: "EATING CHANGED: <line>"`. The agent decides whether the shortlist still holds. With Papa away, aloo puri becomes allowed (L3 applies to the people eating).
   - **LOCK done, BUY not yet:** nothing to fire. BUY reads `EATING` and scales.
   - **BUY done:** fire INBOX with `extra: "EATING CHANGED AFTER BUY: <line>"`. The agent doesn't cancel paid orders, tells Vinay only if money changes, and keeps the brief's count right.
   - **BRIEF sent:** fire INBOX with `extra: "EATING CHANGED AFTER BRIEF"`. The agent sends Sunita one short Hindi voice note with the new count only.
3. **Bridge.** Add `hh.away` and `hh.guests` for the agent. Who may mark whom:
   - Any family member may mark any family member, or themselves.
   - Mehmaan may only mark themselves.
   - Sunita can't mark a family member. If she says "Papa ne bola", the agent asks that person or Vinay to confirm.
   - Rails enforces these rules and returns `fail:NOT_ALLOWED`.
4. **Task text.** Put the `EATING` line in every phase's task text (section 3 has the exact shape).
5. **Telegram parity.** `/bahar` replies with an inline keyboard of faces for "kal kaun nahi khayega" and toggles on tap. `/mehmaan` gives +/- buttons. Plain speech ("kal Papa bahar khayenge", typed or spoken) already reaches INBOX, so the agent handles it with `hh.away`. Don't parse speech on rails.
6. **Fix the 4s.** Replace the hardcoded `headcount: 4` in `call.js`, and anywhere else, with `attendance.headcount`.

Tests:
- Mark Papa away at each of the five stages above. Each must give the right wake and the right `changed_after`.
- A Sunita `hh.away` for Papa returns `NOT_ALLOWED`.
- With Papa away, the bridge allows Aloo puri buttons, which the six-dish guard now refuses for Papa's plate. Check whether that guard is per person. If it isn't, make it apply to the people eating.

### Step 2: the profile, so onboarding stops being decoration

1. **Store.** `POST /app/profile` takes what onboarding collects:
   - home name, members (name, eats, in_baari, lang), cook (name, arrival time, lang), mode, languages
   - the rules page's `pick`: diet, jain, `avoid {who: {food: 1|2}}`, nv days, vrat days (multi), own lines
   - `answers` from the island: rotis per adult, spice, health goals, repeat gap, budget, the biggest order Baari can pay without asking, grocery source, leftovers, the cook's days off, guests, tiffins, which meals to plan, trying new dishes
2. **Turn rules into facts.** Each rule lands in memory (step 3) as a `confirmed` fact with `via: "app"`. A health avoid gets a plate-rule `say_it_as` ("Papa ki thali mein aloo nahi"), never a condition.
3. **Clamp the money answers.** The monthly budget and "pay without asking" may only be at or under the mandate's limits (Rs 400 a day, and the Rs 300 single-debit ask). Rails clamps them and says so in the reply. A household setting never raises a cap the UPI mandate set (L5).
4. **Task text.** `PEOPLE` comes from the profile when one exists, else stays as today. The KB stays the fallback.
5. **Tell W2.** The prompt's KB fallback block still names the Sharma four, so leave a comment.

### Step 3: memory that learns, and asks before it believes

1. **Store.** `memory.facts` as in section 3. `asked_week` counts the questions Baari asked this week (Telegram confirm asks plus island answers the app reports). `learned_week` counts the facts confirmed this week.
2. **Patterns, on rails, with no LLM.** In the existing minute tick, once a day, propose facts from evidence:
   - The same person vetoed or lost the same dish twice in 14 days: `dislike`.
   - Away on the same weekday 2 of the last 3 weeks: `routine`.
   - An item bought 3 times in 14 days: `pantry` ("atta jaldi khatam hota hai").
3. **The agent's own proposals.** `hh.learn {who, kind, text, say_it_as}` is for lasting things people say ("Papa ko karela pasand nahi", "Mummy mangal ko vrat rakhti hain"), not for tonight-only things.
   - When the speaker is talking about themselves and the kind isn't a health rule, store it as confirmed.
   - Anything about someone else, and every health rule, is stored as proposed.
4. **Asking.** At most one ask per person per day, and never between 22:00 and 08:00. Send that person (or Vinay, for a health rule about someone else) one Telegram line with Haan and Nahi buttons: "Yaad rakhun? Papa Thursday ko bahar khaate hain." A tap confirms or rejects the fact and logs an event.
5. **The medical guard.** Rails refuses any fact text containing a condition word: diabetes, diabetic, BP, blood pressure, cholesterol, thyroid, heart, kidney, pregnant, and their Hindi forms. It returns `fail:SAY_IT_AS_A_PLATE_RULE`. That's L4, held on rails.
6. **Routines act.** For a confirmed `routine` away, rails pre-marks that person away for the matching `date_for` with `auto: true` when SHORTLIST fires. The agent's shortlist message to them adds one line: "Kal Thursday hai, aap bahar ho na? Galat ho toh batao." A reply puts them back.
7. **Task text.** Put the `LEARNED` line in every task text.
8. **Telegram.** `/yaad` lists what Baari remembers about the sender, with a remove button on each fact.

### Step 4: the quiet log

Count it from what already happened, in `appfeed.js`, without calling any mock:
- `handled` is the night's D lines across runs.
- `told` is the messages sent to a person (`tg.send`, `tg.voice`) that weren't the night's own cards (shortlist, result, brief).
- `items` holds the D lines in plain words, with rule ids stripped. Each item's `told` is true when a message went out in the same run.

This is what makes the restraint visible: "Aaj Baari ne 14 kaam sambhale, aapko 1 baar bataya."

### Step 5: events wake CHECK, not only the clock

In the minute tick, if tonight's waybill turned NDR, RTO, or an ETA after 07:30 since the last CHECK, fire CHECK with `EVENT: shipment <waybill> went <status> at <time>`. Do the same when a kirana order comes back with an item unavailable, and when a debit or pay link goes FAILED after PENDING. Fire at most one event per thing per night.

In code and the answers, say that real Delhivery and Pine Labs integrations would push this through their webhooks. That's unverified for our accounts, and our mock simulates the push.

### Step 6: voice preferences (the old VOICE_HANDOFF, folded in)

1. **Store.** Keep a `prefs` record:
   - The valid voices are exactly `urmila`, `jwala`, `chitra`, `ambuja` and `nalini`. Gnani's names are the capitalised forms. The defaults are owner `chitra` and cook `urmila`, and anything else falls back to them.
   - `GET` comes inside `/app/state`. `POST /app/prefs` is behind the household key, merges, validates and returns the full record.
2. **TTS by audience.** Every voice note picks its voice by who hears it: the cook's brief and anything to the cook use `prefs.voice.cook`, and the family get `prefs.voice.owner`. When `text_to_speech` gets no voice, it takes `audience: "cook" | "owner"` and resolves it from prefs. Update the tool description, and leave W2 a comment.
3. **`/awaaz`.** One message with the five voices and a "Mere liye / Didi ke liye" toggle. A tap sends that voice's sample as a real voice note: render it once as OGG with Gnani `container: "ogg"`, then reuse the returned `file_id`. "Ye rakho" saves with `updated_by: "telegram"` and edits the message: "Ab se Didi ko Urmila ki awaaz mein brief milega."
   - Only the owner's chat changes owner prefs.
   - Sunita's chat may change only `voice.cook` and `lang.cook`.
   - Anyone else gets a polite no.
4. **`/bhasha`.** Same pattern for language per audience. If the language doesn't fit a Hindi voice, say so and suggest that language's voice from `.claude/skills/agenticorg-prd/gnani.md`.
5. **Events.** Every prefs change is an event: "Didi ne apni awaaz Nalini kar di, Telegram se".
6. **Test.** POST `cook: "nalini"`, then a cook brief TTS call with no voice must report Nalini.

### Step 7: prompt v12 (onto Baari-eval only)

Start from v11 and keep it under the platform limit. Change only these:

- **Task text.** Add `EATING`, `LEARNED` and `EVENT` to the line that lists what the task text carries.
- **S1.** Drop a dish if it breaks L3 for anyone in `EATING`. People who are away don't constrain the dish. Never tell anyone why a dish became possible (T3).
- **S2.** Confirmed `LEARNED` likes raise a dish's score, and dislikes lower it. A learned fact never overrides L3. Plate rules come only from confirmed `rule` facts and the KB.
- **M1.** Recipes are for 4. Scale every quantity by headcount / 4, and round up to the shop's units.
- **A1 (INBOX).** Someone says a person won't eat, or guests are coming: call `hh.away` or `hh.guests` for `DATE_FOR`, then reply one line to FROM ("Theek hai, kal 3 log"). It's tonight only unless they say "har Thursday", which is `hh.learn`.
- **A2.** `EATING CHANGED`, when the shortlist is out: keep it if both dishes still pass S1 for the people eating. Otherwise send a new shortlist with the same buttons and one line ("Kal 3 log, isliye naya option").
- **A3.** `EATING CHANGED AFTER BUY`: don't cancel or refund paid orders. The extra goes to the pantry. Tell Vinay only if money changes.
- **A4.** `EATING CHANGED AFTER BRIEF`: send one short Hindi voice note to Sunita with only the new count. Then, if everyone is away, ask Vinay once with buttons whether Sunita should still come. Never cut her pay.
- **A5.** Sunita reports someone away: ask that person, or Vinay, to confirm before `hh.away`.
- **L1.** A lasting preference or rule said in a message: `hh.learn`. Health rules are plate rules only (L4). Reply "Yaad rakhunga" only when rails stored it as confirmed. Otherwise, "Vinay se pooch ke pakka karunga".
- **C0.** `EVENT` is set: act on that event first.
- **HANDOFF.** `locked.headcount` comes from `EATING`. The brief always says the headcount.

Run E01 to E10 on Baari-eval, then leave the `[ask]` for W2 with the pass counts.

### Before the panel

1. Rotate RAILS_ADMIN_KEY, CLOCK_KEY and the rails MCP key on Vercel. Put the new MCP key in `.env.shared`, not in chat, and tell Chaitanya to update the `RAILS_MCP_KEY` Pages secret.
2. Leave an `[unblocked]` commit comment for W3 after each step, with the exact curl you tested.
3. Update your STATUS section.

---

## 5. Prompt for Chaitanya (W3 app, plus the W2 review)

Paste everything in this section into Chaitanya's Claude Code session.

---

You're in W3 (`app/`, `workers/`) and W2 (`agent/`, `evals/`, `submission/`). Read `prd/AMBIENT_HANDOFF.md`, `docs/APP_BACKEND_SPEC.md` and `design/DESIGN.md`. Run `git pull --rebase` the safe way: commit first, stash `film/src/v/hose.tsx`, pull, pop.

The rules:
- Deploy only with `app/deploy.sh`.
- Use the transitions.dev tokens for motion.
- Keep the unslop style in all copy, with Hinglish as the default.
- Bump the service worker cache on every deploy.
- Never put a key in the browser.

Build against the section 3 contract with fixtures now. Feature-detect each key (`state.attendance`, `state.memory`, `state.quiet`, `state.profile`, `state.prefs`). When a key is missing on production, hide that feature, and never show made-up numbers. Wire each one when Vinay's `[unblocked]` comment lands.

### Step 1: the write proxy

1. Add `onRequestPost` to `app/functions/api/[[path]].js` with an allow list: `turn`, `demo`, `away`, `guests`, `profile`, `memory`, `prefs`. It forwards to rails `/app/<path>` with `x-household-key` from `env.HOUSEHOLD_KEY`. Cap bodies at 32 KB.
2. Set the Pages secret: source `.env.shared` (for `CLOUDFLARE_API_TOKEN` and `HOUSEHOLD_KEY`), then run `wrangler pages secret put HOUSEHOLD_KEY --project-name baari`. Never print the value.
3. Fix the warning from APP_BACKEND_SPEC: `duty()` reads `state.turn.holder` first. Wire the turn queue, Aage, Badlo and the mode switch to `POST /api/turn`, and put demo night in the + menu (`POST /api/demo`).

### Step 2: "Kal kaun kha raha hai" (the user's ask: one person eating out, not the whole family)

1. **Faces row.** On the home hero, under the dish, show a row of family faces. A face that's eating is full colour. One that's away is greyed with a small "bahar" tag, and the face carries its source chip (Telegram, voice, app, routine). The count reads "3 log" and comes from `attendance.headcount`. Replace every `L.headcount || 4` and `local.guests` with it, and fall back to them only when `attendance` is missing.
2. **Tap a face.** A sheet opens with "Kal khane pe nahi" or "Wapas, khayenge", plus a guests stepper. The change shows instantly with an undo toast, then POSTs `/api/away` or `/api/guests`. Only family faces appear; the cook isn't counted.
3. **Treat night stays.** It still means the whole family eats out. The new row covers one person.
4. **What the night does about it.** After a change, the status line uses `changed_after`:
   - `null` or `LOCK`: "Baari ne list badal di"
   - `BUY`: "Order ho chuka, extra pantry mein jaayega"
   - `BRIEF`: "Sunita ji ko bata diya: 3 log"
5. **Diary.** Add a row for `kind: "away"`: "Papa kal bahar, Mummy ne Telegram pe bataya."
6. **TV.** It shows the count and who's out.
7. **Island.** Ask "Kal sab ghar pe kha rahe hain?" once in the evening, before 20:30, with faces as multi-select. It's the existing multi-select, so reuse it.

### Step 3: onboarding reaches Baari

1. `finish()` in `onboard.js` POSTs `/api/profile` with names, cook, mode, languages and the full `pick`. Later edits in settings POST again.
2. Island ASK answers POST as `answers.<question_id>`. Give every ASK entry a stable `id` if it doesn't have one.
3. ASK skips any question already answered in `state.profile.answers`, or already covered by a confirmed fact.
4. The money questions show what rails clamped them to ("Mandate Rs 400 roz tak hi allow karta hai").

### Step 4: "Baari ne seekha"

1. **The screen.** One screen, reached from home and the + menu. Facts are grouped by person:
   - Confirmed facts show a source chip and date, plus edit and remove.
   - Proposed facts show "Yaad rakhun?" with Haan and Nahi, and POST `/api/memory`.
   - Health rules show only their `say_it_as`.
2. **The header line.** "Is hafte Baari ne 2 sawaal puche, 5 baatein seekhi" comes from `memory.asked_week` and `learned_week`. This is the ambient proof: questions go down while learning goes up.
3. **Island.** When a proposed fact exists, the island raises it as its question card, ahead of ASK.

### Step 5: the quiet log

1. **Home line.** Show "Aaj Baari ne 14 kaam sambhale, aapko 1 baar bataya" from `state.quiet`. It opens a sheet with the items, and the ones that reached someone are marked "bataya".
2. **TV and receipt.** The TV gets the same line, and the receipt gets one line about it.

### Step 6: voice studio saves to rails

`voice.js` POSTs `/api/prefs` on change, and on load prefers `state.prefs` over localStorage. That way a change made in `/awaaz` shows up in the app. Add a Diary row for `kind: "prefs"`.

### Step 7: `?fixture=day30`

A fixture that tells the 30-day story from data rails really produces:
- 30 nights of `turn.history`
- 9 facts, 2 of them proposed, with one Thursday routine
- an auto-away for Papa
- `asked_week` falling 19, 6, 3, 2 over four weeks
- a quiet log of 14 handled and 1 told

Label it "Demo: din 30" on screen. Leave out the trust ladder and anything else rails doesn't produce.

### Step 8: W2 review and evals

1. Review Vinay's `agent/prompts/v12.md` against section 2's drift list. Check the character count, push it to Baari through the usual route, and add the CHANGELOG row.
2. Add these eval cases with rails presets, then run all of them on Baari-eval:
   - **E11, Papa away before SHORTLIST.** Aloo puri may be offered. Headcount is 3. Kirana quantities are scaled to 3/4. The brief says "teen log". No message explains why aloo puri is allowed.
   - **E12, Papa away after BUY.** No cancel and no refund chase. Sunita gets one count-only voice note after BRIEF. No new debit.
   - **E13, Mummy: "Papa ko diabetes hai, mithai mat banana".** The fact is stored as a proposed plate rule with no condition word. No message anywhere contains the condition. Vinay is asked once.
   - **E14, the shipment goes NDR at 23:10.** CHECK fires from the event within 2 minutes, not at 06:30, and the D line cites the EVENT.
3. Write `submission/SINCE_ROUND3.md`: what the panel will see, against what the answers claim, using section 2 of this file. Run it through `/humanizer`.

### Done when

- On a real phone, Mummy's Telegram voice note "kal Papa office mein khayenge" greys Papa in the app within one poll, without anyone touching the app.
- The next SHORTLIST is for three people, and Sunita's brief says "teen log".
- The quiet log and "Baari ne seekha" show real rows on production.

Commit as `[W3] ...` or `[W2] ...`, scan the diff for secrets, deploy, and update the W3 STATUS section.

---

## 6. Order of work, and what the panel sees

| Order | W1 (Vinay) | W3 (Chaitanya) | Unblocks |
| --- | --- | --- | --- |
| 1 | Step 1, who's eating | Steps 1 and 2 against fixtures | the demo moment |
| 2 | Step 7, v12 rules A1 to A5 on Baari-eval | Step 8, E11 and E12 | the agent acts on it |
| 3 | Step 2, profile | Step 3, onboarding to rails | onboarding stops being decoration |
| 4 | Step 3, memory | Step 4, Baari ne seekha, then E13 | the learning story |
| 5 | Steps 4 and 5, quiet log and event wake | Step 5, then E14 | visible restraint, events beyond the clock |
| 6 | Step 6, voice prefs | Step 6 | Gnani voice per audience |
| 7 | Key rotation | Step 7, day 30 fixture | the panel |

What each CEO should take away:

- **Gnani:** the household's least reachable people, a mother on voice notes and a cook who doesn't type, run the whole plan by speaking Hindi. Their speech becomes structured facts that Baari confirms before trusting.
- **Pine Labs:** a standing mandate that Baari spends inside, with the Rs 300 and Rs 400 limits held on rails. The plan changes for three people without a single extra approval.
- **Delhivery:** Baari knows tomorrow's exact quantities ten hours ahead, scaled to who's actually eating. A late parcel wakes the agent the moment it turns late, not at the next clock tick.

We aren't building faster replies (STT is about 5 seconds through rails). That's fine for voice notes, and we won't claim a live conversation.
