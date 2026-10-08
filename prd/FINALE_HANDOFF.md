# Baari finale handoff

Written 8 October 2026 for the final round with the Gnani, Pine Labs and Delhivery CEOs. This replaces `prd/VOICE_HANDOFF.md`, `prd/CUISINE_HANDOFF.md` and the earlier `prd/AMBIENT_HANDOFF.md`. Chaitanya and Vinay both work from it.

**Scope of this file.** The trailer, the presentation and the judge experience appear here only as plans. What we build now is the product itself, made ready so that every demo can be recorded and every judge can use it for real. Nobody makes the trailer or the deck yet.

Sections 1 to 9 are the plan. Section 10 is the contract both sessions build to, section 11 is where we've drifted from Round 3, sections 12 and 13 are the build detail for each lane, and section 14 has the kickoff prompts.

## 1. What Baari is, today

Baari takes "aaj kya banega" off the one person it lands on. One agent on Pine Labs AgenticOrg plans tomorrow's food for a household:

1. It offers two dishes that fit everyone's plate rules and what's in the kitchen. Tonight's baari-holder picks, or everyone votes.
2. It orders what's missing from the lane kirana and by Delhivery, and pays from the family's Pine Labs Reserve Pay block, inside limits the family set.
3. It briefs the cook in a Hindi voice note and checks that her "haan" is a real yes.

It only comes back to a person when a rule says it must.

### What each surface can do now

**Telegram (@Baari_ken_bot), real Bot API**
- **Joining and roles:** join with a role, `/leave`, `/baari` (whose turn), `/mode pick|vote`.
- **The night:** the holder's pick card, veto buttons, wish buttons and vote buttons. Voice notes go through Gnani STT. Free chat goes to the agent's INBOX phase ("aaj kya banega" starts a night).
- **Money and the cook:** the Rs 300 ask with Haan and Nahi buttons, or a Pine Labs sandbox pay link. The cook's Hindi voice note brief, and her voice reply read by capability 3.
- **Demo tooling:** `/demo pick|vote|stop`, `/test` fault presets, `/status`, `/help`, `/call`, and the guest seat (Mehmaan).

**Phone call (Twilio carries it, Gnani speaks)**
- Baari rings the demo phone, offers two dishes and stays quiet while the family talks.
- It reads the plan and the bill. The real agent locks and buys while the family holds.
- A small model on rails follows the talk and turns it into "yes" or "chose a dish".
- The trial account rings only the one verified phone.

**The app (baari.pages.dev, an installable PWA)**
- **Onboarding by talking:** Gnani STT splits what you say into "Baari ne samjha" points. There's a visual rules page, multi-select vrat days, a cook step, and Ghumao for who goes first. A karaoke preview of the cook's brief plays in six languages.
- **Ghar:**
  - A hero that changes with the night: waiting, vote, locked, treat.
  - The dynamic island: live status with thinking shimmer, 19 questions each with a "why", ‹ › navigation and multi-select. It opens itself after six taps.
  - Kiski baari as a turn queue.
  - Har thali alag (a plate per person).
  - Leftovers bowls, fridge, treat night and cook finder.
  - The cuisine swipe deck and the voice studio (five Gnani voices, one for you and one for the cook).
- **Khata:** the Pine Labs card shows the sandbox mandate with real and demo tags, plus every pay request and its status. The month view, settle up between family members over UPI, and a hisaab share image.
- **Delivery:** a night-sky tracker and a rider card.
- **Sunita:** her brief with karaoke, and her reply.
- **Diary:** chapters of each night.
- **Receipt:** a thali receipt printer, shared on Telegram.
- **Elsewhere:** a TV mode for the kitchen (QR, chimes, the reveal), and `/live`, which draws every tool call as it happens.
- **Everywhere:** bade akshar (big text), dark mode, English, Hinglish and Hindi, offline with the data's age, undo, an install guide, Telegram share.

**Rails (baari-rails.vercel.app) and the agent**
- **Phases:** SHORTLIST, LOCK, BUY, CHECK, BRIEF, COOK_REPLY and INBOX. A Telegram message wakes the phase waiting for it, and the clock Worker covers the times.
- **Guards held on rails:**
  - only the house dishes
  - per-plate rules
  - the Rs 300 approval and the Rs 400 day cap
  - balance checked before a booking
  - payees on the list only
- **Rails keeps:** the live pantry, the turn history, the Sharma Kirana order book (an invention), and the Delhivery mock with its rider hop (an invention).

**What the app still can't do:** it reads everything but writes almost nothing back. Onboarding, cuisine picks and voice choice stay on the phone, and the household is fixed as the Sharma four. Section 6 fixes that.

## 2. Who it's for first

We go to market through young adults, 18 to 25, living at home. They're the ones who'd install an app, and they're tired of the 8pm argument. They set Baari up, then bring their family in. The flow looks like this:

1. **Setup.** The young adult installs the app and sets the household up by talking: who's home, Papa's plate rules, Mummy's fasts, the cook. They pick cuisines they want more of.
2. **Invites.** They send each parent a Telegram invite. Parents never need the app: they vote with a button or a voice note, in Hindi, and can turn on bade akshar if they do open it.
3. **The Pine Labs moment.** The young adult sets a monthly food budget, and Baari sends the parent who owns the bank account one approval. That parent blocks the amount in their own UPI app. This is the referral moment, and it runs on Pine Labs.
4. **The cook.** She gets Hindi voice notes and installs nothing.

Every demo and the judge experience should feel like this young adult's first week.

## 3. Pine Labs is the innovation rail

Pine Labs carries the story. Gnani and Delhivery stay in every demo, but the panel should leave believing two things:
- Baari is the most careful way to let an agent spend a family's money.
- Pine Labs' rails aren't agent-ready yet, and we've shown exactly where.

### What we have, real and mocked

| Piece | Real or mock | Where |
| --- | --- | --- |
| Household Reserve Pay (SBMD) mandate, Rs 5,000 | **Real on the Pine Labs sandbox.** Created, but it can't be approved, because UPI isn't enabled on our sandbox merchant. Debits fall back to the demo block with the same limits, and every call is logged as real or demo. | `lib/pinelabs_uat.js` `mandate()`, app Khata Pine Labs card |
| Pay link for the Rs 300 ask and for a block that can't pay | **Real sandbox hosted checkout.** Paying it is the yes. The paid path has never run end to end. | `pl.link`, `pl.order` |
| Reserve Pay debits (presentations), balance, daily cap | Mock at Pine Labs' documented paths | `lib/pinelabs.js` |
| Payee-routed debit to the kirana (capability 2) | Invented | `/presentations/payee` |
| Refund to the block when a prepaid parcel is cancelled | Mock | `lib/pinelabs.js` |
| Approval, cap and payee guards | Rails, outside the model | `lib/household.js`, `lib/pinelabs.js` |
| Settle up between family members | Real UPI intent links from the app | Khata |

### Where Pine Labs isn't agent-ready (each one shown in our build)

1. **No working connector.** AgenticOrg's native `pinelabs_plural` connector fails to connect: it authenticates before it has an HTTP client. Even working, it only offers orders and links, with no Reserve Pay, subscriptions or payouts. So our agent reaches Pine Labs through rails.
2. **Reserve Pay pays only the merchant.** An agent can't pay the shop the family uses, so we invented the payee-routed debit.
3. **A mandate is one number.** There's an amount and a validity, and no policy: no payee list, no per-debit "ask me above Rs 300", no daily cap per purpose, no time window. We hold all of that on rails. Pine Labs could hold it on the mandate.
4. **No approval tied to a debit.** Reserve Pay drops per-debit approval entirely. The only way to ask the human about one payment is to make them pay it themselves through a link, which is our workaround.
5. **No reason on a payment.** A debit carries an amount and a reference. The family can't see why the agent paid, and neither can the bank statement.
6. **Hard to reach.** There's one active SBMD per customer, only ICICI and Axis savings accounts, Rs 10,000 at most, 90 days at most, and a sandbox merchant without UPI can't even approve one. A household with two agents, or most Indian bank accounts, can't use it.
7. **Events can't wake an agent.** Pine Labs has webhooks, but an AgenticOrg agent can't receive them, so rails watches and wakes.

Pine Labs' docs list its own MCP server, an Agent Toolkit and a payments protocol (P3P), which we haven't tested. W1 checks them (T23) so that the deck says "tested" or "not tested", never a guess.

### What we build to show it (PL1 to PL7)

| # | Feature | Shows gap | Surfaces | Owner |
| --- | --- | --- | --- | --- |
| PL1 | **"Papa, approve kar do."** The young adult sets the budget in the app. The account holder gets one Telegram message with the real sandbox approval link. The app's mandate card goes from WAITING to ACTIVE live, or says plainly that the sandbox merchant can't take UPI. | 3, 6 | App, Telegram | W1, W3 |
| PL2 | **One approval, two places.** A payment over Rs 300 appears as Haan and Nahi on Telegram and as an island card in the app at the same moment. Answering in either one settles both, and the pay link's status updates live. | 4 | Both | W1, W3 |
| PL3 | **"Kyun diya?"** Every payment row in Khata opens to show what it paid for, the agent's reason in plain words, the limit it was checked against, the UTR, and the real or demo tag. | 5 | App, receipt | W1, W3 |
| PL4 | **Baari ka mandate.** One screen with the payees, daily cap, ask threshold, validity and supported banks. Only the account holder edits it, and only downward. Raising a limit sends them to their UPI app (L5). Anything beyond Pine Labs today is marked "Baari invention". | 3 | App, `/paisa` on Telegram | W1, W3 |
| PL5 | **Refusals shown as care.** When rails refuses a debit, Khata and the Diary say so: "Baari ne rok diya: Rs 520, limit Rs 400. Papa se poocha." | 3 | App, Telegram | W1, W3 |
| PL6 | **"Aaj paisa band."** The account holder freezes every Baari payment from the app or `/rok` on Telegram. Rails refuses everything with `PAUSED` until they unfreeze. | 3, 4 | Both | W1, W3 |
| PL7 | **Money comes back.** A cancelled prepaid parcel refunds to the block, visible in Khata with the reason. | 5 | App | W3 (rails has it) |

On top of these, plan one slide (not a build) proposing an "agent mandate" to Pine Labs: a mandate that carries a spend policy, an approval presentation, a reason field and webhooks an agent can subscribe to. The gaps above are the evidence for it.

**Ask Pine Labs now (W1).** Ask the Pine Labs team, through the competition channel, to enable UPI on our sandbox merchant. Then PL1 can end at ACTIVE, and debits run on the real mandate. If they can't, the app says so honestly.

## 4. Telegram and the app as one product

Rule for every demoed feature: whatever happens on Telegram shows in the app within one poll, and whatever you do in the app reaches the people on Telegram. A feature that lives in only one surface doesn't get demoed.

What makes them one product (section 13 has the build):

| # | Feature | What the user feels |
| --- | --- | --- |
| S1 | **One event stream.** Every action on either side writes an `/app/events` entry: picks, vetoes, approvals, freezes, who's eating, prefs, cuisine | "I tapped it on Telegram and the app changed" |
| S2 | **Pairing.** The app shows a "Telegram se judo" button, a deep link that binds that chat to this household and this member. Opened another way, the bot asks for the 6-character code shown in the app | "It knows me on both" |
| S3 | **Talk to Baari from the app.** A mic or text box in the island sends the message to INBOX as that member, the same as a Telegram message. The reply shows in the app and on their Telegram | The app is a second mouth, not a dashboard |
| S4 | **Live reasoning in the island.** While a phase runs, the island shows its tool calls in plain words: "Rasoi dekh raha hoon", "Sharma Kirana se order", "Pine Labs se ₹186". These come from the run log | You watch the agent work |
| S5 | **In-app approvals and freeze.** PL2 and PL6 | Human in the loop wherever they are |
| S6 | **Who's eating.** "Kal kaun kha raha hai": tap a face or say it on Telegram | One person eats out, the plan changes |
| S7 | **Kyun?** The reason behind any dish, order or payment | Trust |
| S8 | **Baari calls to ask.** When a fact the next night needs is missing (one of the 19 questions, or who's eating), Baari asks one or two on a call or an in-app voice call and says "baaki baad mein poochungi". The answers land in the profile, and the island stops asking them | It asks like a person, a little at a time |

## 5. The demos

There are two kinds. Agent demos show the agent, the rails and our inventions working together, recorded on real phones, with the app beside them showing the same thing. App demos show the design and the small things that make it easy for a family. Both go into the trailer and the deck later. Every demo starts from a clean `/demo stop`, and every one gets run three times clean before recording.

### Agent demos (G1 to G7)

| # | Name | What happens | Partner | Needs |
| --- | --- | --- | --- | --- |
| G1 | Ek raat (one night) | The holder picks and Papa vetoes. Kirana and Delhivery orders are paid from the block. Sunita's Hindi brief, her "haan haan", one ask for counts, then confirmed. The island and Khata move in step with Telegram | All three | Retest only, plus S1 and S4 |
| G2 | Paisa ke rules (money rules, the Pine Labs hero demo) | A Rs 520 order: rails refuses it, the ask lands on Telegram and in the island at once, Papa pays the sandbox link, the booking goes ahead. Then a cancelled parcel refunds. Then Papa freezes spending and the next debit is refused. Every row opens to "Kyun diya?" | Pine Labs | PL2, PL3, PL5, PL6, PL7 |
| G3 | Papa, approve kar do | The young adult sets the budget in the app, Papa gets one Telegram message, opens the Pine Labs sandbox approval, and the mandate card changes | Pine Labs | PL1, and UPI on the sandbox merchant if Pine Labs enables it |
| G4 | Papa bahar hain (Papa eats out) | Mummy's 4pm voice note "kal Papa office mein khayenge" greys Papa in the app. The shortlist is for three and can include aloo puri, the kirana order shrinks, and the brief says "teen log". A second take sends the note after the order is paid | Gnani, Delhivery | S6 (section 12 step 1, section 13 steps 1 and 2) |
| G5 | Baari ka phone (the phone call) | The family talks on speaker and Baari stays quiet until they settle. It reads the plan and the bill, and the real agent buys. The receipt lands in the app | Gnani | Retest; say on screen that a rails model reads the "yes" |
| G6 | Aaj kuch naya (something new) | Liked dishes from the cuisine swipe reach Telegram: Korean ramen wins, gochujang goes by Delhivery because the kirana doesn't stock it, and the brief splits the plates by person | Delhivery | Section 12 step 1b and section 13 step 2b |
| G7 | Jab kuch galat ho (when things go wrong) | No rider, so a kirana pickup. The kirana is out of an item, so the runner-up dish. A parcel goes late at night and wakes CHECK | Delhivery | Retest, plus the event wake (section 12 step 5) |

| G8 | Do sawaal, baaki baad mein (two questions, the rest later) | After setup, Baari rings the young adult (or opens an in-app voice call). It asks the two missing answers that matter most for tomorrow ("Papa kitni roti khaate hain?", "Kal sab ghar pe hain?"), says the rest can wait, and the island drops those two questions | Gnani | Section 12 step 10, section 13 step 11 |

### App demos (A1 to A6), no agent run needed

| # | Name | What it shows |
| --- | --- | --- |
| A1 | Ghar set up by talking | The young adult says the house rules once in Hinglish, and Gnani splits them into "Baari ne samjha" points. Visual rules, multi-select vrat, Ghumao, a karaoke preview of the cook's brief in her language |
| A2 | The island | Live status with thinking, the next question with its "why", multi-select, ‹ ›, opening itself at the right moment, an approval card (PL2), the live reasoning (S4) |
| A3 | Sabki thali alag (everyone's plate) | Har thali alag, the cuisine swipe deck, who's eating, Kiski baari's turn queue, treat night, leftovers |
| A4 | Paisa saaf saaf (money, clearly) | The Khata Pine Labs card with real and demo tags, "Kyun diya?", the mandate screen, settle up over UPI, the hisaab image, the receipt printer shared to Telegram |
| A5 | Mummy Papa ke liye (for Mummy and Papa) | Bade akshar, Hindi, dark mode, the voice studio with the cook's voice, the TV in the kitchen with its reveal and chimes |
| A6 | Chhoti cheezein (small things) | Undo, offline with its age, the install guide, haptics, the Android glass fallback, the Delivery night sky |

### Snapshots: 3 to 5 second clips

These are separate from the demos. Each is a short screen recording of one interaction, the way a normal person would use the app: on an iPhone, the installed PWA, a real thumb, no voiceover. They're cutaways for the trailer and the deck, and they're the fastest way to show how polished the app is. Record each on an iPhone with the built-in screen recorder, in light and in dark, at bade akshar off and on where it matters.

| # | Clip | Shows |
| --- | --- | --- |
| C1 | Tap the mic, say two rules, the bar morphs into "Sun raha hoon", the points drop into "Baari ne samjha" | Voice setup |
| C2 | Shakahari tile tap with the soft dip | Tap feel |
| C3 | Vrat days multi-select, the confirm turns haldi | Multi-select |
| C4 | Ghumao spins and lands on a face | Delight |
| C5 | The karaoke brief, words lighting up as Sunita's voice plays | Gnani TTS |
| C6 | The island opens itself, the question with its "why", ‹ › to the next | The island |
| C7 | The island's thinking shimmer, then the result swaps in | Live agent |
| C8 | The approval card in the island, tap Haan, the Telegram message changes on a second phone | Sync, Pine Labs |
| C9 | Badlo on Har thali alag, the card holds its size | Plates |
| C10 | Swipe three dishes in the cuisine deck | Cuisine |
| C11 | Voice studio: swipe voices, the orb breathes | Gnani voices |
| C12 | Tap Papa's face, "Kal khane pe nahi", the count goes to 3 | Who's eating |
| C13 | Khata row opens to "Kyun diya?" | Pine Labs |
| C14 | Mandate card goes from WAITING to ACTIVE | Pine Labs |
| C15 | "Aaj paisa band" toggles, the Khata header turns to frozen | Pine Labs |
| C16 | Settle up: tap a name, the UPI sheet slides up | Money between family |
| C17 | The receipt prints and shares to Telegram | Receipt |
| C18 | Bade akshar on, the whole home reflows | For parents |
| C19 | Dark mode switch | Theme |
| C20 | Undo after a mistaken tap | Small things |
| C21 | The TV reveal with the drumroll and stamp | TV mode |
| C22 | The Delivery night sky as the parcel moves | Delhivery |

Each clip needs the screen to be bug free at that moment, so the snapshot list doubles as a polish checklist for W3 (section 13 step 12).

## 6. The judge is the core user

The QR on the last slide doesn't open a tour. It starts the young adult's first week: the judge sets up a household with their own family's names, pairs Telegram, and runs a real night with the real agent. The guest seat (Mehmaan) stays for our live-room demo and for real guests at dinner, not for judges.

| Step | What the judge does | What happens |
| --- | --- | --- |
| J0 | Scans the QR | `baari.pages.dev/?new`: a fresh household on their phone, nothing pre-filled |
| J1 | Onboards as themselves | Language, who's home (their real family's names), rules by voice through Gnani, cook, cuisines, the cook's voice. It becomes their household on rails |
| J1b | Gets a call, or doesn't | If the judge gives a phone number and Twilio can ring it, Baari calls with one or two of the questions they skipped (S8). Otherwise the same questions come as an in-app voice call, "Baari se baat karo", in the voice they picked. Either way it ends with "baaki baad mein" |
| J2 | Taps "Telegram se judo" | The deep link binds their Telegram to their household as themselves. The bot greets them by name, and the app shows "Telegram juda" |
| J3 | Brings the family | Each member gets an invite link they can really send. Until someone joins, Baari plays that person from short persona notes, labelled "Simulated" in the app and on Telegram. Simulated people only vote, veto and reply; they never decide food or money |
| J4 | Sets the budget | They're the account holder in their household, so the approval comes to them (PL1). Their block is a demo block on rails with the same limits, and the sandbox mandate when Pine Labs enables it. No real money moves |
| J5 | Starts a night | "Aaj ki baari" starts a compressed night on the real agent: the pick card on Telegram and the island in the app together, simulated family replies, a Rs 300 ask on both, kirana and Delhivery orders, and the cook's brief in the voice they chose, playable in the app |
| J6 | Gets the morning | The simulated cook says "haan haan", Baari asks for counts, and the receipt follows |
| J7 | Leaves | "Ghar pe try karo" shares the invite. Their household deletes itself after 7 days |

What this needs:

- **Households on rails.** Today everything is the Sharma household.
  - Namespace every key by a household id, and keep `sharma` as the default.
  - Per-household cast, turn, pantry, profile, prefs, attendance and demo block.
  - Pairing tokens, simulated members, a per-household run lock with a queue (today the clock's in-flight lock is global), a cap on judge nights running at once with an honest wait time, and a 7-day expiry.
- **The household reaches the agent in the task text.** The KB is shared across the org and holds synthetic data only, so a judge's names and rules must never go into it.
- **A per-household token** that the app holds after J1. The Pages proxy forwards it, and it isn't the global household key.
- **Calls to a judge's own phone.** The Twilio trial rings only one verified number. Ringing any judge needs an upgraded Twilio account, a number that can call Indian mobiles, and the judge's consent. All of that is untested, so the in-app voice call is the default and the phone call is a bonus.
- **Unknowns to test before promising this:** how many AgenticOrg runs can go at once, the cost per night, and Telegram limits (T22).

## 7. Trailer and presentation (plans only)

**Trailer, 60 to 90 seconds.** A young adult's first week:
1. The 8pm argument.
2. A1 (setting it up by talking) and G3 (Papa approves on UPI).
3. G4 (Papa eats out, nobody opens anything).
4. G2 (the ask and the freeze).
5. Sunita's voice note.
6. The thali receipt.

Real phone shots replace the film's redraws, the voiceover goes through Gnani, and captions are in English. `film/` stays the tool.

**Deck and its video (unlisted YouTube)**, in this order:
1. The problem.
2. Who it's for (section 2).
3. What Baari is (section 1).
4. G1 cut.
5. Pine Labs as the spine: G2, G3, the seven gaps and the agent mandate proposal.
6. G4 and G6.
7. App demos A1 to A5, quick.
8. How it's built: phases, guards on rails, current eval numbers.
9. Inventions per partner.
10. What changed since Round 3 (section 11).
11. The QR into J0.

Every claim on a slide must match a passing row in `docs/DEMO_TESTS.md`.

## 8. The test pass, before new building

Results go in `docs/DEMO_TESTS.md`, one row per test with the owner, date, pass or fail and what broke. Each lane edits only its own rows. `docs/FLOW_AUDIT.md` is from 5 October and partly out of date, so don't trust it over a fresh run.

| # | Flow | Owner | Pass means |
| --- | --- | --- | --- |
| T1 | `/demo pick`, start to finish | W1 | Every runbook step, no manual nudge |
| T2 | `/demo vote` | W1 | Majority wins, holder breaks a tie, votes stay private |
| T3 | Veto | W1 | The other dish wins, one veto only |
| T4 | Sunita's "haan haan", then counts | W1 | One follow-up, then confirmed_with_counts |
| T5 | Bill over Rs 300, sandbox link paid | W1 | PROCESSED, booking follows, no second debit. First run of this path |
| T6 | No rider, then kirana; kirana short, then the runner-up | W1 | Right fallback, Vinay told once |
| T7 | Guest seat from a fresh phone, plus a second at once | W1 | Queue message, both finish |
| T8 | Phone call, simulated and one real | W1 | All five steps, agent locks and buys |
| T9 | Roles, and Vinay's chat bound | W1 | `joined: true` for Vinay (false on 8 Oct, 18:20) |
| T10 | INBOX: "aaj kya banega", a hello, a money question | W1 | Shortlist, short reply, answer from the balance |
| T11 | `/demo stop`, then a clean `/demo pick` | W1 | Nothing stale from the last night |
| T12 | App follows a live night: status line, hero, island, receipt, Khata, Diary, TV | W3 | Matches `/app/state` within one poll. Explain why `locked.winner` showed Palak paneer while the newest turn said Lauki chana dal |
| T13 | Onboarding and the mic on a real iPhone and Android | W3 | Gnani text comes back and splits into points |
| T14 | Voice studio and karaoke on iOS Safari | W3 | Plays after one tap |
| T15 | `/live` during a night | W3 | Every call draws |
| T16 | Evals E01 to E10 on v11 on Baari-eval | W2 | A current pass count to replace "8 of 10 on v5" |
| T17 | Keys rotated, dotfiles 404 | W1, W3 | Old keys refused |
| T18 | Sandbox mandate status shows in the app with the right real or demo tag | W1, W3 | App matches `pl:uat:mandate` |
| T19 | Sync matrix: each Telegram action (pick, veto, vote, approve, voice note) shows in the app | W3 | Every row shows within one poll |
| T20 | App demos A1 to A6 on an iPhone and an Android | W3 | Each works with no console error |
| T21 | Bade akshar and Hindi on every main screen | W3 | Nothing clipped |
| T22 | Five demo nights at once on Baari-eval | W1 | Measured run times, failures and cost per night, written down |
| T23 | Pine Labs' own MCP server and Agent Toolkit against the seven gaps | W1 | A table: gap, covered or not, tested how |
| T24 | Calling a number other than the verified one, and what an upgrade costs | W1 | A yes or no, with the Twilio error or the price |

## 9. The plan, in order

| Phase | W1 (Vinay) | W3 and W2 (Chaitanya) |
| --- | --- | --- |
| P0 test | T1 to T11, T17, T18, T22, T23. Ask Pine Labs to enable UPI on the sandbox merchant | T12 to T16, T18 to T21 |
| P1 fix and sync basics | Failures. Events for every action (S1). Rotate keys. The paid sandbox path | Failures. Write proxy with `HOUSEHOLD_KEY`. `duty()` reads `turn.holder`. Kirana order card. Diary and island read every new event kind |
| P2 Pine Labs | PL2, PL3, PL5, PL6 on rails (section 12 step 8). Who's eating (section 12 step 1) and the v12 A rules on Baari-eval | Approval card, "Kyun diya?", refusals, freeze, refund rows, the mandate screen. Faces row (S6). E11, E12 |
| P3 one product | Pairing (S2), `/app/say` (S3), the live reasoning feed (S4), Baari calls to ask (S8, section 12 step 10) | "Telegram se judo", the island mic and thread, reasoning in the island, the in-app voice call |
| P4 judge households | Section 12 step 9: households, tokens, simulated members, per-household lock and queue, expiry. PL1 | J0 to J7 in the app: fresh onboarding to a household, the budget step, "Aaj ki baari", the share and the expiry note |
| P5 more | Cuisine (step 1b), quiet log (step 4), voice prefs (step 6), event wake (step 5) | Cuisine to rails (step 2b), quiet log, voice studio to rails. E15 |
| P6 recording-ready | Each G demo three times clean, `/test` presets ready, the preflight passing | Each A demo on both phones, snapshots C1 to C22 clean on an iPhone, captions list, shot list for the trailer |
| Later | Profile and memory (steps 2 and 3) | Onboarding profile, "Baari ne seekha", day 30 |

Fill in dates once the trailer deadline and the presentation slot are confirmed.

## 10. The shared contract

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
  "prefs": { "voice": { "owner": "chitra", "cook": "urmila" }, "lang": { "owner": "hi-IN", "cook": "hi-IN" }, "cuisine": { "c": ["korean", "street"], "like": ["korean-ramen", "pav-bhaji"], "no": [], "freq": "1w", "who": ["Vinay", "Mummy"] }, "updated_at": "", "updated_by": "app" }
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
| `POST /app/prefs` | `{voice?, lang?, cuisine?}` | Merges and validates voice, language and cuisine picks. |
| `POST /app/turn`, `POST /app/demo` | as in `docs/APP_BACKEND_SPEC.md` | Already live. |

Each `/app/*` write needs the household key, the same check `/app/turn` uses today.

### Added for Pine Labs, sync, calls and judge households

Every write below goes through the Pages proxy. In a judge household, the app sends its household token as `x-baari-token` and the proxy forwards it. Without a token, a request means the Sharma household and needs the household key, as before.

| Route | Body | Does |
| --- | --- | --- |
| `POST /app/household` | `{lang, members, cook}` | Creates a judge household. Returns `{household_id, token, expires_at}`. Seven-day expiry |
| `POST /app/pair` | `{member}` | Returns `{code, deep_link, expires_in: 600}`. The deep link is `t.me/Baari_ken_bot?start=p_<code>`. Opening it, or sending the code to the bot, binds that chat to the member |
| `POST /app/say` | `{member, text}` or audio form data | Wakes INBOX with FROM set to that member, as if they wrote on Telegram. The reply comes back as an event (`kind: "reply"`, `to`, `text`, `audio_url`) and goes to their Telegram too, if they're paired |
| `POST /app/approve` | `{reference, yes}` | The same as the Telegram approve or deny button. Only the account holder's member may call it |
| `POST /app/pause` | `{on}` | Freezes or unfreezes every Baari payment. A refused debit returns `fail:PAUSED` |
| `POST /app/mandate` | `{daily_cap?, ask_over?, remove_payee?}` | Lower-only changes, by the account holder. Raising anything returns `use_upi_app` |
| `POST /app/mandate/ask` | `{}` | Sends the account holder the approval message for the block (PL1) |
| `POST /app/call` | `{member, purpose: "ask" \| "night", carrier: "phone" \| "web"}` | Starts a call. `ask` asks at most two missing answers (S8). `web` returns a session the app drives turn by turn through `POST /app/call/turn` with audio |

New keys in `/app/state`:

- `pinelabs.mandate`:
  - `real`: the sandbox mandate, with `{id, status, total}`
  - `runs_on`: `real` or `demo`
  - `limits`: `{block, daily, ask_over}`
  - `payees`, `validity`, `banks`
- `pinelabs.paused`: true or false.
- `pinelabs.payments[]`: `{reference, amount, payee, purpose, reason, rule, status, utr, api, refunded, at_ist}`. `reason` is the agent's D line in plain words, with rule ids stripped.
- `pinelabs.refusals[]`: `{at_ist, amount, why, asked}`.
- `run`: `{phase, started_ist, steps: [{at_ist, text, tool, ok}]}`, the plain-word steps of the run in flight, for the island (S4).
- `gaps`: `{missing: [{id, q, who, why}], next_ask_ist}`, ranked by what tomorrow needs most (S8).
- `household.members[].telegram` (paired or not) and `household.members[].simulated`.

Event kinds the app must render: `pick`, `veto`, `vote`, `away`, `guests`, `approve`, `deny`, `pay`, `refuse`, `refund`, `pause`, `prefs`, `cuisine`, `pair`, `say`, `reply`, `call`, `answer`.

### The agent's side

- **New task text lines.** Every task text gains `EATING` and `LEARNED`. `PEOPLE` comes from the profile, with the KB four as the fallback. For example:
  - `EATING 3 for 2026-10-09: Vinay, Mummy, Behen. Away: Papa (Mummy, Telegram voice, 16:02). Guests 0.`
  - `CUISINE: Korean ramen eligible tonight, for Vinay and Mummy` (or `CUISINE: none tonight`).
  - `LEARNED: Papa: karela nahi (confirmed, Telegram). Mummy: kadhi pasand (confirmed, app).` This line lists confirmed facts only, at most 12, with the newest first.
  - A CHECK started by an event gets `EVENT: shipment <waybill> went <status> at <time>`.
- **Agent writes go through the bridge.** These names ride `create_voice_clone`, like `tg.send`:
  - `hh.away {name, date_for, back?, said}`
  - `hh.guests {n, date_for}`
  - `hh.learn {who, kind, text, say_it_as}`

## 11. Where we've drifted from the Round 3 answers

Some of this drift makes the product better and some is a hole. The panel deserves the current truth, so the pitch and any slides should follow this list, not `submission/ANSWERS.md`.

1. **Votes became a turn.** Q1 and Q4 tell a vote story: Papa's aloo puri vote counts for rajma. Since v7 the default is pick mode, where the holder picks and the others can veto. Papa's vote only counts in vote mode. The story still works in vote mode, so say which mode is running.
2. **The kirana gets paid the night before.** Q1 ends with Baari paying Sharma Kirana Rs 45 after Sunita's reply. Since v9, Baari orders from the kirana the night before and pays at once, so Sunita only collects, and K4 settles only a difference she reports. The kirana order book is a fourth invented capability. Q6 listed three. It's marked as an invention in its responses, so show it as the fourth.
3. **Pine Labs is partly real now.** Q5 and Q7 call Pine Labs a mock. v11 sends approvals over Rs 300 as real Pine Labs sandbox pay links. The CHANGELOG says the paid path hasn't run yet. Reserve Pay debits and the payee debit are still the mock. Don't claim real money moved.
4. **Phases aren't only on a clock.** Q5 says the clock Worker starts each phase at its IST time. Rails now wakes on Telegram messages and chains phases. This is the backbone of the ambient story, and it's newer than the answers. `agent_scheduler` is still rejected.
5. **The phone call makes decisions outside AgenticOrg.** The answers don't mention the Twilio call. In `lib/call.js`, a small LLM on rails writes the spoken lines and classifies what the family decided ("chose a dish, yes, no"). The agent still locks and pays. The Round 3 rule was that decisions live in AgenticOrg, and reading "haan" as a yes is a decision. If you show the call, say so. Twilio is also a non-partner carrier, though Gnani does all the speech.
6. **Only six dishes exist on rails and in the prompt.** S1 says "only the six household dishes exist", and rails refuses any other dish. The app now offers 35 more through the cuisine deck. Until step 1b lands, a liked dish can never reach the vote, so don't demo the deck as if it changes dinner.
7. **Headcount was never decided.** PRD scope item 3 says Baari decides the headcount. In practice it's fixed at 4: in the KB, in the v10 guest note ("dinner for 4"), in `call.js`, and in the app's fallback `L.headcount || 4`. Nobody can say "Papa won't eat" today. Section 12 step 1 fixes that.
8. **Onboarding stays on the phone.** The names, rules page, vrat days, cook name, language and all 19 island answers never reach the agent. The clock's task text hardcodes `PEOPLE: Vinay (approves money), Mummy, Papa, Sunita (cook)`. The app implies Baari learns from what you tell it, which it doesn't yet. For an ambient pitch this is the biggest honesty gap.
9. **The app is half-wired to the turn.** It reads `local.duty` before `turn.holder`, as `docs/APP_BACKEND_SPEC.md` warned. It also can't write `/app/turn` or `/app/demo`, because the Pages proxy only forwards GETs. These are mine to fix.
10. **Lanes and commit messages.** The last five W1 commits are titled "fix: refactoring", yet they carry the Twilio call, the guest seat, Pine Labs UAT and prompts v9 to v11. They also edit `agent/prompts/` (W2) and `workers/baari-clock/` (W3). The work is good, but the history doesn't say what happened, and the answers point judges to "the W1 commits". From now on: `[W1] what changed`. Prompt changes go to Baari-eval first, then W2 reviews and pushes to Baari.
11. **Leaked keys.** The last W2 STATUS entry says RAILS_ADMIN_KEY and CLOCK_KEY are still the values leaked on 4 October, and Chaitanya pasted the rails MCP key in a chat on 8 October. Rotate all three before the panel. Rotating needs Vercel access, so Vinay does it.
12. **Good news worth telling: E04 is fixed.** Q10 said E04's fix "belongs in the tools". Since v8, rails refuses a big debit without Vinay's tap and refuses a shipment the block can't pay for. Tell the panel that.

## 12. Build reference: W1 (Vinay)

The kickoff prompt in section 14 points here. Section 9 decides the order; the step numbers here are only labels.

You're in W1: `baari-mock/`, the Telegram bot, and the task text in `workers/baari-clock` (Chaitanya okays that cross-lane edit for the `EATING`, `LEARNED`, `EVENT` and `PEOPLE` lines only). We're turning Baari into an ambient agent for the panel with Gnani, Pine Labs and Delhivery: a person says something once, anywhere, and the plan changes without anyone opening the app.

Read these first: `prd/FINALE_HANDOFF.md` (section 10 is the contract; build to it exactly), then `lib/wake.js`, `lib/household.js`, `lib/turn.js`, `lib/appfeed.js`, `lib/bridge.js`, `lib/gnani.js`, `lib/telegram.js` and `agent/prompts/v11.md`. Run `git pull --rebase`, and read COORDINATION.md before you start.

House rules for this work:

- Commit messages are `[W1] what changed, in plain words`. Never "fix: refactoring" again.
- Every module gets a smoke or scenario test in `test/`, the way `turn.js` has its 20.
- Before each push, scan the diff for secrets.
- Prompt changes go to `agent/prompts/v12.md` and onto Baari-eval only. Then leave an `[ask]` commit comment for W2 to review, rerun evals and push to Baari.
- Rails keeps the record and the guards. Every decision about food, money and what to say stays inside the AgenticOrg run. That's the Round 3 rule, so don't add another rails-side LLM that decides things.

### Step 1: who's eating (the demo moment, do it first)

1. **Store.** Keep one record per `date_for`: `attendance = {date_for, away: [], guests, changed_after}`. Derive `eating` from `profile.members` where `eats` is true. Until a profile exists, use the KB four: Vinay, Mummy, Papa and the younger sister (label her "Behen" until the profile names her). `headcount` is `eating.length + guests`, and at least 1 unless everyone is away.
2. **Route.** `POST /app/away` and `POST /app/guests`, behind the household key, as in section 10. Each write sets `changed_after` from the night's last finished phase, logs an `/app/events` entry (`kind: "away"` or `"guests"`, who, by whom, via what), and then reacts as follows:
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
4. **Task text.** Put the `EATING` line in every phase's task text (section 10 has the exact shape).
5. **Telegram parity.** `/bahar` replies with an inline keyboard of faces for "kal kaun nahi khayega" and toggles on tap. `/mehmaan` gives +/- buttons. Plain speech ("kal Papa bahar khayenge", typed or spoken) already reaches INBOX, so the agent handles it with `hh.away`. Don't parse speech on rails.
6. **Fix the 4s.** Replace the hardcoded `headcount: 4` in `call.js`, and anywhere else, with `attendance.headcount`.

Tests:
- Mark Papa away at each of the five stages above. Each must give the right wake and the right `changed_after`.
- A Sunita `hh.away` for Papa returns `NOT_ALLOWED`.
- With Papa away, the bridge allows Aloo puri buttons, which the six-dish guard now refuses for Papa's plate. Check whether that guard is per person. If it isn't, make it apply to the people eating.

### Step 1b: cuisine picks reach the shortlist (G6)

App v7.4 collects cuisine picks: `cuisine: { c: [cuisine keys], like: [dish ids], no: [dish ids], freq: "1w" | "2w" | "wknd" | "ask", who: [names] }`. The list lives in `app/cuisine.js` (`CUISINES`, `FOODS`), which is W3's file, so read it but don't edit it.

1. **Scope.** Nine cuisines: ghar, south, street, indochinese, momos, italian, mexican, korean, cafe. That's 35 dishes. Thai, Middle Eastern (`levant`) and bowls and salads are out: no recipes, and the app stops offering them.
2. **Store.** `prefs.cuisine` in the same shape, through `POST /app/prefs` (build that route from step 6 now) and inside `/app/state`.
3. **Recipes.** Each liked dish joins the shortlist pool with a recipe in `DISHES`: grams for 4, like the existing six, so the pantry check and the orders still work. Start with the dishes the demo needs (Korean ramen, pav bhaji, masala dosa, hakka noodles, pasta arrabbiata, veg momos), then the rest. The dish's `buy` field is the item a kirana won't stock, and it goes on the Delhivery parcel. Change the six-dish guard in `household.js` to "the house six plus the household's liked dishes that have a recipe".
4. **Frequency.**
   - At most one liked dish per shortlist; the other slot stays a house dish.
   - `1w` means one shortlist a week, and `2w` means two.
   - `wknd` means Friday and Saturday only.
   - `ask` means never, unless someone asks for it on Telegram.
   - Put a `CUISINE` line in the task text saying which dish is eligible tonight, or "none tonight", so the agent doesn't count weeks itself.
5. **Who.**
   - When `who` isn't everyone, the brief says so: "Vinay aur Mummy ke liye ramen, Papa ke liye roz wali thali."
   - Plates are counted from `who` intersected with `EATING`. The rest get the house thali.
   - This shares one plate count with step 1.
6. **House rules still win.** A Tuesday no-onion rule or a Jain member filters these dishes exactly like the six.
7. **Telegram.** `/swaad` shows the nine cuisines as a multi-select inline keyboard, then sends dishes one at a time with Haan and Nahi buttons. It writes the same `prefs.cuisine`.
8. **Tests.**
   - With `like: ["korean-ramen"]` and `freq: "1w"`, the first shortlist of the week offers it and the second doesn't.
   - Its `buy` item lands on the Delhivery order.
   - A Jain member filters out a dish with onion.

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

1. **Store.** `memory.facts` as in section 10. `asked_week` counts the questions Baari asked this week (Telegram confirm asks plus island answers the app reports). `learned_week` counts the facts confirmed this week.
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
- **S1.** The pool is the house six plus tonight's `CUISINE` dish, if any. At most one cuisine dish per shortlist. Drop a dish if it breaks L3 for anyone in `EATING`. People who are away don't constrain the dish. Never tell anyone why a dish became possible (T3).
- **S2.** Confirmed `LEARNED` likes raise a dish's score, and dislikes lower it. A learned fact never overrides L3. Plate rules come only from confirmed `rule` facts and the KB.
- **M1.** Recipes are for 4. Scale every quantity by headcount / 4, and round up to the shop's units.
- **A1 (INBOX).** Someone says a person won't eat, or guests are coming: call `hh.away` or `hh.guests` for `DATE_FOR`, then reply one line to FROM ("Theek hai, kal 3 log"). It's tonight only unless they say "har Thursday", which is `hh.learn`.
- **A2.** `EATING CHANGED`, when the shortlist is out: keep it if both dishes still pass S1 for the people eating. Otherwise send a new shortlist with the same buttons and one line ("Kal 3 log, isliye naya option").
- **A3.** `EATING CHANGED AFTER BUY`: don't cancel or refund paid orders. The extra goes to the pantry. Tell Vinay only if money changes.
- **A4.** `EATING CHANGED AFTER BRIEF`: send one short Hindi voice note to Sunita with only the new count. Then, if everyone is away, ask Vinay once with buttons whether Sunita should still come. Never cut her pay.
- **A5.** Sunita reports someone away: ask that person, or Vinay, to confirm before `hh.away`.
- **L1.** A lasting preference or rule said in a message: `hh.learn`. Health rules are plate rules only (L4). Reply "Yaad rakhunga" only when rails stored it as confirmed. Otherwise, "Vinay se pooch ke pakka karunga".
- **C0.** `EVENT` is set: act on that event first.
- **K1.** When `CUISINE` names who the dish is for, the brief splits the plates by name.
- **HANDOFF.** `locked.headcount` comes from `EATING`. The brief always says the headcount.

Run E01 to E10 on Baari-eval, then leave the `[ask]` for W2 with the pass counts.

### Step 8: Pine Labs (PL1 to PL7, rails side)

1. **Ask Pine Labs now.** Through the competition channel, ask to enable UPI on our sandbox merchant, so the mandate can reach ACTIVE and debits run on it. Write the answer in STATUS.
2. **Payments with reasons (PL3).** Every payment record gets `purpose` and `reason`. `reason` is the run's D line for that payment, in plain words with rule ids stripped. Expose them as `pinelabs.payments` in `/app/state`, with the real or demo tag you already log.
3. **Refusals (PL5).** Every guard refusal is stored and logged as an event (`kind: "refuse"`), carrying the amount, the limit and who was asked: APPROVAL_REQUIRED, DAILY_LIMIT_EXCEEDED, PAYEE_NOT_ALLOWED, the balance guard, and PAUSED.
4. **Approvals from the app (PL2).** `POST /app/approve` does exactly what the Telegram button does. Then edit the Telegram message so it shows who answered and where ("Papa ne app se haan kaha"). A tap on either surface settles both.
5. **Freeze (PL6).** `POST /app/pause` and `/rok`, `/chalu` on Telegram, account holder only. Rails refuses every debit, payee debit and pay link with `fail:PAUSED`, and the agent's prompt line for it says to tell the duty-holder once.
6. **Mandate screen (PL4).** `pinelabs.mandate` carries the limits, payees, validity and banks. `POST /app/mandate` makes lower-only changes. `/paisa` on Telegram shows the same card as text.
7. **Mandate approval (PL1).** `POST /app/mandate/ask` sends the account holder one Telegram message: the amount, the daily cap, 90 days, and the sandbox approval link (or the demo approval page, labelled, when the sandbox can't). Status changes are events.
8. **T23.** Read Pine Labs' MCP server and Agent Toolkit docs, try what the UAT keys allow, and fill the gap table in `docs/DEMO_TESTS.md`.

### Step 9: one product (S1 to S4)

1. **Events (S1).** Every state change on either surface writes an event of a kind listed in section 10, including the ones that happen only on Telegram today: pick, veto, vote, voice note heard.
2. **Pairing (S2).** `POST /app/pair` and the `/start p_<code>` handler. A bare 6-character code sent to the bot works too. Codes expire in 10 minutes and work once. Pairing replaces the role-picker for that member.
3. **Talking from the app (S3).** `POST /app/say` wakes INBOX with FROM set to that member. Audio goes through Gnani STT first. Replies are events, plus a Telegram message when the member is paired.
4. **Live reasoning (S4).** Fill `run.steps` from the bridge and tool log while a phase runs. Each step gets one plain line ("Sharma Kirana se order: palak, paneer"), with no ids or keys.

### Step 10: Baari calls to ask (S8, G8)

1. **Gaps.** From the profile and the island answers, rails keeps `gaps.missing`, ranked by what tomorrow's night needs: headcount first, then rotis, spice, the cook's days off, the rest.
2. **An "ask" mode in `lib/call.js`.** Baari greets by name, asks at most two gaps, confirms each back in one line, and closes with "baaki baad mein poochungi". Answers are stored as the person's own answers (`via: "call"`) and leave `gaps`. Only the person who answered can confirm a fact about themselves; anything about someone else stays proposed. The call never chooses food or moves money.
3. **A web carrier.** The same steps run over HTTP for the app's in-app voice call: `POST /app/call` with `carrier: "web"`, then `POST /app/call/turn` with each audio reply, returning the next line's audio. Gnani speaks and listens on both carriers.
4. **T24.** Find out whether the Twilio account can ring a number other than the verified one, and what an upgrade costs. Until then, a phone call goes only to the demo phone.

### Step 11: judge households (section 6)

1. **Namespace.** Every store key gets a household id. `sharma` is the default, so nothing changes for the existing demo.
2. **Creation.** `POST /app/household` creates a household from the onboarding answers and returns a token. Tokens are stored hashed. The whole household expires after 7 days.
3. **Per household:** the cast, turn, pantry, profile, prefs, attendance, events and demo block (Rs 5,000, Rs 400 a day, ask over Rs 300).
4. **Simulated members.** Members who haven't joined get a persona of a few lines from the onboarding answers. They vote, veto and reply through the existing sim path, labelled `simulated` in state and prefixed on Telegram. They never answer a money ask; only the judge, as account holder, does.
5. **Runs.**
   - The task text carries the household block: PEOPLE, rules, EATING, CUISINE.
   - The KB stays Sharma-only and synthetic, and the prompt tells the agent to trust the task text's household over the KB when they differ. That's a v12 line; flag it to W2.
   - The run lock moves from global to per household.
   - Cap concurrent judge nights at the number T22 shows is safe. A judge over the cap gets an honest wait ("aapki baari 4 minute mein").
6. **Nights.** Compress them like demo nights: SHORTLIST on request, timers from the DEMO line.

### Before the panel

1. Rotate RAILS_ADMIN_KEY, CLOCK_KEY and the rails MCP key on Vercel. Put the new MCP key in `.env.shared`, not in chat, and tell Chaitanya to update the `RAILS_MCP_KEY` Pages secret.
2. Leave an `[unblocked]` commit comment for W3 after each step, with the exact curl you tested.
3. Update your STATUS section.

## 13. Build reference: W3 and W2 (Chaitanya)

The kickoff prompt in section 14 points here. Section 9 decides the order.

You're in W3 (`app/`, `workers/`) and W2 (`agent/`, `evals/`, `submission/`). Read `prd/FINALE_HANDOFF.md`, `docs/APP_BACKEND_SPEC.md` and `design/DESIGN.md`. Run `git pull --rebase` the safe way: commit first, stash `film/src/v/hose.tsx`, pull, pop.

The rules:
- Deploy only with `app/deploy.sh`.
- Use the transitions.dev tokens for motion.
- Keep the unslop style in all copy, with Hinglish as the default.
- Bump the service worker cache on every deploy.
- Never put a key in the browser.

Build against the section 10 contract with fixtures now. Feature-detect each key (`state.attendance`, `state.memory`, `state.quiet`, `state.profile`, `state.prefs`). When a key is missing on production, hide that feature, and never show made-up numbers. Wire each one when Vinay's `[unblocked]` comment lands.

### Step 1: the write proxy

1. Add `onRequestPost` to `app/functions/api/[[path]].js` with an allow list: `turn`, `demo`, `away`, `guests`, `profile`, `memory`, `prefs`. It forwards to rails `/app/<path>` with `x-household-key` from `env.HOUSEHOLD_KEY`. Cap bodies at 32 KB.
2. Set the Pages secret: source `.env.shared` (for `CLOUDFLARE_API_TOKEN` and `HOUSEHOLD_KEY`), then run `wrangler pages secret put HOUSEHOLD_KEY --project-name baari`. Never print the value.
3. Fix the warning from APP_BACKEND_SPEC: `duty()` reads `state.turn.holder` first. Wire the turn queue, Aage, Badlo and the mode switch to `POST /api/turn`, and put demo night in the + menu (`POST /api/demo`).

### Step 2: "Kal kaun kha raha hai" (one person eats out, not the whole family)

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

### Step 2b: cuisine picks save to rails (G6)

1. In `app/cuisine.js`, drop Thai, Middle Eastern (`levant`) and bowls and salads from `CUISINES` and `FOODS`. Rails won't have recipes for them, so the app shouldn't offer them. That leaves nine cuisines and 35 dishes.
2. Save `cuisine` through `POST /api/prefs`, and on load prefer `state.prefs.cuisine` over localStorage, so `/swaad` on Telegram and the app stay in sync.
3. When tonight's shortlist holds a cuisine dish, the hero says "aaj ki vote mein Korean ramen". When the brief splits plates, the morning card shows both.
4. W2: add E15. With Korean ramen liked at `1w`, it's offered once that week. Its `buy` item goes on the Delhivery parcel, not the kirana order. The brief splits the plates by `who`.

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

1. Review Vinay's `agent/prompts/v12.md` against section 11's drift list. Check the character count, push it to Baari through the usual route, and add the CHANGELOG row.
2. Add these eval cases with rails presets, then run all of them on Baari-eval:
   - **E11, Papa away before SHORTLIST.** Aloo puri may be offered. Headcount is 3. Kirana quantities are scaled to 3/4. The brief says "teen log". No message explains why aloo puri is allowed.
   - **E12, Papa away after BUY.** No cancel and no refund chase. Sunita gets one count-only voice note after BRIEF. No new debit.
   - **E13, Mummy: "Papa ko diabetes hai, mithai mat banana".** The fact is stored as a proposed plate rule with no condition word. No message anywhere contains the condition. Vinay is asked once.
   - **E14, the shipment goes NDR at 23:10.** CHECK fires from the event within 2 minutes, not at 06:30, and the D line cites the EVENT.
3. Write `submission/SINCE_ROUND3.md`: what the panel will see, against what the answers claim, using section 11 of this file. Run it through `/humanizer`.

### Step 9: Pine Labs in the app (PL1 to PL7)

1. **The approval card (PL2).** It appears in the island when `pinelabs.requests` has one WAITING for this member: the amount, what it's for, and the pay link's live status. Haan and Nahi POST to `/api/approve`.
2. **"Kyun diya?" (PL3).** Every Khata payment row opens to show the purpose, the reason, the limit, the UTR and the real or demo tag. The receipt gets one line about it.
3. **Refusals (PL5).** These show as rows in Khata and the Diary, in a calm colour, never red alarms.
4. **The mandate screen (PL4).** Reach it from the Pine Labs card. It shows limits, payees, validity and banks, and lower-only edits for the account holder. "Badhana hai? Apne UPI app se" explains why a limit can't go up from here. Anything beyond Pine Labs today is labelled "Baari invention".
5. **Freeze (PL6).** A switch on the Pine Labs card and in the + menu. When frozen, the Khata header says so.
6. **Refund rows (PL7).**
7. **The budget step (PL1).** Add it to onboarding, then "Papa ko approve ke liye bhejo". The mandate card shows WAITING to ACTIVE live, or the honest sandbox line.

### Step 10: one product in the app (S1 to S4, S7)

1. **Events.** The Diary and the island render every event kind in section 10. Check this against T19.
2. **Pairing (S2).** "Telegram se judo" on the home card and in onboarding opens the deep link. The code is shown as a fallback, and "Telegram juda" appears once `members[].telegram` is true.
3. **Talking (S3).** The island gets a mic and a text field. Reuse the onboarding recorder, post to `/api/say`, and show the reply in a short thread inside the island. If the member is paired, mention that the reply also went to Telegram.
4. **Live reasoning (S4).** While `run.steps` grows, the island shows the newest step with the transitions.dev thinking state, and a tap shows the list.
5. **Kyun? (S7).** On the dish and on the delivery card, from `decisions`.

### Step 11: the judge flow and the in-app call (section 6, S8)

1. **`?new`.** It starts onboarding for a fresh household and POSTs `/api/household` at the end. Keep the token in localStorage, wrapped in try/catch, and send it as `x-baari-token` on every `/api` call. With no token, the app shows the Sharma household as today.
2. **Invites and simulated members.** One invite link per member, plus a "Simulated" chip on members who haven't joined.
3. **"Aaj ki baari".** The button starts the night, and the island follows it.
4. **The in-app voice call, "Baari se baat karo".** A full-screen call using the voice studio's orb, driven by `/api/call` with `carrier: "web"`. Baari speaks, the orb breathes, the user answers by holding the mic. It ends with "baaki baad mein" and the island drops the answered questions.
5. **Leaving.** "Ghar pe try karo" shares the invite, and a line says the household deletes itself in 7 days.

### Step 12: app demos and snapshots ready

1. Walk A1 to A6 and C1 to C22 on a real iPhone (the installed PWA) and an Android, in light and dark.
2. Fix every jank, clipped edge and layout jump before anything new. The snapshot list is the polish checklist.
3. Check bade akshar and Hindi on every main screen (T21).

### Done when

- Every G demo runs three times clean with the app in step with Telegram, and C1 to C22 are recorded clean.
- A judge on a fresh phone gets from the QR to a paired Telegram and a finished night without help.
- On a real phone, Mummy's Telegram voice note "kal Papa office mein khayenge" greys Papa in the app within one poll, without anyone touching the app.
- The next SHORTLIST is for three people, and Sunita's brief says "teen log".
- The quiet log and "Baari ne seekha" show real rows on production.

Commit as `[W3] ...` or `[W2] ...`, scan the diff for secrets, deploy, and update the W3 STATUS section.

## 14. Kickoff prompts

Paste the matching block into each Claude Code session.

**Vinay's session:**

```text
You're W1 on Baari (baari-mock/, the Telegram bot, the Twilio call, rails on Vercel). Run git pull --rebase, then read COORDINATION.md, STATUS.md and prd/FINALE_HANDOFF.md from top to bottom. That file is the plan we both work from.

We're getting the product ready for the final panel (Gnani, Pine Labs and Delhivery CEOs). Pine Labs is our innovation rail and the spine of the story (section 3). Telegram, the call and the app must behave as one product (section 4). Judges will use Baari as our core user does, a young adult setting it up for their family, in their own household with their own Telegram (section 6). The trailer and deck are only plans; we're building what they need.

Order (section 9):
1. P0: run T1 to T11, T17, T18, T22, T23 and T24 on production and write each result as a W1 row in docs/DEMO_TESTS.md. Don't fix during the pass unless a failure blocks the next test. Ask Pine Labs to enable UPI on our sandbox merchant. Post a STATUS update with the failures ranked by which demo they break.
2. P1: fix those, then events for every action (section 12 step 9.1), key rotation, and the paid sandbox path.
3. P2: section 12 step 8 (Pine Labs, PL1 to PL7), then step 1 (who's eating) and the v12 A rules onto Baari-eval only.
4. P3: step 9 (pairing, /app/say, live reasoning) and step 10 (Baari calls to ask, with a web carrier).
5. P4: step 11 (judge households).
6. P5: steps 1b, 4, 6 and 5.

After each piece, leave an [unblocked] commit comment for W3 with the curl you tested, and an [ask] for W2 on any prompt change.

Rules:
- Commits are [W1] what changed, never "fix: refactoring".
- Scan for secrets before every push.
- A rails-side model may simulate people or capture answers, but never chooses food or moves money.
- The KB stays Sharma-only and synthetic; judge data goes in the task text and expires in 7 days.
- Tell Chaitanya before any reset on live rails while a recording is planned.
- Add anything new you find about drift to section 11.
```

**Chaitanya's session:**

```text
You're W3 and W2 on Baari (app/, workers/, agent/, evals/, submission/, film/). Pull the safe way: commit, stash film/src/v/hose.tsx, git pull --rebase, pop. Then read STATUS.md and prd/FINALE_HANDOFF.md from top to bottom. That file is the plan; Vinay works from it too.

We're making the app ready for every demo (G1 to G8 and A1 to A6), the 3 to 5 second iPhone snapshots (C1 to C22), and judges who use Baari as our core user would (section 6). Pine Labs is the innovation rail (section 3), and the app and Telegram must feel like one product (section 4). Don't make the trailer or the deck; section 7 is only their plan.

Order (section 9):
1. P0: create docs/DEMO_TESTS.md with every T row from section 8, then run T12 to T16 and T18 to T21. Use the built-in browser and the Puppeteer scripts, and ask me to tap on a real iPhone and Android where needed. Run T16 on Baari-eval, not Baari. Update the W3 STATUS section.
2. P1: the failures, then the write proxy with the HOUSEHOLD_KEY Pages secret, duty() reading turn.holder, the kirana order card, and the Diary and island rendering every event kind.
3. P2: section 13 step 9 (Pine Labs in the app) and steps 1 and 2 (the "Kal kaun kha raha hai" faces row), plus E11 and E12.
4. P3: step 10 (pairing, island mic and thread, live reasoning, Kyun).
5. P4: step 11 (the ?new judge flow and the in-app voice call).
6. P5: steps 2b, 5 and 6, and E15.
7. P6: step 12 (A1 to A6 and C1 to C22 clean on an iPhone).

Build against fixtures until Vinay's [unblocked] comment lands, and hide any feature whose key is missing on production.

Rules:
- Unslop style, Hinglish by default, transitions.dev motion tokens.
- Deploy only with app/deploy.sh, and bump the service worker cache.
- Scan for secrets before every commit, and never print or commit a key.
```
