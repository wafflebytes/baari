# Lane C
Status: done
Branch head: b1edd73 (the shots); the commit after it adds only this report.

Gate 2. Base: `6b9ec62` on `video-handoff`.

**Which shots.** The owner's prompt for this round gives lane C trailer s17 to s28 (s17, s18, s20, s21, s22, s23, s25, s26, s27, s28), with new assets under `assets/c/`. That differs from `README.md` on this branch, which gives lane C shots 14 to 18. I followed the owner's prompt. Lead, please check the merge: if lane B followed the README, s17 and s18 may exist on two branches.

## Shots

| Shot | Built or reworked | Base44 move | Lint | Checked at (trailer seconds) |
| --- | --- | --- | --- | --- |
| s17 Portal | Built | The click (cursor on, ink to haldi in 5 frames), then the rise (strip 21): the kirana, Delhivery and khata cards climb out of the button and off the top, `power2.in`. The last card out, the ₹520 Payment card, lands in 0.4 s at shot 18's framing, so it is s18's first frame | ok | 54.27, 55.77 |
| s18 ₹520 | Reworked | Push into UI copy (strip 23) from 1.67 to 2.95 s, while L15 says "aur bill... mujhe hi aaya", stopping when it lands; then the click without the press (strip 24): the cursor stops on "₹520 pay karo" and the haldi ring comes on. Never pressed, no Pine Labs page, nothing paid | ok | 57.57, 58.57, 59.28 |
| s20 Raat bhar | Reworked | Product alive (14): the CA50 night card holds dead still while the island steps the clock on beats 0, 2, 4, 5 (12). The card swaps In transit to Out in place with 6:40 AM. Carrier (03): a parcel lifts off the Out stop as the card cuts away and lands at s21's framing on the cut | ok | 62.13, 63.23 |
| s21 Parcel | Built | Still hold, three beats, under "Saamaan aa gaya" | ok | 64.08 |
| s22 Namaste | Reworked | Giant letters behind a cursor, one script a beat, each replaced by a hard cut (16, 12); then the brief's words cut in on `brief.json` times with the spoken word on a haldi tint | ok | 64.99, 65.95, 69.19 |
| s23 Sunita's reply | Built | Her transcript's words cut in on L17's words; चार cuts to 4 and दो to 2 in place (18); the app's "Counts pakke" chip cuts in | ok | 73.78 |
| s25 Lock screen | Built | Cut in, still (02); the reminder's body types on L18's words (25) | ok | 74.16, 76.96 |
| s26 Receipt | Built | A thing becomes the next thing (03): the rajma thali lands in 0.4 s onto the receipt's ब and the CA55 slip cuts in around it on the beat | ok | 77.64, 78.84 |
| s27 Ravivaar | Built, placeholder art | Text set into the picture (20, 25): the picture cuts in still, her line types beside her on L19's words | ok | 83.22 |
| s28 End card | Reworked | Icon row with the haldi tile stepping on the tick (26), hard cut to the flood with grain and the ब exactly where the ballot was, still; "Aaj ki baari?" and "Aapki." type on L20; QR, then one partner logo a beat | ok | 84.14, 84.94, 88.34 |

Every timing number is in `cues/<shot>.json`, each file's `about` says what it means. Voice word times were read off the picked WAVs (an energy onset pass, `assets/vo/L15, L17, L18, L19, L20.wav`); they are good to a frame or two and should be rechecked against the final mix.

## Timing requests (beats, with the reason)

- **s23: 7 to 8 beats, or L17 at 0.45 instead of 0.9.** L17 ends at 2.94 s of a 3.28 s shot, so the "Counts pakke" chip, which can only come after "दो" turns into 2, gets 0.7 s on screen. It needs about 1.7 s (3 words / 3 + 1). Either change fixes it; moving L17 is cheaper.
- No others. s17, s18, s20, s21, s22, s25, s26, s27 and s28 fit their current lengths.

## Island and caption changes (already in your cue files; listed so the lead can check the total)

- s20: the 4:05 AM and 6:40 AM steps now carry `"in": "cut"`, so the clock steps by cut on the beat instead of retyping (README, the island: clock steps cut in). Text unchanged.
- No new island lines and no extra captions. The island texts in s20, s22 and s26 ("Raat bhar", "Sunita ka brief", "Lunch pe nazar 1:00 PM") were already in the cue files from the lead; I didn't trace them to app copy. Please confirm their source or replace them.

## motion.js requests (what's missing, and how you worked around it)

- None blocking.
- s28: LOOK.md asks for a haldi cursor on "Aaj ki baari?", but the text sits on the haldi flood, where a haldi caret is invisible. I used the default ink caret. If the owner wants haldi, the ask needs a cream ground, which would mean cutting back from the flood.
- s18: `M.click` with `prop: "boxShadow"` changes the ring's colour in 5 frames (black to haldi, as the reference changes the button). That gives a click with no press, which the truth rule needs (CA35 never taps the button).

## Bugs in files I can't edit

- **`film/trailer/check.html` doesn't load `motion.js`**, so every composition built on `MOTION`, and the generated captions layer, throws inside it, and `film/checks/dom.mjs` can't measure them. I ran the checks with an uncommitted copy that adds `<script src="motion.js"></script>` after `moves.js`. Fix: add that line to `check.html`.
- **`film/checks/dom.mjs` hard-codes port 8741.** Lanes on other ports can't use it as it is; my uncommitted copy pointed at 8743. A `PORT` env var would fix it.
- **s01's date and time collide** (lane A's file). s25 copies s01's lock screen, and dom.mjs flagged "Friday, 9 October" x "8:05" at the same positions. In s25 I moved the lock to y 166, the date to 222 and the time to 292; s01 probably needs the same fix.

## Sources (one row per outside asset: file, where it came from, licence)

No outside assets. Everything new is cut from files already in the repo:

| File | From | Licence |
| --- | --- | --- |
| `assets/c/s17-payment.png` | `film/clips/CA35-01-app-light-t3.payment.png`, crop 1050 x 780 at 65, 492 | Ours (app capture) |
| `assets/c/s17-kirana.png` | `film/clips/CA51-01-app-light-t1.kirana.png`, crop 1076 x 800 at 53, 900 | Ours |
| `assets/c/s17-khata.png` | `film/clips/CA49-01-app-light-t1.khata.png`, crop 1076 x 700 at 52, 545 | Ours |
| `assets/c/s17-delhivery.png` | `film/clips/CA50-01-app-light-t1.real.png`, crop 1076 x 1000 at 52, 780 | Ours |

Also used directly: CA50 `real.png` and `poster.png` (s20), CA55 `poster.png` (s26), `shared/img/obj/*`, `shared/img/dishes/rajma.png`, `shared/cast/face-mummy.svg` (Personas by Draftbit, CC BY 4.0, already in SOURCES), `shared/img/brands/*` as given, `shared/app-icon.png`, `assets/grain.png`.

## Checks you ran (lint output, stills you looked at, glitch.py ranges)

- `node scripts/lint-motion.mjs` on all ten compositions: `ok: 10 file(s) move like Base44`.
- dom.mjs (the patched copy described above, against the real compositions, island and captions): 0 fails at s17@1.3, s17@2.8, s18@3.5, s20@2.6, s20@3.7, s21@0.8, s22@0.3, s22@1.26, s22@4.5, s23@3.0, s25@0.1, s25@2.9, s26@0.3, s26@1.5, s27@4.0, s28@0.7, s28@1.5, s28@4.9. Smallest text 22 px (the tags); lowest contrast 5.12:1 (mute on cream). The first run failed s25 on a date and time collision, which is now fixed.
- glitch.py: n/a. My shots use no video ranges, only the 3x stills, which have no burned-in zoom frames. CLIPS.md's clips for these shots were checked and not used: the split mixes (`split-CA50-dawn`, `split-CA51-kirana`) are light and dark halves with a moving divider, and a card cropped from 393 px video would be soft at this size. The rule says close-ups go to the 3x stills.
- Draft render of `excerpt.html` s17:s28 (35.6 s, 23 s to render), with 18 frames pulled around every carrier: the s17 click and rise, the landing into s18, the s18 push and ring, the s20 to s21 parcel, the s26 thali landing, the s28 row. All land where intended, with no blank frames.
- 720p stills, one or two a shot at the key moment: `film/handoff/lanes/c-stills/`.

## Open problems

- **s27 art.** No "Mummy with chai" exists. A placeholder frames `face-mummy.svg` on a peach card. It needs a flat-vector Mummy seated with chai, in the cast's style (like `mummy-fridge.svg`), at about 584 x 620.
- **s21 doorstep.** R4 was never shot, so the shot is the parcel render alone. That's acceptable as a fallback, but it's the weakest beat in the lane.
- **s23 truth.** The CA52 thread shows "Counts pakke" next to "Pyaaz 4", which contradicts L17's "only two onions", so I show only "Counts pakke". TRAILER_PLAN 14 notes T4 is partial (the reply was labelled vague_yes). Worth a look by whoever signs off on truth.
- **s17 amount.** The plan says the kirana card reads "₹40 · paid"; the app's card in CA51 reads ₹28 Paid. I used the app's card as captured.
- **s22 sound** (lane F): the `greetSlice` and `karaokeAudioFrom` cues are unchanged and are what the mix needs for the greeting slices and the brief under the karaoke.
- **s17 rise.** The three spend cards climb from 0.3 to full size and leave by the top; at gate 3 they could carry more of the frame (start larger, overlap more), as in the reference's frames 816 to 831.
- **Environment.** This session ran on macOS, not the cloud image: `/opt/pw-browsers` doesn't exist here, so renders used HyperFrames' own cached headless shell and dom.mjs used Google Chrome. Same HyperFrames and puppeteer versions as the lockfile.
