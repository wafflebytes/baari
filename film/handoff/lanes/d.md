# Lane D
Status: done
Branch head: 13279d7 (the cut); this report is the commit after it

Lane D is the slide 8 tour, as the owner assigned it in the session prompt: 786 x 1704, 8 chapters of 4.9 s, hard cuts on the chapter times, real speed, idle frames cut, each chapter ending near its poster still, silent. `film/handoff/lanes/README.md` still lists lane D as trailer shots 20 to 25 and the tour as the lead's; I followed the owner's prompt and touched no trailer shot.

## What's done

The full cut, roughed in, at its real timing. `python3 film/deck/videos/tour.py` builds it from `film/deck/videos/tour.json`.

- 1176 frames, 39.2 s, 30 fps constant, 786 x 1704, H.264 High, yuv420p, no audio track, `+faststart`.
- Every chapter is exactly 147 frames, so the hard cuts fall on 4.9, 9.8, 14.7, 19.6, 24.5, 29.4 and 34.3 s, the slide's name-reel times (`film/TRANSITIONS.md`, slide 8 rows 1 to 7).
- Every source is a clip.mjs take played at 1.25x, which is real speed.
- Idle frames are dropped by hard cuts inside a chapter. Each chapter's last part ends on its `out` point, just before the poster still's zoomed frames. `tour.py` moves that part's in-point so the chapter fills exactly 147 frames.
- Nothing is added on top of the app: no text, no tags, no motion. That's the Base44 move LOOK.md gives the tour, product on the beat (strip 02).

`tour.mp4` and `tour-poster.png` aren't committed at gate 2. Gate 3 delivers them. `python3 film/deck/videos/tour.py --draft` writes `film/deck/videos/tour/tour-draft.mp4` (git-ignored) for the animatic.

| Ch | At (s) | Chapter | Source ranges (take seconds, 1.25x) | Ends on (matches poster) |
| --- | --- | --- | --- | --- |
| 1 | 0.0 | The island | CA17 clean 0.6 to 2.85, 4.85 to 5.85, 6.425 to 9.3 | The opened sheet, "Waiting for Vinay's yes / Saamaan mangana", ₹520 card (`CA17-01 poster`) |
| 2 | 4.9 | Aapke liye | CA17 clean 11.95 to 13.55, 16.9 to 18.7, 23.95 to 25.1; CA35 clean 2.917 to 4.5 | The ₹520 Payment card, "demo checkout" (`CA35-01 payment`) |
| 3 | 9.8 | Badlo | CA20 light 2.35 to 4.0, 7.6 to 9.0, 19.758 to 22.8 | Chole chawal, "Aloo puri skip: Papa ki thali mein aloo nahi" (`CA20-01 poster`) |
| 4 | 14.7 | Sirf dal chawal nahi | CA25 5.2 to 9.4, 11.85 to 12.3, 14.842 to 16.3 | Veg momos with the Haan stamp mid-card (`CA25-01 poster`) |
| 5 | 19.6 | Baari ki awaaz | CA26 1.35 to 4.1, 4.875 to 8.25 | The orb on Chitra (`CA26-01 poster`) |
| 6 | 24.5 | Khata | CA71 10.3 to 11.5, 17.9 to 18.9, 50.8 to 51.6, 53.5 to 54.9, 55.892 to 57.6 | Pine Labs card, "Payment ki maang ₹520", RUKA (`CA71-01 poster`) |
| 7 | 29.4 | Kaun kha raha hai | CA68 0.3 to 3.2, 5.092 to 8.3 | The sheet with Papa switched off (`CA68-01 poster`) |
| 8 | 34.3 | Lauki ne note kar liya hai | CA70 0.3 to 2.8, 3.575 to 7.2 | The reminders sheet, the Lauki card fully on screen (`CA70-01 poster`) |

`python3 film/deck/videos/tour.py --plan` prints the exact in-points and frame counts.

## What's open

- **Chapter 2 ends on a card the deck showed first.** CA17's flings and its fold leave the deck on the fridge card, and no take returns to the ₹520 card after a fold. To end on the chapter's poster (CA35's Payment card), the chapter cuts from CA17's fold to CA35's ₹520 card. Every frame is real, but the order is ours. If the owner wants a strict take order, end the chapter on the fold ("Samajh gayi. Kal ki quantity badlegi.") and drop the poster match. It's a one-line change in `tour.json`.
- **Badlo uses the raw light take, not `mixes/split-CA20-reel.mp4`.** CLIPS.md names the mix, but the mix is light and dark side by side, split down the middle of the screen. The tour is light only (all eight posters are light), and cropping half a screen leaves a 393 px strip. The mix also plays the light take at its recorded speed (26.0 s for a 26.6 s take), so it isn't retimed to real speed. The raw take at 1.25x, with its four still ranges avoided, gives the same reel at real speed.
- **Holds.** These takes have few events: a tap, an animation, then a still screen until the next tap. After the idle cuts, the longest holds are product holds on readable app text: the hero with the pill shimmer in chapter 1 (2.2 s), and each chapter's last 1.4 to 2.9 s on the poster state. They're listed under checks. At gate 3 I can trade some of a chapter's end hold for a second part from later in the take, if the owner wants more taps per chapter.
- **Chapter 1's pill morph is small at phone size.** The "Saamaan mangana" to "Daam dekh rahi hoon…" morph is the chapter's subject, but on the slide's 394 x 852 screen it's a 30 px change. The open into "Aaj raat" carries the chapter.
- **Gate 3 still needs the delivery encode.** That means `tour.py` at CRF 16, slow, `tour-poster.png` as the first frame, and the format checks on the final file.

## Checks run

| Check | Result | Notes |
| --- | --- | --- |
| Frame count and chapter cuts | pass | 1176 frames (8 x 147). Cuts on the 147-frame boundaries, confirmed by `--plan` and the contact sheet of the draft |
| Format (draft) | pass | ffprobe: High, 786 x 1704, yuv420p, 30/1, 1176 frames, no audio stream |
| glitch.py on every range | flags 13 of 19 parts, all false | `film/checks/trailer/glitch.py` compares the header row with the take's first frames, so it flags every opened sheet and dark screen as zoomed: CA17 clean 7.08 to 28.64, CA35 clean 2.2 to 17.56, CA25 5.68 to 43.32, CA26 5.6 to 69.48, CA68 2.24 to 12.4, CA70 2.24 to 25.4. Both clean takes (CA17, CA35) have no still at all in `taps.json`. I checked every flagged part by eye on 0.5 s contact sheets: no zoomed frames |
| Still check by still image (`tour/stills.py`, new) | pass, 19 of 19 | Matches each frame against the top-left 393 x 852 of each 3x still, which is what the screencast shows while a still is taken. On CA20 it reproduces glitch.py's ranges exactly (4.12 to 5.08, 9.6 to 10.8, 15.72 to 16.68, 22.92 to 23.4). It caught one of my ranges, CA25 11.55, inside the "picked" still (10.64 to 11.8), now 11.85. `tour/check.py` runs both detectors on every part and writes `tour/checks.json` |
| Black frames | pass | None (mean luma under 8) |
| Frozen runs over 0.5 s | reported | 0.67 to 2.87 (ch1 hero, pill shimmer only), 3.6 to 4.93 (ch1 end), 15.37 to 16.73 (ch4 picks), 27.3 to 28.8 (ch6 end), 29.4 to 30.83 (ch7 hero), 31.3 to 34.3 (ch7, Papa off, then end), 34.3 to 35.83 (ch8 hero), 37.0 to 39.2 (ch8 end). The rest are 0.5 to 0.8 s |
| Ends near poster | pass | Each chapter's last frame next to its poster: identical states on all eight. Stills in `film/handoff/lanes/d-stills/`, 720 px tall, one per chapter at its last frame |
| Clip speed | pass | All 19 parts are clip.mjs takes at 1.25x. None of the tour takes is a wall-clock take |
| dom.mjs, text contrast, smallest text | n/a | The tour adds no DOM and no text. It's the bare app screen, text as recorded (HANDOFF section 6) |
| lint-motion.mjs | n/a | No composition; the tour is an ffmpeg cut with hard cuts only |
| Truth tags | n/a | Per TRAILER_CHECKS gate 1: the slide frames and captions the bare screen. The app's own "demo checkout" label shows on the ₹520 cards (ch1, ch2), and nothing is marked paid |
| Sound | pass | No audio track |

Commands, from the repo root:
```sh
python3 film/deck/videos/tour.py --plan
python3 film/deck/videos/tour.py --draft
uv run --with numpy --with pillow python -I film/deck/videos/tour/check.py film/deck/videos/tour/tour-draft.mp4
```

## Changes I need from the lead

- `film/handoff/lanes/README.md`: the lane table gives lane D trailer shots 20 to 25 and gives the tour to the lead. The owner's prompt gave lane D the tour. Someone still needs to own s20, s21, s22, s23 and s25.
- `film/CLIPS.md`, slide 8, Badlo: say "`clips/CA20-01-app-light-t1.webm` at 1.25x, avoiding its stills" instead of the split mix, or tell me to use the mix anyway (and which half).
- `film/checks/trailer/TRAILER_CHECKS.md`: add the still check by still image (`film/deck/videos/tour/stills.py`) next to glitch.py, and note that glitch.py flags opened sheets. It's yours to copy into `film/checks/trailer/` if you want it for the trailer too.
- No new outside assets, so no SOURCES rows.

## Process note

This session ran on a Mac, not the cloud image: there's no `/opt/pw-browsers`, so `HYPERFRAMES_BROWSER_PATH` pointed at HyperFrames' own headless shell (`npx hyperframes browser path`). The branch was built in a separate git worktree so the owner's uncommitted `w3-slides` work in the main checkout stayed untouched. Repo root served on port 8744.
