# Look

How the trailer and the deck look. Taken from the landing page in `app/landing/` (screenshots in `film/look/landing-1440.png` and `landing-390.png`, 9 October). Where this file and `film/DECK_PLAN.md` section 5 disagree, this file wins. The plans still decide what is shown; this decides how.

The landing page is the app's material laid out like a quiet product page: a cream ground, Family headlines with tight tracking, white cards with a pastel top, a black pill with a haldi ring, and a small cast of flat characters (a haldi blob holding a karchi, a samosa, a tomato, a chilli) floating on white discs. The film keeps all of that and adds the Base44 reference's one big lesson: nearly empty frames, small type, one object, and scale as the drama.

## Palette

| Role | Hex | Use |
| --- | --- | --- |
| Ground | `#F6F4EF` | Every frame's background. Cream, never white |
| Ink | `#15130F` | Headlines, body, the island pill, phone bezels |
| Mute | `#6B675F` | Secondary text only: source tags, labels, times. 5.1:1 on the ground |
| Accent, haldi | `#F2B705` | The one thing to look at. As a fill, a ring, an underline or a highlight behind ink text. Never as text on cream (1.65:1) |

Supporting values, which are not new colours:
- **Card** `#FFFFFF`, with the landing's soft warm shadow.
- **Haldi jelly** `#FFE883 → #F9C523 → #F0A300`, only on the ब mark, coins and the decisive button, as the app draws them.
- **Haldi text** `#855C00`, only where a word itself has to be the accent (5.4:1 on the ground). Haldi tint `#FDF2D3` sits behind karaoke words and highlighted rows.

**Status colours stay inside small chips.** Green `#0B6E49` on `#E3F4EA` (Live, paid), red `#B4232A` on `#FFE6E4` (a break point, refused), night `#24206B → #5B3B9A` (Delhivery's overnight card). They mark a status at chip size and never become a slide's focal point. App clips and posters keep their own colours; we frame them, we don't recolour them.

**Dark frames.** Three moments go dark because their content is dark: the horror flip in trailer shot 2, the in-app call (CA64 is a dark take), and the night card. Dark ground is `#0F0E0C`, ink becomes `#F3F0E9`. Nothing else is dark.

## Type

| Role | Face | Weight | Tracking |
| --- | --- | --- | --- |
| Headline | Family (licensed, `app/fonts`) | 500. 600 only for the wordmark | -0.04em at 85 px and up, -0.031em from 55 to 68 px |
| Body | Inter | 400 for running text, 500 for labels, 600 for names inside cards | -0.011em |

Two utility faces, both narrow in use:
- **JetBrains Mono 500**: clock times, rupee amounts in the khata, tool-call names, the slide 16 spec card. Nothing else.
- **Noto Sans Devanagari, Bengali, Tamil, Kannada, Telugu**: the glyphs Family and Inter don't have. They take the size and weight of the role they stand in for.

### Scale

A 1.25 scale from 28 px body, at 1080p:

| Step | px | Use |
| --- | --- | --- |
| -1 | 22 | Floor. Source tags, truth chips, insight ids. Nothing smaller anywhere |
| 0 | 28 | Body, quote text, captions on slides |
| 1 | 35 | Trailer captions, card titles, lead lines |
| 2 | 44 | Sub-headlines |
| 3 | 55 | Smallest headline (5% of frame height) |
| 4 | 68 | Slide headline |
| 5 | 85 | Big slide headline |
| 6 | 107 | Hero numbers |
| 7 | 133 | Trailer title cards |
| 8 to 12 | 167, 208, 260, 326, 407 | Trailer giant type |
| 13 | 509 and up | Giant say: a word fills the frame |

Line height 1.02 for display at 85 px and up, 1.09 below, 1.5 for body.

## Grid

1920 × 1080.
- **Title-safe** at 5%: 96 px left and right, 54 px top and bottom. All text sits inside it.
- **Action-safe** at 3.5%: 67 px and 38 px. All objects sit inside it, except full-bleed shapes.
- **Columns**: 12 across the 1728 px between the title-safe edges, 24 px gutters, so a column is 122 px.
- **Rows**: a 4 px baseline. Vertical gaps step 8, 16, 24, 32, 48, 64, 96.

Text is left-aligned on a column edge. One centred line is allowed (a title card, a caption, the trailer's giant words).

## Shape language

- **Rounded.** Cards 28 px radius, bento tiles 16 px, pills fully round. No sharp corners anywhere except the frame itself and the khata ledger's spine.
- **Flat, lifted by shadow.** White cards on cream carry the landing's warm shadow (`0 1px 2px rgba(60,40,0,.04), 0 18px 40px -26px rgba(90,55,0,.28)`). Glass pills carry the inner highlight. No gradients on cards except the landing's pastel tinted top (peach `#FBE6DA`, haldi `#FDF0CC`, green `#DFF3E7`, lilac `#EAE6FB`, sky `#E1ECFA`, rose `#FCE3EA`) fading to white by mid-card.
- **Line weight.** Hairlines are 1 px at 8% ink. Rings are 2 to 3 px haldi. The ink pill has a 1.5 px haldi ring, like the landing's black button.
- **Characters.** The landing's cast, exported unchanged to `film/shared/cast/`: flat fills, ink limbs 8 px wide with round caps, oval eyes with a white glint, coral cheeks. Family members are the app's Personas faces. Any new drawing (Mummy at the fridge, a fridge, a doormat) is drawn in this same language: flat shapes, no outlines on bodies, ink only for limbs and small details.
- **Objects.** The app's 3D renders (thalis, khata, cooker, kirana bag, parcel, mic, ballot) carry a soft drop shadow, `drop-shadow(0 20px 24px rgba(60,40,0,.18))`. They are the only dimensional things in a frame.
- **Texture.** None. The landing is flat, so the Base44 grain on the end card is dropped.

### Frames for footage

- **Phone.** A plain ink bezel, 14 px at a 1000 px tall phone, outer radius 64 px, screen radius 26 px, no notch, no dynamic island, the landing's phone shadow. The takes have no safe-area insets, so a cutout would hide the app's own island pill. A playing phone is at most 1100 px tall; anything bigger uses the 1179 × 2556 stills.
- **TV.** The `/tv` takes in a thin ink bezel, 12 px, radius 20 px, on the ground. No stand.
- **Telegram cards.** Rebuilt from trace text, in the landing's Telegram language: green-grey chat ground, white bubbles, translucent green buttons. Greyscale where Telegram's own branding would show. Never Telegram's logo inside a card.

## The island

The narrator in both pieces, and the deck's section pill. An ink pill with a 1.5 px haldi ring and the jelly ब at its left, Inter 600 white text at 28 px (35 px in the trailer). While Baari works it shimmers through the app's own verbs (`app/verbs.js`): mute `#9A948A` text with a light band crossing it, the app's shimmer. When Baari speaks, a five-bar waveform replaces the ब. In the trailer the island is one layer over every shot (`trailer/compositions/island.html`, cues in `timing.json`), so it stays put across cuts and carries them; its width springs between numbers measured in the real fonts (`scripts/measure.mjs`).

## Captions and tags

- **Trailer captions.** English, one centred line, Inter 500 35 px, white on an ink plate at 88% with a 999 px radius, 64 px above the bottom edge. Every spoken line gets one. Where the line is already on screen as giant type (shot 8), the giant type is the caption: its English sits under it in Inter 500 35 px mute, 40 px below the last line, with no plate.
- **Truth tags.** A glass chip in the top right corner inside title-safe, Inter 500 22 px, ink text, a small mute dot: "Pine Labs sandbox", "Delhivery mock", "demo block", "demo data". Present for as long as the thing it describes is on screen.
- **Source tags on quotes.** Inter 500 22 px, mute, under the quote: "working mother, Pune · first-hand".

## Motion

The landing's motion, translated to frames at 30 fps.

| Move | Curve | Duration | From the landing |
| --- | --- | --- | --- |
| Entrance | `cubic-bezier(0.22, 1, 0.36, 1)` | 470 ms in the trailer (one beat), 520 ms in the deck | Its reveal: fade up 18 px, blur 5 px to 0 |
| Exit | `cubic-bezier(0.64, 0, 0.78, 0)` | 200 to 300 ms | Its reel's outgoing word: up and blurred |
| Stagger | | 90 ms, about 3 frames | Its reveal's `--d * 90ms` |
| Spring | `cubic-bezier(0.34, 1.36, 0.64, 1)` | 450 to 650 ms | Pill names, faces, the turn ring. Only on the ब pill and faces |
| Name reel | ease in, spring out | 500 ms out, 700 ms in | A word slides up out of a window, blurred 8 px, the next slides up in |
| Plate swap | spring | 700 ms | Scale 0.4 and -40° to rest. Plates only |
| Card swap | ease | 500 ms | From 20% opacity, 8 px down, blur 3 px |
| Coin flip | ease | 600 ms | rotateY through 90° |

Rules:
- Nothing moves linearly except machines: the clock tumble, a progress bar, the shimmer band.
- One hero move per shot or slide. Everything else enters 16 to 24 px with the entrance curve.
- Related things stagger by 2 to 4 frames. A layout never moves as one block.
- The next element starts before the last one settles.
- Text never moves while it has to be read. Text reveals by line, never by letter, except the deck's slide 1 typing, which is the question itself being asked.
- No bounce on money or numbers. Digits roll with the entrance curve and a 2 px blur.
- No dissolves to a colour, no white flashes. Every cut has a carrier: the ink pill, the plate or the haldi accent (see `film/TRANSITIONS.md`).

## What the film adds to the landing

- **Scale.** The landing never goes above 88 px. The trailer does: giant words at 260 to 600 px, then back to 35 px UI, the Base44 move.
- **One object a frame.** The landing packs bento grids; the trailer shows one card, one phone or one plate at a time.
- **The haldi flood.** The only full-bleed accent, once, at the end of the trailer.

## Audit of work before this file

Built before the look was fixed, and what happens to each:

| Piece | Keep or redo | Why |
| --- | --- | --- |
| `film/trailer/scripts/trailer-lines.json`, `gnani.mjs`, `pick.mjs` and 26 picked Gnani takes | Keep | Voice is outside the look. Every take checked by Gnani STT against its script |
| L07 text | Changed before this file | Now says the three rules the CA76 onboarding take shows on screen ("Papa: aloo aur tel nahi", "Mummy: meetha kam", vrat days), so the giant words shrink into the chips that are really there |
| L15 text | Changed before this file | Rails sends the Pine Labs link to the approver, Vinay (`baari-mock/lib/ops.js` `approver()`), and the landing says "Vinay paid the link". "Bill Papa ko gaya" was untrue. Now: "Setup maine kiya. Aur bill... mujhe hi aaya." |
| `film/trailer/scripts/kit.py`, the kitchen kit synth | Keep, remix | The mix rule changes from 8 dB of ducking to music 18 dB under the voice |
| Fonts in `film/trailer/assets/fonts` | Move to `film/shared/fonts` | One theme for both pieces |
| The painted Mummy (ClaudeAnimationBase, p5.brush) from the trailer plan | Redo | The landing is flat vector. Mummy is drawn in the cast's language instead, from her Personas look (straight bun, pink kurta) |
| Grain on the end card | Dropped | The landing has no texture |
| Family 800 in the plans | Family 500 | The landing sets headlines at 500, and the licensed files stop at SemiBold |
| 18 px corner tags in the plans | 22 px | Projector floor |
| Shot 6 chip "Papa: meetha nahi" | "Papa: aloo nahi" | L07 now gives Papa no potato and oil and gives Mummy less sugar, which is what CA76 shows. The chip agrees with the voice and the app |
| Telegram card text in the trailer plan ("Locked: Rajma chawal. Next baari: Behen", "Soak 250 g rajma now") | Redo | No trace sent those lines. Cards now quote R1b E01 and R2 E01 word for word; the soak task is the app's own card |
