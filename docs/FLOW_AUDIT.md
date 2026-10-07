# Baari flow audit

Written 7 October 2026, 17:10 IST. It walks the whole user journey, one step at a time, and marks where it breaks today. Each step gets three short sections: what should happen, what happens now, and what needs to be there instead.

Everything here was checked against the live system, not just the docs:

- rails `/admin/health`, `/admin/cast`, `/admin/handoff`, and `/app/state` / `/app/events` on https://baari-rails.vercel.app
- baari-clock `/status` on https://baari-clock.chaitanyajha.workers.dev
- the live app at https://baari.pages.dev
- `evals/out/runs.csv`, `submission/ANSWERS.md` Q10, and the code paths cited inline

Where something is a guess and not something I saw, it says so.

## The state right now, in one table

| Check | Live value | Means |
| --- | --- | --- |
| Clock crons | `off` | Nothing fires at 8:30 pm tonight |
| Clock auto-advance | `off` | Firing one phase won't start the next |
| AgenticOrg session on the clock | valid, refreshed every 30 min | The clock *can* start runs |
| Phases ever fired by the clock | SHORTLIST once (4 Oct 17:53, a clock test). LOCK, CHECK, BRIEF, COOK_REPLY: never | The five-phase night has never run end to end on the scheduler |
| Cast | Vinay bound. Mummy, Papa, Sunita: no chat. Solo off | Messages to three of the four people fail |
| Rails health | `ok: false` ("no chat for Mummy, Papa, Sunita") | |
| Telegram webhook | set, 0 pending | Inbound messages do arrive |
| Gnani | reachable | |
| Reserve Pay | ACTIVE, Rs 4,893.74 left | |
| KB | 18 of 18 BAARI_ files present | |
| Last HANDOFF | 5 Oct, SHORTLIST done, shortlist "Chole chawal" + "Lauki chana dal" | Stale, and will be fed into the next run |
| App feed | last event 4 Oct 18:58 | The app shows an idle screen |

---

## Part 1. The complete user journey, as designed

There are two journeys: the household's and a judge's.

### The household (one night)

| # | When | Who | What happens |
| --- | --- | --- | --- |
| 0 | Once | Everyone | Each person opens their role link in Telegram and is bound to the bot as Vinay, Mummy, Papa or Sunita |
| 1 | 8:30 pm | baari-clock | Starts the SHORTLIST run on AgenticOrg |
| 2 | 8:30 pm | Baari | Reads the pantry and dish list from the KB, picks two dishes the house can make, sends each person a Telegram message with two buttons |
| 3 | 8:30 to 9:30 pm | Family | Taps a button or sends a voice note. Can also ask Baari something ("cap hata do") |
| 4 | 9:30 pm | Baari (LOCK) | Counts the votes (Gnani STT for voice), breaks ties for Vinay, applies Papa's plate rule. Works out what's missing. Checks the balance, books staples on Delhivery, debits Reserve Pay, puts fresh items on Sunita's kirana pickup. Asks Vinay before any debit over Rs 300. Tells everyone the result |
| 5 | 10:45 pm, 6:30 am | Baari (CHECK) | Tracks the waybill. If late: rider hop, else move to kirana pickup, else switch to runner-up. Acts on Vinay's "Haan" if he approved a big debit |
| 6 | 7:45 am | Baari (BRIEF) | Hindi voice note to Sunita: what to cook, for how many, what to pick up, she pays nothing |
| 7 | 8:05 am | Baari (COOK_REPLY) | Transcribes her reply. Vague "haan haan" gets a follow-up asking for counts. A clear amount gets Sharma Kirana paid from the block |
| 8 | All night | Family | The household app shows the vote, the khata, the parcel, the brief and every decision with its rule |
| 9 | Next evening | Baari | Starts again from the HANDOFF and an up-to-date pantry |

### A judge

| # | What they do |
| --- | --- |
| J1 | Watch the recording of a real night |
| J2 | Open baari.pages.dev and see it working |
| J3 | Maybe try the bot themselves |
| J4 | Open the agent on AgenticOrg and read the runs |
| J5 | Read ANSWERS.md, the eval sheet and the repo |

---

## Part 2. Step by step: where it breaks

### Step 0. Joining the household

**What should happen.** Each family member joins once, and only the right person can take a role. A judge can be given a seat without breaking the real household.

**What happens now.**
- Only Vinay is bound. Mummy, Papa and Sunita have no chat, and solo mode is off (`/admin/cast`).
- When Baari sends to an unbound role, `resolveTo` returns `"<role> has no Telegram chat yet"` (`baari-mock/lib/ops.js:69`). The send fails, so three of the four people would get nothing tonight.
- Anyone who sends `/start role_vinay` to @Baari_ken_bot becomes Vinay. The webhook passes it straight to `setCast` (`baari-mock/lib/telegram.js:76-78`), which overwrites the role with no check (`baari-mock/lib/ops.js:46-50`). Vinay is the role whose "Haan" approves debits over Rs 300.
- There's no judge path. A judge needs someone to send them a role link, and taking it knocks the real person off that role.

**What I think is going on.** Binding was built for a demo where the team holds all four phones, then recast for evals (`{eval: true}` puts every role on `sim-*`). After the evals ended, the cast went back to whatever was saved, which was just Vinay.

**What needs to be there.**
- All four roles bound, or solo mode on, before any run.
- Role binding that only the duty-holder or an operator can approve, and that won't silently replace an existing binding.
- A separate guest or judge seat that can watch and vote without touching the real roles.

---

### Step 1. Something has to start the night

**What should happen.** At 8:30 pm the clock fires SHORTLIST, and the later phases follow at their times with nobody touching anything.

**What happens now.**
- Crons are `off` and auto-advance is `off` (`/status`). Nothing fires unless someone calls `/crons` or presses a button on `/dev`.
- The session part works: the clock refreshes its AgenticOrg token at :00 and :30 (`workers/baari-clock/src/index.js` `scheduled`), and it's valid now.
- The clock's own record (`last:<phase>` in KV) shows only one fire ever: SHORTLIST, run `msg_d2c563ab5fd9`, tagged `w1-clock-test`. LOCK, CHECK, BRIEF and COOK_REPLY have never been started by the clock. The 19:35 rehearsal in STATUS.md never happened, because the plan switched to a made video.
- Every eval ran a single phase on Baari-eval through the harness (`evals/harness/ao_client.js`), not the clock. So the eval scores say each phase works on its own. Nothing has shown that the five phases chain together through HANDOFF on the production agent.

**What needs to be there.** One rehearsed night on `Baari`, fired by the clock, all five phases, with each phase's HANDOFF feeding the next, and the run ids written down. Until that exists, "it runs every night" is an untested claim.

---

### Step 2. SHORTLIST: picking two dishes

**What should happen.** Baari reads the pantry and the six dishes, picks two the house can make, and sends buttons to Vinay, Mummy and Papa.

**What happens now.**
- The one clock-fired SHORTLIST wrote this in its HANDOFF: `"notes_for_next": "KB returned empty for dishes and pantry"`. It then picked **Chole chawal**, which is not one of the six dishes. It isn't in `agent/kb/split/` and it isn't in the fallback list inside the prompt (`agent/prompts/v5.md:38`). With no KB results, the agent made up a dish even though the prompt carried a copy of the real list.
- That shortlist is still on the live feed: `/app/state` shows "Chole chawal" with `photo: null`.
- The HANDOFF's `sent` list says the shortlist went to Mummy and Papa. HANDOFF is what the agent *says* it did, so this needs checking against the rails log before anyone trusts it.
- The KB lives in a shared org, and other teams delete documents. The heal job keeps the files *present* (18 of 18 now). Files being present doesn't prove `knowledge_base_search` returns them. My guess, unverified: a re-uploaded file takes time to index, so searches right after a heal come back empty.

**What needs to be there.**
- A shortlist that can only contain the six known dishes. Either the tool rejects anything else, or the prompt is told to fall back to its inline list and never invent.
- A KB check that runs a real search, not just a file listing, before each phase.

---

### Step 3. Voting, 8:30 to 9:30 pm

**What should happen.** People tap buttons or send voice notes. If someone asks Baari something, Baari answers.

**What happens now.**
- Button taps work. The webhook stores them in Redis and answers the tap with "Noted 👍" (`baari-mock/lib/telegram.js:96`).
- **Nobody reads anything until LOCK at 9:30.** The webhook only stores messages. No agent run starts when a message comes in. If Vinay writes "cap hata do" at 8:45, Baari says nothing until the next phase runs, and then only if that phase thinks to look.
- Voice notes depend on Gnani STT. Every eval voice note was clean Gnani TTS audio, never a real phone recording with kitchen noise. In R3, E01 failed once on `AUDIO_CONVERSION_ERROR`.

**What I think is going on.** The platform only runs the agent when called. Nobody calls it on an inbound message, so Baari is a batch job that wakes five times a day. It isn't a chat bot.

**What needs to be there.** A trigger on an inbound message that either starts a short run or at least sends an acknowledgement ("Baari 9:30 baje sab votes dekhega"). Plus voice notes recorded on a real phone, tested at least once.

---

### Step 4. LOCK: deciding, booking, paying

This is where most of the money and most of the risk is.

**What should happen.** Count the votes, apply the rules, check the balance, book staples, debit, ask Vinay before anything over Rs 300, tell everyone the result, and write a HANDOFF for CHECK.

**What happens now. Break 4a: the clock throws away long runs.**
- In R3, LOCK-type cases ran 60 to 115 seconds (`evals/out/runs.csv`, `ms` column: E02 52 to 78 s, E04 62 to 76 s, E05 up to 115 s).
- AgenticOrg's run endpoint returns a gateway 504 on long runs, even when the run finishes. This happened in R1b and R2 (`runs.csv`: `POST /agents/.../run -> 504`).
- The eval harness handles this. After a 504 it finds the run in `/agent-runs` and reads the result (`evals/harness/ao_client.js:47-74`).
- **The clock doesn't.** Its `ao()` throws on any non-2xx (`workers/baari-clock/src/index.js`, `ao` function). `fire()` then catches it, marks the phase `ok: false`, and **never posts the output to `/admin/run-output`**.
- What follows from that:
  - no DECISIONS saved, so the app's Why tab stays empty
  - no new HANDOFF, so CHECK starts from SHORTLIST's handoff and doesn't know a waybill or debit exists
  - auto-advance stops
  - the run itself may have finished on the platform, booked the parcel and moved the money, with nothing on our side recording it
- Firing from `/dev` adds a hop: browser, Pages Function, Worker, AgenticOrg. That's one more place a 60 to 115 s request can time out. I haven't tested this.

**Break 4b: the parcel ships before the money is checked (E04).** GPT-5.4 calls balance, create_shipment and debit together in one parallel batch. The rails refuse the debit (422), but `create_shipment` on the Delhivery mock has no idea about money, so the parcel goes out. It failed four runs in a row on v5.

**Break 4c: the Rs 300 approval is a prompt rule only.**
- The rails do enforce the Rs 400 daily cap (`DAILY_LIMIT_EXCEEDED`, `baari-mock/lib/pinelabs.js:242-246`) and the payee list (`PAYEE_NOT_ALLOWED`, `:250-255`).
- Nothing on the rails checks the Rs 300 single-debit limit. `30000` appears nowhere in `baari-mock/lib/`. If the model skips M5, a Rs 350 debit goes through.

**Break 4d: Vinay's "Haan" waits up to an hour.** M5 makes Baari ask, add the ask to `open_asks`, and stop. A tap at 9:40 pm is read only by the next run, CHECK at 10:45 pm. That's fine as a design, but nobody has tested it, because CHECK has never run after a real LOCK on the clock.

**Break 4e: smaller agent issues.**
- Mummy and Papa still sometimes get the tally ("Ek vote aaya"), and the privacy judge doesn't catch it.
- E05 retries correctly but cites the wrong rule.
- E01 and E09 pass about half the time on the platform.

**What needs to be there.**
- The clock recovering a 504 the way the harness does, so a long LOCK still saves its DECISIONS and HANDOFF.
- A shipment that can't be created until a balance read has covered its cost: a rails check, or no parallel tool calls on this agent.
- The Rs 300 rule enforced on the rails, the way Rs 400 already is.

---

### Step 5. CHECK: the overnight watch

**What should happen.** At 10:45 pm and 6:30 am, track the parcel. If it's late, try a rider hop, then the kirana pickup, then the runner-up dish. Act on any approval Vinay gave.

**What happens now.**
- It has never been fired by the clock.
- The rider hop is an invented capability on our mock. It works and says it's an invention, but no real Delhivery API sits behind it.
- In E07, after "no rider", Baari moved chana dal to Sunita's kirana pickup. Sharma Kirana doesn't stock chana dal (`BAARI_shop_sharma_kirana.md`). The rule (C4) says switch to the runner-up, and no judge checks the stock list, so E07 counts as a pass.
- CHECK depends on LOCK's HANDOFF having the waybill. If LOCK hit break 4a, CHECK has nothing to track.

**What needs to be there.** A real LOCK, then CHECK on the clock with the waybill passed through, and a check that anything moved to the kirana is actually on its stock list.

---

### Step 6. BRIEF: Sunita's voice note

**What should happen.** At 7:45 am, a Hindi voice note to Sunita.

**What happens now.**
- The TTS path was fixed late on 4 October (8132878): rails return a short clip link and `tg.voice` sends it. E08 passed after that.
- **Sunita has no chat bound**, so the voice note fails today (step 0).
- Never fired by the clock.

**What needs to be there.** Sunita bound, and one real BRIEF on the clock.

---

### Step 7. COOK_REPLY: Sunita answers, the kirana gets paid

**What should happen.** Baari hears her reply. A vague one gets a follow-up, and a clear one with an amount gets the kirana paid.

**What happens now.**
- **COOK_REPLY runs once, at 8:05 am, and it's the last phase of the day.** The clock has no later phase (`UTC_PHASE` ends at 02:35 UTC, which is 08:05 IST).
- If Sunita replies at 8:10, nothing reads it until SHORTLIST at 8:30 pm. That run is about tomorrow's dinner, not paying for today's pickup.
- The vague-reply path has the same hole. Baari sends "kitne log?", Sunita answers a few minutes later, and no run is left to hear it.
- E10 ("late reply") passes in evals because the harness injects the reply *before* firing COOK_REPLY. A real late reply never gets a run.
- Capability 3's LLM stage hit OpenRouter 429s on most R3 notes, so the rules fallback answered. The rules label "₹45" as `unclear`, because they don't read money amounts.

**What needs to be there.** A reply from Sunita has to wake Baari: a trigger on her inbound message, or COOK_REPLY repeating every few minutes until about 9:00 am. Without that, the kirana payment, which is the main point of the morning, depends on her replying before 8:05.

---

### Step 8. The household app

**What should happen.** The app shows tonight live: the vote, the khata, the parcel, the brief, and every decision with its rule.

**What happens now.**
- It shows an idle screen: "Next: two dishes at 8:30 pm". `phase` and `now_ist` are null, and the last event is from 4 October.
- Under that screen the feed still holds a dead night: the invented "Chole chawal" shortlist for 5 October, with only Vinay voted.
- `reset-day` (`baari-mock/lib/ops.js:112-138`) clears overrides, idempotency keys and run records. It doesn't clear `handoff:last`, `app:track`, `app:hop` or `app:brief`. The app *hides* old items on screen, but the data stays (STATUS.md, W2 note at 20:00 on 4 Oct).
- The Why tab is built from DECISIONS saved by `/admin/run-output`. With break 4a, a long LOCK leaves it empty.
- `?fixture=shortlist|lock|morning` look complete, but they're fixed JSON files, and the badge says "Demo".
- `/api/state` and `/api/events` are public. Anyone can read the balance, payees and every call summary. That's fine for fake data and wrong for a real family.

**What needs to be there.** A reset that clears every per-night key, the app fed by a real night, and the feed behind some kind of household login if this ever holds real data.

---

### Step 9. The next night

**What should happen.** Tomorrow starts from tonight's HANDOFF and a pantry that knows what got used and what arrived.

**What happens now.**
- **The pantry never changes.** It lives in two KB files dated 2 October (`BAARI_pantry_*`), and nothing writes back after cooking or delivery. No rails code touches the pantry. After one real night, Baari's idea of the kitchen is wrong, and it gets more wrong every day. The same goes for "last cooked" and "last lost by" in the dish list, which drive rotation and fairness.
- The clock passes whatever is in `handoff:last` into the next run (`index.js`, `fire()`, reads `/admin/handoff`). Right now that's the 5 October SHORTLIST handoff. Tonight's SHORTLIST would get an old date and a made-up dish in its context. Whether the prompt ignores a handoff from another date is untested.
- `reset-day` reseeds the Reserve Pay block, which puts the balance back. Fine for demos, but it means the khata never shows more than one day of real history.

**What needs to be there.** A pantry and dish history that the agent updates after LOCK and COOK_REPLY (a writable store, not KB files), and a HANDOFF that's discarded when its date doesn't match.

---

## Part 3. The judge's journey

| Step | What they get now | Where it breaks |
| --- | --- | --- |
| J1, watch a recording | A Remotion animated film (`film/`) with cartoon redraws | ANSWERS.md Q2 still has three `[TODO after recording]` lines for real takes. If the brief wants a recording of the agent actually running, the film is a reconstruction, not one. Q11 also has a TODO for the transcript link |
| J2, open the app | Idle screen, or canned fixtures | Nothing live is happening (steps 1 and 8) |
| J3, try the bot | @Baari_ken_bot answers `/start role_x` and nothing else | Nobody runs the agent on inbound messages, and taking a role kicks out the real person (steps 0 and 3) |
| J4, read the agent | Agent `36ae8107` on AgenticOrg | Tool list shows ElevenLabs voice tools moving money and sending Telegram messages. It needs the README's explanation. Every run says `hitl_triggered` at confidence 0.82, which we can't explain |
| J5, read the evals | "8 of 10" | Reruns may not match: E01 1 of 3, E06 2 of 4, E09 2 of 4. Two cases count as passes while doing the wrong thing (E07 stock, vote tally leak) |

---

## Part 4. Security holes along the way

- **Leaked keys.** RAILS_ADMIN_KEY and CLOCK_KEY leaked at 18:05 on 4 October through `/.dev.vars`. STATUS.md says they were never rotated. I can't confirm from here whether today's values are the leaked ones. If they are, anyone holding them can reset the day, inject fake votes or fire runs that move block money.
- **Role takeover** through `/start role_vinay` (step 0).
- **A public household feed** (step 8).
- **The Rs 300 limit** lives only in the prompt (break 4c).

---

## Part 5. All the breaks, ranked

| Rank | Break | Step | Effect |
| --- | --- | --- | --- |
| 1 | No full night has ever run on the clock | 1 | Every other claim about the nightly loop is untested |
| 2 | Clock drops output when a long run 504s | 4 | A LOCK can move money and leave no HANDOFF or decisions behind |
| 3 | Sunita's reply after 8:05 is never read | 7 | Kirana doesn't get paid. The vague-reply follow-up goes nowhere |
| 4 | Three of four roles unbound | 0 | Tonight's messages reach only Vinay |
| 5 | Shortlist can invent a dish when KB search is empty | 2 | Happened in the only clock run: "Chole chawal" |
| 6 | Shipment before balance (E04) | 4 | Parcel goes out unpaid |
| 7 | Pantry and dish history never update | 9 | Wrong from night two onward |
| 8 | Anyone can take any role | 0 | A stranger can approve spend as Vinay |
| 9 | Rs 300 approval not enforced on rails | 4 | One skipped rule and money moves |
| 10 | No reply between phases | 3 | Family messages sit unanswered for up to an hour |
| 11 | Recording TODOs, animated film instead | J1 | Judges may not see a real run |
| 12 | reset-day leaves stale keys, stale HANDOFF is fed forward | 8, 9 | Old nights leak into new ones |
| 13 | Public feed, maybe-unrotated keys | 4, 8 | |
| 14 | Flaky passes, judges that miss stock and tallies | 4, 5 | Scores won't reproduce exactly |

## Corrections to my earlier answer

- I said the clock's AgenticOrg session had almost certainly expired. It hasn't. The 30-minute refresh works, and the session is valid now.
- I said the money limits live only in the prompt. The Rs 400 daily cap and the payee list are enforced on the rails. Only the Rs 300 single-debit approval is prompt-only.
