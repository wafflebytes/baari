# Lane a

Branch head: 0701f8a (the shots; this report is the commit after it)

## Shots

| Shot | Built or reworked | Base44 move | Lint | Checked at (trailer seconds) |
| --- | --- | --- | --- | --- |
| s01 | Reworked | Cut in, still; push into UI copy (23) on "Lauki" while L01 plays, `M.push` 0.32 to 1.75 s, landing with the word 560 px wide, centred on (960, 420) | ok | 0.2, 1.0, 1.8 |
| s02 | New | Dark passage (17); the count morphs 1, 2, 3 on the tick (12), "RAATEIN." cuts in with the 1. The lauki thali sits at (960, 420) from frame 0, where s01 left the word | ok | 1.9, 2.875 |
| s03 | New | Product on the beat (02): the made pick card and its two dish tiles cut in whole; `M.click` on "Rajma chawal" at 0.867 s, on L02's second "Rajma!"; the other two buttons cut out after the colour lands | ok | 3.8, 4.62, 4.95, 5.4 |
| s04 | New | Gather into a row (05), the row becomes the wordmark (06), still logo (07). The tiles fly from their s03 place and size into a centred row in 0.2 s; the app icon cuts in at the head on beat 1; "Baari" arrives a letter every 2 frames, each tile cutting out as letters reach it; the logo holds still from 0.87 s to the end (2.4 s, five beats) | ok | 6.1, 6.6, 7.2, 8.594, 9.0 |
| s06 | Reworked | Cards around the subject (04): chips cut in one a beat from 0 and hold still; inserts flash one tick each at 1.875 and 2.344 (08). No camera move, so frame 0 is s05's last frame | ok | 15.05, 16.5, 16.9, 17.5 |
| s07 | Reworked | Gather (05): the chips hold, then at 0.469 s fly in straight lines to the island's place in 0.2 s and cut out on arrival; the island cuts in on that frame (0.669 s) and types "Sab yaad rakh rahi hoon…". No frost, no blur | ok | 18.4, 18.83, 19.5, 19.781 |

s05 is the lead's and I didn't touch it.

## Timing requests (beats, with the reason)

None. Every shot fits its length in `timing.json`.

## Island and caption changes (already in your cue files; listed so the lead can check the total)

- s07: the island cue moved from 0.3 to 0.669 s, so the pill cuts in on the frame the chips arrive. Same text, shimmer, type in.
- s01 to s06: island hidden, no extra captions.

## motion.js requests (what's missing, and how you worked around it)

- No primitive for a run of letters cutting in without a caret on a fixed rhythm. The s04 wordmark uses `M.words` on `M.lettersOf(...)` with `each: 2 frames`, so I know each letter's time and can cut the tiles out under the 3rd and 5th letters. `M.type` hides its letter times behind the seeded jitter. A `times` return from `M.type` would let the wordmark use real typing.
- `M.collapse` gathers to one vars object; to centre chips of different widths on x 960 I tween `left: 960, xPercent: -50`. That works, but a note in motion.js would help other lanes.

## Changes needed in files I can't edit

- **`film/trailer/check.html` never loads `motion.js`.** Every gate 2 composition throws `MOTION is not defined` there, so `checks/dom.mjs` measures an un-run page: everything hidden shows and nothing moves. It needs `<script src="motion.js"></script>` after `moves.js`. I added that line locally for my runs and reverted it before committing. Other lanes' dom.mjs results are probably wrong until it's fixed.
- `film/handoff/lanes/README.md` says lane assets go under `assets/<shot>/`; the owner's prompt says `assets/a/`. No conflict this time: lane A needed no new assets.

## Sources (one row per outside asset: file, where it came from, licence)

None new. Every image comes from the repo: `shared/app-icon.png` (app/icon-512.png), `shared/img/dishes/lauki-chana-dal.png` and `rajma.png` (app/img), and `shared/cast/mummy-fridge.svg`.

## Truth

- s01: copy from `app/extras.js` "quiet" nudge, word for word. Tag "App reminder".
- s03: no trace has a rajma pick card. The card copies the R3 E01 vote card's shape ("Kal X ya Y? ...", buttons X, Y, "Kuch bhi"; `evals/runs/R3/E01/2026-10-04T12-23-55-030Z_platform.json`, messages 4 to 6) with Lauki chana dal as dish one, so Lauki wins by default. That's the hook's rule and L03's joke. I trimmed the message to the question: "Kal Lauki chana dal ya Rajma chawal?". I dropped "9:30 tak batao, warna ... banega" for reading time. Tag "demo data", because "made" isn't in the tag list. If the lead prefers another tag, it's one word in `s03.html`.
- s03: the plan's line "Papa already voted. Your turn, it takes one tap." (`app/extras.js` "vote") is left out, because LOOK allows one line of type per frame. The lauki doesn't slide off either; slides aren't Base44's.
- s04: the app icon as given, unrecoloured.
- s06 and s07: chip text as the lead's gate 1 build had it (HANDOFF section 3).

## Checks you ran (lint output, stills you looked at, glitch.py ranges)

- `node scripts/lint-motion.mjs compositions/s01.html compositions/s02.html compositions/s03.html compositions/s04.html compositions/s06.html compositions/s07.html`: `ok: 6 file(s) move like Base44`.
- `node ../checks/dom.mjs trailer ...`, run with `motion.js` loaded in check.html (see above), on 16 frames:
  - Key moments: 0 fails. s01@0.2, s02@1.0, s03@0.5, 1.2 and 2.0, s04@0.1, 0.6 and 2.5, s06@1.6, 1.9 and 2.4, s07@0.3 and 1.5. Smallest text is 22 px (the tags); worst contrast is 5.63:1 (mute "Baari" on the white card, and the tag).
  - s01@1.0 and s01@1.8 fail text-safe-area. That's the push into copy: the camera crops the lock screen off the frame edges, which is the move (ref 1006 to 1048 crops its text the same way). I left it unmarked rather than adding `.no-check`. Tell me if you want it handled another way.
  - s07@0.6 fails no-collisions: the four chips overlap in flight, 0.13 s into the 0.2 s gather. They are gone by 0.669 s.
- glitch.py: n/a. Lane A uses no clips or mixes; every shot is made.
- 720p stills, looked at one by one, in `film/handoff/lanes/a-stills/`: s01-still (0.2), s01-push-lands (1.8), s02-count (2.875), s03-click (4.62), s03-fold (5.4), s04-gather (6.1), s04-logo (8.594), s06-thoughts (17.5), s07-gather (18.83), s07-island (19.781).
- The cut from s01 to s02 lands as planned: "Lauki" ends 560 px wide at (960, 420), and the 560 px thali replaces it in place.

## Open problems

- s03's card is on screen 2.34 s for 6 words plus three buttons. Words / 3 + 1 wants 3 s, and the voice doesn't read the card. Options: one more beat for s03 (5 to 6 beats, taken from s04's logo hold, which runs five beats where three or four will do), or accept it, since the buttons are the point and L02 says "Rajma". I'd take the beat from s04.
- The plan's "Papa: meetha nahi" chip is still "Papa: aloo nahi", as the lead decided at gate 1.
- Gate 3 polish still to do: the s01 lock screen could use the 3x look of a real lock screen, and s02's spotlight is a flat gradient with no texture.

Status: done
