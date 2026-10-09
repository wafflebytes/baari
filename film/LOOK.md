# Look

How the trailer and the two deck videos look. Rewritten 9 October from the Base44 launch video ("Build an app with your name on it", 50 s, 1280 x 720, 24 fps), which the owner named as the look source for the video work. Where this file and `film/DECK_PLAN.md` section 5 disagree, this file wins. The plans still decide what is shown; this decides how.

Reference files, all in `film/trailer/look-ref/`:
- `base44-2fps.jpg`: the whole video at 2 fps, 100 frames.
- `base44-hero-1.0s.jpg`: the hero ("Build [sketch card] an app").
- `base44-type-10.6s.jpg`: a type section (the giant cursor type).
- `base44-card-11.4s.jpg` and `base44-cards-37.6s.jpg`: a section with one card, and the canvas of cards.

The video is 720p, so every size below was measured as a share of frame height and then converted to 1080p.

## What the reference does

Nearly empty frames. A pale ground, one dark sans, one hot accent. Small type, then letters taller than the frame, then small UI again: scale is the drama. The accent appears only on the thing you should look at (the send button, the cursor) until the last second, when it floods the frame. Every cut is carried by an object: the card inside a sentence zooms up to become the next shot, a ring of portraits collapses into a row and the row becomes the logo, a button turns orange and throws out the next scene.

Baari keeps all of that and swaps in its own brand values. The roles are Base44's; the hex values are Baari's, because the app clips can't be recoloured and the shared theme (`film/shared/theme.css`) is frozen.

## Palette

Sampled from the reference frames (median of a flat patch), then mapped to the Baari token that plays the same role.

| Role | Base44, sampled | Baari | Notes |
| --- | --- | --- | --- |
| Ground | `#FBFBFB` (hero), `#F2F2F2` (logo), `#E9E7E3` (prompt section) | `#F6F4EF` | Base44's own grounds run from cool white to warm grey. Baari's cream sits inside that range, on the warm side |
| Ink | `#1B1B1B` to `#222123` | `#15130F` | All type, the island pill, phone bezels |
| Neutral | `#BABABD` (card captions, canvas labels) | `#6B675F` | Base44's grey is 1.8:1 on its ground, which fails our 4.5:1 floor. Ours is 5.1:1 on cream |
| Accent | `#FC6826` (send button), `#FF6C01` (end flood) | Haldi `#F2B705` | The one thing to look at: the decisive button, a ring, an underline, the ब, the end flood. Never as text on cream (1.65:1); where a word must be the accent, it takes haldi text `#855C00` (5.4:1) |

Supporting values, not new colours: card white `#FFFFFF`; haldi tint `#FDF2D3` behind karaoke words; the jelly gradient on the ब mark only.

Status colours (green, red, night indigo) stay inside small chips and never become a frame's focal point. App clips and posters keep their own colours: we frame them on the ground, we don't recolour them.

Dark ground `#0F0E0C` with ink `#F3F0E9`, only where the content is dark: trailer shot 2 (the horror flip), shot 14 (CA64 is a dark take). Base44 goes dark once too, for its dark-mode prompt at 22.8 s.

## Type

The reference uses one grotesk at regular and medium weights for everything. Baari uses one headline family and one body family, on the 1.25 scale already in the theme.

| Role | Face | Weight |
| --- | --- | --- |
| Headline | Family (licensed, `app/fonts`) | 500. Tracking -0.04em at 85 px and up, -0.031em below |
| Body | Inter | 400 running text, 500 labels and captions, 600 names in cards |

Two utilities, each for one kind of text only: JetBrains Mono 500 for machine text (tool names in the night panel, clock times), and Noto Sans in each Indian script for glyphs Family and Inter don't have, at the size of the role they stand in for.

### Sizes, measured against the reference

| Reference element | Glyph height | Font size at 1080p | Baari step |
| --- | --- | --- | --- |
| Card label ("Build", "Base 1") | 1.8% of height | about 27 px | `.t0` 28 |
| Card body (the prompt text) | 2.5% | about 37 px | `.t1` 35 |
| Hero line ("Build an app") | 4.7% | about 70 px | `.t4` 68 |
| Big line ("With your name on it") | 8.8% | about 130 px | `.t7` 133 |
| Tagline over footage ("Build it today") | 10.4% | about 155 px | `.t8` 167 |
| Giant cursor type ("out", "piano") | 40 to 70% | 600 px and up | `.t13` 509 and up |

The full scale, at 1080p: 22, 28, 35, 44, 55, 68, 85, 107, 133, 167, 208, 260, 326, 407, 509. Headlines are 55 px or more (5% of frame height). Nothing on screen is under 22 px. In the night video, which plays at 0.596 scale inside its slide card, nothing we add is under 37 px.

## Grid

1920 x 1080.
- Title-safe at 5%: 96 px left and right, 54 px top and bottom. All text sits inside it.
- Action-safe at 3.5%: 67 px and 38 px. All objects sit inside it, except full-bleed shapes.
- 12 columns across the 1728 px between the title-safe edges, 24 px gutters, so a column is 122 px and column edges fall at x = 96 + 146n.
- A 4 px baseline; vertical gaps step 8, 16, 24, 32, 48, 64, 96.

Text is left-aligned on a column edge. One centred line is allowed, and the reference uses it constantly: its hero, its logo and its tagline are each one centred line in an empty frame.

For the slide 8 tour (786 x 1704, the bare app screen) there is no grid of ours: it is the app's own layout at 2x. For the night video the grid is the same as the trailer's.

## Shape language

- Rounded. The reference's prompt card has a radius of 2.2% of frame height (16 px at 720p); our cards are 28 px, bento tiles 16 px, pills fully round. No sharp corners except the frame.
- Flat. White cards on the pale ground with a barely visible shadow (the theme's `--shadow-card`). No outlines, no gradients on cards except the landing's pastel tinted top.
- Line weight. Hairlines 1 px at 8% ink. Rings 2 to 4 px haldi. The island pill has a 1.5 px haldi ring.
- Objects. The app's 3D renders (thalis, khata, cooker, kirana bag, parcel, ballot) carry a soft drop shadow and are the only dimensional things in a frame, the way the reference's product photos are.
- Characters. The landing's flat cast and the Personas faces, unchanged, in `film/shared/cast/`.
- Texture. The reference's ground is clean; its only grain is on the end flood. Ours is clean everywhere except the end flood, which gets a fine seeded grain (a static noise tile at 4% opacity, so every frame is still a pure function of time).

### Frames for footage

- Phone: a plain ink bezel, no notch, no home bar (`.phone` in the theme). A playing phone is at most 1100 px tall at 1080p; close-ups use the 1179 x 2556 stills.
- TV: a thin ink bezel, no stand (`.tv`).
- Telegram cards: rebuilt from trace text, word for word, in greyscale bubbles; never Telegram's logo inside a card.

## Motion

The motion comes from Base44 and nothing else (the owner, 9 October). Labelled frame strips of every move are in `film/trailer/look-ref/`, named by move (`01-words-card-burst.jpg` to `26-icon-row-then-flood.jpg`); open the one for your move before building it. It was measured on all 1,200 frames of the reference at 24 fps; frame numbers below are the reference's. Times carry over to our 30 fps by the clock, not by frame count: Base44's 4-frame tick is 0.167 s, which is 5 of our frames.

### What Base44 does

Five habits, most frequent first:

1. **It cuts.** Of about 45 scene changes in 50 seconds, all but four are hard cuts. The four: the card in the sentence bursts to fill the frame (frames 33 to 42), a phone shrinks into a portrait card (84 to 91), portraits fly into a row (129 to 138), and one 4-frame dissolve from the logo into footage (183 to 187). No wipes, no slides, no blur between shots, no dips to a colour.
2. **Type is typed.** Words cut in whole, at full size and full opacity, one every 3 or 4 frames ("Build", "an", "app" on frames 0, 4 and 7). Or letters arrive one at a time behind a cursor, 1 or 2 frames a letter with a longer gap at each space, like a person typing (frames 218 to 241). Type never fades, rises, blurs in, scales up or bounces. It leaves when the shot cuts, or once, word by word in reverse (121 to 131).
3. **Scale is the cut.** The same text at two sizes: small in its input box, then letters 400 to 600 px tall, cropped by the frame, with the camera on the cursor so earlier letters slide off the left edge (419 to 432). Then a hard cut back to the box, still typing (433). Nothing zooms between the two sizes.
4. **Things become the next thing.** The sketch card becomes the website, the phone becomes a portrait, the portraits become a row and the row becomes the wordmark, a glyph becomes a bag, the send button throws out a stack of products, loose cards snap into an app layout, the icon row becomes the wordmark on the orange. When something moves, it is on its way to being the next shot.
5. **Holds are dead still, or alive inside.** The logo (frames 146 to 182) and the end flood (1163 to 1199) don't move: the frame-to-frame difference is 0.0 to 0.6 out of 255. Product holds keep the frame still and let the product work (keys light up, a row climbs a leaderboard, a tooltip walks along the bars). A camera moves only while words are arriving and stops when they land (962 to 975).

### Measured

| Move | Reference frames | Measured | Ours at 30 fps |
| --- | --- | --- | --- |
| Word cut-in | 0, 4, 7 | A word every 3 to 4 frames, whole | A word every 5 frames (0.167 s), or on the voice where the line is spoken |
| Typing | 218 to 241, 1088 to 1109 | 1 to 2 frames a letter, 4 to 7 at a space, the cursor solid while typing | 2 frames a letter with a seeded jitter of one frame, 5 at a space |
| Cursor blink | 204 to 217 | 7 frames on, 5 off | 9 on, 6 off (0.3 s and 0.2 s) |
| Tick: glyph morph, flash montage | 294 to 310, 187 to 203 | A new shape or picture every 4 frames, hard cut | Every 5 frames (0.167 s), or one a beat where the grid or a voice wants it |
| Landing: the card burst, the phone into a card | 35 to 47 | 10 frames, fast then settling, no overshoot: 18, 32, 66, 76, 80, 83, 94, 100% | `M.LAND`: 0.4 s (12 frames), `power2.out` |
| Gather: portraits into a row | 129 to 133 | 4 frames, straight lines | `M.GATHER`: 0.2 s (6 frames), `power2.out` |
| The click | 786 to 798 | The cursor glides onto the button and stops; the button goes black to orange in 4 frames through a dark red; the next thing appears 2 frames later | `M.click`: cursor 8 frames `power2.out`, colour 5 frames (0.167 s, the reference's 4), next thing 2 frames after |
| Rise: the portal's stack | 799 to 831 | Starts slow, speeds up | `power2.in`, the only ease-in |
| A footage shot | 732 to 785 | 11 to 16 frames | 0.47 to 0.7 s: one beat to a beat and a half |
| A product hold | 48 to 62, 483 to 511 | 0.6 to 1.2 s | One to three beats |
| A brand hold | 146 to 182, 1163 to 1199 | 1.5 s, still | Three or four beats, still |
| Dissolve | 183 to 187 | 4 frames, once | 0.167 s, at most once in the trailer |

### Rules

- Cut on the beat. A shot change is a hard cut unless something on screen turns into the next shot; then it lands in about 10 of the reference's frames (0.4 s, 12 of ours) with `power2.out`, and the cut falls where it lands.
- Type cuts in: whole words on the tick or on the voice, or letters behind a cursor. Never a fade, rise, blur or scale on text. Old type leaves with its shot.
- Giant and small alternate by cutting. Giant type is 260 to 509 px, may crop off the frame's edges, and holds the cursor still while new letters push the line left.
- Everything that moves, moves to become something. No decorative drift, no parallax, no floating.
- Landings settle with `power2.out` and never overshoot. No springs anywhere: not the island, not the ब, not the faces.
- Brand frames hold still to the pixel. Product frames hold their framing and let the app move. A camera pushes only while words arrive, and stops when they land.
- The accent turns up on one thing at a time (a cursor, a button, a ring) until the flood, which arrives by hard cut.
- The trailer cuts on the 128 BPM grid (Base44 runs at about 136). Where a line is voiced, the voice sets the clock: spoken words cut in on their own timings.
- Every cut's carrier is written in `film/TRANSITIONS.md`.

The moves are code in `film/trailer/motion.js`, which every video composition uses. `film/shared/moves.js` (frozen) keeps the landing page's fades and springs for the slides; the videos don't call it.

## Base44's moves, shot by shot

Every shot of all three videos is built from these moves and no others. "Strip" names the file in `film/trailer/look-ref/`. "Out" is how the shot hands over; `film/TRANSITIONS.md` has the carrier and landing word for each cut.

| Shot | What it shows | Base44 move | Strip | Out |
| --- | --- | --- | --- | --- |
| 1 | Lock screen, "Lauki has noticed" | Cut in, still; then a push into the line of copy while L01 says it, stopping when it lands (ref 40 to 43 s) | 23 | The push lands on "Lauki"; cut |
| 2 | The lauki thali in the dark, "3 RAATEIN" | Dark passage (ref 19.75 s); the count steps 1, 2, 3 on the tick (glyph morph) | 17, 12 | Hard cut to bright |
| 3 | Pick card, the tap on Rajma chawal | Product on the beat; the click (cursor, the button's colour in 5 frames) | 02, 24 | The card's two dishes stay for shot 4 |
| 4 | The ब, "Baari" | The row becomes the wordmark: the dishes gather into a row, the ब cuts in at its head, "Baari" types; then the still logo for three beats, no drift | 05, 06, 07 | Hard cut |
| 5 | Word windows | Words cut in on the tick; a card cuts into the sentence; the second card lands to the full frame. The worked example: `compositions/s05.html` | 01 | The card is shot 6's first frame |
| 6 | Mummy at the fridge, four thoughts | Cards around the subject, cut in on the beat and held still; two flash inserts on the tick | 04, 08 | The chips stay put for shot 7 |
| 7 | The thoughts into the island | Gather: the chips fly in straight lines into the island in 0.2 s; the island's words type | 05 | The island carries the cut |
| 8 | Din 0, the rules | A cursor, then giant typed type on the voice with the camera on the cursor; scale cut to the rule in the app | 09, 10, 11 | Hard cut on the beat |
| 9 | The island's question, "Rajma any day" | Product on the beat; the click on "Rajma any day" | 02, 24 | Hard cut |
| 11 | Voice studio, five voices | Product alive, one voice a beat | 14 | Hard cut |
| 12 | Ghumao lands on Papa, "Main?!" | Product on the beat; the faces gather into a row | 02, 05 | The row carries into shot 13 |
| 13 | Raat 1, verbs, pantry into two thalis | Flash montage under the island's verbs, one a beat; assembly: objects cut in around the pick card, then the scaffold leaves | 08, 12, 13 | The two thalis hold |
| 14 | The call | Dark passage; product alive (the orb, the counter); nothing else moves while the voices play | 17, 14 | Hard cut on the stamp's beat |
| 15 | Pakka, the plate lock | Same framing, new state: the katori holds while the TV becomes the app | 18 | Hard cut |
| 16 | The soak turn, "Main?" | Text set into the picture over the task; the click on "Bhigo diya" | 20, 24 | Hard cut |
| 17 | The portal | The click on the haldi button, then the rise: kirana bag, parcel and khata climb out of it | 21 | The rise's last card is shot 18's |
| 18 | ₹520 to Vinay | Push into UI copy toward "₹520 pay karo", stopping when it lands; the click; no checkout page | 23, 24 | Hard cut |
| 20 | Raat bhar, the clock | Product alive; the island's clock steps on the beat (glyph morph) | 14, 12 | The parcel carries into shot 21 |
| 21 | The parcel at the door | A thing becomes the next thing: the card's parcel lands into the parcel render | 03 | Hard cut |
| 22 | Namaste in six scripts, then the brief | Giant letters with the camera on the cursor, one script a beat; the brief's words cut in on their own timings | 16, 12 | Hard cut |
| 23 | Sunita's reply, चार becomes 4 | Same framing, new state: the word cuts to the digit in place | 18 | Hard cut |
| 25 | Lock screen bookend | Cut in, still; the notification's line types as L18 says it | 02, 25 | Hard cut |
| 26 | The thali becomes the receipt | A thing becomes the next thing | 03 | Hard cut |
| 27 | Ravivaar, Mummy's line | Text set into the picture: her line types beside her | 20, 25 | Hard cut |
| 28 | The row, the flood, the ask | Icon row with the ring stepping on the tick; hard cut to the haldi flood with the mark, still; "Aaj ki baari?" and "Aapki." type with a haldi cursor | 26, 25 | End |
| Tour | Eight chapters of the bare app | Product on the beat: hard cuts on the chapter times, real speed, idle frames cut, nothing added | 02 | Hard cuts |
| Night | The night beside its tool calls | A prompt box filling line by line: the panel's calls type behind a cursor; the phone holds its place across beats; the clock steps on the tick | 11, 12, 18 | Hard cuts on the beats |

The deck videos play inside slides while a person talks, so they use the reference's two plainest moves:
- **Slide 8 tour: product on the beat.** The bare app, hard cuts on the chapter times, real speed, idle frames cut, nothing added.
- **Slide 9 night: a prompt box beside the product.** Each call types into the panel the way the reference types into its prompt box (letters behind a cursor, one line at a time). The phone on the right cuts on the beats and holds its place, so its frame carries every cut. The clock changes on the tick.

## The island

The narrator. An ink pill at top centre, 1.5 px haldi ring, the jelly ब at its left, Inter 600 white at 30 px. While Baari works it shimmers through the app's own verbs (`app/verbs.js`). It is one layer over the whole trailer (`compositions/island.html`), so it stays put across cuts and carries them, the way the reference's prompt box carries its typing from shot to shot.

It moves like the reference's prompt box. It appears and leaves by cutting. When its words change, the old words cut out, the pill's width lands in 0.2 s (`M.GATHER`) with `power2.out`, and the new words type on, 2 frames a letter. A run of verbs changes on the tick or the beat, like the reference's glyph morph. The shimmer sweep is the app's own animation, so it runs as the app runs it.

## Captions and tags

- Trailer captions: English, one centred line, Inter 500 35 px, white on an ink plate at 88%, 64 px above the bottom edge. Where the line is on screen as giant type (shots 5 and 8), the giant type is the caption and its English sits under it in 35 px mute, no plate.
- Night video captions: one centred line, Inter 500 37 px or more, on the same ink plate.
- Truth tags: a glass chip, top right inside title-safe, Inter 500 22 px ("App reminder", "App, real speed", "Pine Labs sandbox", "Delhivery mock", "demo block", "demo data"). In the night video tags are 37 px.
- Captions and tags cut in and out with the words and the shot. They never fade (Base44's type never does).

## What changed from the previous LOOK.md

The previous file took the look from the Baari landing page and borrowed one lesson from Base44. This one takes the look from Base44 and keeps the landing's brand values where the frozen theme fixes them. In practice:

- Palette, type families, grid, island and captions: unchanged. They already matched Base44's roles, so the theme stays as it is.
- Motion, at gate 2: re-derived from all 1,200 frames of the reference, on the owner's instruction that the motion comes from Base44 only. Text cuts in instead of fading and rising; landings use `power2.out` in 0.4 s; springs and decorative drifts are gone; the end flood is a hard cut, not a growing circle. The gate 1 version (fades in 200 to 300 ms, a one-beat hero move with the theme curve) is replaced.
- Texture: the end flood gets the reference's fine grain (the landing had none).
- Frames: fewer things per frame. The reference never shows more than one product object and one line of type at once; shots built before this file are checked against that in the audit below.

## Audit of the video work before this file

| Piece | Keep or redo | Why |
| --- | --- | --- |
| `timing.json`, `scripts/build.mjs`, the 128 BPM grid | Keep, extend | Placeholders keep the cut timed end to end. Per-shot cue times were hard-coded in the compositions; new shots read them from `timing.json` through the generated `timing.js`, and the four older shots move over with the animatic. Shots 22 and 28 grew by two beats each (six greetings plus the karaoke; the end card's ask and answer need their reading time), so the cut is 192 beats, 90.0 s; the animatic trims at least a beat |
| Voice lines, 27 picks, `gnani.mjs`, `pick.mjs` | Keep, except L17 | Each pick checked by Gnani STT against its script. L17 scored 0.737; re-pick it with fresh takes before the mix |
| Shot 1, lock screen | Keep | One centred lock screen, one card, the app's real nudge copy (`app/extras.js` "quiet"), tagged "App reminder" |
| Shot 6, Mummy at the fridge | Fixed | The four thought chips sat at x 132 and 236, off the column edges; they now sit on 96 and 242. All four carried a haldi dot, spending the accent four times; the dots are mute now and the accent stays on the island. Chip entrances cut from 470 to 300 ms |
| Shot 7, thoughts into the island | Fixed | The chips' last fade was linear (`ease: "none"`); it is the exit curve now, and the chips start from the shot 6 grid positions |
| Shot 8, Din 0 | Keep, faster | Giant type 133 px on the grid, its English under it, the phone 848 px tall, tagged "App, real speed". Phrase and phone entrances cut from 470 to 300 ms. The haldi rings were placed by eye; recheck at three stills once the clip cuts are final |
| Island layer | Finishing | Cues stopped after shot 8, so "Din 0 setup" sat on screen to the end. Cues or hides now exist for shots 9, 15, 18, 20, 22 and 28; the rest come with the animatic |
| Captions layer | Keep | Hold times already follow words / 3 + 1. The `.srt` is still to write |
| Style frames in `film/look/style-frames/` (trailer s01, s06, s08) | Superseded | Rendered before the look moved to Base44; the gate 1 set is in `film/trailer/style-frames/` and `film/deck/videos/style-frames/` |
| `film/public/sfx/*.mp3` | Use for the rhythm (owner's call, 9 Oct) | The kitchen kit won't be recorded. The beat is built from these UI sounds plus foley-like hits; their source isn't recorded in the repo, so each one used is logged in `film/trailer/SOURCES.md` as such |
| Sound rules | Changed by the owner, 9 Oct | Trailer: every L line in Gnani as cast in TRAILER_PLAN section 9; the bed ducks 8 dB under each line; -14 LUFS, -1 dBTP. Tour and night: no voice, no music, silent or low UI pops only |
| Plan's Family 800 and 18 px tags | Already replaced | Family 500 (the licensed files stop at SemiBold), tags 22 px |

### Gate 2: the motion audit against Base44 alone

Every composition built before gate 2 used `film/shared/moves.js`: text faded up 8 to 22 px through a blur, the island and faces sprang in, captions faded. None of that is in the reference. Each is redone with `film/trailer/motion.js`:

| Piece | What it did | What it does now |
| --- | --- | --- |
| Shot 1 | The card slid down with a blur; the camera drifted the whole shot | The lock screen and card cut in; the camera holds still, then pushes into "Lauki" while the voice says it (the reference's push into UI copy) |
| Shot 5 | Lines rose in; windows opened with the theme curve | Words cut in on the voice; each window cuts open between two words; the second window bursts to fill the frame in 0.4 s with `power2.out` |
| Shots 6 and 7 | Chips slid in with a blur; the camera drifted; the chips flew off with an ease-in and faded | Chips cut in on the beat and hold still; the four-frame inserts stay; the chips gather into the island in 0.2 s with `power2.out`; no drift |
| Shot 8 | Phrases rose in; they shrank into the app with an ease-in and a fade | Each rule types on in giant type behind a cursor, on the voice; then a hard cut to the phone, where the rule sits in the app (the reference's scale cut) |
| Shot 15 | The TV settled from 1.06 with a blur; the app settled 2% | The TV cuts in still; the stamp lands; the app cuts in on the katori, same framing |
| Shots 18 and 20 | Tags faded in; the camera drifted with `sine.inOut` | Tags cut in; the camera holds; the clock steps on the tick; the ring cuts on with the click |
| Shot 22 | Greetings faded through | Each greeting types on behind a cursor on its beat; the karaoke words cut in on the brief's own timings |
| Shot 28 | The flood grew from the ring as a circle | The ring steps along the row on the tick, then a hard cut to the flood with the mark where the row was; "Aaj ki baari?" and "Aapki." type on with a haldi cursor |
| Island | Sprang in; text faded and rose | Cuts in and out; width lands in 0.2 s; words type on |
| Captions | Faded in 8 px | Cut in and out |
