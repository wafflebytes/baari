# Baari finale deck plan

Written 8 October 2026, 22:00 IST. The plan for the 8-minute finale presentation, followed by the judges' questions. Nothing here is built yet. The trailer has its own plan in `film/TRAILER_PLAN.md`, and the two share one look and one set of HyperFrames components.

Sources: `prd/PRODUCT.md`, the finale handoff (gitignored), the teammate's insight map (`INSIGHT_MAP.md`, shared person to person, cited below by its ids: S for sources, I for insights, X for our analysis), `research/`, `submission/ANSWERS.md` and the Round 1 PDF in `research/Baari-Ken-Submission.pdf`.

## 1. The brief

- **Time.** 8 minutes, then questions.
- **What it must answer.** The five finale questions, in order. They are the spine, so the judges can tick them off as we go:
  1. Which opening, who has the problem, how they get by today, who we are and why us.
  2. The one insight that changed the solution, where we found it, and what we'd have built without it.
  3. Does it work. We're on the build track, so we show the agent doing its job and say what it still can't do.
  4. Which rail we'd innovate on, what the agent needs that the rail can't do yet, and a specific ask.
  5. What a customer has to hand over, and why they'd agree.
- **What they reward.** Evidence ("did a real person tell you this?"), creativity, clarity, feasibility, thoroughness.
- **What the user asked for on top.** Our own findings at the centre. Non-obvious calls. Failure points and user drop-offs, and how each fix closes one. Ready to run tomorrow. Clean and minimal, in the trailer's design language, with a little motion and never too much.
- **Formats.**
  - Live: an HTML deck with motion, driven by the arrow keys.
  - Handed in: a PDF, where every page is the final frame of its slide.
  - Venue backup: a .pptx of full-bleed final frames with the two videos embedded.

## 2. The story

"From the person who needs it to the rails it runs on" is the competition's own brief, and it's also the order of a night with Baari. So the deck walks that line once, and never doubles back:

**Mummy carries it → what we found → what we built → proof it runs → the rail it needs → what a family hands over → your turn.**

### The device: whose baari is it?

A small ink pill at the top centre of every slide, the same island as the app, says whose turn the section is. It slides right as the talk moves on, the way the app's nav pill moves between tabs.

| Section | Pill reads |
| --- | --- |
| Q1 | Mummy ki baari |
| Q2 | Humne kya suna |
| Q3 | Baari ki baari |
| Q4 | Pine Labs ki baari |
| Q5 | Ghar ki baari |
| Close | Aapki baari |

The deck's argument is in that one line of pills: the load moves from Mummy to the agent, and the agent needs two things from the room, a better rail and a family's trust.

### One sentence a judge should leave with

Baari takes "aaj kya banega" off the one person it always lands on, because the problem was never recipes. The kitchen lives in one head, and Baari holds it instead.

## 3. Time budget

About 870 spoken words at 130 a minute, plus 90 seconds of demo video.

| # | Slide | Answers | Length | Ends at |
| --- | --- | --- | --- | --- |
| 1 | "Kuch bhi" | Opening | 0:20 | 0:20 |
| 2 | Whose baari: Mummy's | Q1 | 0:25 | 0:45 |
| 3 | How they get by today | Q1 | 0:30 | 1:15 |
| 4 | Who we are | Q1 | 0:25 | 1:40 |
| 5 | The kitchen lives in one head | Q2 | 0:30 | 2:10 |
| 6 | What we'd have built | Q2 | 0:30 | 2:40 |
| 7 | What we found that we weren't looking for | Q2 | 0:25 | 3:05 |
| 8 | One night, on real phones (video) | Q3 | 1:30 | 4:35 |
| 9 | Where a night breaks, and what Baari does | Q3 | 0:30 | 5:05 |
| 10 | Tested on bad nights | Q3 | 0:25 | 5:30 |
| 11 | What it can't do yet | Q3 | 0:20 | 5:50 |
| 12 | The rail: Pine Labs | Q4 | 0:30 | 6:20 |
| 13 | The ask: an agent mandate | Q4 | 0:35 | 6:55 |
| 14 | What a family hands over | Q5 | 0:35 | 7:30 |
| 15 | Aapki baari | Close | 0:30 | 8:00 |

If a rehearsal runs long, cut from slide 7 first (fold its best row into slide 6), then shorten slide 11 to three lines. Never cut slides 9 and 13. They carry the drop-offs and the ask, the two things the brief asks for most directly.

## 4. Slide by slide

Each slide lists four things:
- **On screen.** The words that appear, kept under 30. The talk carries the rest.
- **Motion.** What builds in, and how.
- **Final frame.** The PDF page, readable on its own.
- **Say.** A near-verbatim talk track for rehearsal.

Quotes on screen carry a source tag in the form "working mother, Pune · first-hand". City and role only, never a name: that was the consent promise in Round 1.

### Slide 1. "Kuch bhi"

- **On screen.** The trailer's first eight seconds, full-bleed: the giant typed "aaj kya banega?", the family group replying "kuch bhi", the wall of family groups, then "'Kuch bhi' naam ki [empty katori] koi sabzi nahi aati."
- **Motion.** The video plays with sound. It's the only slide that opens itself.
- **Final frame.** The last line with the katori on cream. Small, bottom left: "Baari · What to cook today? · Product Build track".
- **Say.** "Every evening, in almost every home we spoke to, one person asks this. Everyone else says 'kuch bhi'. And the next afternoon, someone orders out anyway, because nobody actually agreed."

### Slide 2. Whose baari: Mummy's

- **On screen.**
  - Headline: "Aaj kiski baari? Roz Mummy ki."
  - The painted Mummy from the trailer, back to us, with four glass chips around her: what's in the kitchen, what was eaten lately, whose plate has rules, what can arrive before the cook.
  - Bottom right, in mono: "299 min a day: women's unpaid domestic work. Men: 97. NSO Time Use Survey 2019."
- **Motion.** The chips orbit in one at a time, 300 ms apart, then settle.
- **Final frame.** Mummy, four chips, the number.
- **Say.** "We chose 'What to cook today?'. In the homes we interviewed, one person decides every meal, and it's usually the mother. Our first user is the home where she works or is stretched thin, and a part-time cook needs a brief every morning. Small families who settle it at the stove in five minutes told us they don't need this. We believed them, and narrowed."
- **Evidence.** I4 (S10, S11), X2.
- **Note.** Say the opening's name, never a number, until the brief email confirms it. The Round 1 PDF says 07, The Ken's page lists it 13th.

### Slide 3. How they get by today

- **On screen.** Four glass cards, each with one artefact and one line:

| Card | Shows | Line | Source |
| --- | --- | --- | --- |
| The Sunday plan | Photo of a household's handwritten weekly menu | "We tried to make a weekly schedule. It never actually gets formed." | Menu photo S13, first-hand. Quote S6, a student describing their home |
| The group chat | A family group full of "kuch bhi" | "No one has a definite answer and there is always chaos. Children mostly order from outside." | Working mother, Pune, S7, first-hand |
| The order-out | A delivery bag beside an untouched katori of dal | "My son eats outside and then says 'I already ate out.' He doesn't tell anyone, so it gets wasted." | Mother of two sons, interviewed 7 Oct, S12, first-hand |
| The cook | A voice note icon | "With a bai there's often miscommunication. We say one thing and she makes something else." | Same interview, 11:01 |

- **Motion.** Cards land left to right, one per sentence of the talk track.
- **Final frame.** All four cards.
- **Say.** "This is how they get by today. A weekly plan on paper that's dead by Wednesday. A group chat full of 'anything'. A son who eats out and doesn't tell anyone, so the food is thrown away. And a cook who gets one instruction and hears another. Every one of these is a place where the night breaks. Hold on to them. We'll come back to each."

### Slide 4. Who we are

- **On screen.**
  - Three faces, one line each:
    - Chaitanya: "Has briefed a part-time cook every morning for three years."
    - Vinay: "Built voice and payments infrastructure, and has shipped on Gnani since an internship."
    - Keshav: "Runs the same loop at home."
  - A row of numbers in mono: "11 households before we built · 3 after · 8 cities · 4 days on all three rails · 82 platform runs".
- **Motion.** Faces pop with the app's spring. The numbers roll up with the app's digit animation.
- **Final frame.** Faces, lines, numbers.
- **Say.** "We're three people who live this problem. One of us has briefed a cook every morning for three years. One builds voice and payments for a living. One runs the same loop at home. We talked to eleven households before writing a line of code, and to three more after we had something to show. Then we built it on Gnani, Pine Labs and Delhivery in four days."
- **Check before saying it.** The "three years" figure, and that eleven households can be listed if asked.

### Slide 5. The kitchen lives in one head

- **On screen.**
  - Headline: "Nobody lacks recipes. The kitchen lives in one head."
  - Three quotes, small:
    - "At least my mom remembers what's in the fridge, so she doesn't need to check." A student in Kanpur, on the mother in that home.
    - "I don't know what ingredients are present, so I asked her to check." Student, Guntur.
    - "About 90 to 92 percent of it is handled in the mind." A mother, interviewed in Marathi, first-hand.
- **Motion.** The four chips from slide 2 fly up and into one small head icon, then the quotes fade in under it.
- **Final frame.** Headline, head icon with four chips, three quotes.
- **Say.** "Here's the one thing that changed our solution. We went in expecting a recommendation problem: help families think of what to cook. Every home already knew what it could cook. Deciding well means holding four things at once: what's in the kitchen, what was eaten lately, whose plate has rules, what can arrive before the cook does. Only one person holds all four. Explaining them costs more than deciding alone, so 'kuch bhi' is the sensible answer for everyone else, and the load never moves."
- **Evidence.** I1, I2, I3. We found it in the household interviews (S2, S3, S4, S7).

### Slide 6. What we'd have built without it

- **On screen.**
  - **Left, struck through.** "A recipe recommender. A Sunday meal planner." Small: "Both already exist in these homes, on paper, abandoned."
  - **Right.** "An agent that holds the kitchen, and gets the family to agree the night before."
  - **Below.** Daminger's four steps as a bar: Anticipate, Find options, Decide, Monitor. Three segments fill haldi with "Baari". "Decide" stays white with four family faces.
- **Motion.** The strike draws across the left. The bar fills segment by segment, skipping "Decide".
- **Final frame.** Both columns and the bar.
- **Say.** "Without this, we'd have built a recipe app or a weekly planner. The homes we visited had already tried the planner, on paper, and dropped it. The sociologist Allison Daminger splits this kind of mental load into four steps. Women carry most of the anticipating and the monitoring. Deciding is the part families already share. So Baari takes the three invisible steps and leaves the family the one they already do together. It delegates the asking, never the choosing."
- **Evidence.** I18, X1, X5. Daminger, *American Sociological Review* 84(4), 2019.

### Slide 7. What we found that we weren't looking for

The judges ask for this by name.

- **On screen.** Four rows, "We expected", then "We found", in two columns:

| We expected | We found | So Baari |
| --- | --- | --- |
| Menu first, then shopping | "Usually we have the groceries first, and then we decide." | Reads the pantry before it suggests. Most nights the best dish needs nothing bought |
| Waste is vegetables going bad | Cooked food thrown out "not because it was bad, because nobody ate it" | Headcount and portions go into every brief |
| The family wants the agent to choose | A mother would rather pick four or five dishes herself and let the family choose from those | Asks, collects, executes. It only picks when nobody answers |
| Two options are kinder than five | The same mother: "With two it's 'if not this, then that'. With four, there's variety." | Two today. Making 2 to 4 a household setting, and measuring time to lock |

- **Motion.** Rows reveal one at a time on each spoken point.
- **Final frame.** The table.
- **Say.** Walk the four rows in a sentence each, and end on the last: "That last one is a mother pushing back on our own design, and we think she's right enough to test it."
- **Evidence.** I14, I19, I38, I36 (S12, S7, S10, S3). Insight map section 4.

### Slide 8. One night, on real phones

- **On screen.** A 90-second cut, separate from the trailer and plainer. It's G1 from the finale handoff, captured on real phones with the app beside them, in order:
  1. 8:30 PM, the pick card.
  2. Papa's voice note, and the private plate line.
  3. A veto.
  4. The lock, landing on Telegram, the TV and the app at once.
  5. The order card, with the kirana paid and the Delhivery parcel booked.
  6. A Rs 520 Pine Labs link.
  7. The night sky.
  8. 7:45 AM, Sunita's Hindi voice note.
  9. "Haan haan", then the ask for counts, then the counts.
  10. The receipt.
  11. Ten seconds of the phone call: the family arguing on speaker while Baari stays quiet, then "rajma final" and the plan read back.
- **Motion.** The video's own captions carry it. A mono clock in the corner shows the night's real time.
- **Final frame.** A grid of four phone stills, plus labels: "Recorded on real phones. Telegram and Gnani: real. Pine Labs: sandbox. Delhivery: mock at documented paths." And a QR to the full video on Drive, so the PDF reader can watch it.
- **Say.** Three lines at most over the video:
  - At the pick card: "Two dishes, both checked against the pantry and everyone's plate."
  - At the voice note: "This is Gnani, in Hindi, to a cook who never installed anything."
  - At the receipt: "Nobody opened an app for any of that."
- **Truth.** Every moment matches a passing row in `docs/DEMO_TESTS.md`. If PL1 (the paid sandbox link) hasn't passed, the cut stops at the open checkout.

### Slide 9. Where a night breaks, and what Baari does

This is the drop-off slide, and it pays off slide 3.

- **On screen.** The night as a horizontal timeline, six red break points, each turning into a haldi catch:

| Time | Where it breaks today | What Baari does | Status |
| --- | --- | --- | --- |
| 8:30 PM | Nobody answers. "Kuch bhi" | Picks close on their own. Silence means dish one | Live |
| 9:00 PM | "That was your baari" turns into blame | The holder picks only between two dishes that are already safe. Pass the turn, or switch to vote mode | Live |
| 9:30 PM | Someone eats out and doesn't say | "Kal kaun kha raha hai": one tap sets the headcount, the order and the brief | Deployed on rails and the app 8 Oct. The agent reads it from prompt v13, not yet live |
| 9:35 PM | The first money surprise | Limits set once. Anything over Rs 300 comes to a parent as one Pine Labs link. Every rupee shows its dish | Live on sandbox |
| 6:30 AM | The parcel is late, no rider | Rider hop, then the kirana pickup, then the runner-up dish. One line to the parent, only if the plan changed | Live on the mock |
| 8:05 AM | The cook says "haan haan" | One voice note asking for counts. She never pays from her pocket | Live |

- **Motion.** A playhead runs along the night. At each break a red dot drops, then turns haldi as its fix appears.
- **Final frame.** The full timeline with all six catches.
- **Say.** "Here's where a night falls apart today, and what Baari does at each point." Walk them fast, one breath each. End with: "Each of these came from someone telling us how their night actually goes."
- **Evidence.** I13, I11, I19 and X9, I25, A5, I21 and I35.

### Slide 10. Tested on bad nights

- **On screen.**
  - **Left.** A bar chart of eval rounds: R1 v3 GPT-4o 0 of 10, R1 v3 GPT-5.4 2 of 10, R2 v4 4 of 10, R3 v5 8 of 10. Use the fresh number if the v12 rerun lands.
  - **Right.** One line: "The model booked the parcel before checking the money. Four runs in a row. So every money rule moved out of the prompt and into the rails."
  - **Bottom strip.** Real or mock, as glass chips: Telegram real · Gnani real · Pine Labs links real on sandbox · Reserve Pay mandate on sandbox, debits on a demo block · Delhivery mock at documented paths · Twilio trial.
- **Motion.** Bars grow one per round. The quote types on.
- **Final frame.** Chart, line, strip.
- **Say.** "We tested it on ten bad nights: a tie, a payment timeout, a late parcel with no rider, a cook's 'haan haan', a son asking Baari to ignore the cap. We went from zero of ten to eight of ten. The failure that taught us most was the model booking a parcel before checking the money, even after the prompt told it twice to check first. So the money rules don't live in the prompt any more. They live in our rails, where a refusal is code, not a hope."
- **Check.** Don't quote "8 of 10" as current. It was prompt v5 on 4 October. Either rerun on v12 or say the date.

### Slide 11. What it can't do yet

- **On screen.** Two columns.
  - **Not yet.**
    - one household on our rails
    - headcount fixed at four in the live agent. Who's eating is deployed on rails and the app, and waits on prompt v13
    - always two options
    - no pencilled week
    - no pause for a trip
    - no mode for homes without a cook
    - the Pine Labs paid step waits on a sandbox acquirer
    - Delhivery is a mock, because we have no tokens
  - **Next, ranked by evidence.** Headcount that changes, Mummy's list, a five-day pencil plan, 2 to 4 options, a pause, no-cook mode.
  - **At the bottom, small.** "It should be like this." A mother who cooks herself, after a ten-minute demo. "Reacted to a demo, hasn't used it."
- **Motion.** None beyond a fade. This slide is plain on purpose.
- **Final frame.** Both columns and the quote.
- **Say.** "What it can't do yet: it runs one household, it assumes four people eat, and it always offers two dishes. The next things we'd build are in the order our interviews asked for them. The first is a headcount that changes, because the biggest waste we heard about was cooking for someone who didn't come home."
- **Evidence.** PRODUCT.md section 11, insight map proposals 1 to 6, I44.

### Slide 12. The rail: Pine Labs

- **On screen.**
  - **Top, in grey.** What we said in Round 1: "UPI lets one person make many payments. It can't let one payment have several people behind it, or one person act for several households."
  - **Middle.** "Building on your sandbox, we had to hold these on our own rails:"
  - **Six chips.**
    - ask above Rs 300
    - Rs 400 a day
    - these shops only
    - a reason on every debit
    - pay the kirana directly (our invention)
    - no parcel until the link is paid
- **Motion.** The Round 1 line greys out as the six chips land.
- **Final frame.** Both parts.
- **Say.** "In Round 1 we picked Pine Labs, and said UPI can't let one person act for several households. Our cook buys for four families and can be a delegate of none. Building the agent taught us what comes before that. The model can't be trusted with a rule about money, so the rules have to sit outside it. In four days we held six of them on our own server. They belong on the mandate."
- **Tone.** Pine Labs' team is on the jury and knows its rails better than we do. Say it as what we learned building on their sandbox, never as what's wrong with Pine Labs.

### Slide 13. The ask: an agent mandate

- **On screen.** A spec card in mono, the most technical thing in the deck, kept to four lines:

```
mandate.policy   payees: [sharmakirana@okaxis]   ask_above: 300   day_cap: 400   hours: 20:00-09:00
presentation     amount, reference, reason: "Rajma 250 g for tomorrow", payee_vpa
events           presentation.refused · link.paid · mandate.expiring  →  webhook an agent can subscribe to
next             one delegate, many households: the cook who works four homes
```

Beside each line, one short "why":

| Line | Why |
| --- | --- |
| Policy | E04: a model ignored "check first" four runs in a row |
| Reason | "We don't watch how much money leaves our hands." A mother, 7 Oct |
| Payee | Reserve Pay settles only to the merchant. Families pay the lane kirana |
| Events | Today our rails poll and wake the agent |

- **Under it, small.** What we invented on the other two rails: Gnani reading a cook's "haan haan" as a vague yes with counts in digits, and Delhivery's kirana-to-door rider hop inside a window.
- **Motion.** The card types on line by line, mono, with its "why" sliding in beside each.
- **Final frame.** The card, the four whys, the strip.
- **Say.** "So here's what we're asking Pine Labs to build: an agent mandate. It's a Reserve Pay block that carries the family's rules, not just an amount. Who it may pay, when it must ask, how much a day, and when. Every debit carries a reason the family sees in their own UPI app. It can settle to a named shop on the list. And it tells the agent when something's refused or paid, instead of us polling. We've run every one of these on our rails for a week. We'd hand them over gladly."

### Slide 14. What a family hands over

- **On screen.**
  - Headline: "One limit, approved once, by the parent who pays."
  - The red khata ledger render, opened: "Rs 400 a day · ask me above Rs 300 · Sharma Kirana, Delhivery".
  - Four reasons a parent says yes:
    - It's less than they hand the cook today: cash, settled at month end.
    - Every rupee shows its dish.
    - Baari can't raise it, add a shop or pay the cook.
    - Anything bigger comes back as one Pine Labs tap.
- **Motion.** The ledger opens. The reasons tick in.
- **Final frame.** Ledger and reasons.
- **Say.** "Baari can learn the pantry from what it buys, and the house rules from one spoken minute. The one thing it can't work without is permission to spend. A plan that can't buy the tomatoes is one more Sunday menu on the fridge door. Parents agree because it's smaller than what they already hand the cook in cash, every rupee shows its dish, and Baari can't raise its own limit. That first approval is also how Baari spreads. The young adult sets it up, and the parent's first payment makes it real for the house."
- **Evidence.** I25, I41, X8, I27.
- **Decide as a team.** Round 1's answer was "one family WhatsApp group, cook included". If we change it, say why in one sentence: the chat lets Baari ask, but the limit is what lets it act. If we keep the Round 1 answer, slide 14 shows the family group with the cook in it, and the limit becomes the second line.

### Slide 15. Aapki baari

- **On screen.**
  - A large QR.
  - "Your baari. Set up your house and run tonight's dinner."
  - Below: `t.me/Baari_ken_bot` · `baari.pages.dev`.
  - The go-to-market in one line: "Young adults bring it home. Parents stay on Telegram. A cook works four homes, and every one of them gets better at briefing her."
  - Three partner logos, the AgenticOrg line, three names.
- **Motion.** The ब pill from the top travels down into the QR's centre and the QR draws itself.
- **Final frame.** As listed.
- **Say.** "That's Baari. It's live now, and the QR on screen starts a night on your own phone. We'll end where we started. Roz Mummy ki baari hoti thi. Ab Baari ki baari."
- **QR target.** The judge flow `baari.pages.dev/?new` if it's built and tested by Saturday. Otherwise the bot's guest night, which works today (CT23).

## 5. Design system for the slides

It's the trailer's look, held still:

| | |
| --- | --- |
| Canvas | 1920 x 1080, cream `#F6F4EF`. Margins 96 px. A 12-column grid |
| Type | Family 800 for headlines at 96, 72 or 48 px. Inter 400 and 500 for body at 28 and 22 px. JetBrains Mono for numbers, times and the spec card. Noto Sans Devanagari at matching sizes for Hindi |
| Colour | Ink for everything. Haldi only for the one thing to look at on each slide. Green for "Live". Night indigo only for Delhivery and the night. Red only for a break point |
| Status chips | Live (green), Built, deploying (haldi outline), Sandbox (ink outline), Mock (grey), Not yet (grey dashed) |
| Quotes | Glass cards, Inter 28, with the source tag under each in Inter 500 at 18 px, grey |
| Objects | The app's renders as section icons: ballot for deciding, khata for money, parcel for Delhivery, mic for Gnani, cooker for the night |
| Density | At most 30 words a slide, one idea a slide |

### Motion rules

- **Curves.** Every build uses the app's tokens: `cubic-bezier(0.22, 1, 0.36, 1)` for arrivals, and the spring only for faces and the ब pill. Durations from the app's scale, 200 to 520 ms.
- **No bounce on money.** Same rule as `/live`.
- **One hero move per slide.** Everything else fades or slides 16 px.
- **The final frame is the slide.** Nothing important exists only mid-animation. Every build ends in a frame that reads as a printed page.
- **Advancing.** The right arrow advances. If a slide's build is still running, the first press completes it and the second goes on. The left arrow goes back to the previous slide's final frame.

## 6. How it's built

One HyperFrames project for the deck, beside the trailer's, sharing its `baari.css` and `moves.js`.

```
film/deck/
  s01.html ... s15.html   one composition per slide, 1920 x 1080, a paused GSAP timeline on window.__timelines
  deck.html               the player
  notes.html              the talk track, slide by slide, for a second screen
  export.mjs              final frames to PNG and PDF
  assets/                 renders, clip stills, the two videos, logos, the QR
```

### The player, `deck.html`

It's small: one iframe and a key handler.
- The right arrow plays the current slide's timeline. If the timeline has finished, it loads the next slide and plays it.
- The left arrow loads the previous slide at `progress(1)`.
- `F` goes fullscreen. `N` opens `notes.html` in a second window, kept in step through `BroadcastChannel`.
- `?print` lays every slide at its final frame, one per page, with `@page { size: 1920px 1080px }`.

### Export, `export.mjs`

- Playwright opens each slide, sets its timeline to the end, and screenshots it at 3840 x 2160.
- The PNGs join into `Baari_finale.pdf`.
- The same PNGs, with the trailer and the demo video placed on slides 1 and 8, make the venue `.pptx`.

### Render to video

`npx hyperframes render` on each slide gives MP4 builds, if we ever need a narrated deck video.

## 7. Who says what

- **Two speakers, so the voice changes once in the middle.** The handover is the joke: the first speaker ends slide 7 with "Vinay, teri baari."
  - Chaitanya takes Q1 and Q2. Three years of briefing a cook every morning makes the insight Chaitanya's to tell.
  - Vinay takes Q3 to Q5. Vinay built the voice and the money, and the "nice try, Vinay" joke from the trailer lands better with Vinay standing right there.
- **Rehearse three times against a clock.** The cut order in section 3 handles overruns. Never speed up; cut instead.
- **Know slide 13 cold.** The person who runs Pine Labs will ask about it.

## 8. Questions to prepare for

| Likely question | Answer from | Don't say |
| --- | --- | --- |
| What does a night cost to run? | We haven't measured it. About six agent runs a night, one per phase, on GPT-5.4 | Any number we haven't measured |
| Why Telegram and not WhatsApp? | Telegram's Bot API was what we could build on in the time. WhatsApp is the launch channel. The phone call covers anyone who won't open a chat | That families prefer Telegram |
| Why only two options? | Speed and real agreement, from our own critique (S14, S15). A mother told us four, so it becomes a setting and we measure time to lock (I36) | That two is proven best |
| Won't the turn cause fights? | The holder only picks between two dishes that are already safe, anyone can pass, and families can switch to vote mode (I11) | |
| Is any of this real? | Telegram, Gnani and the Pine Labs sandbox links are real. Delhivery is a mock at its documented paths. The QR runs a night on your phone now | |
| Isn't checking the cook surveillance? | We dropped the "planted wrong item" trust test from Round 2 for exactly that reason (I22). She gets two questions about stock, never sees votes, rules or money, and there's no score | |
| Have you talked to a cook? | Not yet, and it's our biggest gap. Every cook claim rests on our own experience and the critique | That cooks told us anything |
| How does it make money? | Not priced. The one signal we have: mothers want the relief but haven't paid for help with this before (I6) | A made-up price |
| Health data? | A plate rule, never a diagnosis. Baari never names a condition (L4) | |
| What do you need from Gnani and Delhivery? | Gnani: the household reply extraction as a product, faster STT. Delhivery: delivery windows and a hyperlocal hop API | |

## 9. Claims to check before anything goes out

From the insight map's section 8 and the Round 1 notes:

1. Move the two practice role-plays out of the Drive interviews folder, or delete them.
2. Quotes carry city and role only, never a name, and consent is on record for each.
3. The three survey quotes in PRODUCT.md ("Husband and I alternate", "Every morning I have to tell my cook", "Tried the whole plan every Sunday") are The Ken's survey, not ours. Credit The Ken or leave them out. This deck doesn't use them.
4. Say the opening's name, not its number, until the brief email confirms it.
5. Rerun the evals on prompt v12, or say "8 of 10 on prompt v5, 4 October".
6. Check the UNEP waste figure in the report itself, or leave it out. This deck doesn't use it.
7. No "points for healthy eating" anywhere.
8. "Reacted to a demo", never "used", for the three post-build households.
9. Every product moment on a slide or in a video matches a passing row in `docs/DEMO_TESTS.md`, and mocks and sandboxes are labelled.
10. "Three years" with a cook, and "eleven households", are numbers we can stand behind if asked.

## 10. Order of work

1. **Team decisions.** Slide 14's answer (the limit, or the family group). Who speaks. The QR's target.
2. **Write and time the talk track.** Read it aloud against a clock and cut to 8:00.
3. **Build slides 1 to 15** as HyperFrames compositions, reusing the trailer's components.
4. **Cut the 90-second demo video** for slide 8 from the G1 clips.
5. **Export.** The PDF and the venue `.pptx`, then open both on a different laptop.
6. **Rehearse three times.** Fix what the clock says.
