# Baari trailer plan

Written 8 October 2026, revised 22:15 IST, for the finale with the Gnani, Pine Labs and Delhivery CEOs on the jury. This is the plan only. Nothing here has been rendered yet.

Read with:
- `prd/PRODUCT.md`, for what Baari does today.
- The finale handoff (gitignored, shared person to person). Its section 5 capture catalogue gives the clip ids used below.
- `docs/DEMO_TESTS.md`, for what has passed.
- `film/CLIP_SLOTS.md` and `film/slots.json`: where every shot's footage comes from, placeholders, timing that stretches, and PDF posters.
- The teammate's insight map (`INSIGHT_MAP.md`, shared person to person).

The companion plan for the deck is `film/DECK_PLAN.md`.

**This trailer starts from the product as it is on 8 October, not from the old film.** The Remotion film in `film/src/` was made for Round 3 when Baari was a Telegram bot with a dashboard. Since then Baari has gained:
- the dynamic island and its thinking verbs
- the nudges
- onboarding by voice, with Ghumao and the island's questions
- the cuisine deck and the voice studio with five Gnani voices
- the brief in six languages
- the phone call, and TV mode
- Pine Labs payment links
- who's eating and night tasks
- the kirana card
- a judge's own night from a QR

The trailer is built from those. Section 8 lists what the old film used, so none of it comes back by accident.

## 1. The brief

- **Length.** Under 90 seconds. Target 86.
- **Format.** 1920 x 1080, 30 fps, H.264 master, burned-in English captions plus an `.srt`. A 1080 x 1920 cut comes later from the same project.
- **Audience.** The judges, watching on a laptop, probably with sound on, probably once. It's handed to them, not presented.
- **Job.** Show what the people in a house actually see and hear from Baari, and why they'd enjoy it. Every frame is a screen, a voice, or a moment a family member lives through. No architecture in the trailer; the deck does that.
- **Who it follows.** The young adult who brings Baari home, the go-to-market user in PRODUCT.md section 4, through Baari's first week in the house. Mummy is the one who gets her evenings back. Baari narrates in her own voice, the voice of the app's island and nudges: dry, warm, a little cheeky.
- **Voice.** Every line is generated in Gnani (Timbre v2.5) first, so the trailer is complete without a recording session. Vinay, the family on the call and Sunita can be swapped for real voices if they get recorded, matched to the Gnani take's timing.
- **Footage.** The trailer ships on Made and Auto sources alone (see `film/CLIP_SLOTS.md`). Human recordings aren't promised; if they come, they replace a default shot by shot.
- **Tone.** High energy, funny the way a family group chat is funny. Every joke is something the product really says or does.
- **Tools.** HyperFrames for the edit. ClaudeAnimationBase for one or two hand-painted shots.

## 2. What the Base44 ad does, frame by frame

The reference is 50 seconds, 1280 x 720 at 24 fps, about 40 cuts. Frames were pulled at 2 fps and at 8 fps around every transition; the contact sheets are in `film/ref/base44/`.

| Time | What happens | The move | Where we use it |
| --- | --- | --- | --- |
| 0.0 to 1.5 | "Build an app" types word by word, small, centred on white. A blank card opens between "Build" and "an app", fills with a sketch, the sketch becomes a water-ripple app, and the card zooms up to become the next shot | Inline image inside a sentence, then a match zoom through it | Vinay's line about the house, with word windows (shot 5) |
| 1.5 to 3.0 | Two finished app screens, one per beat | Product on the beat | Every app shot. One screen per beat, never a slow scroll |
| 3.0 to 5.5 | A photo of a person, then "With your name on it" with portrait cards floating around the words, which collapse into a row of four | Cards orbit type, then collapse into a row | What Mummy keeps in her head orbits her (shot 6). The family faces collapse into a row after the invite (shot 12) |
| 6.0 to 7.5 | Logo, small, on white, fading to a ghost grid | An early, quiet logo | Baari's mark at 0:06 (shot 4) |
| 7.6 to 8.5 | Sunglasses, metronome, 3D printer, delivery slip, three frames each | Flash montage on 16th notes | The island's thinking verbs, one verb and one object per beat (shot 13) |
| 8.5 to 11 | A cursor blinks. "Build an outfit" types in letters 600 px tall; the camera rides the cursor | Giant type with the camera locked to the cursor | Vinay's spoken rules appear in giant type as they're said (shot 8) |
| 11 to 12.3 | Pull back: the giant words are the prompt in a small input box. A cursor clicks the orange send button | Scale cut from giant type to small UI | The giant words shrink into "Baari ne samjha" chips (shot 8) |
| 12.3 to 13 | The logo glyph morphs through three shapes, then objects pop in one by one around a phone | A morphing glyph as the thinking beat, then assembly | The island's shimmer, then pantry chips assemble into two thalis (shot 13) |
| 13 to 15.5 | Clothes fill the phone UI; an outfit builds on a wireframe figure | UI building itself | The pick card building itself (shot 13) |
| 15.5 to 17.4 | The outfit on the phone becomes a real mirror selfie, which multiplies into a wall of tiles | UI to real life, then a tile wall | The lock landing on every surface at once (shot 15) |
| 17.4 to 18 | "piano" letter by letter in giant type, the camera passing through the letters | Cut through giant letters | "Didi, namaste" in six scripts, giant (shot 22) |
| 18 to 21.3 | The piano prompt, then the app with keys lighting up | Prompt, then product alive | A Telegram tap, then the app answering it |
| 21.3 to 22.6 | A real man at a piano; a leaderboard beside a real hand on keys | UI and real life side by side | Papa's phone beside the app at the Pine Labs link (shot 18) |
| 22.8 to 25 | Dark mode. Images fly into the prompt box, spinners morph into thumbnails | Things flying into an input | Cuisine swipes flying into the vote (shot 10) |
| 25 to 26.5 | A pencil sketch of a robot arm becomes a wireframe, then the finished UI, same framing | Sketch to final, locked framing | Painted Mummy resolving into the glass world (shot 7) |
| 26.5 to 32.5 | Real people at desks with their prompt set into the scene | Text set into real footage | The soak task on Vinay's phone, in hand (shot 16) |
| 32.6 to 35 | A black send button turns orange under the cursor, and charts, shoes and photos fly out of it | The button as a portal | The haldi button throws out the kirana bag, the parcel and the khata (shot 17) |
| 37.4 to 40 | A fast pan across a canvas of screens | Infinite canvas pan | The lock across TV, Telegram, app and island (shot 15) |
| 40 to 43 | "The security scan came back clean. You're ready to launch." The camera pushes into the text until a few words fill the frame | Zoom into a line of UI copy | Zoom into "Lauki has noticed" until the lauki fills the frame (shot 2) |
| 43.5 to 44.6 | A cursor clicks "Publish" | The one decisive click | Papa's one tap on "Pay ₹520 · Pine Labs" (shot 18) |
| 45 to 48 | Real footage, "Build it today" typed over it with an orange cursor | Tagline typed over life | "Aaj ki baari?" then "Aapki." over the table (shot 28) |
| 48 | A row of five glyphs, one highlighted | Icon row as a closer | Six object renders in a row (shot 28) |
| 48.5 to 50 | Full-bleed orange with grain, logo centred | Brand colour floods the frame | Haldi floods the frame (shot 28) |

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

We keep that shape and add a voice. The difference is in the hook: Base44 opens with its own product typing; we open with our product talking, a real Baari nudge read aloud.

## 3. Baari's look, translated for film

The app today is not the Uber Eats brief in `design/DESIGN.md`. It's warmer. Screenshots of every tab on the fixtures were taken on 8 October for this plan.

| Element | In the app | In the trailer |
| --- | --- | --- |
| Ground | Cream `#F6F4EF` | The canvas for every shot, like Base44's off-white |
| Ink | `#15130F` | All type, the island pill, the lock screen |
| Haldi | Jelly gradient `#FFE883` to `#F0A300` with an inner highlight | The only accent: the ब mark, the decisive button, the final flood |
| Night | Indigo gradient `#24206B` to `#5B3B9A` | The "Raat bhar" Delhivery card, stars fading into dawn |
| Glass | Frosted cards, a black glass dock, the dynamic island | Phone frames and chips float on cream with a soft warm shadow |
| The island | A black pill at the top that shimmers while Baari works and cycles kitchen verbs: "Tadka laga rahi hoon", "Sabziwale se mol-bhaav", "Cooker ki seeti gin rahi hoon", with the real step in between ("Rasoi dekh rahi hoon", "Pine Labs block dekh rahi hoon") | The narrator's device. Every act opens with the island thinking and closes with what it decided |
| Objects | Red khata ledger with a coin, steel pressure cooker, kirana paper bag with tomatoes, taped parcel, cream microphone, steel katori of ballots | Characters. They pop with a squash and land with a shadow |
| Food | One family of 40 top-down renders: steel thali, katori, peach backdrop | The plate that stays in one place while the world around it changes |
| Copy | The app's own lines: the nudges, the island's questions and options, "Baari ne samjha", "Sab jud gaye. Badiya." | The jokes. We don't write new gags when the product already has better ones |
| Type | Family (display), Inter (body), Noto Sans Devanagari, JetBrains Mono | Family 800 for giant words, each Indian script for the language montage, Mono for days and times |
| Faces | Persona avatars for Vinay, Mummy, Behen, Papa, Sunita | The family, when we can't show real faces |
| Motion | transitions.dev tokens: ease `cubic-bezier(0.22, 1, 0.36, 1)`, digits rolling with a little blur, spring `cubic-bezier(0.32, 1.32, 0.5, 1)` | The same curves, so the film moves like the app does |

**The feeling to hold.** A Delhi flat on a weeknight. The son on the sofa, phone in hand, Papa pretending not to care about dinner, Mummy for once not in the kitchen at 9 pm. Calm, a little cheeky, kind to Mummy, kind to Sunita. Glass and steel, not neon. It should feel like the house got lighter, and like the kid who set it up is quietly proud of it.

## 4. The idea

### Baari's first week in the house

The spine is one week, told in days: Din 0 (setup), Raat 1 (the first night), then the morning, then Sunday. A small mono label in the island carries the day and time.

### The island is the narrator

Base44's unit of story is the prompt box. Ours is the dynamic island:
- Each act opens with the black pill shimmering through Baari's kitchen verbs.
- It closes with what Baari did, written in the pill.
- When Baari speaks, the pill is where her voice comes from on screen: a small waveform inside it.

This is the app's real behaviour (the verbs live in `app/verbs.js`, the live steps in the island since 8 October), so the trailer teaches the judges the interface without explaining it.

### The kid brings it home

The young adult, Vinay in the Sharma household, sets Baari up and is the face of the first week. The reason fits in one line at 0:07: one person in the house answers the same question every day, and it's time it was someone else's turn. The emotional payoff is Mummy's, at the end. The funny payoffs are Vinay's: the soaking job lands on Vinay, and the bill lands on Papa.

### "Main?!"

A running gag, three times, each time the turn lands on someone who didn't expect it:
1. Ghumao spins and lands on Papa. "Main?!"
2. The night task lands on Vinay. "Main?"
3. The end card lands on the viewer: "Aaj ki baari?" then "Aapki." The QR that follows is a real way for a judge to run tonight's dinner.

### The plate that doesn't move

From the first night on, the rajma chawal thali holds the exact same position and size on screen while the world around it swaps on the beat:
1. The TV reveal.
2. The Telegram result.
3. The app's locked hero.
4. The receipt.
5. A real thali on a real table.

It's our version of Base44 keeping the outfit while the world changes.

### Sound from the house

- The bed is built from the kitchen: steel katori tinks for hi-hats, a belan on a chakla for the snare, a tadka sizzle for risers.
- The drop is the TV mode's drumroll and its "Pakka" stamp, the product's own reveal sound.
- The sonic logo at the end is three stamps, one per partner.

### The ब as the baton

The haldi ब mark from the island travels through the film:
- It lands as the title.
- It hops from face to face in Ghumao.
- It's the button that bursts into the morning's shopping.
- It floods the frame at the end.

## 5. The hook

The first three seconds have to work with the sound off, start talking inside one second, and be about the product's own problem, not random noise. Current practice backs all three:
- In Advids' study of 82 AI-startup launch scripts (September 2026), the first word arrives inside a second in 58 of them.
- Question-led and interrupt-led openings hold more viewers at five seconds. Revial's 2026 report, as relayed by GoFaceless, puts it at about 22% for questions; that's second-hand, so treat it as a hint.
- Sovran and Klap both warn that an interrupt only works when the strange thing belongs to the product.

### H1, recommended: "Lauki has noticed"

1. **0:00.** A phone lock screen at 9:20 PM. One notification slides down, the app's real nudge copy: "**Baari** · Lauki has noticed 👀 / Three nights, no vote from you. It's winning by default." Baari's voice reads the first line, deadpan.
2. **0:01.9.** The camera pushes into the word "Lauki" until it becomes the lauki chana dal thali, alone in a spotlight on black. A horror sting: a low boom, a steel spoon dragged across a thali for the screech. "3 RAATEIN." flickers in giant type. For a second and a half, a family food app is a horror trailer.
3. **0:03.8.** Hard cut to bright cream. A thumb jabs "Rajma chawal" on the Telegram pick card; the buttons fold into the message with a tick. The app's own line pops beside it: "Papa already voted. Your turn, it takes one tap." The lauki thali slides out of frame. Vinay, relieved: "Rajma. Rajma! Ho gaya."
4. **0:05.6.** The ब drops and the ring turns once. "Baari". Baari: "Ghar raat ko tay karta hai. Warna... lauki."

Why it works:
- It's the product's real rule: silence means dish one, so if you don't vote, the default dish wins.
- It's the product's real copy, from the nudges sheet.
- Every Indian child of every age has lost a war to lauki.
- It reads muted, because the notification is text.
- It names the product's mechanic in the first six seconds without explaining anything.

### Alternates, if H1 tests badly

- **H2, "the island at work".** Black, then the island alone, top centre, shimmering through six kitchen verbs on six beats, each with its object flashing behind it: "Tadka laga rahi hoon", "Atta goondh rahi hoon", "Sabziwale se mol-bhaav", "Cooker ki seeti gin rahi hoon", "Rajma bhigo rahi hoon". It ends on "Aapke ghar ka kal ka khaana tay kar rahi hoon." It's charming and very ownable, but slower to land a laugh.
- **H3, "chup"**. Black screen, a phone on a dining table, a family arguing about dinner on speaker. The screen shows only Baari's call card: "Baari sun rahi hai · 0:47 chup". Then Baari, politely: "Toh... rajma final?" It's strong with sound and weak muted, so it stays in the body as shot 14.

### Test before locking

Show only the first three seconds, muted, to someone who hasn't seen any of it. "What happens next?" means it works. "It's an ad" means rewrite. Then the same test with sound.

## 6. Beat sheet

The grid is 128 BPM: a beat is 0.47 s and a bar is 1.875 s. Times are where a beat starts; the editor snaps to the grid. Clip ids come from the finale handoff's capture catalogue; W means it records today, B means it needs a build or deploy first. Every shot has a Made or Auto default in `film/slots.json` (slot T01 is shot 1, and so on), and until its clip lands it shows a placeholder at the right size. R ids are human footage: an upgrade if it comes, never a dependency (section 12).

### Act 1, the hook (0:00 to 0:07)

| # | Time | Picture | Move | Sound and voice | Source | Why a family enjoys it |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0:00 | Lock screen at 9:20 PM, the "Lauki has noticed" notification | A notification as the first line | Soft ding. L01 | The app's nudges sheet sends this as a real notification ("Send me one now"). See section 13 | The nudge is funny, not naggy |
| 2 | 0:01.9 | Push into "Lauki" until the lauki thali fills the frame in a spotlight. "3 RAATEIN." flickers | Zoom into UI copy, then a genre switch | Horror sting | Dish render `lauki-chana-dal` | Everyone's childhood enemy |
| 3 | 0:03.8 | A thumb taps "Rajma chawal"; the card folds with a tick. "Papa already voted. Your turn, it takes one tap." The lauki slides off | Hard cut to bright | Pop. L02 | CT03, CT26 (W) | One tap and you're safe |
| 4 | 0:05.6 | The ब drops, the ring turns, "Baari" | The app's splash motion | First kick. L03 | CA01 rebuilt at 4K | The name, early and small |

### Act 2, why the kid set it up (0:07 to 0:17)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | 0:07.5 | Kinetic type: "Hamare ghar mein roz ek hi sawaal" [window: a ladle stirring a pot] "aur ek hi insaan" [window: Mummy's face] "uska jawab deti hai." | Word windows | L04, Vinay's real voice | Persona face, R1 | The kid noticed. That's the whole reason |
| 6 | 0:11 | Painted Mummy at an open fridge, back to us. Four glass chips orbit her: "Fridge mein kya hai", "Papa: meetha nahi", "Kal kya bana tha", "Sunita kitne baje". Four-frame flashes between: an empty tomato tray, a sticky note on the fridge, a delivery bag at the door | Orbit, flash montage | L05 | Painted P1, R9, object renders | It names the invisible work, gently |
| 7 | 0:14.5 | The chips lift off and fly into the island. The pill widens and shimmers: "Sab yaad rakh rahi hoon…". The painting brush-wipes into glass | Orbit into the baton, brush to glass | L06, one word: "Meri." | Painted P1 into HyperFrames | The load visibly leaves her |

### Act 3, Din 0: setting it up by talking (0:17 to 0:29)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | 0:17 | "Din 0" in the island. Vinay on the sofa with the phone. The mic bar morphs to "Sun rahi hoon". Each phrase Vinay says pops up in giant type, then shrinks into a chip under "Baari ne samjha" | Giant type, then scale down to chips | L07, Vinay's real voice | CA08 (W, real iPhone, real Gnani STT) | Say it once, out loud, never fill a form |
| 9 | 0:21 | The island asks: "How often can the same dish come back?" Options: "Once a week, max", "Twice is fine", "Rajma any day". A thumb taps "Rajma any day" | One tap | Tink | CA17 (W) | The app has a sense of humour, and so does the house |
| 10 | 0:23 | "Sirf dal chawal nahi": three swipes on eighth notes (Korean ramen, pasta, momos), each flying into "Vote mein daalo" | Things flying into an input | Three whooshes | CA25 (W) | The kids get a say in what's new |
| 11 | 0:25 | The voice studio orb breathes. Five swipes, five Gnani voices, each speaking half a second of its own sample. It lands on Chitra for "Aapse" and Urmila for "Sunita ji se" | One voice per beat | The app's own samples, `app/audio/voice-*.mp3` | CA26 (W) | You pick how Baari sounds, and how she sounds to Sunita |
| 12 | 0:27 | Ghumao spins over four faces and lands on Papa. Papa: "Main?!" The faces collapse into a row with Telegram ticks: "Sab jud gaye. Badiya." | Spin, then cards into a row | L08. Pop on each tick | CA10, CA27 (W) | Running gag, part one |

### Act 4, Raat 1 (0:29 to 0:45)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | 0:29 | "Raat 1 · 8:30 PM". The island cycles verbs, one per beat, each with its object flashing big behind it: "Rasoi dekh rahi hoon" (fridge), "Niyam padh rahi hoon" (ballot), "Sabziwale se mol-bhaav" (kirana bag), "Daam dekh rahi hoon" (khata). Pantry chips fly together into two thalis on Papa's pick card | Flash montage, then assembly | Katori hats come in | CA16, CA38 (W since the 8 Oct deploy), CT03 | You can watch it think, in your own kitchen's words |
| 14 | 0:33 | The phone on the dining table rings: "Baari". She offers the two dishes, then goes quiet. The family argues on speaker, overlapping. On screen, only the call card: "Baari sun rahi hai" and a counter, "0:47 chup". Then: "Toh... rajma final?" Everyone: "Haan!" | Hold on one card while the sound does the work | L09 to L11 | CK01 to CK03 (W). R6 | It knows when not to talk |
| 15 | 0:38 | The drop: the living-room TV's drumroll and the "Pakka" stamp. The plate holds still while the surface swaps around it on four beats: the TV reveal, the Telegram result ("Locked: Rajma chawal. Next baari: Behen"), the app's locked hero, the island saying "Agli baari: Behen" | Plate lock across surfaces | Drumroll, stamp, chimes. L12 | CV02, CT10, CA15, CA19 (W) | Everyone hears it at once, wherever they are |
| 16 | 0:42 | "10:00 PM". Vinay's phone, in hand: "Soak 250 g rajma now, by 10:30" with "Soaked ✓". Vinay: "Main?" A tap on "Soaked ✓". The app's task card turns haldi | Text set in real footage, then the app | L13, L14 | CT28, CA32 (B, see section 13) | Running gag, part two. And nobody forgets the rajma |

### Act 5, the money (0:45 to 0:55)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 17 | 0:45 | The island: "Pine Labs block dekh rahi hoon…". A thumb taps the haldi button. Out fly the kirana bag ("Sharma Kirana · ₹40 · paid", with its demo block tag), the parcel ("Delhivery") and the khata. The kirana card reads "taiyaar" | The button as a portal | Pops, a soft till chime | CA51 (W since the deploy), CA49, CT16 | Small spends just happen, inside a limit someone set |
| 18 | 0:48 | Papa's phone beside the app: "Tomorrow's staples: ₹520. That's over the ₹300 you set." Buttons "Pay ₹520 · Pine Labs" and "No". Vinay, aside to camera: "Setup maine kiya. Bill Papa ko gaya." Papa taps Pay; Pine Labs' checkout opens | Phone and app side by side, the one decisive tap | L15 | CT15, CA35, CP04 (W); CP05 and CP06 wait on PL1 | Anything bigger comes back to the person who pays, as one tap |
| 19 | 0:52 | A Khata row opens: "₹40 · Sharma Kirana · Kyun: tamatar aur dhaniya, kal ke rajma ke liye · demo block" | A row expanding | L16 | CA43 (B: PL3) | Every rupee says what it was for |

### Act 6, the night shift (0:55 to 1:02)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | 0:55 | The island: "Parcel pe nazar…". The night-sky card fills the frame. The time tumbles from 10:45 PM to 6:40 AM. A small flicker as the rail points switch: "Late? Rider hop. No rider? Kirana." | Clock tumble | Crickets into birds, no voice | CA50, CP12, CP13 (W, Delhivery mock) | Plan B happens while the house sleeps |
| 21 | 0:59.5 | The parcel icon cuts to a real parcel on a real doormat at dawn | UI to life | Doorbell, soft | R4 | It actually arrives |

### Act 7, Sunita's morning (1:02 to 1:13)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 22 | 1:01.5 | "7:45 AM". Sunita's phone, hands only, a voice note arriving. Then full frame, giant: "दीदी, नमस्ते।" morphs on the beat through Marathi, Bangla, Tamil, Kannada and Telugu, each greeting in its own script and its own Gnani voice, and lands back on Hindi. The Hindi brief carries on as karaoke, each word lighting haldi as it's spoken | Cut through giant letters, script morph, karaoke | The app's own brief audio and word timings, `app/audio/brief-*.mp3` and `brief.json` | CA12, CA52, CT18 (W) | Her brief, in the language she understands best |
| 23 | 1:06.5 | Sunita replies by voice: "Chaar log. Pyaaz do hi hain." Gnani's transcript writes on, and the numbers lift out of the Devanagari as digits: चार becomes 4, दो becomes 2. A chip: "Counts confirmed ✓" | Words turning into numbers | L17, Sunita's real reply or the fallback voice | CT20, CP01 (W) | Baari hears what she means, in numbers |
| 24 | 1:10 | A hand lifts the packed bag at Sharma Kirana. The kirana card turns "READY · paid". "Sunita collects. She never pays." | Real footage, caption in scene | Till chime | R5, CA51 | Dignity for the cook, and no end-of-month cash maths |

### Act 8, the payoff (1:13 to 1:30)

| # | Time | Picture | Move | Sound and voice | Source | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 25 | 1:13 | The lock screen again, Vinay's phone, 8:05 AM: "Rajma is on the stove / You did nothing this morning. That was the plan." The phone sits on a bedside table; a hand pulls the blanket up | Bookend with shot 1 | L18 | The nudges sheet; R-shot of a bedside | The best thing an app can say to you |
| 26 | 1:16 | "1:00 PM". The thali that never moved becomes a real thali on the table; hands reach in. The receipt prints beside it | The last plate swap, UI to life | Printer chatter | R3, CA55 | It got eaten. Nobody ordered out |
| 27 | 1:19 | "Ravivaar · 7 PM". Mummy with chai, sitting, her phone face up: "And nobody asked 'aaj kya banega' even once." | Painted P2 or real R7 | L19, Mummy's only line | The nudges sheet, P2 or R7 | The emotional landing |
| 28 | 1:24 | The six object renders in a row; one highlights. Haldi floods the frame with grain, the ब embossed, "Baari". Three stamps reveal the partners: Gnani, Pine Labs, Delhivery. Then "Aaj ki baari?" types, a beat, "Aapki." A QR and `t.me/Baari_ken_bot` | Icon row, haldi flood, typed CTA | Three stamps. L20 | Logos in `app/img/brands`. CT23 for the QR's night | Running gag, part three, and a real invitation |

**Trim order if it runs long:** shot 19, then 10, then 24. Shot 16 drops out on its own if the night task hasn't run on a real night by the edit.

## 7. The script

Lines go to Gnani in Devanagari, because the Hindi voices read Devanagari more naturally than Roman Hinglish. English captions are what appears on screen. Telegram text on screen stays in English, as the product writes it since prompt v12. App text stays in the app's Hinglish.

| Id | Who | Text for TTS | Caption | Voice | Note |
| --- | --- | --- | --- | --- | --- |
| L01 | Baari | लौकी ने नोट कर लिया है। | Lauki has noticed. | Chitra | Deadpan, a little ominous |
| L02 | Vinay | राजमा। राजमा! हो गया। | Rajma. Rajma! Done. | Jalaj, or Vinay if recorded | Out of breath, like a narrow escape |
| L03 | Baari | घर रात को तय करता है। वरना... लौकी। | The house decides at night. Otherwise... lauki. | Chitra | A smile on "lauki" |
| L04 | Vinay | हमारे घर में रोज़ एक ही सवाल होता है... और एक ही इंसान उसका जवाब देती है। | Every day our house has one question, and one person who answers it. | Jalaj, or Vinay if recorded | Straight, not sad |
| L05 | Vinay | मैंने सोचा, अब ये किसी और की बारी हो। | I figured it was someone else's turn. | Jalaj, or Vinay if recorded | |
| L06 | Baari | मेरी। | Mine. | Chitra | One word, warm |
| L07 | Vinay | पापा की थाली में मीठा नहीं। मम्मी का मंगल का व्रत। और हफ़्ते में एक बार कुछ नया, प्लीज़। | No sweets on Papa's plate. Mummy fasts on Tuesdays. And something new once a week, please. | Jalaj, played into the app's mic by the capture (A01), or Vinay if recorded | Gnani STT really hears it in CA08 |
| L08 | Papa | मैं?! | Me?! | Hemraj | Genuinely betrayed |
| L09 | Baari, on the call | Rails' own call lines from the sim call transcript (A16) | What's run out, and the two dishes | Chitra | If the real call is recorded, use its audio instead |
| L10 | The family | Overlapping, improvised on the real call: Papa "राजमा!", Behen "रामेन!", Mummy "पिछले हफ़्ते भी राजमा था", Vinay "पास्ता बना लो ना..." cut off | Subtitled lightly, mostly left as noise | Hemraj, Yashvi, Ambuja and Jalaj, over the sim call. The real family if the call is recorded | The mess is the point |
| L11 | Baari, on the call | तो... राजमा फ़ाइनल? | So... rajma's final? | The call voice | Polite, after 47 seconds of silence |
| L12 | Baari | पक्का। | Locked. | Chitra | On the stamp |
| L13 | Baari | आज राजमा भिगोने की बारी... विनय की। | Tonight's rajma-soaking turn goes to... Vinay. | Chitra | Enjoying it |
| L14 | Vinay | मैं? | Me? | Jalaj, or Vinay if recorded | Running gag |
| L15 | Vinay | सेटअप मैंने किया। बिल पापा को गया। | I did the setup. The bill went to Papa. | Jalaj, or Vinay if recorded | Aside, deadpan, very pleased |
| L16 | Baari | हर रुपये का हिसाब, वजह के साथ। | Every rupee, with its reason. | Chitra | Optional. Cut if shot 19 goes |
| L17 | Sunita | चार लोग। प्याज़ दो ही हैं। | Four people. Only two onions left. | Bhavna, or the eval cast's reply audio. Her real reply if one is recorded and she agrees | |
| L18 | Baari | आपने सुबह कुछ नहीं किया। यही तो प्लान था। | You did nothing this morning. That was the plan. | Chitra | Reading her own notification |
| L19 | Mummy | अच्छा... तो अब मेरी बारी... आराम की। | Oh... so now it's my turn... to rest. | Ambuja | The only time we hear her. Warm, surprised |
| L20 | Baari | आज की बारी... आपकी। | Tonight's turn... is yours. | Chitra | Over the QR |

The brief in shot 22 isn't a new line. It's the app's own pre-rendered Gnani audio, with word timings already in `app/audio/brief.json`:
- Hindi: "दीदी, नमस्ते। कल दोपहर राजमा चावल बनाना है, चार लोगों के लिए।"
- The other five greetings: "दीदी, नमस्कार" (Marathi), "দিদি, নমস্কার" (Bangla), "அக்கா, வணக்கம்" (Tamil), "ಅಕ್ಕ, ನಮಸ್ಕಾರ" (Kannada), "అక్కా, నమస్కారం" (Telugu).

### The jokes, and where each comes from

| Joke | Where it comes from in the product | Lands with |
| --- | --- | --- |
| "Lauki has noticed" | The app's nudges sheet, plus the live rule that silence means dish one | Everyone who was ever a child |
| "Rajma any day" | An answer option in the island's question about repeats | Everyone |
| "Main?!", three times | Ghumao, the night task going to whoever's home, and the judge's own night from the QR | Everyone. It also explains "baari" without a word of explanation |
| "0:47 chup", then "Toh... rajma final?" | The phone call, where Baari stays quiet while the family talks | The Gnani jury: an agent that knows when not to speak |
| "Setup maine kiya. Bill Papa ko gaya." | The Pine Labs link going to the parent who pays, PRODUCT.md's referral moment | The Pine Labs jury, and every young adult in the room |
| "Sabziwale se mol-bhaav…" | The island's thinking verbs | Anyone who has used a coding agent with a whimsical spinner, and anyone who has haggled for dhaniya |
| "You did nothing this morning. That was the plan." | The nudges sheet | Everyone |
| "Ab meri baari... aaraam ki." | New, the only invented line, and it's Mummy's | Everyone's mother |

## 8. What we deliberately don't reuse from the old film

The Round 3 film (`film/scripts/lines.json`, `film/src/`) was good, and it's in the judges' memory, so repeating it would look like we stood still. None of these come back:
- "Kuch bhi" as a family chorus, and "is there a sabzi called kuch bhi"
- Papa's aloo puri voice note, and the plate line told only to him
- Vinay asking Baari to spend a thousand and forget the cap, and "nice try"
- "Everyone sleeps, Baari doesn't"
- The cook's "haan haan" being pushed for a count, as the joke. The trailer shows Gnani reading numbers instead
- The cooker whistle as the drop
- "Aaj kiski baari?" as the last line
- Sunita as narrator, and the paper toy theatre
- The Reserve Pay "four hundred a day" line

The product features under those jokes are still real, and the deck covers them: plate rules, the cap, the vague yes. The trailer just doesn't tell those jokes again.

## 9. Voice with Gnani

### Casting

The five voices the app already offers come first, so the trailer sounds like the product.

| Role | Voice | Why |
| --- | --- | --- |
| Baari | Chitra | The app's default "Aapse" voice, warm and dry. Try Jwala ("bright and lively") on L03 and L13 if the energy dips |
| Baari to Sunita | Urmila, through the app's own brief audio | It's what Sunita really hears |
| Five-language greetings | The app's own `brief-<lang>.mp3` | Already rendered by Gnani, with word timings |
| Mummy | Ambuja | "Calm and unhurried", for one warm line. Nalini as the alternate |
| Papa | Hemraj | Older male, good at outrage |
| Behen, on the call | Yashvi | |
| Vinay | Jalaj by default | A young male voice, so the trailer works with no recording. If Vinay records the lines to the Jalaj takes' timing, the gags land harder with the real person on stage |
| Sunita | Bhavna by default | Her real reply only if one is recorded and the person playing her agrees |

### Getting expression out of a voice with no emotion tags

Timbre v2.5 has no `[laughs]` or `[sighs]`, so the expression comes from the writing and the edit:
1. **Write for the mouth.** Short clauses, punctuation as direction. An ellipsis is a pause, a full stop is a beat, a question mark lifts.
2. **Try SSML.** Gnani's docs list it as supported; we haven't tested it. Try `<break time="400ms"/>` before "लौकी" in L03 and before "विनय की" in L13. If a tag is ignored or read aloud, use punctuation instead.
3. **Takes.** Render every line at speeds 0.92, 1.0 and 1.08, with two punctuation variants each. Six takes a line. Pick by ear.
4. **Edit like music.** Land the last word of each line on a beat. Overlap the family on the call by a few frames, the way families talk.
5. **Treat by context.** Voice notes get a phone band (300 Hz to 3.4 kHz) and a little room. The call gets telephone EQ. Baari's narration stays clean and close, as if from the island.
6. **Pronunciations.** Before the full render, test "Pine Labs", "Delhivery", "Telegram", "Ghumao", "rajma" and "Sunita ji".

### Pipeline

- Copy `film/scripts/vo.mjs` (it caches one call per line by hash and writes a manifest) to `film/scripts/gnani.mjs` and change only the call.
- **Direct.** `POST https://api.vachana.ai/api/v1/tts/inference` with `text`, `voice`, `model: "timbre-v2.5"`, `language: "hi-IN"`, `speed`, and `audio_config` for 44.1 kHz WAV. The header is `X-API-Key-ID` with `GNANI_API_KEY` from `.env.shared`.
- **Through our rails.** Rails' Gnani adapter answers ElevenLabs' shape at `/v1/text-to-speech/<Voice>`, so the old script works with a new base URL and Gnani voice names. That's the same path the agent uses.
- Takes go to `film/public/vo/g/<id>-<take>.wav`. A new `film/scripts/trailer-lines.json` holds the L lines. Leave `lines.json` alone; it belongs to the old film.

## 10. Sound

| Layer | What | Where |
| --- | --- | --- |
| Bed | A royalty-free electronic track at 124 to 128 BPM, light, plucky, no vocals, with a clear drop near bar 20 | From 0:05 |
| Kitchen kit | Katori tinks as hats, belan on chakla as snare, tadka sizzle as riser, a spoon on a thali for fills | Recorded on a phone in a real kitchen, ten minutes, layered over the bed |
| Horror sting | A low boom, and a steel spoon dragged slowly across a thali | Shot 2 only |
| The drop | TV mode's drumroll into the "Pakka" stamp | Shot 15 |
| UI | Soft pops of our own (`film/public/sfx/pop.mp3`, `msg.mp3`), the stamp, a till chime, the receipt printer. Not Telegram's notification sounds | Every UI event, never louder than the voice |
| Night | Crickets into birds (`crickets.mp3`, `birds.mp3`) | Act 6 |
| Sonic logo | Three stamps, one per partner | Shot 28 |

**Mix.** Duck the bed 8 dB under every line. Final loudness -14 LUFS integrated, -1 dBTP. HyperFrames' audio skill can carve the bed only in the voice's band, which keeps the energy up under dialogue.

## 11. Transitions we use

Each has a name so the edit can talk about them:

| Name | What it is | Shots |
| --- | --- | --- |
| Notification zoom | Push into a word of a notification until the thing it names fills the frame | 2 |
| Genre flip | A one-second switch into another film's language: horror, here | 2 |
| Word window | A glass card opens between two words of a sentence | 5 |
| Orbit | Glass chips circle a subject, then leave together | 6, 7 |
| Brush to glass | A p5.brush wipe that resolves into a frosted glass edge | 7 |
| Giant say | Spoken words appear huge as they're said, then shrink into chips | 8 |
| Verb flash | The island's verb changes on the beat while its object flashes big behind it | 13, 17, 20 |
| Assemble | Small objects fly together into a finished thing | 13 |
| Hold the card | The picture stays on one quiet UI card while the sound tells the story | 14 |
| Plate lock | The thali stays still while the surface around it swaps on the beat | 15, 26 |
| Portal | A tapped button throws out the next scene's objects | 17 |
| Clock tumble | Mono digits roll through hours | 20 |
| Script morph | One greeting, letter shapes morphing through six Indian scripts on six beats | 22 |
| Words to numbers | Digits lift out of spoken words | 23 |
| UI to life | A UI object hard cuts to the same thing in real footage, same position and scale | 21, 26 |
| Bookend | The lock screen from shot 1 returns with the opposite news | 25 |
| Haldi flood | The brand colour fills the frame from the highlighted object | 28 |

One shader transition at most, from the HyperFrames registry, and only at the drop. Everything else is a cut on the beat or an object travelling.

## 12. Human footage, if it comes

None of this is promised, and the trailer doesn't wait for it. Each row's default ships; the real shot replaces it only if it arrives and passes the truth pass. If someone does shoot: a phone at 4K 30 fps, daylight or warm practical light, locked off where possible. No faces of anyone who hasn't agreed to be in it; hands are enough. No real phone numbers, chat ids or names other than the Sharma cast on any screen.

| Id | Shot | Default, which ships without it |
| --- | --- | --- |
| R1 | A ladle stirring a pot, close | Pressure cooker render |
| R2 | Vinay on a sofa, phone in hand, from the side | Hands only |
| R3 | A real steel thali of rajma chawal, top-down, framed exactly like the app render | Stay on the render |
| R4 | A parcel on a doormat at dawn | The night-sky card's parcel icon |
| R5 | A hand lifting a packed bag at a kirana counter | Kirana bag render |
| R6 | A phone ringing on a dining table, the family leaning in on speaker | The call card alone, which is what shot 14 mostly shows anyway |
| R7 | Mummy sitting with chai, face optional | Painted P2 |
| R8 | A TV in a living room showing `/tv` with the reveal, family silhouettes | The `/tv` screen recording |
| R9 | A fridge door opening, from inside | Skip |
| R10 | A bedside table with a phone, morning light, a hand pulling a blanket | The lock screen alone |

**Phone screen recordings** follow the finale handoff: no cursor or touch dot, light theme, notifications off except the ones we're filming, the same wallpaper on every phone, and a one-second shot of the `/live` clock at the start of each take so the edit can sync them. Each clip comes with its tap log, so fingers can be drawn in afterwards in one consistent style.

**The lock-screen notifications** (shots 1 and 25) are Made by default: an iOS lock screen built in HyperFrames with the app's real nudge copy. If someone has an iPhone with Baari installed, the nudges sheet's "Send me one now" puts the real notification on the lock screen, and a screen recording of that is the upgrade.

**Telegram shots** (3, 15, 16, 18) are Made by default: Telegram-style cards rebuilt in HyperFrames from the exact message text in a passing night's `/admin/sim-outbox`. Bubble shapes and greyscale, never Telegram's own branding, the same rule `/live` follows.

## 13. Tools

### HyperFrames, for the whole edit

It's HTML, CSS and GSAP, rendered frame by frame in headless Chrome. That suits us for three reasons:
1. The app is HTML and CSS. The trailer imports `app/app.css` tokens and rebuilds any app element pixel-true, at any size, including the island and its verbs, without screen-recording it.
2. One set of components builds both the trailer and the deck (see `film/DECK_PLAN.md`).
3. It's deterministic, so fixing shot 12 doesn't change shot 11.

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
- **`moves.js`.** One GSAP helper per transition in section 11.
- **`island.js`.** The island as a component, fed `verbs.js` from the app, so the verbs are the real ones.
- **Timelines.** Each is paused and registered on `window.__timelines` under its composition id, as HyperFrames expects.
- **`assets/`.** Clips from `film/clips/`, renders from `app/img/`, the app's audio from `app/audio/`, painted shots, logos.

### ClaudeAnimationBase, for the painted moments

p5.js and p5.brush, made for hand-painted cartoon animation. Its own rules say no text in the painting and always use transitions, which fits: HyperFrames lays the chips and type over its output.

- Clone it into `film/painted/` (MIT licence). Read its `ANIMATION_GUIDE.md` first.
- Replace its character, Clawd, with Mummy: hair in a bun, reading glasses on a chain, a cotton saree with the pallu tucked in. Keep her back to camera in P1 so her face is never the problem.
- **P1, 4 seconds.** Mummy at an open fridge, the light from inside on her, the camera drifting in.
- **P2, 3 seconds, optional.** Mummy sitting with chai on a Sunday evening, the same brushwork in calmer colours.
- Render with `node render.mjs --clip --out=out/p1.mp4` (add `--soft-gl` on a machine without a GPU), and bring it into HyperFrames as a video clip.
- Use its brush wipe once, for shot 7.

If the painted Mummy isn't convincing within an hour, paint objects only (the fridge, a pot, the sticky note) and use R7 for the end.

## 14. The truth pass

Every product moment in the trailer has to match a row that passed in `docs/DEMO_TESTS.md`, and anything on a mock or a sandbox says so on screen.

| Shot | Depends on | State on 8 October, 22:15 | If it isn't ready |
| --- | --- | --- | --- |
| 1, 25, 27 | Nudge notifications | The app sends each one as a real notification from the nudges sheet. Rails doesn't fire them on its own yet | Either wire the quiet-voter and morning nudges to rails events before the edit (a Telegram line is the small version), or keep the shots and add a tiny "Baari nudges" chip so they read as the feature, not as a logged night |
| 3 | The pick card and a fold | Works | |
| 8 | CA08, Gnani STT in onboarding | Works | |
| 13 | The island's live steps | Deployed 8 Oct 21:52 (D2) | Verbs alone, which are always live |
| 14 | The phone call | The real call rings one verified phone on the Twilio trial, and T24 found the balance at -1.15 USD, which may stop it. The default is the sim call (A16), and its test (T8) hasn't run yet | If the sim call fails, voice rails' call lines straight from `baari-mock/lib/call.js` |
| 15 | A clean lock on camera | T3 passed on the eval cast; T1 partial | `?fixture=lock` for the app, real phones for Telegram |
| 16 | G9 night task | Rails and the app deployed 8 Oct 21:50. The agent asks for the task only from prompt v13, which is on no agent yet | Cut the shot, or stage it on Baari-eval once v13 passes there |
| 17 | The kirana card and block debits | Kirana card live since D2; debits on the demo block | Tag "demo block" |
| 18 | PL1, the paid sandbox link | Blocked: our merchant has no test acquirer (T23c) | End on the open checkout, tagged "Pine Labs sandbox". Never show "paid" until PL1 passes |
| 19 | PL3, "Kyun?" on a payment | Not built | Cut the shot |
| 20 | Rider hop and kirana pickup | Works on the Delhivery mock | Small "Delhivery mock" tag |
| 23 | Counts read from her reply | T4 partial: the counts reply was labelled vague_yes while the agent treated it as confirmed | Show the agent's confirmation, not the label, until the fix lands |
| 3, 15, 16, 18 | Made Telegram cards | Their text must be copied from a passing night's outbox, word for word | Use the outbox of the driven night in `film/CLIP_SLOTS.md` |
| 28 | The QR's night | The guest night works today (CT23). The judge's own household (`?new`) isn't built | Point the QR at the bot's guest night |

Small corner tags, Inter 500 at 18 px on a glass chip, are enough: "Pine Labs sandbox", "Delhivery mock", "demo block". The judges will respect the honesty more than a clean lie.

## 15. Where to be creative, and what's fixed

**Fixed:**
- the first week as the spine
- the island as the narrator
- the "Main?!" gag landing on the viewer at the end
- the plate that doesn't move
- Gnani for every generated voice
- nothing from section 8
- the truth pass
- under 90 seconds

**Open, and please play:**
- the hook itself, if H2 or H3 tests better
- type sizes and how far each zoom goes
- which verbs flash on which beats
- what flies out of the portal
- the painted Mummy's look
- which kitchen sound sits on which beat
- the order of surfaces at the lock
- any shot the real footage makes better than the plan

If a shot looks better than its row here, keep the shot and change the plan.

## 16. Order of work

1. **Lock the script.** Read it aloud against a 128 BPM click and trim to 86 seconds.
2. **Voices.** Generate the L lines in Gnani with six takes each, pick, and lay them with the app's brief audio and the sim call's lines into a voice-only animatic: title cards on the beats. This settles timing before any picture.
3. **Clips.** Run the Auto captures in `film/CLIP_SLOTS.md` section 2, the driven night first. Anything not captured yet stays a placeholder at its exact size, so the animatic is reviewable today. Human recordings slot in later if they come.
4. **Painted P1** in ClaudeAnimationBase, with the one-hour fallback rule.
5. **Picture.** The HyperFrames composition, act by act. Contact-sheet every act at 2 fps, the way the reference was studied, and check every cut against the beat.
6. **Sound.** The kitchen kit, the mix, loudness.
7. **The truth pass** (section 14), then captions and the `.srt`.
8. **The H1 test.** Three seconds, muted, on someone new. Then the full film on someone new, watching their face, not the screen.

## 17. Done when

- It runs under 90 seconds, and the first word is spoken inside one second.
- No placeholder is left, and the render script's placeholder check passes.
- A person who has never heard of Baari can say, after one watch, what it does and why their mother would like it.
- No line or gag from section 8 is in it.
- Every product moment matches a passing test row, and every mock or sandbox moment is tagged.
- Every generated voice is Gnani.
- It plays clean at -14 LUFS with English captions.
- The rendered file and the `.srt` are on the shared Drive, and the HyperFrames project is committed without fonts or secrets.
