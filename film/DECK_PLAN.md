# Baari finale deck plan

Written 8 October 2026, 22:00 IST; app tour, build slide and appendix added 9 October, 02:00; the technical diagrams at 03:30. The plan for the 8-minute finale presentation, followed by the judges' questions. Nothing here is built yet. The trailer has its own plan in `film/TRAILER_PLAN.md`, and the two share one look and one set of HyperFrames components.

Sources: `prd/PRODUCT.md`, the finale handoff (gitignored), the teammate's insight map (`INSIGHT_MAP.md`, shared person to person, cited below by its ids: S for sources, I for insights, X for our analysis), `research/`, `submission/ANSWERS.md`, and the build numbers in `film/deck/stats/`. The frame is Round 3 and the product as it stands on 8 October. Earlier rounds aren't the argument; they appear only where a fact (the team, the opening) comes from them.

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
  - Handed in: a PDF, where every page is the final frame of its slide, and every video is replaced by the one frame chosen for it (`film/CLIP_SLOTS.md` section 6).
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
| Q3 | Baari ki baari. On slide 8 the pill drops into the phone and becomes the app's own island |
| Q3, slide 13 | Hamari baari: the one slide about us |
| Q4 | Pine Labs ki baari |
| Q5 | Ghar ki baari |
| Close | Aapki baari |

The deck's argument is in that one line of pills: the load moves from Mummy to the agent, and the agent needs two things from the room, a better rail and a family's trust.

### One sentence a judge should leave with

Baari takes "aaj kya banega" off the one person it always lands on, because the problem was never recipes. The kitchen lives in one head, and Baari holds it instead.

## 3. Time budget

About 900 spoken words at 130 a minute, including the talk over the app tour, plus 60 seconds of demo video with three lines over it.

| # | Slide | Answers | Length | Ends at |
| --- | --- | --- | --- | --- |
| 1 | Aaj kya banega? (a show of hands) | Opening | 0:25 | 0:25 |
| 2 | Whose baari: Mummy's | Q1 | 0:20 | 0:45 |
| 3 | How they get by today | Q1 | 0:20 | 1:05 |
| 4 | Who we are | Q1 | 0:15 | 1:20 |
| 5 | The kitchen lives in one head | Q2 | 0:30 | 1:50 |
| 6 | What we'd have built | Q2 | 0:25 | 2:15 |
| 7 | What we found that we weren't looking for | Q2 | 0:15 | 2:30 |
| 8 | The app, up close (tour video, talked over) | Q3 | 0:40 | 3:10 |
| 9 | One night, run by the agent (video) | Q3 | 0:50 | 4:00 |
| 10 | How it's wired, and what wakes it (two diagrams) | Q3 | 0:35 | 4:35 |
| 11 | Where a night breaks, and what Baari does | Q3 | 0:30 | 5:05 |
| 12 | Tested on bad nights | Q3 | 0:20 | 5:25 |
| 13 | How two of us built it | Q3, and Q1's "why us" | 0:25 | 5:50 |
| 14 | What it can't do yet | Q3 | 0:15 | 6:05 |
| 15 | The rail: Pine Labs | Q4 | 0:30 | 6:35 |
| 16 | The ask: an agent mandate | Q4 | 0:35 | 7:10 |
| 17 | What a family hands over | Q5 | 0:35 | 7:45 |
| 18 | Aapki baari | Close | 0:15 | 8:00 |

After the close, appendix pages A1 to A7 sit in the PDF and behind the last slide in the live deck, for questions. They take no talk time.

If a rehearsal runs long, cut in this order:
1. Slide 7: fold its last row into slide 6.
2. Slide 10: drop its second beat. The ambient diagram stays in the PDF.
3. The tour: drop chapters 7 and 8, to 32 seconds.
4. Slide 14: three lines.
5. The demo video: down to its 45-second minimum.

Never cut slides 11 and 16. They carry the drop-offs and the ask, the two things the brief asks for most directly.

## 4. Slide by slide

Each slide lists four things:
- **On screen.** The words that appear, kept under 30. The talk carries the rest.
- **Motion.** What builds in, and how.
- **Final frame.** The PDF page, readable on its own.
- **Say.** A near-verbatim talk track for rehearsal.

Quotes on screen carry a source tag in the form "working mother, Pune · first-hand". City and role only, never a name: that's what we promised the people we recorded.

### Slide 1. Aaj kya banega?

The deck opens with the room, not a video. The judges have all lived this question, so we make them answer it.

- **On screen.** Only "aaj kya banega?", typing in giant Family 800 with a haldi cursor, the camera riding the cursor, the same move the trailer uses for spoken words. After the hands go down, a second build: "Ek ghar. Ek sawaal. Roz. Ek hi insaan."
- **Motion.** The type runs on load. The second line builds on the first press.
- **Final frame.** Both lines on cream. Small, bottom left: "Baari · What to cook today? · Product Build track".
- **Say.** "A quick show of hands. Who here was asked this at home in the last week?" Wait for the hands. "Keep it up if you answered 'anything'." Wait. "That's the problem. In every home we spoke to, one person asks this every day, everyone else says some version of 'kuch bhi', and the next afternoon someone orders out anyway, because nobody actually agreed."

### Slide 2. Whose baari: Mummy's

- **On screen.**
  - Headline: "Aaj kiski baari? Roz Mummy ki."
  - The painted Mummy from the trailer, back to us, with four glass chips around her: what's in the kitchen, what was eaten lately, whose plate has rules, what can arrive before the cook.
  - Bottom right, in mono: "299 min a day: women's unpaid domestic work. Men: 97. NSO Time Use Survey 2019."
- **Motion.** The chips orbit in one at a time, 300 ms apart, then settle.
- **Final frame.** Mummy, four chips, the number.
- **Say.** "We chose 'What to cook today?'. In the homes we interviewed, one person decides every meal, and it's usually the mother. Our first user is the home where she works or is stretched thin, and a part-time cook needs a brief every morning. Small families who settle it at the stove in five minutes told us they don't need this. We believed them, and narrowed."
- **Evidence.** I4 (S10, S11), X2.
- **Note.** Say the opening's name, never a number, until the brief email confirms it. Our first submission says 07, The Ken's page lists it 13th.

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
  - A row of numbers in mono: "11 households before we built · 3 after · 8 cities". The build numbers wait for slide 13.
- **Motion.** Faces pop with the app's spring. The numbers roll up with the app's digit animation.
- **Final frame.** Faces, lines, numbers.
- **Say.** "We're three people who live this problem. One of us has briefed a cook every morning for three years. One builds voice and payments for a living. One runs the same loop at home. We talked to eleven households before writing any code, and three more after."
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
- **Say.** At 15 seconds, only the last row: "We found things we weren't looking for. The best one: a mother pushing back on our own design. 'With two it's if not this, then that.' We think she's right enough to test it." The table carries the rest on the page.
- **Evidence.** I14, I19, I38, I36 (S12, S7, S10, S3). Insight map section 4.

### Slide 8. The app, up close

The night doesn't need the app. It runs on Telegram, voice notes and a phone call, because the people we spoke to told us not everyone will open one (I5). So this slide isn't the proof that it works; slide 9 is. It's why the person who does open the app enjoys it, one feature at a time, each tied to something a family told us.

- **The pill.** The deck's pill, reading "Baari ki baari", drops into the phone's Dynamic Island and becomes the app's own island: the same black pill, the same width morph (480 ms), now reading "Aaj raat". It climbs back out at the end of the slide.
- **On screen.** One iPhone, left of centre, plays the chapters back to back. On the right, each chapter's name lands in Family 800 the way the app's Badlo reel lands a dish: names blur past, overshoot 14 px and spring back. Under it, one line, and the insight id in mono.

| # | Chapter | What the phone shows | The line | Why it's there | Clips |
| --- | --- | --- | --- | --- | --- |
| 1 | The island | The pill morphing between lines, then opening into "Aaj raat" with its 6-step track | "Baari thinks out loud." | "The voice message is going, so communication is happening. Things are being ordered and coming home." A mother who cooks herself, after a demo (I44) | CA16 |
| 2 | Aapke liye | The card deck: drag, tilt, fly off; a check folds a card away and the count ticks down | "Only what needs you, one card at a time." | People want narrowing, not more choices (I8). When nothing needs you, it says so: "Aapke liye kuch nahi. Baari sambhal rahi hai." | CA17, CA21, CA35 |
| 3 | Badlo | The jackpot reel: twelve plates spin and land, with "Aloo puri skip: Papa ki thali mein aloo nahi" | "Spin it. The rules still hold." | Being able to undo cuts regret more than being right does (I9). A rule said once is never policed again (X10) | CA20 |
| 4 | Sirf dal chawal nahi | The cuisine deck: Haan and Nahi stamps, then how often | "New dishes the cook can actually make." | Health can't mean boring (I30). A new dish fails when the cook doesn't know it (I20) | CA25 |
| 5 | Baari ki awaaz | The voice studio: the orb breathing, five Gnani voices, one tab for you and one for the cook | "Choose how Baari sounds, for you and for her." | Language per person (I24). The brief has to be exact, in the cook's language (I35) | CA26 |
| 6 | Khata | The cloth ledger opening, ₹50 coins going hollow, the Pine Labs card with a waiting link | "Every rupee shows its dish." | "We don't watch how much money leaves our hands" (I41). Auto-pay hurts at the first surprise (I25) | CA71, CA42 |
| 7 | Kaun kha raha hai | One tap: Papa's out, the count drops to three | "Cook for who's actually eating." | The waste is cooked food nobody ate (I19), and nobody volunteers who's eating (X9) | CA68 |
| 8 | Lauki ne note kar liya hai | The reminders sheet, that card on top | "Three nights, no vote from you. It's winning by default." | Silence turns into avoidance (I13). A nudge with a joke, not a guilt trip | CA70 |

- **Motion.** Each chapter runs about 4.75 seconds: the clip at 1x to 1.5x with idle frames cut, the name reel on the chapter's first beat. Nothing else moves. The names are the captions; the talk carries the why.
- **Final frame, the PDF page.** The phone gives way to a wall of eight phones in two rows of four, each frozen at its chapter's poster still (`film/RECORDING_DELTA.md` section 4), with its name, its line and its insight id. The title is "Nobody has to open it. Everybody wants to." Under it, small: "The night runs on Telegram and a phone call. The app is where the house sees it." The full set of screens is appendix A5.
- **Until the clips exist.** Each chapter shows a placeholder phone holding a fixture screenshot (`film/CLIP_SLOTS.md` section 4). The slot is `DECK_TOUR` in `film/slots.json`.
- **At 40 seconds.** Each chapter gets about 4.25 seconds.
- **Say (Chaitanya, about 100 words).** "Baari doesn't need an app. The whole night runs on Telegram and a voice note. But whoever opens it should enjoy it. The island is Baari thinking out loud. It only puts in front of you what needs you, one card at a time. Don't like tonight's dish? Badlo. It spins, and Papa's no-aloo rule still holds. The cuisine deck brings dishes the cook can actually make. You choose how Baari sounds, for you and for the cook. Every rupee in the khata shows its dish. One tap says Papa's eating out. And if you stop voting, the lauki notices. Vinay, teri baari."
- **Evidence.** I44, I8, I9, X10, I30, I20, I24, I35, I41, I25, I19, X9, I13. Every line on the PDF page carries its id.

### Slide 9. One night, run by the agent

This slide doesn't depend on any human recording. The night is driven by script on the eval cast (`drive.py veto`), and `/live` and the app are recorded at the same moment, so the whole demo is automatic. See `film/CLIP_SLOTS.md` section 2. If real-phone recordings of G1 arrive and pass, they replace the left half.

- **On screen.** A 50-second cut (45 at least, 60 at most), separate from the trailer and plainer. The tour has just shown the app's features, so this cut stays on the night itself. The layout is `/live` on the left, which draws every tool call on its rail with the phone frames showing each message as it goes, and the app on the right in a phone frame. In order:
  1. 8:30 PM, the pick card going out, and the app's hero turning to the vote.
  2. Papa's voice note heard by Gnani, and the private plate line.
  3. A veto.
  4. The lock, landing on the TV (`/tv`) and the app at once, while the app's island shows Baari's live steps.
  5. BUY: the kirana card turning "taiyaar, paid" and the Delhivery parcel booked, every call drawing on its rail.
  6. The Rs 520 Pine Labs link, if that night's bill crosses the limit.
  7. The "Raat bhar" card as the parcel tracks: stars fading into dawn.
  8. 7:45 AM, Sunita's Hindi voice note on her page with the karaoke.
  9. "Haan haan", then the ask for counts, then the counts.
  10. The receipt.
  11. Ten seconds of the sim call: Baari offering two dishes and reading the plan back, voiced in Gnani from rails' own lines.

  Agent waits are cut out: a mono clock in the corner tumbles forward wherever minutes are skipped. To reach 50 seconds, drop beats 7 and 11 first, then 6 if PL1 hasn't passed. Slide 10 explains the wiring, so the video doesn't have to.
- **Motion.** The video's own captions carry it. Until the capture exists, the slot shows placeholders at the exact size.
- **Final frame, the PDF page.** One frame, chosen by the poster spec for slot `DECK_NIGHT` in `film/CLIP_SLOTS.md`, never a random one:
  - `/live` with all four rails carrying calls and the D lines filled, beside the app's "Pakka" hero with the kirana card "taiyaar, paid".
  - It's taken 1.5 seconds after the night's last BUY event.
  - The caption reads: "One night, run by the agent. Telegram and Gnani real · Pine Labs sandbox · Delhivery mock".
  - A small QR in the corner opens the full video on Drive.
- **Say.** Three lines at most over the video:
  - At the pick card: "Two dishes, both checked against the pantry and everyone's plate."
  - At BUY: "Every line on the left is the agent calling a real tool."
  - At the receipt: "Nobody in the house opened an app for any of that."
- **Truth.** Every moment matches a passing row in `docs/DEMO_TESTS.md`. If PL1 (the paid sandbox link) hasn't passed, the cut stops at the open checkout.

### Slide 10. How it's wired, and what wakes it

The build track asks whether it works and how. The demo just showed a night; this slide shows the machine that ran it, in two beats. Both diagrams come from `docs/diagrams/src/` (01 and 02), the same sources as the README, so the deck and the repo never disagree.

- **Beat 1, the system (about 18 s).** Diagram 01 in its slide cut.
  - Built left to right in five steps: the house, Telegram and Twilio, our rails, AgenticOrg, the partners.
  - Then one haldi path lights end to end: clock → Baari → bridge → guards → Pine Labs.
  - The guards card stays lit.
- **Beat 2, the always-on layer (about 17 s).** The system slides up and shrinks to a strip. Diagram 02 draws in under it.
  - The four wake causes land first, one per beat: the clock, someone replies, something goes wrong, a step got missed.
  - Then the night: a playhead crosses the time ruler, and each wake's line drops into its moment card. The five haldi bubbles pop as it passes them.
  - The numbers count up last: 12 wakes, 5 times anyone heard from it, 0 apps opened.
- **Slide cut.** On a projector, type at the README's scale is too small. Add `?slide` to a diagram to get:
  - type at 1.3x
  - the mono detail lines hidden on every card except the guards and the four wake causes
  - wire labels kept
  - It needs a `slide` class in `docs/diagrams/kit.css`.
- **Motion.** Wires draw with `stroke-dashoffset` at the app's ease, `cubic-bezier(0.22, 1, 0.36, 1)`. Cards fade up 12 px. No bounce anywhere on a diagram.
- **Final frames, two PDF pages.**
  - 10a is diagram 01, full detail, with the title "The model decides and talks. Our rails hold every rule."
  - 10b is diagram 02, with its own title: "Baari sleeps until something needs it."
- **Say (Vinay, about 80 words).** "Here's what just ran. The model decides and talks. Every rule, every partner call and all the state sit on our rails, and the money goes through guards in code before Pine Labs sees it. Nothing waits for someone to open an app. The clock, a message, a problem like a late parcel, or a step the agent missed wakes one short run, about half a minute. On a night like this, that's twelve wakes, and only five times anyone hears from it."
- **Evidence.** `prd/PRODUCT.md` sections 5 to 8; `baari-mock/lib/wake.js`, `eventwake.js`, `quiet.js`.

### Slide 11. Where a night breaks, and what Baari does

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

### Slide 12. Tested on bad nights

- **On screen.**
  - **Full width.** Diagram 06, the run chart, in its slide cut. Every dot is one of the 82 platform runs on 4 October: a row per bad night, a column group per model and prompt. The group headers carry the rounds: GPT-4o on v3 0 of 10, GPT-5.4 on v3 2 of 10, v4 4 of 10, v5 8 of 10. The row names are the ten bad nights, so they need no chips of their own. The four numbered notes say what broke and what changed; note 4, E04, is the reason for the ask. Use the fresh number if the v13 run lands.
  - **Bottom strip.** Real or mock, as glass chips: Telegram real · Gnani real · Pine Labs links real on sandbox · Reserve Pay mandate on sandbox, debits on a demo block · Delhivery mock at documented paths · Twilio trial.
- **Motion.** The dots fill in column by column, in the order the runs happened, so the room watches red turn green. Each header counts up as its group finishes. The E04 box lights last.
- **Final frame.** Chart, notes, strip.
- **Say.** "We tested it on ten bad nights: a tie, a payment timeout, a late parcel with no rider, a cook's 'haan haan', a son asking Baari to ignore the cap. We went from zero of ten to eight of ten. The two that still fail taught us more than the eight that pass, and one of them is the reason for our ask to Pine Labs."
- **At 20 seconds.** Say the first and last sentences; the chips carry the middle.
- **Check.** Don't quote "8 of 10" as current. It was prompt v5 on 4 October. Either rerun on v12 or say the date.

### Slide 13. How two of us built it

At 25 seconds, the say track drops its middle sentence. The build track rewards how we build as much as what we built, and Q1 asks "why us". This slide answers both with numbers. Appendix pages A1 to A4 carry the rest for anyone who asks, and A6 and A7 the engineering.

- **The pill.** "Hamari baari": our turn, the one slide about us.
- **On screen.**
  - **Headline, Family 800.** "Do log. 129 crore tokens." Under it, Inter 28: "Nearly one for every person in India. This is what we pointed them at."
  - **Left, the commit clock.**
    - A 24-hour dial, midnight at the top.
    - Each of the 160 commits is a tick at its IST minute. Length is lines changed, on a log scale. Ink for Chaitanya, haldi for Vinay, outline for the cloud sessions.
    - The arc from 8 PM to 8 AM is night indigo, labelled "Baari's hours".
    - In the centre, in mono: "43% after 8 PM".
    - Data: `film/deck/stats/git.json`, `log`.
  - **Right, three rows.** Each is one big mono number and one line:
    - "11 min". "A whole family night, start to finish, on rails we built. A real kitchen gives you one night a day."
    - "6,121". "Browser actions: Claude clicking through its own screens. 30 app versions in 29 hours."
    - "0". "22 commit comments between our two Claude sessions. 12 said 'unblocked'. None said 'blocked'."
  - **Footer, mono 18 px.** "We called Claude 'bro' 82 times. It said 'You're absolutely right' 0 times in 5,428 replies."
  - **Source line, 14 px.** "git log, Claude Code transcripts, ccusage. Both laptops, Baari only, 9 Oct."
- **Motion.** One hero move: a clock hand sweeps the 24 hours in 2.4 s, and each tick pops as the hand passes it. The three numbers roll up with the app's digit animation as they're said. The footer fades in last.
- **If there's time: the flipbook.** A small phone under the "6,121" row flips through the 30 app versions at ten a second, ending on today's app.
  - Each frame is `?fixture=lock`, or the closest screen that version had, at its "App vN" commit.
  - It's made with `git worktree` and Playwright, so nobody has to click.
  - The PDF shows its last frame.
- **Final frame.** Headline, clock, three rows, footer, source.
- **Say (Vinay, about 75 words).** "One slide on how two of us built this in five days. Everyone has Claude now. The edge is what you point it at. We built rails we control, so the agent lives a whole night in eleven minutes instead of one a day. Claude clicked through its own screens six thousand times. Our two Claude sessions talked through commit comments: twelve 'unblocked', zero 'blocked'. And yes, we called it 'bro' eighty-two times."
- **Numbers.** All from `film/deck/stats/`: `README.md`, `git.json` and `team.json`. Re-run them on the morning of the finale; they only go up.

### Slide 14. What it can't do yet

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

### Slide 15. The rail: Pine Labs

- **On screen.**
  - **Top, typed in mono.** "GPT-5.4 booked the parcel before checking the money. Four runs in a row." Under it, from eval E04: "after the prompt said 'check first' twice."
  - **Middle.** "So the rules moved out of the model. On our rails today:"
  - **Six chips.**
    - ask above Rs 300
    - Rs 400 a day
    - these shops only
    - a reason on every debit
    - pay the kirana directly (our invention)
    - no parcel until the link is paid
- **Diagram.** Diagram 04, where the money rules live, replaces the chip row on the PDF page and builds live as the talk names each rule. The six chips stay as its spoken order. The E04 quote is its first card. The five guard questions light as they're said. Then the three outcomes draw: kirana paid in green, the Pine Labs link in haldi, a refusal in red.
- **Motion.** The E04 line types on and holds a beat. Then the diagram builds, one guard per spoken item.
- **Optional clip (slot `DECK_RAIL`), only if it doesn't crowd the diagram.** Five seconds of `/live` from the driven night, the Pine Labs track stopping at a red signal on a refused debit. Its PDF frame is the poster spec for `DECK_RAIL`.
- **Final frame.** Both parts.
- **Say.** "We'd innovate on Pine Labs, and the reason came from our own evals. Four runs in a row, the model booked a parcel before it checked the money, after the prompt had told it twice to check first. A model can't be trusted with a rule about money. So we took every one of them out of the prompt and put it in code: ask above three hundred, four hundred a day, these shops only, a reason on every debit, pay the kirana directly, no parcel until the link is paid. We've held all six on our own server. They belong on the mandate."
- **Tone.** Pine Labs' team is on the jury and knows its rails better than we do. Say it as what we learned building on their sandbox, never as what's wrong with Pine Labs.

### Slide 16. The ask: an agent mandate

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

### Slide 17. What a family hands over

- **On screen.**
  - Headline: "One limit, approved once, by the parent who pays."
  - The red khata ledger render, opened: "Rs 400 a day · ask me above Rs 300 · Sharma Kirana, Delhivery".
  - Four reasons a parent says yes:
    - It's less than they hand the cook today: cash, settled at month end.
    - Every rupee shows its dish.
    - Baari can't raise it, add a shop or pay the cook.
    - Anything bigger comes back as one Pine Labs tap.
  - **A second, smaller row: everything else, a little at a time.** The island asks one question at a time, with its "why", and backs off on "Abhi nahi". A call asks two and says "baaki baad mein".
  - **A third row, in grey: what Baari never asks for.** An inventory to type. A diagnosis. A rupee from the cook. A voice as proof of who's speaking.
- **Motion.** The ledger opens. The reasons tick in. The two smaller rows fade up together.
- **Optional clip (slot `DECK_KHATA`).** The app's Khata Pine Labs card with a waiting link, in a phone frame beside the ledger. Its PDF frame is the poster spec for `DECK_KHATA`.
- **Final frame.** Ledger, reasons, and the two rows.
- **Say.** "The one thing Baari can't work without is permission to spend. It learns the pantry from what it buys, and the house rules from one spoken minute. But a plan that can't buy the tomatoes is one more menu on the fridge door. Parents agree because it's less than they already hand the cook in cash, every rupee shows its dish, and Baari can't raise its own limit. Everything else it asks for slowly: one question at a time, with a reason, and it stops when you say 'abhi nahi'. And that first approval is how Baari spreads. The young adult sets it up, and the parent's first payment makes it real for the house."
- **Evidence.** I25, I41, X8, I27 for the limit. I3 and I43 (no inventory forms, keep the pantry invisible), I22 (no checks on the cook), L4 (no diagnosis) and A2 (no voice authentication) for what it never asks.

### Slide 18. Aapki baari

- **On screen.**
  - A large QR.
  - "Your baari. Set up your house and run tonight's dinner."
  - Below: `t.me/Baari_ken_bot` · `baari.pages.dev`.
  - The go-to-market in one line: "Young adults bring it home. Parents stay on Telegram. A cook works four homes, and every one of them gets better at briefing her."
  - Three partner logos, the AgenticOrg line, three names.
- **Motion.** The ब pill from the top travels down into the QR's centre and the QR draws itself.
- **Final frame.** As listed.
- **Say.** "Scan it and tonight's dinner runs on your phone. We'll end where we started. Roz Mummy ki baari hoti thi. Ab Baari ki baari. Aur aaj raat... aapki."
- **QR target.** The judge flow `baari.pages.dev/?new` if it's built and tested by Saturday. Otherwise the bot's guest night, which works today (CT23).

### Appendix: A1 to A7

Seven pages after the close, for questions and for the judges reading the PDF later. No talk time. Each is one designed page in the deck's look, built from a real object in the app.

- **A1. Hamari khata: the build, in numbers.**
  - The app's red cloth ledger, opened, with one column for Chaitanya, one for Vinay and one for both. Totals are in `film/deck/stats/team.json`.
  - Rows:
    - active hours with Claude Code: 30.7 and 36.7, so 67.4
    - Claude's replies: 2,839 and 2,589, so 5,428
    - tool calls: 36,465, 70% of them Bash
    - edits: 2,540
    - browser actions: 6,121
    - tokens: 129 crore, 98.5% of them read from cache
    - cost at API prices: $458
    - commits: 160 plus 5 merges, 151 of them with Claude
    - after 8 PM: 43%
    - longest stretch: 12.2 hours, both of us
    - interrupted and apologised: 192 and 21
    - "bro": 82
  - The page ends with the app's own stamp: "Hisaab barabar".
- **A2. Sab ghar mein tha: what's in our kitchen.**
  - The app's receipt printer, printing the stack. The title is the receipt's own line.
  - Line items:
    - The app a family opens: 0 npm packages. Two CDN scripts (html2canvas, qrcode-generator) and Google Fonts.
    - The rails: 0 packages, Node built-ins only.
    - The clock: a Cloudflare Worker, 0 packages.
    - Evals: `yaml`. The old film: Remotion, React, Puppeteer. This deck and trailer: HyperFrames, GSAP, p5.brush.
    - Services:
      - AgenticOrg on GPT-5.4
      - Gnani STT and TTS
      - Pine Labs Plural UAT
      - Delhivery (a mock at its documented paths)
      - the Telegram Bot API
      - Twilio
      - Cloudflare Pages and Workers
      - Vercel
    - Claude skills used: transitions-dev ×19, humanizer ×13, unslop ×3, agenticorg-prd ×2, frontend ×1.
    - Skills we wrote:
      - agenticorg-prd: 63 platform facts, each tagged live, docs, ours or unverified.
      - unslop: no em dashes, ever. Claude slipped 3 times, all in one laptop's sessions.
  - Total line: "Dependencies a family installs: 0".
- **A3. Do lanes, ek repo.**
  - The repo drawn as `/live` draws rails: one track per lane.
    - W1, rails, Vinay.
    - W2, brain and evals, Chaitanya.
    - W3, the app, Chaitanya and then Vinay from 21:45 on 8 Oct.
    - The four cloud branches (app, evals, memory, taste) peel off and rejoin at the integrate merge, 9 Oct, 00:45.
  - Commits are the stations. The gap from 4 to 7 October is folded and labelled "Round 3 submitted".
  - The 22 commit comments ride the tracks as cars, by tag: 12 `[unblocked]`, 5 `[ask]`, 3 `[used]`, 2 `[idea]`, 0 `[blocked]`.
  - One card quotes a session thanking the other: "Rerunning E01, E08, E10 on v5 now. Thanks for chasing that one down."
- **A4. Prompt ki diary.**
  - Thirteen prompt cards, stacked, each card's height its length: 8,387 characters at v1, 32,610 at v13.
  - Each card names the night that broke the one before it, from `agent/prompts/CHANGELOG.md`:
    - v2: the validator blocked Telegram and Pine Labs.
    - v4: GPT-4o wrote English.
    - v6: a hello mid-night was ignored.
    - v7: the turn was only decoration.
    - v8: money rules moved to rails (E04).
    - v9: LOCK stopped before buying.
    - v10: judges get their own night.
    - v11: real Pine Labs sandbox.
    - v12: two languages in one message, and Baari spoke as a man.
    - v13: who's eating, prep, cuisine, memory.
  - The title is "Every version names the night that broke the last one."
- **A5. Every screen.**
  - Sixteen phones at their poster stills, from the rows in `film/RECORDING_DELTA.md`:
    - the island, the deck, Badlo, the cuisine deck, the voice studio, the khata
    - who's eating, the reminders, Baari ne seekha, Kyun
    - the call, the onboarding karaoke, Raat bhar, the kirana card
    - the receipt, the TV
  - Each phone carries one line.
  - This is the "section" a judge flips back to after the talk.
- **A6. Context engineering.** Diagram 03, full detail: the brief rails writes for one LOCK run, line by line, with what each line is for. Around it sit the rules, the kitchen facts and the tool answers, then the DECISIONS it leaves behind, and along the bottom five things kept out on purpose. This is the answer to "how do you keep an LLM reliable with money?"
- **A7. The bridge.** Diagram 05: the 17 names the validator refused, then a phrasebook of what each voice-tool call really does and where it lands, one `pl.link` call, and the answers that ride back in the voice id. The answer to "why does a voice tool send a payment link?"

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
  s01.html ... s17.html   one composition per slide, 1920 x 1080, a paused GSAP timeline on window.__timelines
  a01.html ... a07.html   the appendix pages, still; A6 and A7 load docs/diagrams/src/03 and 05

Diagrams are not redrawn for the deck. Slides 10, 12 and 15 and pages A6 and A7 load `docs/diagrams/src/*.html` in an iframe with `?slide` (and `&theme=dark` if the deck runs dark), and animate their wires with the deck's timeline. When a diagram changes, `node docs/diagrams/render.mjs` updates the README's PNGs from the same file.
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
- `?print` lays every slide at its final frame, one per page, with `@page { size: 1920px 1080px }`. Every video shows its chosen poster frame instead of playing.
- A slot whose clip hasn't landed shows its placeholder, and `export.mjs` refuses to make the final PDF while any placeholder is left.

### Export, `export.mjs`

- Playwright opens each slide, sets its timeline to the end, and screenshots it at 3840 x 2160.
- The PNGs join into `Baari_finale.pdf`.
- The same PNGs, with the trailer on slide 1, the tour on slide 8 and the demo video on slide 9, make the venue `.pptx`.

### Render to video

`npx hyperframes render` on each slide gives MP4 builds, if we ever need a narrated deck video.

## 7. Who says what

- **Two speakers, so the voice changes once in the middle.** The handover is the joke: the first speaker ends the app tour (slide 8) with "Vinay, teri baari."
  - Chaitanya takes Q1, Q2 and the tour. Three years of briefing a cook every morning makes the insight Chaitanya's to tell, and the app is Chaitanya's work.
  - Vinay takes the rest of Q3 (from the demo, slide 9, through the wiring, the evals and the build slide) and Q4 to Q5. Vinay built the voice and the money, and the "nice try, Vinay" joke from the trailer lands better with Vinay standing right there.
- **Rehearse three times against a clock.** The cut order in section 3 handles overruns. Never speed up; cut instead.
- **Know slide 16 cold.** The person who runs Pine Labs will ask about it.

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
| How does it run without anyone opening an app? | Slide 10b: the clock, a message, an event or a missed step wakes one short run; the quiet log counts what reached a person | That it's always listening. It wakes on those four things only |
| How do you keep the model reliable with money? | A6 and diagram 04: rails writes the context, money rules live in code, every payment passes the guards, DECISIONS are checked against the call log | That the prompt alone is enough. E04 proved it isn't |
| Why does a voice tool send Telegram messages? | A7: the validator refused every custom tool; the native ElevenLabs connector passed with our Base URL, and the name argument picks the action | |
| How did two people build this in five days? | Slide 12, then A1 to A3: rails we control, a demo clock, evals on bad nights, two Claude Code sessions in lanes | That Claude did it alone. We wrote the rules, the evals and the interviews, and said no a lot |
| What did it cost to build? | $458 at API prices across both laptops, Baari only (ccusage), plus about $25 for the planning session in the cloud | A total for anything but Baari |
| What do you need from Gnani and Delhivery? | Gnani: the household reply extraction as a product, faster STT. Delhivery: delivery windows and a hyperlocal hop API | |

## 9. Claims to check before anything goes out

From the insight map's section 8 and our own earlier notes:

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
11. Build numbers come from `film/deck/stats/` and get re-run on the morning of the finale. Say "at API prices" next to any dollar figure, and show Baari-only numbers, never a laptop's total across other projects.
12. Keep prompt counts off the slides. Chaitanya's transcripts show 663 messages in one hour on 4 October, which looks like a loop or a relay, not typing. "bro", tool calls, tokens and edits don't depend on it.
13. "Nearly one token for every person in India" assumes about 146 crore people (UN, 2025). Check the figure before saying it.

## 10. Order of work

1. **Team decisions.** Who speaks. The QR's target.
2. **Write and time the talk track.** Read it aloud against a clock and cut to 8:00.
3. **Build slides 1 to 18 and A1 to A7** as HyperFrames compositions, reusing the trailer's components. Slides 8 and 9 start on placeholders. Add the `?slide` cut to `docs/diagrams/kit.css` before slides 10, 12 and 15.
4. **Record the app tour's clips** (`film/RECORDING_DELTA.md` section 4, priorities 1 to 8) on fixtures, and cut the 45-second tour for slide 8.
5. **Record the driven night and cut the 50-second demo video** for slide 9 (`film/CLIP_SLOTS.md` section 2).
6. **The poster pass.** For `DECK_TOUR` and `DECK_NIGHT`, and `DECK_RAIL` and `DECK_KHATA` if used, take the frame each poster spec names and check it at PDF size.
7. **Re-run the build numbers** (`film/deck/stats/`) and update slide 13 and A1 to A4. Re-render the diagrams if the product changed.
8. **Export.** The PDF and the venue `.pptx`, then open both on a different laptop.
9. **Rehearse three times.** Fix what the clock says.
