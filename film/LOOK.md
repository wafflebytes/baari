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

Measured frame by frame at 24 fps around seven transitions (0.0, 3.2, 5.3, 11.9, 32.4, 44.9 and 47.5 s).

| What the reference does | Measured | Our rule |
| --- | --- | --- |
| Words of a line arrive one after another | One word every 4 frames (167 ms), each word cuts in at full size | Text reveals by line. Where giant type puts one word on a line, that is one word per line. Each line enters with the theme curve in 200 to 300 ms, staggered 3 frames |
| The card inside the sentence opens | Words push apart in 2 frames, the card fills over 6 | Hero move: 470 ms (one beat) with `cubic-bezier(0.22, 1, 0.36, 1)` |
| Portraits collapse into a row | 6 frames (250 ms), hard ease-out, no overshoot | Entrances and gathers: 250 to 470 ms, theme ease-out; exits 200 to 300 ms, ease-in `cubic-bezier(0.64, 0, 0.78, 0)` |
| The logo glyph morphs | A new shape every 4 frames, hard cuts | Machine steps (the clock tumble, the shimmer) may step or run linear; nothing else does |
| The send button turns orange | 4 frames (167 ms) | Colour changes on the decisive button: 200 ms |
| Push into UI copy | One slow move over 2 to 3 s | Camera drifts: the whole shot, `sine.inOut`, never more than 8% scale |
| Holds | Each idea holds still about a beat before the next cut | Each key idea sits still for at least one beat (469 ms) |

Rules:
- Ease out on entrances, ease in on exits. Springs (`cubic-bezier(0.34, 1.36, 0.64, 1)`) only for the ब pill, the island and faces. No bounce on money or numbers.
- One hero move per shot. Everything else enters 16 to 24 px.
- Related elements stagger by 2 to 4 frames; a layout never moves as one block. The next element starts before the last one settles.
- Text never moves while it has to be read, and stays on screen words / 3 + 1 seconds after it lands.
- Every cut has a carrier: the ink pill (the island), a plate (a thali or a card that holds its place), or the haldi accent. Crossfade only when nothing better connects. No dips to a flat colour, no white flashes, never a blank frame. Every cut is listed in `film/TRANSITIONS.md`.
- The trailer cuts on the 128 BPM grid (the reference runs at about 136). Where a line is voiced, the voice sets the clock.

## Base44's moves, shot by shot

The motion above is not a style for the eight style frames; every shot of all three videos uses one of the reference's moves, and the shots built before this file are reworked to match (entrances cut from 470 ms to 300 ms, holds of a beat, a carrier on every cut). `film/TRANSITIONS.md` names the carrier for each cut.

| Base44 move, at its time in the reference | Where it lands in the trailer |
| --- | --- |
| Push into a line of UI copy (40 to 43 s) | Shot 1 drifts into the notification; shot 2 pushes into "Lauki" until the thali fills the frame; shot 18 pushes into the ₹520 card; shot 20 drifts into the night card |
| A card opens inside a sentence, then the card zooms up to become the next shot (0 to 1.5 s) | Shot 5, twice; its second window grows into shot 6 |
| Product on the beat, one screen a beat (1.5 to 3 s) | Shot 3's pick card, shot 11's voice studio (one voice a beat), shot 26's receipt |
| Cards orbit the type, then collapse into a row (3 to 5.5 s) | Shot 6's four thoughts orbit Mummy and shot 7 collapses them into the island; shot 12's faces collapse into a row after Ghumao |
| An early, quiet logo (6 to 7.5 s) | Shot 4, the ब drops and "Baari" lands small |
| Flash montage, three frames an object (7.6 to 8.5 s) | Shot 13, one island verb and its object a beat; shot 6's two four-frame inserts |
| Giant type with the camera on the cursor, then a scale cut to small UI (8.5 to 12.3 s) | Shot 8, each rule said in giant type shrinks into its chip in the app |
| A glyph that morphs as the thinking beat (12.3 to 13 s) | Shot 7's shimmer, shot 13's verbs, shot 22's greeting changing script on every beat |
| UI building itself (13 to 15.5 s) | Shot 13's pantry assembling into the two thalis |
| The outfit holds while the world swaps around it (15.5 to 17.4 s) | Shot 15's plate lock: the katori holds still from the TV to the app |
| Dark mode for one passage (22.8 to 25 s) | Shot 14, the call |
| Text set into real footage (26.5 to 32.5 s) | Shot 16's soak card over the app take |
| The button as a portal (32.6 to 35 s) | Shot 17, the haldi button throws out the kirana bag, the parcel and the khata |
| The one decisive click (43.5 to 44.6 s) | Shot 18's ring on "₹520 pay karo"; shot 3's tap on Rajma chawal |
| Tagline over life (45 to 48 s) | Shot 25's bookend nudge, shot 27's "And nobody asked 'aaj kya banega' even once" |
| Icon row, one highlighted, then the brand flood (48 to 50 s) | Shot 28: six renders, the ring, the haldi flood, the ask, the answer |

The deck videos, played inside slides with a person talking over them, use the reference's two quietest moves:
- **Slide 8 tour: product on the beat.** The bare app, hard cuts on the chapter times, real speed, idle frames cut, nothing added. The slide's name reel is the type.
- **Slide 9 night: the prompt box beside the product.** The panel is the night's prompt box: its heading, clock and calls enter at the reference's speed (300 ms, one line at a time) while the phone on the right cuts on the beats. The phone holds its place across cuts, so the plate carries them; the clock steps like the reference's glyph morph.

## The island

The narrator. An ink pill at top centre, 1.5 px haldi ring, the jelly ब at its left, Inter 600 white at 30 px. While Baari works it shimmers through the app's own verbs (`app/verbs.js`). It is one layer over the whole trailer (`compositions/island.html`), so it stays put across cuts and carries them, the way the reference's prompt card does.

## Captions and tags

- Trailer captions: English, one centred line, Inter 500 35 px, white on an ink plate at 88%, 64 px above the bottom edge. Where the line is on screen as giant type (shots 5 and 8), the giant type is the caption and its English sits under it in 35 px mute, no plate.
- Night video captions: one centred line, Inter 500 37 px or more, on the same ink plate.
- Truth tags: a glass chip, top right inside title-safe, Inter 500 22 px ("App reminder", "App, real speed", "Pine Labs sandbox", "Delhivery mock", "demo block", "demo data"). In the night video tags are 37 px.

## What changed from the previous LOOK.md

The previous file took the look from the Baari landing page and borrowed one lesson from Base44. This one takes the look from Base44 and keeps the landing's brand values where the frozen theme fixes them. In practice:

- Palette, type families, grid, island and captions: unchanged. They already matched Base44's roles, so the theme stays as it is.
- Motion: entrances for small UI drop from a flat 470 ms to 200 to 300 ms, as the reference moves; the hero move keeps a full beat.
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
