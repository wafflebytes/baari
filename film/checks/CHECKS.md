# Deck checks

The checks report for the finale deck: 19 slides and the 7 appendix pages in `film/deck/`. Each check is marked pass, fixed or n/a; fixed and n/a carry a note. A check is added for every error no check caught. The videos (trailer, slide 8 tour, slide 9 night) have their own report from the video session, `film/checks/trailer/TRAILER_CHECKS.md` on the `video-handoff` branch.

Run 9 October, on branch `w3-slides`.

## How to rerun

From the repo root, serve it (`python3 -m http.server 8741`), then:

- `cd film && node checks/dom.mjs deck s01 ... a07` reads every text box at the final frame: size, contrast, the 5% safe area, collisions and the word count. It writes `checks/dom-deck.json`.
- `cd film/deck && node export.mjs --png` (and `--4k`, then `--pdf`) makes the final frames, the PDF and the JPEGs `make_pptx.py` uses.
- `node export.mjs --at <id> t1,t2,t3` makes the three stills for a build.

## By check

| Check | Result | Note |
| --- | --- | --- |
| spelling-and-facts | fixed | Four fact errors found and fixed this round; see "Fixes" below. Every number on a page traces to `film/deck/stats/` (git.json, team.json, comments.json), `agent/prompts/`, `evals/out/runs.csv` or the R3 traces |
| truth-tags | pass | Slide 9's caption says demo data and real runs ("App on demo data · tool calls from real runs on AgenticOrg, 4 October"). Slide 12 carries each partner's state (Telegram real, Gnani real, Pine Labs links sandbox, Reserve Pay sandbox with demo debits, Delhivery mock, Twilio trial) and dates 8 of 10 to prompt v5 on 4 October. Slide 11 tags each catch Live, Live on sandbox, Live on the mock, or Rails · agent next. Slide 14 marks the quote "reacted to a demo, hasn't used it". A5 says "on fixture data". A4 marks v12 live and v13 not pushed |
| text-safe-area | pass | All 26 pages: every text box inside 96 px by 54 px. A1 to A7's page tag sat at 50 px at first and moved to 60 |
| no-collisions | pass | All 26 pages. A2's big zero and its line collided at first (fixed with 44 px between them) |
| text-contrast | fixed | All 26 pages at 4.5:1 or more; the lowest is 4.55:1 (A6, A7). The README diagrams' faintest labels (`--text-3`, 2.4:1) failed on A6 and A7; `docs/diagrams/kit.css` now darkens `--text-3` to #736F66 in the slide cut only, so the README renders don't change |
| projector-size | pass; n/a on A6, A7 | Nothing under 22 px on s01 to s18 or A1 to A5. A6 and A7 are diagrams 03 and 05 at full detail for reading in the PDF; their labels run 11 to 17 px. `dom.mjs` marks an iframe `data-size-na` and reports those texts apart ("77 texts size n/a") |
| frame-sheet | pass | `film/checks/deck-sheet.png`: all 26 final frames, none blank, none mid-animation |
| clip-speed | n/a | The deck plays no clip of its own. The tour and the night are the video session's files; until they land, slides 8 and 9 show their posters |
| still-glitch | pass | Three stills per build, checked by eye: s01 to s18 when each was built, A1 to A5 this round. One glitch found and fixed: A3's train rail and empty siding showed before the train (they now come in with it) |
| transitions-carried | pass | Every cut is a 220 ms crossfade over the next slide's first frame, with the section pill as the carrier (it holds, or springs across from the last stop). Checked on a grab 140 ms into the A6 to A7 cut: no blank frame. See `film/deck/TRANSITIONS.md` |
| format | pass | PNG 1920 x 1080 and 3840 x 2160. `Baari_finale.pdf`: 26 pages at 1920 x 1080 pt, 11.5 MB. `Baari_finale.pptx`: 26 slides at 16:9 (12,192,000 x 6,858,000 EMU), talk track in the speaker notes |
| loudness | n/a | The deck has no audio. The tour and night are silent; the talk is live |
| sync | n/a | No audio to sync |
| qr-target (new) | pass | Slide 18's QR decodes (jsQR, from the 1080p and the 4K export) to `https://baari.pages.dev/`, which returns 200. Added after the owner's note that the QR must open the app |
| phone-screens (new) | pass | Every phone screen comes from `shoot.mjs` (safe areas and status bar in the shot) inside the README frame; no capture is cropped or clipped. Checked by eye on s08 (live and wall) and A5 |
| trace-names (new) | pass | Slide 9's panel matches the three R3 traces call for call (E02 LOCK, E07 CHECK, E08 COOK_REPLY), named as the traces record them. Checked by script against `evals/runs/R3/`. Added after the video session's note |

## By page

Words are the page's own copy. Figure words (inside a diagram, a ledger, a receipt, a map) are counted apart: the 30-word cap applies to what a person reads as the slide, and a figure is read like a chart. Numbers and clock times aren't words.

| Page | Words | In figure | Min px | Min contrast | Note |
| --- | --- | --- | --- | --- | --- |
| s01 | 20 | | 22 | 5.12 | |
| s02 | 26 | | 22 | 5.63 | |
| s03 | 29 | | 22 | 5.63 | Keys shortened to "Sunday plan" and "Group chat" to fit 30 |
| s04 | 30 | | 28 | 5.12 | The monogram discs are decoration (`aria-hidden`), not words |
| s05 | 29 | | 22 | 5.63 | |
| s06 | 26 | | 22 | 5.12 | |
| s07 | 30 | | 22 | 5.04 | |
| s08 | 30 | | 28 | 16.88 | "The island" became "Island" to fit 30 |
| s09 | 25 | | 22 | 5.12 | Panel now uses the traces' names |
| s10a | 10 | 83 | 22 | 4.55 | Redesigned on the owner's note (see below) |
| s10 | 0 | 28 | 22 | 5.12 | |
| s11 | 30 | | 22 | 5.12 | |
| s12 | 21 | 112 | 22 | 5.12 | Diagram 06, slide cut |
| s13 | 30 | | 22 | 5.12 | Commit comments 22 to 23 (a fresh read) |
| s14 | 29 | | 22 | 5.12 | |
| s15 | 23 | 88 | 22 | 5.04 | Diagram 04, slide cut |
| s16 | 26 | | 28 | 6.54 | |
| s17 | 29 | | 28 | 16.88 | The plan's rows "asks slowly" and "never asks for" are cut to fit 30; the talk track says both |
| s18 | 25 | | 22 | 5.12 | |
| A1 | 8 | 59 | 22 | 5.12 | The ledger is the figure |
| A2 | 19 | 85 | 22 | 5.12 | The receipt is the figure |
| A3 | 20 | 35 | 22 | 5.12 | The rail map and train are the figure |
| A4 | 13 | 104 | 22 | 5.12 | The diary rows are the figure |
| A5 | 9 | 28 | 22 | 5.12 | One line per screen |
| A6 | 2 | 331 | n/a | 4.55 | Diagram 03, full detail |
| A7 | 2 | 266 | n/a | 4.55 | Diagram 05, full detail |

## Notes answered

| Note | From | Kind | What changed | Check |
| --- | --- | --- | --- | --- |
| "At the end QR: it should be for the app not the telegram bot" | Owner | error | Slide 18's QR now points at `https://baari.pages.dev/`; its caption reads "Scan to open the app · baari.pages.dev" | qr-target, added |
| "I didn't like s10a ... it looks very unprofessional ... cannot be easily understood ... do that at the end" | Owner | taste | Done last, as asked. Diagram 01's slide cut has its own layout now, read left to right. The house (four cards) reaches our rails by Telegram, voice, a call or the app. Our rails are four plain jobs in a 2 x 2: wakes Baari, every partner call, holds the house, guards the money. The model sits outside the rails, top right, on AgenticOrg. The partners show their real logos and their state tags. Before, it was 17 boxes of equal weight with jargon names ("Wake", "Bridge", "App feed", "Inventions") and labels that collided. Every wire has one meaning, and haldi marks only the money path, which lights end to end: the clock, a brief to Baari, its tool call back through the bridge, the guards, Pine Labs. The README's cut of diagram 01 is unchanged; its re-render is byte-identical | none needed |
| Slide 9's panel used `read_messages` and `send_message`, names that aren't in the traces | Video session (CLOUD_NOTES.md) | error | The panel now shows the rails operation each call ran, as the traces record it: `tg.updates`, `tg.send → Vinay`, `pl.balance`, `pl.debit`, `pl.debit.<id>`, `tg.voice → Sunita`. CHECK and COOK_REPLY gained the `tg.updates` read they were missing | trace-names, added |
| The night video carries its own panel and truth line, so the slide would show both | Video session | taste | Once `videos/night.mp4` lands, slide 9 plays it full bleed (its frame grows from the box to the whole slide) and shrinks back into the page at the end. The PDF page is unchanged | none needed |
| The end card's QR goes to the app | Video session | error | Already matched (see the owner's note above) | qr-target |
| Link the video report | Video session | taste | Linked at the top of this file | none needed |

## Fixes this round

- **s13:** "0 “blocked” in 22 commit comments" became 23. A fresh `gh api` read on 9 October found 23 (the last one, an [ask] at 01:17, came after `team.json` was read at 01:15). Still none say "blocked". Tags and times are in `film/deck/stats/comments.json`. The talk track's "twelve 'unblocked'" stays true.
- **Diagram 03 (A6 and the README):** "Prompt v12, 26,818 characters" became 26,695, the length of `agent/prompts/v12.md`. The changelog says the live text matches the file, so the file is the count. A4 uses the files' lengths for every version.
- **s09:** the trace names (above).
- **s18:** the QR target (above).
- **s08 and A5, the phones:** the app captures had no status bar, so the app ran to the screen's edge and the rounded phone clipped the avatar, the home button and the tab bar (owner's note, an error). `film/deck/shoot.mjs` now reshoots all 16 screens the way the README's are shot (`docs/diagrams/screens.mjs`). It replays each recorded shot file on the local app at 393 x 852, with the iPhone's 59/34 safe areas in the app's CSS and the README status bar drawn in (no home bar, as asked). The bar's ink follows what's behind it. All 16 shoot in parallel in under a minute. The phones use the README's frame (bezel, island cutout, side buttons), scaled whole by one width. Check added: phone-screens, below.
- **s10a:** the redesign (above). The slide cut lives in `docs/diagrams/src/01-system.html` as its own block, shown only with `?slide`.
- **`film/checks/dom.mjs`** (edited on this branch; the video session reads it and doesn't edit it):
  - It now multiplies the scale up the ancestors' transforms. Rounding `offsetHeight` read 22 px as 21.8.
  - It scales an iframe drawn smaller or larger (A6, A7).
  - It counts iframe text and `[data-fig]` blocks as figure words.
  - It reads "43%" as a number.
  - It marks `data-size-na` iframes as projector-size n/a.
