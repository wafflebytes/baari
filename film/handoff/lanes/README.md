# Video lanes: how to build your shots

Six sessions build the Baari finale videos in parallel. Five are lanes, A to E, each on its own branch, building trailer shots. The lead (lane F) does the slide 8 tour and the slide 9 night, merges every lane into `video-handoff`, and renders. Nobody can message anybody: git is the only channel. Read this file, then `film/LOOK.md` (the look and the motion), then `film/TRANSITIONS.md` (your cuts), then the strips in `film/trailer/look-ref/` for your moves.

Start only when `film/handoff/lanes/READY-gate2.md` exists on `video-handoff`.

## Lanes

| Lane | Branch | Shots | Rework (built before, old motion) | New |
| --- | --- | --- | --- | --- |
| A | `video-lane-a` | 1, 2, 3, 4, 6, 7 | s01, s06, s07 | s02, s03, s04 |
| B | `video-lane-b` | 8, 9, 11, 12, 13 | s08 | s09, s11, s12, s13 |
| C | `video-lane-c` | 14, 15, 16, 17, 18 | s15, s18 | s14, s16, s17 |
| D | `video-lane-d` | 20, 21, 22, 23, 25 | s20, s22 | s21, s23, s25 |
| E | `video-lane-e` | 26, 27, 28, and the temp mix | s28 | s26, s27, `scripts/mix.py` |
| F | the lead, on `video-handoff` | tour, night, s05, merging, renders | | |

Shot 5 (`compositions/s05.html`) is already reworked by the lead: it is the worked example. Copy its structure.

What each shot shows, its Base44 move and its strip are in `film/LOOK.md`, "Base44's moves, shot by shot". What it must contain, its voice line and its clips come from `film/TRAILER_PLAN.md` section 6 and `film/CLIPS.md` (CLIPS.md wins on clips; it lists the fallbacks for everything that was never recorded). The look and motion come from LOOK.md. Truth comes from TRAILER_PLAN section 14, `film/DECK_PLAN.md` section 9 and `prd/PRODUCT.md`.

## Set up

```bash
git fetch origin video-handoff && git checkout -b video-lane-<x> origin/video-handoff
cd film/trailer && npm ci
export HYPERFRAMES_NO_TELEMETRY=1
# a headless Chrome: npx hyperframes doctor, or in the standard cloud image:
export HYPERFRAMES_BROWSER_PATH=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
export PRODUCER_HEADLESS_SHELL_PATH=$HYPERFRAMES_BROWSER_PATH
export CHROME=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)
node scripts/build.mjs                    # writes index.html etc. (git-ignored)
```

Look at your shots:

```bash
node scripts/build.mjs --excerpt s14:s15     # excerpt.html: those shots, with the island and captions as they are there
npx hyperframes snapshot --no-end --at 37.6,38.4,45.5 .   # stills from index.html, at trailer seconds
npx hyperframes render -c excerpt.html -o renders/s14.mp4 -q draft
```

`renders/island.txt` (written by every build) says what the island shows when each shot starts. Shot start times are in `timing.js` after a build, or `beat x 0.46875`.

## What you edit, and nothing else

| You own | Notes |
| --- | --- |
| `film/trailer/compositions/<shot>.html` for your shots | One `<template>` per shot, `data-duration` equal to the shot's length. Register `window.__timelines["<shot>"]` |
| `film/trailer/cues/<shot>.json` for your shots | `cues`: every timing number your composition reads (seconds from the shot's start), read as `TIMING.cues.<shot>`. `island`: the island's lines in your shot. `captions`: extra caption lines (spoken lines get theirs from `timing.json` automatically) |
| `film/trailer/assets/<shot>/` | Anything new your shot needs: retimed clip cuts, made images. Each file under 20 MB |
| `film/handoff/lanes/<x>.md` | Your report to the lead (below) |
| Lane E only: `film/trailer/scripts/mix.py`, `film/trailer/assets/sfx/` | The temp mix |

Everything else belongs to someone else. If you need a change there, ask for it in your report and work around it meanwhile:
- `timing.json` (shot starts, lengths, voice placement), `scripts/build.mjs`, `motion.js`, `trailer.css`, `scripts/lint-motion.mjs`: the lead's. Ask for timing changes in beats ("s14: 17 to 18 beats, because L11b spills 0.17 s into s15").
- `film/shared/**`, `film/LOOK.md`, `film/TRANSITIONS.md`, `film/checks/**`, `film/trailer/assets/SOURCES.md`, the plans, `film/clips`, `film/mixes`, `app/**`: frozen or the lead's. Put sources rows and check results in your report; the lead copies them in.
- Another lane's shots and cue files.

## Never commit

- Any env value, key, token, password or real phone number. Nothing from an `.env`.
- Generated files: `index.html`, `timing.js`, `captions.json`, `compositions/captions.html`, `compositions/island.html`, `assets/island-widths.json`, `excerpt.html`. They're git-ignored; don't force them.
- `renders/`, `snapshots/`, `node_modules/`, `assets/mix.wav`.
- Any file over 20 MB, and any outside asset without a sources row in your report.

Stage files by name (`git add film/trailer/compositions/s14.html film/trailer/cues/s14.json ...`), never `git add -A`.

## The rules

**Motion: Base44 only.** Use `motion.js` (`const M = MOTION`) and nothing else. Its header lists every primitive, and each is commented with the Base44 frames it copies:
- `M.cut` and `M.swap`, hard cuts;
- `M.words`, whole words on the tick or the voice;
- `M.type`, letters behind a cursor;
- `M.land`, 0.4 s with `power2.out`;
- `M.collapse`, a gather;
- `M.push`, a camera only while words arrive;
- `M.rise`, the portal;
- `M.click`;
- `M.flash` and `M.morph`, on the tick;
- `M.colour`;
- `M.dissolve`, at most once in the trailer, and only by agreement.

Before every commit, run `node scripts/lint-motion.mjs compositions/<your shots>`; it must say ok. It refuses:
- other eases;
- fades and rises on anything, and blur;
- callbacks;
- unseeded randomness;
- CSS animation;
- `MOVES` (the old `shared/moves.js`).

In short:
- Cut on the beat.
- Type cuts in or types.
- Things turn into the next shot.
- Brand holds stay still to the pixel.
- No springs, no drift.

**A frame is a pure function of time.**
- Everything goes on the paused timeline at absolute times.
- Use `immediateRender: false` on a late `fromTo`; `motion.js` does it for you.
- Videos use `<video id="..." data-start data-duration data-media-start muted>` inside the composition. Every `<video>` needs an `id`: without one HyperFrames renders it blank (found on the night video).

**Timing.** All of it is in `cues/<shot>.json`, none hard-coded. The trailer is on the 128 BPM grid; a beat is 0.46875 s. Where a line is voiced, the voice sets the clock: word times come from the voice file (`assets/vo/L*.wav`, `manifest.json`). Text on screen stays at least words / 3 + 1 seconds, unless a voice reads it.

**Layout.** All from LOOK.md:
- Title-safe 96 / 54 px; columns at x = 96 + 146n.
- The type scale only: 22, 28, 35, 44, 55, 68, 85, 107, 133, 167, 208, 260, 326, 407, 509. Nothing under 22 px.
- Family 500 for display, Inter for body, Noto in each script.
- Mute text `#6B675F` or darker; haldi never as text on cream (`#855C00` if a word must be the accent).
- One accent at a time.
- The island owns the top centre (y 54 to 122): keep text and faces out of it.

**Clips.**
- Use a mix in `film/mixes` where one fits.
- Raw `clip.mjs` takes run about 1.25x slow: play them at speed 1.25 (or retime with `setpts`). The wall-clock takes (CA01, CA13, CA14, CA59, CA60, CA74, CA75, CA76, CV01 to CV03) are real speed already.
- Stills burn zoomed frames into raw takes. Check your ranges with `cd film/clips && python3 -I ../checks/trailer/glitch.py <take>.webm`, and never use a range it flags.
- Phone video at most 1100 px tall; bigger means the 1179 x 2556 stills.
- No notch, no home bar.

**Truth.**
- Every word on screen traces to the app's copy, a trace, a voice line's subtitle or the plan. No invented UI text.
- Tags, top right: "App reminder", "App, real speed", "demo data", "Pine Labs sandbox", "Delhivery mock", "demo block".
- No Pine Labs checkout page, ever. Nothing marked paid that wasn't.
- Partner logos as given in `app/img/brands`, never redrawn or recoloured.
- The QR goes to `https://baari.pages.dev`.

**Sound** (lane E):
- Every L line in Gnani as cast (`assets/vo`).
- The bed ducks 8 dB under every line.
- -14 LUFS integrated, -1 dBTP.
- The rhythm comes from `film/public/sfx/*.mp3` and `scripts/kit.py` synths (`uv run --with numpy --with scipy --with pyloudnorm`).
- Every outside sound in your report's sources table.
- `mix.py` writes `assets/mix.wav` (git-ignored); the lead runs it at merge.

## Your report: `film/handoff/lanes/<x>.md`

Write it last, commit it, and push your branch. The lead merges only branches whose report says `Status: done`.

```markdown
# Lane <x>
Status: done
Branch head: <sha>

## Shots
| Shot | Built or reworked | Base44 move | Lint | Checked at (trailer seconds) |

## Timing requests (beats, with the reason)
## Island and caption changes (already in your cue files; listed so the lead can check the total)
## motion.js requests (what's missing, and how you worked around it)
## Sources (one row per outside asset: file, where it came from, licence)
## Checks you ran (lint output, stills you looked at, glitch.py ranges)
## Open problems
```

## Gates

- **Gate 2, now.** Every shot in your lane exists and moves right, clips placed and timed, rough polish allowed. The lead merges all five lanes, renders 720p animatics of the trailer (with the temp mix), the tour and the night, and the owner reviews them.
- **Gate 3.** The owner's notes for your lane arrive as `film/handoff/lanes/<x>-notes.md`. Start when `READY-gate3.md` exists. Finish every shot at full quality, then report again.
- **Gate 4.** The lead's: final renders, frame sheets, checks, delivery.
