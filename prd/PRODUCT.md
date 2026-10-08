# Baari: the product

This is the source of truth for what Baari is, what it does today, who it's for and how it reaches them. Last updated 8 October 2026, from the repo at commit 407dd98 and live production, plus the rails memory work on branch `cloud/memory` (profile, memory, quiet log, event wake, calls to ask), which isn't deployed yet. When a feature ships or changes, update this file in the same commit.

Plans and build instructions don't go here. `prd/PRD.md` is the Round 3 build contract, `prd/ENGINEERING.md` covers how the agent is built, and `design/DESIGN.md` covers the app's look.

## 1. In one line

Baari takes "aaj kya banega?" off the one person it always lands on. It's an ambient agent that gets the family to agree on tomorrow's food, buys what's missing inside limits the family set, and briefs the cook in her language.

Baari is Hindi for "turn", as in "aaj kiski baari hai?" (whose turn is it today?).

## 2. The problem

In most Indian homes with a cook, one person decides every meal. The family says "kuch bhi" (anything), the cook makes something, nobody likes it, and someone orders out anyway. Nobody actually agreed.

Our six household interviews (`research/Household_1..6.txt`) and the survey lines behind Round 1 put it plainly:

- "Husband and I alternate but each thinks we are doing it all the time."
- "Every morning I have to tell my cook what to make. But it gets annoying and many times I end up just telling her nothing and ordering out."
- "Tried the whole plan every Sunday for the coming week but it just doesn't consistently happen."

Nobody lacks recipes. The real constraint is state. Deciding well means holding four things at once:
- what's in the kitchen
- what was eaten lately
- who's sick of what, and whose plate has rules
- what can arrive before the cook does

Only one person holds all four, so explaining them costs more than deciding alone, and the load never moves. A Sunday plan goes stale by Wednesday because the kitchen keeps changing.

**Baari's voice.** Baari speaks as a woman ("Baari bhejegi"). On Telegram she writes to the family and guests in short, plain English, never the same line in two languages. She speaks to the cook only in Hindi voice notes.

## 3. What Baari believes

1. **Agreement comes before cooking.** The family settles on the dish the night before, not the cook at 8am.
2. **The turn is the product.** Every night one member holds the baari and picks; the others get a veto. The turn rotates, so over a week everyone has a say and nobody carries it all. Families who'd rather vote can switch to vote mode.
3. **The agent holds the state, not one person.** Pantry, rules, history, the turn, the money and the cook's day live in one place that everyone, and the agent, can act on.
4. **Meet people where they already are.** The family is on Telegram, the cook gets voice notes, anyone can take a phone call, and the app is a companion. Nobody has to open an app for a night to work.
5. **Money moves only inside limits a person set, in their own UPI app.** Baari can't raise its own limits, add a shop, or pay the cook from her pocket.
6. **Health rules are plate rules, never diagnoses.** "Papa ki thali mein aloo nahi", never a condition.
7. **Stay quiet unless a rule says speak.** Baari handles what it can and comes back to a person only where it must.

## 4. Who it's for

| Person | Role | Surface | Language |
| --- | --- | --- | --- |
| **The young adult (18 to 25), living at home** | First user and the one who brings Baari home. Sets it up, invites the family, holds the baari some nights | App to set up, Telegram day to day | English on Telegram, Hinglish by default in the app |
| **Parents** | Hold the baari on their nights, veto, send voice notes. The parent who pays gets a Pine Labs payment link for any order above the household's limit, pays it with card or UPI, and Baari places the order | Telegram, voice notes, bade akshar in the app if they open it | Telegram in English; Hindi and Hinglish vote words and voice notes still count. The app in English, Hinglish or Hindi |
| **The cook** (Sunita in the demo household) | Hears the plan, confirms counts, collects pre-paid groceries. Never pays, never installs anything | Telegram voice notes | Hindi (six Indian languages supported for her brief) |
| **The lane kirana** (Sharma Kirana) | Packs the order the night before and gets paid from the block | UPI payee | n/a |
| **A guest at dinner (Mehmaan)** | Can hold one night's pick. When the account holder isn't on Telegram, the guest stands in for them and gets that night's Pine Labs payment link | Telegram | English |

### Go to market

We start with young adults living with their parents, in metro homes with a part-time cook. They're the ones who install apps and the ones tired of the 8pm argument. The motion runs in four steps:

1. **They set the house up in the app by talking:** who's home, Papa's plate rules, Mummy's fasts, the cook's name and language, the cuisines they want more of.
2. **They send each parent a Telegram invite.** Parents never need the app.
3. **They set the household's limits:** how much Baari may pay on its own, and how much a day at most. Above that, Baari sends the parent who pays a Pine Labs payment link on Telegram. One tap, pay by card or UPI on Pine Labs' checkout, and the order is placed. That first link is the referral moment: the young adult brings the parent in, and the parent's first payment makes Baari real for the household.
4. **Later, the cook spreads it.** A part-time cook works three or four homes, and every home she cooks in gets better at briefing her. That supply-side network is the long-term moat. It's in the Round 2 design (C8 one_cook_many_homes) and isn't built yet.

## 5. A night with Baari

Times are for a real night. On a demo night the same steps run in about 10 minutes.

| Time | Phase | What happens |
| --- | --- | --- |
| 20:30 | SHORTLIST | Baari reads the live pantry and household rules and sends tonight's holder two dishes, with pick buttons and "Aaj nahi, agle ko do" to pass the turn. The others get a heads-up and can send wishes |
| Until 21:30 | Picks | The holder picks (or everyone votes in vote mode). Anyone else may veto once, and a veto makes the other dish win. Silence means dish one |
| 21:30 | LOCK | Baari locks the winner and runner-up, works out what's missing, and tells everyone the result and whose baari is next |
| 21:35 | BUY | Fresh items go to Sharma Kirana's order book. Dry staples go on a Delhivery parcel. Small amounts inside the limits are paid from the household's block. Anything over Rs 300, or more than the block holds, goes to the account holder as a Pine Labs payment link, and the order is placed only once Pine Labs says it's paid |
| 22:45, 06:30 | CHECK | Is the parcel on time? If not: a hyperlocal rider hop, a kirana pickup, or the runner-up dish. The account holder hears only if the plan changed |
| 07:45 | BRIEF | The cook gets a Hindi voice note under 45 seconds: the dish, how many, plate rules, what's packed and paid at the kirana, and two count questions |
| 08:05 | COOK_REPLY | Her voice reply goes through Gnani. A vague "haan haan" isn't a yes, so Baari asks once for counts. If she reports a difference at the kirana, Baari pays it |
| Any time | INBOX | Any message no phase is waiting for goes to Baari: "aaj kya banega" starts a night, a question gets a short answer, a request to break a limit gets a polite no |

## 6. What it does today, by surface

### Telegram (@Baari_ken_bot, real Bot API)

- **Joining and roles:** join with a role per household member (a role held by another real chat can't be taken), `/leave`, `/baari` (whose turn), and `/mode pick` or `/mode vote` for the account holder.
- **The night:**
  - The holder's pick card, the others' wish and veto buttons, and vote buttons in vote mode. A tapped button folds into its message so nobody taps twice.
  - Typed or spoken messages: voice notes go through Gnani STT, and a spoken pick counts.
- **Who's eating:** `/bahar` shows a button per person for "not eating tomorrow" and a tap toggles it; `/mehmaan` sets guests with - and +. Saying it ("kal Papa bahar khayenge", typed or as a voice note) reaches Baari, who marks it. The cook can't mark a family member, and a guest only themselves. A change after the shortlist, the order or the brief wakes Baari to fix what it affects.
- **Night tasks:** when tonight's dish needs prep (soak rajma, chole or urad; set curd when it's low), Baari gives the job to someone eating at home, never the cook, with a "Soaked ✓" button, one reminder, and a quick plan in the brief if nobody does it.
- **Pairing:** the app makes a one-time code and a `t.me/Baari_ken_bot?start=p_<code>` link (10 minutes, works once) that binds a chat to a member.
- **Money:** the Rs 300 ask comes as Haan and Nahi buttons, or as a real Pine Labs sandbox pay link.
- **The cook:** her brief as a Hindi voice note in a Gnani voice, and her voice reply read for commitment and counts.
- **A night for a guest:** anyone outside the household who taps Start gets a greeting and a night of their own as Mehmaan, with "What's for dinner?", "What's Baari?" and, when calls are set up, "Talk on the phone". When the account holder isn't on Telegram, the guest gets the night's Pine Labs payment link in his place and can pay it. One guest at a time, with a queue and a wait time. A guest can arm `/test` scenarios before their night, and they end with it.
- **Demo tooling:** `/demo pick`, `/demo vote` and `/demo stop`; `/test` arms fault scenarios; `/status`, `/help`, `/call`, and `/new` to start a night.

### Phone call (Twilio carries it, Gnani speaks)

Baari rings the phone on the table and says what's run out. It offers two dishes, then stays quiet while the family talks on speaker and answers only what's asked. Once they settle, it reads the plan (what comes by Delhivery, what from the kirana, what's home) and asks "theek hai?". On a yes, the real agent locks and buys while the family holds. Then it reads the bill from what was actually paid, and says goodbye.

- Gnani speaks every line, and Twilio's Hindi voice stands in if Gnani is down.
- A small model on rails follows the conversation and turns what the family said into "chose a dish", "yes" or "a question". The agent makes the food and money decisions.
- The trial account rings only one verified phone, and a judge's own phone needs a paid upgrade (T24). On 8 October its balance read -1.15 USD, so check a test call before a recording.
- **Baari calls to ask (rails, not deployed yet):** a short call to one person. Baari greets them by name, asks at most two things it still doesn't know (who's eating tomorrow first, then rotis, spice and the cook's days off), says each answer back in one line and ends with "baaki baad mein poochungi". Answers count as that person's own. The call never picks food or moves money. It runs on the demo phone or in the browser (`POST /app/call` with `carrier: "web"`), and Gnani speaks and hears both.
- The call's plan and quantities use tomorrow's headcount from who's eating, not a fixed four.

### The household app (baari.pages.dev, installable PWA)

**Onboarding by talking**
- Language first (Hinglish by default).
- Who's home, with faces from the Personas set and a face editor.
- A visual rules page: diet, Jain, per-person avoids, non-veg days, multi-select vrat days, custom lines.
- Say the rules out loud: the bar morphs into "Sun raha hoon", Gnani STT (through rails) transcribes, and the speech splits into "Baari ne samjha" points.
- Pick or vote mode, and Ghumao, a spinner that picks who goes first.
- The cook's name, arrival time and the language she understands best, with a karaoke preview of her brief in six languages.

**Ghar (home)**
- A hero that changes with the night: waiting, vote, locked, treat night.
- The dynamic island:
  - live status with a thinking shimmer
  - 19 questions, each with a "why" (rotis per adult, spice, health goals, how often a dish may repeat, tie-breaks, the monthly budget, the biggest order Baari can pay without asking, where groceries come from, leftovers, the cook's days off, guests, tiffins, which meals to plan, trying new dishes)
  - multi-select answers and ‹ › navigation
  - it opens itself after six taps, at most once a session, and backs off when told "Abhi nahi"
- Kiski baari: a turn queue with whose night it is and who's next.
- Har thali alag: a plate per person.
- Leftovers bowls, the fridge, treat night, and a cook finder.
- The cuisine deck: "Sirf dal chawal nahi". Pick cuisines, swipe dishes, set how often and for whom.
- The voice studio: five Gnani Hindi voices (Urmila, Jwala, Chitra, Ambuja, Nalini), one for you and one for the cook.
- One family of rendered dish photos (40 dishes).

**The other screens**
- **Khata:**
  - The Pine Labs card: every payment link Baari sent and its live state (waiting, paid, said no, closed), the order and reference behind it, and a "Real API" or "Demo" tag on each call. It also shows the household's Reserve Pay block on the Pine Labs sandbox.
  - The month view, and settle up between family members over UPI.
  - A hisaab image to share.
- **Saamaan / Delivery:** the Sharma Kirana order, the Delhivery parcel, a night-sky tracker and a rider card.
- **Sunita:** her brief with karaoke highlighting, and her reply.
- **Diary:** each night as chapters.
- **Receipt:** a thali receipt that prints on screen and shares to Telegram.
- **TV mode (`/tv`):** a kitchen screen with the meter, faces, the streak and next baari, a join QR, chimes, and a drumroll reveal.
- **`/live`:** every tool call as it happens, for demos.
- **`/dev`:** the operator panel.

**Everywhere in the app**
- English, Hinglish and Hindi.
- Bade akshar (large text), dark mode, undo.
- An offline state that shows how old the data is, an iOS install guide, haptics.
- Telegram sharing, and Liquid Glass on iOS with a frosted fallback on Android.

**What the app reads and writes since 8 October (service worker v42)**
- It reads the turn, who has joined, who's eating, the Sharma Kirana order, demo nights, night tasks, approvals, the agent's live run steps and every household event from rails. `/app/state` answers in about 0.6 s (a 2 second cache and parallel reads).
- Through its Pages proxy (the household key stays server-side) it writes the turn (pick, veto, pass, mode), demo nights, who's away and guests, a night task done, and the kirana Haan and Nahi.

**What the app still doesn't do**
- Cuisine picks and the voice choice stay on the phone. Rails now takes onboarding and the island answers at `POST /app/profile` and shows them in `/app/state`, but the app doesn't send them yet.
- No "Telegram se judo" button, no mic or text thread in the island, no "Kyun?" on the dish, and no in-app call yet.

### The agent

- **Platform:** one agent, Baari, on Pine Labs AgenticOrg (agent `36ae8107`, GPT-5.4 on Azure). A twin, Baari-eval, is used for evals. The prompt is v12 (26,818 characters): English on Telegram, Baari as a woman, Sunita's brief in Hindi. History is in `agent/prompts/CHANGELOG.md`.
- **How runs start:** each run is one phase. Rails wakes the phase that's waiting when a Telegram message arrives, chains LOCK, BUY, CHECK and BRIEF on a demo night, and the `baari-clock` Worker fires phases on time.
- **Memory between runs:** state moves between runs in a HANDOFF block. The live pantry, turn and approvals live on rails. The household profile is in the Knowledge Base as `BAARI_` files. The KB is shared across the org, so it holds synthetic data only and is self-healed by the clock Worker.
- **What Baari learns (rails, not deployed yet):** a profile saved from onboarding replaces the KB's household in the task text as a PEOPLE line, and everyone in it is counted for who's eating. Every task text carries a LEARNED line: up to 12 confirmed facts, newest first ("Papa: no karela (confirmed, Telegram)").
  - Facts come from the rules page (confirmed), from what someone says about themselves on Telegram (confirmed, through `hh.learn`), and from patterns rails counts once a day with no model: two vetoes of the same dish in 14 days, away on the same weekday in 2 of 3 weeks, an item bought on 3 nights in 14 days.
  - Anything said about someone else, every health rule and every pattern is only proposed. Baari asks that person (the account holder for a health rule about someone else) one Telegram line, "Should I remember this?", with Yes and No. At most one ask per person a day, never between 22:00 and 08:00.
  - Rails refuses a fact that names a condition (diabetes, BP, thyroid, sugar ki bimari and the rest, in English and Hindi). It has to be a plate rule.
  - A confirmed routine ("Papa eats out on Thursdays") marks that person away before Thursday's shortlist.
  - `/yaad` on Telegram lists what Baari remembers about you, with a remove button on each.
- **The quiet log (rails):** for each night, how many decisions Baari handled against how many times it messaged someone outside the shortlist, the result and the brief, with each decision in plain words. In `/app/state` as `quiet`.
- **Events wake CHECK (rails):** once a minute rails looks at what it already saw. If tonight's parcel went NDR, RTO or got an ETA after 07:30, a kirana order came back with an item missing, or a debit failed, it starts CHECK with an EVENT line, once per thing per night. Real Delhivery and Pine Labs would push these by webhook; the mock has no push, so rails stands in for it.
- **Every run ends with DECISIONS:** one line per decision, citing a rule id. The rules are grouped by phase: S, V, M, B, C, K, I, E, T.

The hard limits, which no message, vote or task text changes:

| | Limit |
| --- | --- |
| L1 | Never spend more than Rs 400 in a day |
| L2 | Pay only shops on the list. Never pay the cook, never ask her to spend |
| L3 | Never serve a dish that breaks a plate rule to that person |
| L4 | Never name a medical condition |
| L5 | Never raise a cap, add a payee or create a block on its own |
| L6 | Never report a payment or delivery the tool didn't confirm |
| L7 | A request to break a limit gets a polite no and one line to the account holder |

## 7. Partners and rails

| Rail | Real or mock | What Baari does with it |
| --- | --- | --- |
| **Gnani** (voice) | **Real.** Vachana STT and TTS (Timbre v2.5 voices) through our adapter on rails, which speaks ElevenLabs' shape so AgenticOrg's native ElevenLabs connector can carry it | Every voice in and out: family voice notes, the cook's brief and reply, the phone call, the app's mic, the voice studio samples |
| **Pine Labs** (payments, our innovation rail) | **Real on the sandbox:** hosted-checkout payment links that Baari creates and checks. A Reserve Pay (SBMD) mandate is also created on the sandbox. **Mock at documented paths:** the household block's small debits, its balance and daily cap, refunds | Pays for orders the family approves by paying a link, pays small amounts inside the limits from the block, refuses what breaks a limit |
| **Delhivery** (logistics) | Mock at Delhivery's documented paths and fields, on a custom MCP connector | Serviceability, cost, create, track, cancel and NDR for tonight's staples |
| **Telegram** | Real Bot API | Every family and cook message |
| **Twilio** | Real, trial account | Carries the phone call. Gnani does the speech |
| **AgenticOrg** | Real | Runs every decision |

### Pine Labs in detail

**What works end to end on the sandbox: the payment link.** This is the main money flow, built and owned by Vinay.

1. An order is above the household's limit, or more than the block holds.
2. Baari creates a Pine Labs hosted-checkout order for exactly that amount and reference, and sends the account holder one Telegram line saying what it's for, with a "Pay Rs <n> · Pine Labs" button and a "No" button.
3. They pay on Pine Labs' checkout, with card or UPI.
4. Baari reads the order back. Only when Pine Labs says PROCESSED does it book the Delhivery parcel. While a link for the night is still waiting, rails refuses the booking, so a parcel can't go out before the money is settled. Baari then tells them "Got Rs <n> on Pine Labs", and Delhivery carries and tracks the order from there.
5. A paid link pays its reference exactly once. Rails refuses a second debit for it.
6. "No", a failed link or a cancelled one sends the staples to the kirana pickup or switches to the runner-up dish.
7. The Telegram message keeps up: once the link is paid, declined from the app or closed, its buttons go and one line says what happened.

If the sandbox can't create a link, rails tries once more with a fresh token, then sends a demo checkout on rails that says it's a demo. Every call is logged as real or demo, and the app shows which.

**What rails gives the app for this** (`GET /app/state`, `pinelabs`):
- `requests[]`: each link with what it's for, the reason in plain words, its state (waiting, paid, declined, closed), who it went to, and the checkout address while it's waiting.
- `payments[]`: every block debit and paid link, with its purpose, reason, payee, UTR, real or demo tag, and whether it was refunded.
- `refusals[]`: each time rails said no to a payment or a parcel (over Rs 300, over the day's cap, the block too low, a shop not on the list, a link not paid yet), in one plain line, with what Baari did instead.
- `POST /app/paylink {reference, decline: true}` says no to a waiting link from the app. Baari hears it exactly as it hears the Telegram No. Paying always happens on Pine Labs' checkout.
- Events `link`, `link_paid`, `link_declined`, `link_closed` and `refuse` reach `/app/events` with a `kind`.

A new night (`/admin/reset-day`, a demo start) retires the last run's links, so a re-run of the same date starts clean.

The paid step hasn't completed on our sandbox merchant yet: the checkout opens, but card payments there need an acquirer that Pine Labs support is setting up for us (query 112650368, 8 October). Links, the No path and the reads all run on the real sandbox today.

**The household block (Reserve Pay).** The Round 2 design was a Reserve Pay block, approved once in the family's UPI app, so that Baari can pay small amounts without asking each time.
- A real Rs 5,000 mandate exists on the sandbox, and rails renews it if it lapses.
- It can't be approved, because UPI isn't enabled on our sandbox merchant. Until it can, small debits run on a demo block with the same limits.

**What we ran into, said plainly.** These are things we had to work around, not complaints:
- AgenticOrg's native Pine Labs connector didn't connect for us, so Baari reaches Pine Labs through our rails.
- A Reserve Pay debit settles to the merchant that holds the mandate. For a family that wants the lane kirana paid directly, we built a payee-routed debit on our mock (invention 2).
- Spending rules like "ask me above Rs 300" live on our rails today, outside the mandate.

### Inventions (marked as inventions wherever the agent or a judge sees them)

| # | Partner | Invention | Status |
| --- | --- | --- | --- |
| 1 | Delhivery | Hyperlocal rider hop: a rider from the lane kirana to the flat inside a window, with no-rider, slot and cancelled outcomes | On the mock, used in CHECK |
| 2 | Pine Labs | Payee-routed Reserve Pay debit: debit the block, settle straight to an approved shop's UPI ID with a note | On the mock, used for the kirana |
| 3 | Gnani | Household reply extraction: commitment label (confirmed with counts, vague yes, refusal, item missing, unclear), quantities in digits, confidence | On rails, used on every cook reply |
| 4 | Sharma Kirana | Order book: the shop gets tomorrow's order the night before, packs it, and is paid at once, so the cook only collects | On rails, used in BUY |

## 8. Trust and safety

- **Money guards held on rails, outside the model:**
  - the Rs 300 approval
  - the Rs 400 day cap
  - payees on the list only
  - a balance check before any shipment
  - only household dishes can be offered
  - plate rules checked per person
- **Privacy:**
  - Votes stay private in vote mode.
  - Plate rules and money go only to the account holder.
  - The cook never sees anyone's rules or votes.
- **No voice authentication.** A voice note tells you which phone sent it, not who spoke, so Baari never treats a voice as proof of who it is.
- **No personal data in the KB.** The org-shared Knowledge Base holds only the synthetic Sharma household. The app feed carries no chat ids, phone numbers or keys.
- **Every reply is honest.** A refused payment is reported as refused, and "pending" is never "paid".

## 9. What an Indian kitchen throws at Baari

| Situation | What Baari does today | Not yet |
| --- | --- | --- |
| Someone's plate rule (no potato for Papa) | Drops the dish for that plate; a vote for it counts for the other dish and the person gets one kind line | |
| Tuesday no non-veg, vrat days | Rules filter the shortlist | Vrat menus (sabudana, no grain) as their own dishes |
| "Kuch bhi" | Counts as no preference | |
| Nobody answers | Picks and vetoes close on their own; silence means dish one | |
| The cook's vague "haan haan" | Asks once for counts | |
| The cook doesn't reply | Resends once, then tells the account holder | |
| Parcel late, no rider, shop out of stock | Hop, then kirana pickup, then the runner-up dish | |
| Over budget | Asks the account holder; refuses past the day cap | |
| Someone eats out tomorrow | Marked away from Telegram, the app or a call. A confirmed routine marks them before the shortlist. NEEDS and the call scale to the headcount | |
| A dish needs prep the night before (soak rajma, set curd, ferment batter) | | Rails works out whether the prep can happen tonight (the item at home, someone home who isn't the cook, time before the deadline) and tells the agent in a PREP line. After LOCK the task goes to one person with a button and one reminder; if it's missed, the brief carries the quick plan |
| Guests drop in | | |
| Cook calls in sick that morning | | |
| Gas cylinder or power runs out | | |
| A price spike (tomato at Rs 120 a kg) | | |

## 10. How we know it works

- **Evals:** ten cases (`evals/cases/E01..E10.yaml`), each with a rails preset, run on Baari-eval with simulated people. On prompt v5 at the Round 3 deadline, GPT-5.4 passed 8 of 10. E04, a shipment booked before the balance check, has since been fixed on rails. The prompt is now v12 and needs a fresh run.
- **Rails tests:** smoke, turn scenarios, household guards and role takeover. The counts are in the commit history.
- **The metric we'd track with real families:**
  - agreed-and-eaten days out of cooking days
  - time-to-lock (seconds from shortlist to locked dish)
  - the share of nights someone other than the usual person held the baari

## 11. Known limits

- One household on rails today (the synthetic Sharma family). Rails can hold an onboarding profile now, but the app doesn't send it yet.
- The shortlist draws from six house dishes, plus three with night prep.
- Pine Labs payment links are real on the sandbox. The household block's small debits run on a demo block until the sandbox merchant has UPI. Nothing runs on production Pine Labs, and no real money moves.
- Delhivery is a mock. No API tokens are available to us.
- The phone call's understanding of "yes" runs on a rails model, outside AgenticOrg.
- Twilio's trial rings one verified phone.
- AgenticOrg's `agent_scheduler` is rejected on our agent, so a Cloudflare Worker and rails start runs.
- Speech to text through rails takes about 5 seconds: fine for voice notes, not for live talk.
- Every platform run reports `hitl_triggered`, even at confidence 0.82, and we haven't found why.

## 12. Where things live

| What | Where |
| --- | --- |
| App | `app/`, deployed with `app/deploy.sh` to https://baari.pages.dev (Cloudflare Pages) |
| Rails | `baari-mock/`, deployed to https://baari-rails.vercel.app |
| Clock Worker | `workers/baari-clock/` |
| Agent prompt and KB | `agent/prompts/`, `agent/kb/split/` |
| Evals | `evals/` |
| Round 3 answers | `submission/ANSWERS.md` |
| Demo runbook | `docs/DEMO_RUNBOOK.md` |
| Film tooling | `film/` |
| Research | `research/` |
| Bot | https://t.me/Baari_ken_bot |
