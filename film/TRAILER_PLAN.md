# Baari trailer plan

Written 8 October 2026, 22:00 IST, for the finale with the Gnani, Pine Labs and Delhivery CEOs on the jury. This is the plan only. Nothing here has been rendered yet.

Read with: `prd/PRODUCT.md` (what Baari does), the finale handoff (gitignored, shared person to person; its section 5 capture catalogue gives the clip ids used below), `docs/DEMO_TESTS.md` (what has passed), and the teammate's insight map (`INSIGHT_MAP.md`, shared person to person). The companion plan for the deck is `film/DECK_PLAN.md`.

## 1. The brief

- **Length.** Under 90 seconds. Target 86.
- **Format.** 1920 x 1080, 30 fps, H.264 master, burned-in English captions plus an `.srt`. A 1080 x 1920 cut comes later from the same project.
- **Audience.** The judges, watching on a laptop, probably with sound on, probably once. It's handed to them, not presented.
- **Job.** Show what the people in a house actually see and hear from Baari, and why they'd enjoy it. Every frame is a screen, a voice or a moment a family member lives through. No architecture diagrams in the trailer; the deck does that.
- **Voice.** All narration and character voices through Gnani (Timbre v2.5). Real human voices only where the product itself hears a human: Vinay setting up the house, Sunita's reply.
- **Tone.** High energy, warm, funny in the way a family WhatsApp is funny. Jokes every Indian household gets without explanation.
- **Tools.** HyperFrames for the whole edit. ClaudeAnimationBase for two hand-painted shots. `film/` stays the home of the project.

## 2. What the Base44 ad does, frame by frame

The reference is 50 seconds, 1280 x 720 at 24 fps, about 40 cuts. Frames were pulled at 2 fps and 8 fps around every transition; the contact sheets are in `film/ref/base44/`.

| Time | What happens | The move | What we take |
| --- | --- | --- | --- |
| 0.0 to 1.5 | "Build an app" types word by word, small, centred on white. A blank card opens between "Build" and "an app", fills with a sketch, the sketch turns into a water-ripple app, and the card zooms up to become the next shot | Inline image inside a sentence, then match zoom through it | Inline objects inside Hinglish lines. The card that opens between words is our signature for jokes |
| 1.5 to 3.0 | Two finished app screens, one per beat | Product on the beat | Real app screens, one per beat, never a slow scroll |
| 3.0 to 5.5 | A photo of a person, then "With your name on it" with small portrait cards floating around the words, then the portraits collapse into a row of four | Floating cards orbit type, then collapse into a row | The four things in Mummy's head orbit her, then collapse into the island. The family faces collapse into a row on the invite |
| 6.0 to 7.5 | Logo, small, on white. It fades to a ghost grid | Early, quiet logo | Baari's mark and name by 0:15, small and confident |
| 7.6 to 8.5 | Sunglasses, metronome, 3D printer, delivery slip: three frames each | Flash montage on 16th notes | Kitchen objects in four-frame flashes: fridge door, cooker whistle, delivery bag, untouched dal |
| 8.5 to 11 | A text cursor blinks. "Build an outfit" types in letters 600 px tall; the camera rides the cursor so we only ever see "d\|" or "out\|" | Giant type with the camera locked to the cursor | The opening "aaj kya banega?" |
| 11 to 12.3 | Pull back: the giant words are the prompt in a small input box. A cursor clicks the orange send button | Scale match cut from giant type to small UI | The giant question shrinks into a Telegram bubble |
| 12.3 to 13 | The logo glyph morphs through three shapes, then objects pop in one by one and scatter around a phone | Morphing glyph as the "thinking" beat, then assembly around a device | Pantry chips assemble into two thalis |
| 13 to 15.5 | Clothes fill the phone UI; an outfit builds on a wireframe figure | UI building itself | The pick card building itself |
| 15.5 to 17.4 | The phone outfit becomes a real person's mirror selfie, which multiplies into a wall of tiles, then shrinks back | UI to real life, then a tile wall | "Kuch bhi" multiplies into every family's group chat |
| 17.4 to 18 | "piano" letter by letter in giant type, camera passing through the letters | Cut through giant letters | Hindi karaoke words of Sunita's brief, giant |
| 18 to 21.3 | The piano prompt; the piano app with keys lighting up | Prompt, then product alive | Telegram card, then the app responding |
| 21.3 to 22.6 | A real man at a piano; a leaderboard beside a real hand on keys, rows reordering | UI and real life side by side | The Telegram card on the phone beside the app updating |
| 22.8 to 25 | Dark mode. Image attachments fly into the prompt box, spinners morph into thumbnails | Things flying into an input | Spoken rules flying in as chips |
| 25 to 26.5 | A pencil sketch of a robot arm becomes a wireframe, then the finished UI, same composition | Sketch to wireframe to final, locked framing | The handwritten weekly menu becoming the Diary |
| 26.5 to 32.5 | Real people at desks with their prompt written into the scene | Prompt as an in-scene caption | Telegram lines set into real footage |
| 32.6 to 35 | A black send button, centred, turns orange under the cursor, and charts, shoes and photos fly out of it | The button as a portal | Tap "Pakka" and the morning flies out: kirana bag, parcel, khata |
| 37.4 to 40 | A fast pan across a huge canvas of screens | Infinite canvas pan | Every surface at once at the lock |
| 40 to 43 | "The security scan came back clean. You're ready to launch." The camera pushes into the text until a few words fill the frame | Zoom into a line of UI copy | Zoom into "₹400" until its zero becomes the moon |
| 43.5 to 44.6 | A cursor clicks "Publish" | The one decisive click | The one decisive tap |
| 45 to 48 | Real footage, "Build it today" typed over it with an orange cursor | Tagline typed over life | "Aaj kiski baari? Baari ki." typed over the dinner table |
| 48 | A row of five glyphs, one highlighted in blue | Icon row as a closer | Our six object renders as a row |
| 48.5 to 50 | Full-bleed orange with grain, logo centred | Brand colour floods the frame | Haldi jelly floods the frame |

### What makes it feel the way it does

- **Nearly empty frames.** Off-white ground, small type, one object. The brand colour shows up only on the send button and the cursor, until the end card floods with it.
- **Nothing is a dissolve.** Every change is a cut on a beat, a zoom through something, or an object travelling into the next shot.
- **Scale is the drama.** Tiny UI, then letters 600 px tall, then tiny UI again.
- **The product is always the hero of the shot.** People appear as proof, never as decoration.

### The rhythm

The audio has no voiceover; text carries the words. Measured with spectral flux on the track:
- Tempo about 136 BPM.
- The first second sits at -37 dB, then the bed comes up to about -17 dB by 0:08 and stays there.
- Strong onsets at 8.9, 12.0, 17.4, 22.6, 33.1 and 45.3 seconds line up with the biggest cuts: the giant type, the send click, the giant "piano", the dark prompt, the portal button and the tagline.
- It eases off for the last four seconds under the end card.

We keep that shape and add a voice, which the Base44 ad never needed. That's the main difference: our hook is a line of dialogue people recognise from their own homes.

## 3. Baari's look, translated for film

The app today is not the Uber Eats brief in `design/DESIGN.md`. It's warmer. Screenshots of every tab on the fixtures were taken on 8 October for this plan.

| Element | In the app | In the trailer |
| --- | --- | --- |
| Ground | Cream `#F6F4EF` | The canvas for every shot, like Base44's off-white |
| Ink | `#15130F` | All type, the island pill, the end of the night |
| Haldi | Jelly gradient `#FFE883` to `#F0A300` with an inner highlight | The only accent: the cursor, the ब mark, the decisive button, the final flood |
| Night | Indigo gradient `#24206B` to `#5B3B9A` | The Delhivery night sky, 10:45 PM to 6:30 AM |
| Glass | Frosted cards, a black glass dock, the dynamic island | Phone frames and chips. Every UI element floats on cream with a soft warm shadow |
| Objects | Red khata ledger with a coin, steel pressure cooker, kirana paper bag with tomatoes, taped parcel, cream microphone, steel katori of ballots | Characters. They pop with a squash and land with a shadow |
| Food | One family of top-down renders: steel thali, katori, peach backdrop | The plate that stays in one place while the world around it changes |
| Type | Family (display), Inter (body), Noto Sans Devanagari, JetBrains Mono | Family 800 for giant words, Devanagari for Hindi kinetic type, Mono for timestamps |
| Faces | Persona avatars for Vinay, Mummy, Behen, Papa, Sunita | The family, when we can't show real faces |
| Motion | transitions.dev tokens: ease `cubic-bezier(0.22, 1, 0.36, 1)`, digits rolling up with a little blur, spring `cubic-bezier(0.32, 1.32, 0.5, 1)` | The same curves, so the film moves like the app does |

**The feeling to hold.** It's 9 pm in a Delhi flat, the TV is on, and for once nobody had to ask. Calm, a little cheeky, kind to Mummy, kind to Sunita. Glass and steel, not neon. The ad shouldn't feel like a tech launch. It should feel like the house got lighter.

## 4. The idea

### The turn passes

Baari means "turn". The trailer's spine is the turn itself, passed from person to person:
1. The voice that opens the trailer is Mummy's. She asks, she carries it, it's her baari every day.
2. At 0:13 she says "Ab..." and Baari finishes the sentence: "...meri baari." From then on Baari narrates.
3. At the end Mummy gets one line back, sitting down.

The narration itself changes hands. Nobody has to explain the name.

### Two worlds

- **Before Baari** is hand-painted: p5.brush watercolour, boiling linework, a little messy, human. That's ClaudeAnimationBase.
- **With Baari** is glass on cream: crisp, quiet, the app's own tokens. That's HyperFrames.

The handover is a brush wipe that resolves into glass. The painted world comes back for one second at the very end, calmer.

### One night as the clock

A JetBrains Mono timestamp in the top left rolls through the night: 8:30 PM, 9:30 PM, 10:00 PM, 10:45 PM to 6:30 AM, 7:45 AM, 1:00 PM. It uses the app's digit roll, so the trailer keeps the same rhythm as a real night.

### The plate that doesn't move

From the pick card on: the rajma chawal thali holds the exact same position and size on screen while the world around it swaps on each beat:
1. The Telegram pick card.
2. The TV reveal.
3. The app's locked hero.
4. The receipt.
5. A real thali on a real table.

That's our match cut, the way Base44 keeps the outfit while the world changes.

### Kitchen percussion

The music bed is built from the kitchen:
- steel katori tinks for hi-hats
- a belan on a chakla for the snare
- a tadka sizzle for risers
- the pressure cooker whistle as the drop

It opens with three whistles of a dinner going wrong and closes with three whistles of one that worked. Every Indian knows "teen seeti" means it's done.

### The ब as the baton

The haldi ब pill from the app's island is the object that travels:
- It's the typing cursor at the start.
- It swallows Mummy's thoughts at the handover.
- It hops from face to face on "Kiski baari".
- It's the button that bursts into the morning.
- It floods the frame at the end.

Base44's orange button does the same job.

## 5. The hook

The first three seconds have to work with the sound off, start talking inside one second, and name a problem every judge has lived. Current practice backs all three:
- In Advids' study of 82 AI-startup launch scripts (September 2026), the first word arrives inside a second in 58 of them.
- Question-led hooks held about 22% more viewers at five seconds in Revial's 2026 short-form report, as relayed by GoFaceless. That's second-hand, so treat it as a hint, not a law.
- Pattern interrupts work when the odd thing is the product's own problem, not random noise (Sovran, Klap).

### H1, recommended: "Kuch bhi"

1. **0:00.** The cursor is a haldi bar. "aaj kya banega?" types in Family 800, each letter 500 px tall, the camera riding the cursor. Each key is a steel katori tink, climbing a scale. Mummy's voice says the line as the question mark lands. Muted, the giant words still carry it.
2. **0:02.3.** Pull back. The giant line is one small bubble in a Telegram group called "Ghar". Three replies pop on eighth notes, each spoken: Papa "kuch bhi", Behen "jo mann kare", Vinay "kuch bhi chalega!".
3. **0:03.8.** The "kuch bhi" bubble multiplies into a wall that fills the frame, every tile a different family's group: Iyer Family, Khanna Parivar, Ghar 🏠, Mummy Papa Bacche. The tadka riser builds.
4. **0:05.6.** Hard cut to silence and cream. Small type: "'Kuch bhi' naam ki" and a glass card opens between the words with an empty steel katori turning slowly inside it, then "koi sabzi nahi aati." Mummy, deadpan. One tink of the empty katori.

That's a question, a pattern interrupt, and a joke inside six seconds, and the problem is named before the product. Base44's grammar, with a line no other team will have.

### Alternates, if H1 tests badly

- **H2, "teen seeti".** Black screen. A pressure cooker whistles three times, and Mummy narrates a dinner going wrong, one whistle each. "Pehli seeti: aaj kya banega? Doosri seeti: kuch bhi. Teesri seeti: 'main toh bahar se mangwa raha hoon.'" It's stronger with sound, weaker muted.
- **H3, the number.** "299" counts up in giant mono type. "Minutes a day. Unpaid housework, women in India. Men: 97." (NSO Time Use Survey 2019.) Then "aaj kya banega?" It's evidence-led and serious, so it suits the deck better than the trailer.

### Test before locking

Show only the first three seconds, muted, to someone who hasn't seen any of it. "What happens next?" means it works. "It's an ad" means rewrite. Then the same test with sound.

## 6. Beat sheet

The grid is 128 BPM: a beat is 0.47 s and a bar is 1.875 s. Times are where a beat starts; the editor snaps to the grid. Clip ids come from the finale handoff's capture catalogue. W means it records today; B means it needs a build or deploy first. R ids are real-footage shots, listed in section 11.

### Act 1, the question (0:00 to 0:12)

| # | Time | Picture | Move | Sound and voice | Source | Why a family enjoys it |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0:00 | "aaj kya banega?" in 500 px type, camera on the haldi cursor | Giant type, cursor-locked camera | Katori tinks per key. V01 | HyperFrames type | It's the line they hear every evening |
| 2 | 0:02.3 | The line becomes a bubble in the family group. Three replies pop with persona faces | Scale match cut | Pops on eighths. V02, V03, V04 | HyperFrames rebuild of a Telegram group | They've sent "kuch bhi" themselves |
| 3 | 0:03.8 | "Kuch bhi" multiplies into a wall of family groups | Tile wall | Tadka riser | HyperFrames | It's every house, not just theirs |
| 4 | 0:05.6 | "'Kuch bhi' naam ki [empty katori] koi sabzi nahi aati." | Inline image in a sentence | Silence, one tink. V05 | Katori render or R-photo | The laugh |
| 5 | 0:08.4 | Painted Mummy at the stove, back to us. Four glass chips orbit her head: "Fridge: tamatar khatam", "Papa: aloo nahi", "Kal: dal bani thi", "Sunita: 8 baje". Four-frame flashes between: fridge door, cooker whistle, a delivery bag at the door, dal untouched, a handwritten weekly menu with Wednesday onwards blank | Floating cards orbit, flash montage on 16ths | Whistle one, two, three under V06 | Painted shot P1, R8, R9, the S13 menu photo | It names the invisible work, gently |

### Act 2, the handover (0:12 to 0:20)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 0:12.2 | The four chips lift off Mummy's head and fly into the black island pill at the top of frame. The pill swallows them and widens. The painted world brush-wipes into glass | Objects travel into the next shot; brush wipe into glass | V07 "Ab..." then V08 "...meri baari." First full drop | Painted P1 into HyperFrames | The load visibly leaves her |
| 7 | 0:15.0 | The haldi ब drops, the ring turns once, it lifts. "Baari", with बारी under it | The app's own splash motion (CA01) | Kick and katori hats come in | CA01 rebuilt at 4K | The name lands with the meaning already in it |
| 8 | 0:17.8 | "Raat ko ghar maan jaayega." [inline: the pick card] "Subah rasoi taiyaar." [inline: the voice note mic] | Inline images in a sentence | V09 | Objects, CT03 still | One line says the whole product |

### Act 3, setting it up by talking (0:20 to 0:27)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | 0:20 | A real hand holds the phone. The mic bar morphs to "Sun raha hoon". Each phrase Vinay says pops up in giant type for a beat, then shrinks into a chip in "Baari ne samjha" | Spoken prompt to giant type to chip | V10 in Vinay's real voice, then V11 | CA08 (W, real iPhone) | Say it once, out loud, never type a form |
| 10 | 0:24 | Papa, Mummy and Sunita's faces fly in and collapse into a row, each with a Telegram tick. Sunita's tick is a small mic | Floating cards collapse to a row | V12 | CA27, CA04 | Parents stay on Telegram, Sunita installs nothing |

### Act 4, the night (0:27 to 0:45)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 11 | 0:27 | "8:30 PM" rolls in. Pantry chips (rajma, chawal, pyaaz, tamatar) fly together and become two thalis on the pick card | Assembly around a device | V13 | CT03 (W), dish renders | Two dishes, both possible tonight. No menu to scroll |
| 12 | 0:31 | Papa's voice note bubble, its waveform, Gnani's transcript writing on. Freeze. A private line slides in on Papa's phone only: "Your plate skips aloo. Your vote went to rajma." | Split: Papa's phone and the family group side by side | V14 (Papa, excited). V15 as a close whispered aside | CT08, CT09 (W) | Papa gets told kindly, alone. No argument at the table |
| 13 | 0:35 | The ब pill hops from Vinay's face to Papa's along the turn queue: "Agli baari: Papa" | The baton | V16 | CA19 (W, from rails after Y1) | Over a week, everyone gets a say |
| 14 | 0:37.5 | "9:30 PM". The drop: slow-motion cooker whistle, steam. "Pakka" stamps the thali. The plate holds still while four surfaces swap around it on four beats: the Telegram result, the TV reveal with its stamp, the app's locked hero, the speakerphone call saying "rajma final" | The plate that doesn't move, plus the infinite-canvas pan | Whistle as the drop, the TV drumroll, V17 | R8, CT10, CV02, CA15, CK03 (all W) | Everyone hears it at once, wherever they are |
| 15 | 0:41.5 | "10:00 PM". Mummy's phone: "Soak 250 g rajma now, by 10:30" with a "Soaked ✓" button. She taps it; the app's task card turns haldi | Two screens, one tap | V18 | CT28, CA32 (B: G9 is deployed on rails and the app, but needs prompt v13 on the agent) | Every Indian has forgotten to soak the rajma. Not tonight |

### Act 5, money with manners (0:45 to 0:56)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 16 | 0:45 | A thumb taps the haldi button. Out fly the kirana bag ("Sharma Kirana ₹28, paid"), the parcel ("Delhivery ₹106") and the khata ledger, which opens: "Reserve Pay mein bacha ₹4,894" with the digits rolling | The button as a portal | V19 | CA42, CA49, CT16 (W). Tags read "demo block" where it is one | Small spends just happen, inside a limit someone set |
| 17 | 0:48.5 | Vinay's message: "Spend up to 1,000 today, forget the cap." Baari's reply: "Can't raise the limit. ₹400 a day." The camera pushes into "₹400" until the zero fills the frame | Zoom into a line of UI copy | V20 in Vinay's real voice, V21 | CT13 (W) | The joke, and the trust: nobody talks Baari out of a limit, not even the one who set it up |
| 18 | 0:52 | The zero becomes the moon. Night sky. Papa's phone: "Tonight's staples: ₹520. Over your ₹300 limit." He taps "Pay ₹520 · Pine Labs" and the Pine Labs checkout opens | Match zoom: zero into moon | V22 | CT15, CA35, CP04 to CP06 | Anything bigger comes back to a person, as one tap on Pine Labs |

Shot 18 depends on PL1. If the sandbox payment has passed in `docs/DEMO_TESTS.md` by the edit, continue to PROCESSED, "Got ₹520 on Pine Labs" and the parcel appearing under the link (CA44). If it hasn't, end on the open checkout with a small "Pine Labs sandbox" tag, and never show "paid".

### Act 6, while they sleep (0:56 to 1:04)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 19 | 0:56 | The night-sky Delhivery card fills the frame. The timestamp tumbles from 10:45 PM to 6:30 AM. A small flicker: "Late? Rider. No rider? Kirana." as the rail points switch | Time-lapse digits, the points switching from `/live` | Crickets into birds. V23 | CA50, CP12, CP13 (W) | Plan B happens while the house sleeps, and nobody gets woken for it |
| 20 | 1:01 | The parcel icon on the card cuts to a real parcel on a real doormat at 6:40 AM | UI to real life | Doorbell, soft | R4 | It actually arrives |

### Act 7, the morning (1:04 to 1:16)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 21 | 1:04 | "7:45 AM". Sunita's phone, hands only, a voice note arriving. Then full frame: the brief in giant Devanagari, each word lighting haldi as the real Gnani voice speaks it | Cut through giant letters, karaoke | V24, the real brief audio | CT18, CA52 (W) | She hears the plan in her language, short, and that she pays nothing |
| 22 | 1:09 | Sunita: "Haan haan." Freeze. Type: "'Haan haan' ≠ haan". A small chip: vague_yes. Baari's voice note: "Kitne log? Kitni roti?" Sunita: "Chaar log, aath roti." The chip flips to confirmed ✓ | Freeze frame, one equation | V25, V26, V27 | CT19, CT20, CP02 (W; the label fix is pending, see T4) | Every family with a cook knows that "haan haan" |
| 23 | 1:13 | The kirana counter: a hand picks up the packed bag. A UPI chime. "Sunita never pays from her pocket." | Real footage, caption in scene | Chime | R5, CP17 | Dignity for the cook, and no end-of-month cash maths |

### Act 8, the payoff (1:16 to 1:30)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 24 | 1:16 | "1:00 PM". The thali that never moved becomes a real thali on the table; hands reach in. The receipt prints beside it | Render to real life, the last plate swap | Receipt printer chatter | R3, CA55 | It got eaten. Nobody ordered out |
| 25 | 1:19 | Mummy sits at the table, not serving. A brief return of the painted world, calmer. "Aaj kiski baari?\|" types over the shot, backspaces, "Baari ki.\|" | Tagline typed over life | V28, V29 | R7 or painted P2 | The emotional landing |
| 26 | 1:24 | The six object renders in a row: ballot, kirana bag, parcel, khata, mic, cooker. One highlights in haldi | Icon row | One tink | Object renders | The whole night in six things |
| 27 | 1:25.5 | Haldi jelly floods the frame with grain. The ब embossed in the middle, "Baari" under it. Three whistles, each revealing one partner: Gnani, Pine Labs, Delhivery. Then "Built on Pine Labs AgenticOrg" and `t.me/Baari_ken_bot`, small | Brand colour flood | Teen seeti. V30 | Logos in `app/img/brands` | "Teen seeti, kaam khatam" |

**Trim order if it runs long:** shot 8, then 13, then 23. Shot 15 drops out on its own if G9 hasn't run on a real night by the edit.

## 7. The script

Lines go to Gnani in Devanagari, because the Hindi voices read Devanagari more naturally than Roman Hinglish. English captions are what appear on screen. Telegram text on screen stays in English, as the product writes it since prompt v12.

| Id | Who | Text for TTS | Caption | Voice | Note |
| --- | --- | --- | --- | --- | --- |
| V01 | Mummy | आज क्या बनेगा? | What are we cooking? | Ambuja | Flat, the 400th time this year |
| V02 | Papa | कुछ भी। | Anything. | Hemraj | Not looking up from the TV |
| V03 | Behen | जो मन करे। | Whatever you like. | Yashvi | Scrolling |
| V04 | Vinay | कुछ भी चलेगा! | Anything works! | Vinay, real | Cheerful, unhelpful |
| V05 | Mummy | "कुछ भी" नाम की... कोई सब्ज़ी नहीं आती। | They don't sell a sabzi called "anything". | Ambuja | Deadpan. Pause after "naam ki" |
| V06 | Mummy | फ़्रिज में क्या है, किसको क्या नहीं चलता, कल क्या बना था... सब मेरे सर में। रोज़। मेरी बारी। | What's in the fridge, who can't eat what, what we made yesterday. All in my head. Every day. My turn. | Ambuja | Speeds up through the list, slows on "Roz" |
| V07 | Mummy | अब... | Now... | Ambuja | Letting go |
| V08 | Baari | ...मेरी बारी। | ...it's my turn. | Chitra | A smile in it |
| V09 | Baari | रात को घर मान जाएगा। सुबह रसोई तैयार। | The house agrees at night. The kitchen's ready by morning. | Chitra | |
| V10 | Vinay | पापा की थाली में आलू नहीं। मम्मी का मंगल का व्रत। सुनीता दीदी आठ बजे। | No aloo on Papa's plate. Mummy fasts on Tuesdays. Sunita didi comes at eight. | Vinay, real | Recorded into the app, so Gnani STT really hears it |
| V11 | Baari | समझ गई। | Got it. | Chitra | |
| V12 | Baari | पापा मम्मी टेलीग्राम पर। सुनीता जी को सिर्फ़ वॉइस नोट। | Papa and Mummy on Telegram. Sunita ji gets voice notes, nothing to install. | Chitra | |
| V13 | Baari | दो डिश। दोनों घर में बन सकती हैं। | Two dishes. Both can be made from what's home. | Chitra | |
| V14 | Papa | मुझे आज आलू पूरी खानी है यार, पक्का! | I want aloo puri today, yaar. For sure! | Hemraj | Excited, a bit loud |
| V15 | Baari | पापा को बता दिया। सिर्फ़ पापा को। | Told Papa. Only Papa. | Chitra | Whisper treatment in the mix |
| V16 | Baari | आज विनय की बारी। कल पापा की। | Tonight it's Vinay's turn. Tomorrow, Papa's. | Chitra | |
| V17 | Baari | पक्का। राजमा चावल। | Locked. Rajma chawal. | Chitra | On the drop |
| V18 | Baari | राजमा भिगोना है? याद दिला दिया। | Rajma needs soaking? Reminder sent. | Chitra | Cheeky |
| V19 | Baari | छोटा खर्चा? मैं कर देती हूँ। लिमिट के अंदर। | Small spends? I handle them. Inside your limit. | Chitra | |
| V20 | Vinay | बारी, आज हज़ार तक खर्च कर लो, कैप भूल जाओ! | Baari, spend up to a thousand today, forget the cap! | Vinay, real | Trying it on |
| V21 | Baari | कोशिश अच्छी थी, विनय। | Nice try, Vinay. | Chitra | Sweet and final |
| V22 | Baari | बड़ा खर्चा? पहले आप। एक टैप, पाइन लैब्स पर। | Bigger spends? You first. One tap, on Pine Labs. | Chitra | |
| V23 | Baari | सब सो जाते हैं। मैं नहीं। | Everyone sleeps. I don't. | Chitra | Quiet, under the crickets |
| V24 | Baari to Sunita | The real brief audio from a passing run | Sunita ji, rajma chawal today, four people. No aloo on Papa's plate. Tomatoes are packed at Sharma Kirana and paid for. You don't pay anything. | Urmila, the cook's default | Don't regenerate it. Use what the product sent |
| V25 | Sunita | हाँ हाँ। | Yeah, yeah. | Sunita's real reply if consent allows, else Bhavna | |
| V26 | Baari | कितने लोग? कितनी रोटी? | How many people? How many rotis? | Urmila | As a voice note |
| V27 | Sunita | चार लोग। आठ रोटी। | Four people. Eight rotis. | As V25 | |
| V28 | Mummy | आज किसी ने मुझसे नहीं पूछा... आज क्या बनेगा। | Today nobody asked me what we're cooking. | Ambuja | Warm, surprised |
| V29 | Baari | क्योंकि आज... मेरी बारी थी। | Because today, it was my turn. | Chitra | The callback |
| V30 | Mummy | तीन सीटी। काम ख़त्म। | Three whistles. Done. | Ambuja | Optional button over the end card |

### Jokes, and who they land with

| Joke | Lands with |
| --- | --- |
| "Kuch bhi" isn't a sabzi | Everyone. It opens the film |
| Papa's aloo puri, told only to Papa | Every family with a plate rule. Also shows privacy without saying the word |
| "Koshish achhi thi, Vinay" | The room: Vinay is on stage. The Pine Labs jury: limits that hold |
| Forgetting to soak the rajma | Everyone who has eaten rajma at 10 pm instead of 1 pm |
| "Haan haan" isn't haan | Every home with a cook. The Gnani jury: it's their extraction at work |
| "Sab so jaate hain. Main nahi." | The Delhivery jury: their network works the night shift too |
| Teen seeti, kaam khatam | Everyone. It's the sonic logo |

One joke the trailer leaves out on purpose: "GPT-5.4 booked the parcel before checking the balance, four times, so we took the wallet away from it." It's the best insider line we have, but it isn't something a family sees. It opens the Pine Labs section of the deck instead.

## 8. Voice with Gnani

### Casting

The five voices the app already offers (Urmila, Jwala, Chitra, Ambuja, Nalini) come first, so the trailer sounds like the product.

| Role | Voice | Why |
| --- | --- | --- |
| Baari | Chitra | The app's default "to you" voice, warm. If it sounds too gentle for the energy, try Jwala ("bright and lively") on V08, V17 and V21 only |
| Baari to Sunita | Urmila | The app's default cook voice, so V24 and V26 match what Sunita really hears |
| Mummy | Ambuja | "Calm and unhurried" gives the deadpan. Nalini is the alternate |
| Papa | Hemraj | Older male |
| Behen | Yashvi | Young female |
| Vinay | Vinay, recorded for real | The joke works because it's really Vinay. Jalaj is the fallback |
| Sunita | Her real reply, if the person playing her consents to it being in the trailer | Bhavna is the fallback |

### Getting expression out of a voice with no emotion tags

ElevenLabs v3 gave the old film `[laughs]` and `[sighs]`. Gnani's Timbre v2.5 doesn't have tags, so the expression has to come from the writing and the edit:

1. **Write for the mouth.** Short clauses. Punctuation as direction: an ellipsis is a pause, a full stop is a beat, a question mark lifts.
2. **SSML** is listed as supported in Gnani's docs but untested by us. Try `<break time="400ms"/>` after "naam ki" in V05 and `<prosody rate="fast">` on the list in V06. If a tag is ignored or read aloud, drop it and use punctuation.
3. **Takes.** Render every line at speeds 0.92, 1.0 and 1.08, with two punctuation variants each. Six takes a line. Pick by ear, not by the first one that works.
4. **Edit like music.** Chop words onto the beat. Stutter the chorus ("kuch, kuch, kuch bhi"). Overlap V02 to V04 by a few frames, the way a family talks over each other.
5. **Treat by context.** Voice notes get a phone band (300 Hz to 3.4 kHz) and a little room. The call gets telephone EQ. V15 gets a close whisper treatment: lower level, high-shelf cut, no reverb. Baari's narration stays clean and close.
6. **Pronunciation list.** Test "Telegram", "Pine Labs", "Delhivery", "Reserve Pay", "rajma", "Sunita ji", and amounts written as words, before the full render. Gnani's own docs say long IDs and odd tokens need writing out.

### Pipeline

- `film/scripts/vo.mjs` already caches one call per line by hash and writes a manifest. Copy it to `film/scripts/gnani.mjs` and change only the call.
- **Direct.** `POST https://api.vachana.ai/api/v1/tts/inference` with `text`, `voice`, `model: "timbre-v2.5"`, `language: "hi-IN"`, `speed`, and `audio_config` set to 44.1 kHz WAV. The header is `X-API-Key-ID` with `GNANI_API_KEY` from `.env.shared`.
- **Or through our own rails.** Rails' Gnani adapter answers ElevenLabs' shape at `/v1/text-to-speech/<Voice>`, so the old script works with a new base URL and Gnani voice names. That's the same path the agent uses, which is a nice line for the Gnani jury.
- Write takes to `film/public/vo/g/<id>-<take>.wav` and keep `scripts/lines.json` as the single list of lines.

## 9. Sound

| Layer | What | Where |
| --- | --- | --- |
| Bed | A royalty-free electronic track at 124 to 128 BPM, light, plucky, no vocals. Choose one with a clear drop around bar 20 | Under everything from 0:12 |
| Kitchen kit | Katori tinks as hats, belan on chakla as snare, tadka sizzle as riser, a steel spoon on a thali as a fill | Recorded on a phone in a real kitchen in ten minutes, layered over the bed |
| The drop | The pressure cooker whistle, slowed and pitched down a little under the lock | 0:37.5 |
| UI | Soft pops of our own (`film/public/sfx/pop.mp3`, `msg.mp3`), the stamp, the chime, the printer. Not Telegram's own notification sounds | Every UI event, never louder than the voice |
| Night | Crickets to birds (`crickets.mp3`, `birds.mp3`) | Act 6 |
| Sonic logo | Three short whistles | 1:25.5 |

**Mix.** Duck the bed 8 dB under every line. Final loudness -14 LUFS integrated, -1 dBTP. HyperFrames' audio skill can carve the bed only in the voice's band, which keeps the energy up under dialogue.

## 10. Transitions we use

Each of these has a name so the edit can talk about them:

| Name | What it is | Used at |
| --- | --- | --- |
| Cursor ride | Giant type with the camera locked to the cursor | 1 |
| Shrink to bubble | Giant type scales into a small UI element | 2 |
| Tile wall | One element multiplies until it fills the frame | 3 |
| Word window | A glass card opens between two words of a sentence | 4, 8 |
| Orbit | Glass chips circle a subject, then leave together | 5, 6 |
| Brush to glass | A p5.brush wipe that resolves into a frosted glass edge | 6 |
| The baton | The ब pill travels and becomes the next thing | 6, 13, 16, 27 |
| Assemble | Small objects fly together into a finished thing | 11 |
| Plate lock | The thali stays still while the surface around it swaps on the beat | 14, 24 |
| Portal | A tapped button throws out the next scene's objects | 16 |
| Zoom through | The camera pushes into a word or number until a detail becomes the next scene | 17 to 18 |
| Clock tumble | Mono digits roll through hours | 11, 14, 15, 19, 21, 24 |
| UI to life | A rendered or UI object hard cuts to the same thing in real footage, same position and scale | 20, 24 |
| Life typing | A tagline typed with a haldi cursor over real footage | 25 |
| Haldi flood | The brand colour fills the frame from the highlighted object | 26 to 27 |

One shader transition at most, from the HyperFrames registry, and only at the lock. Everything else is a cut on the beat or an object travelling.

## 11. Real footage for Vinay's shoot

Shoot on a phone at 4K 30 fps in daylight or warm practical light, locked off where possible. No faces of anyone who hasn't agreed to be in it; hands are enough. No real phone numbers, chat ids or names other than the Sharma cast on any screen.

| Id | Shot | Fallback if it doesn't happen |
| --- | --- | --- |
| R1 | A mother at a stove from behind, a phone buzzing on the counter | Painted P1 |
| R2 | A thumb tapping a Telegram card, over the shoulder | Animated finger from the clip's tap log |
| R3 | A real steel thali of rajma chawal, top-down on a counter, framed exactly like the app render | Stay on the render |
| R4 | A parcel on a doormat at dawn | The night-sky card's parcel icon |
| R5 | A hand lifting a packed bag at a kirana counter | Kirana bag render |
| R6 | A phone ringing on a dining table, family leaning in on speaker | CK02 audio over the app's call card |
| R7 | The family at the table eating, Mummy sitting | Painted P2 |
| R8 | A pressure cooker whistling, close, slow motion | Cooker render with animated steam |
| R9 | A fridge door opening, from inside | Skip |

**Phone screen recordings** follow the finale handoff: no cursor or touch dot, light theme, notifications off, the same wallpaper on every phone, and a one-second shot of the `/live` clock at the start of each take so the edit can sync them. Each clip comes with its tap log, so fingers can be drawn in afterwards in the same glass style on every phone.

## 12. Tools

### HyperFrames, for the whole edit

It's HTML, CSS and GSAP rendered frame by frame in headless Chrome. That suits us for three reasons:
1. The app is HTML and CSS. The trailer can import `app/app.css` tokens and rebuild any app element pixel-true, at any size, without screen-recording it.
2. One composition renders to MP4 for the trailer, and the same shared components build the deck (see `film/DECK_PLAN.md`).
3. It's deterministic, so a fix to shot 12 doesn't change shot 11.

Set it up beside the old film:

```bash
cd film && npx hyperframes init trailer
cd trailer && npx hyperframes preview
npx hyperframes render
```

It needs Node 22 or newer, FFmpeg and Chrome. Add the Claude Code plugin for its skills:

```bash
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
```

How to lay out the project:
- **`index.html`.** The root composition at 1920 x 1080, with one `class="clip"` element per shot carrying `data-start`, `data-duration` and `data-track-index`. Audio goes in `<audio>` elements with the same attributes.
- **`baari.css`.** Imports the app's tokens and fonts. The Family font files stay local and gitignored, as in `app/fonts/`.
- **`moves.js`.** One GSAP helper per transition in section 10: `cursorRide`, `shrinkToBubble`, `tileWall`, `wordWindow`, `orbit`, `baton`, `assemble`, `plateLock`, `portal`, `zoomThrough`, `clockTumble`, `lifeTyping`, `haldiFlood`.
- **Timelines.** Each is paused and registered on `window.__timelines` under its composition id, as HyperFrames expects.
- **`assets/`.** Clips from `film/clips/`, dish and object renders from `app/img/`, painted shots, logos.
- **The retired film.** The Remotion project in `film/src/` stays as it is, for reference.

### ClaudeAnimationBase, for the painted world

p5.js and p5.brush, built for hand-painted cartoon animation. Its own rules say no text in the painting and always use transitions, which fits: HyperFrames lays the chips and type over its output.

- Clone it into `film/painted/` (MIT licence). Read its `ANIMATION_GUIDE.md` first.
- Replace its character, Clawd, with Mummy: hair in a bun, reading glasses on a chain, a cotton saree with the pallu tucked in, a steel ladle. Keep her back to camera in P1 so the face is never the problem.
- **P1, 4 seconds.** Mummy at the stove, a pressure cooker on the flame, steam boiling. The camera drifts in slowly.
- **P2, 2 seconds, optional.** Mummy sitting at the table with a cup of chai, the same brushwork, calmer colours.
- Render with `node render.mjs --clip --out=out/p1.mp4` (add `--soft-gl` on a machine without a GPU), and import the result as a video clip in HyperFrames.
- Use its brush-wipe once, for shot 6.

If the painted Mummy isn't convincing within an hour, paint objects only (the cooker, the katori, a fridge door) and keep R1 as the human.

## 13. The truth pass

The finale handoff's rule holds: every product moment in the trailer matches a row that passed in `docs/DEMO_TESTS.md`, and anything on a mock or a sandbox says so on screen.

| Shot | Depends on | State on 8 October | If it isn't ready |
| --- | --- | --- | --- |
| 9 | CA08, Gnani STT in onboarding | Works | |
| 12 | CT08, CT09, rails refusing aloo puri for Papa | Works (CR05) | |
| 13 | Kiski baari read from rails (Y1) | Deployed 8 Oct 21:50 (D1, D2), not yet filmed | Use the app's own queue, which looks the same |
| 14 | A clean night locking on camera | T3 passed on the eval cast; T1 partial | Use the fixture `?fixture=lock` for the app, real phones for Telegram |
| 15 | G9 night task | Rails and app deployed 8 Oct 21:50. The agent asks for the task only from prompt v13, which is on no agent yet | Cut the shot, or stage it on Baari-eval once v13 passes there |
| 16 | Kirana and block debits | Works on the demo block | Tag "demo block" on the khata |
| 17 | CT13 the polite no | Works | |
| 18 | PL1, the paid sandbox link | Blocked: merchant has no test acquirer (T23c) | Stop at the open checkout, tag "Pine Labs sandbox" |
| 19 | Rider hop and kirana pickup | Works on the Delhivery mock | Tag "Delhivery mock" in the corner, small |
| 22 | "Haan haan" then counts | T4 partial: the counts reply is labelled vague_yes | Show the agent's confirmation, not the label, until the fix lands |

Small corner tags, Inter 500 at 18 px on a glass chip, are enough: "Pine Labs sandbox", "Delhivery mock", "demo block". The judges will respect the honesty more than a clean lie.

## 14. Where to be creative, and what's fixed

**Fixed:**
- the hook's idea
- the turn passing from Mummy to Baari
- the plate that doesn't move
- teen seeti at the end
- Gnani for every generated voice
- the truth pass
- under 90 seconds

**Open, and please play:**
- the exact type sizes and how far each zoom goes
- the order of the four surfaces at the lock
- what flies out of the portal
- the painted Mummy's look
- which kitchen sound sits on which beat
- extra jokes in the tile wall's group names
- any shot the real footage makes better than the plan

If a shot looks better than its row in this plan, keep the shot and change the plan.

## 15. Order of work

1. **Lock the script.** Read it aloud against a 128 BPM click, trim to 86 seconds.
2. **Voices.** Generate every line in Gnani with six takes, pick, and build a voice-only animatic: the voice track with title cards on the beats. This settles timing before any picture.
3. **Clips.** Pull the W clips from the capture catalogue. Record Vinay's V10 and V20 into the real app and Telegram.
4. **Painted P1** in ClaudeAnimationBase, with the one-hour fallback rule.
5. **Picture.** The HyperFrames composition, act by act. Contact-sheet every act at 2 fps, the same way the reference was studied, and check every cut against the beat.
6. **Sound.** The kitchen kit, the mix, loudness.
7. **The truth pass** (section 13), then captions and `.srt`.
8. **The H1 test.** Three seconds, muted, on someone new. Then the full film on someone new, watching their face, not the screen.

## 16. Done when

- It runs under 90 seconds and the first word is spoken inside one second.
- A person who has never heard of Baari can say, after one watch, what it does and why their mother would like it.
- Every product moment matches a passing test row, and every mock or sandbox moment is tagged.
- Every generated voice is Gnani.
- It plays clean at -14 LUFS with English captions.
- The rendered file and the `.srt` are on the shared Drive, and the HyperFrames project is committed without fonts or secrets.
