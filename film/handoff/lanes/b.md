# Lane B

Status: done
Branch head: f6c83be (the shots); this report is the commit after it

Scope: the owner's lane prompt gives lane B the trailer from s08 to s16. That is shots 8, 9, 11, 12, 13, 14, 15 and 16 (10 is cut). The lanes README gives lane B only 8, 9, 11, 12 and 13, and puts 14 and 15 in lane C. I followed the owner's prompt. If lane C also built s14 or s15 from the README, pick one at merge; the files don't depend on each other.

## Shots

| Shot | Built or reworked | Base44 move | Lint | Checked at (trailer seconds) |
| --- | --- | --- | --- | --- |
| s08 | Reworked, and cut from 17 to 16 beats (7.5 s) to match `timing.json` | Cursor, then giant typed type on the voice with the camera on the cursor (09, 10); scale cut to the rule in the app (11) | ok | 21.156, 22.056, 22.456, 24.106, 27.006, 27.456 |
| s09 | New | Product on the beat (02); the click on "Rajma toh kabhi bhi" (24) | ok | 28.156, 28.606, 29.156 |
| s11 | New | Product alive, one Gnani voice a beat, hard cuts inside the clip (14) | ok | 29.731, 30.731, 31.731 |
| s12 | New | Product on the beat (02); the faces gather into a row in 0.2 s (05) | ok | 32.675, 33.475, 34.125 |
| s13 | New | Row holds under "Raat 1"; flash montage, one object a beat under the island's verbs (08, 12); assembly around the pick card, scaffold leaves (13) | ok | 34.419, 35.219, 36.819, 37.319 |
| s14 | New | Dark passage (17); product alive: the orb breathes, the counter steps on the tick (14, 12) | ok | 39.0, 42.0, 44.0 |
| s15 | Reworked | Same framing, new state: TV stamp, then the app's locked hero, katori on katori, hard cut (18) | ok | 46.269, 47.069, 47.969 |
| s16 | New | Text set into the picture: "Main?" types on L14 (20); the click on "Bhigo diya", the take's done state cuts in (24) | ok | 50.688, 52.438, 52.888 |

Stills, 720p, one per shot at its key moment: `film/handoff/lanes/b-stills/`.

How each one moves:
- **s08.** Each rule of L07 types on in Family 260 px, word by word on the voice. Word onsets were measured on `assets/vo/L07.wav` and are in the cues. The caret holds at the right edge while earlier letters push off the left. After each rule there's a hard cut to the phone (CA76, real speed), where that rule sits in the app: Papa's aloo, the vrat row, "meetha kam" in the summary. English is in 35 px mute under the giant line. No caption plate, since L07 is `caption: false`. Letters that have gone wholly past the clip at x 96 are hidden on that frame. You can't see the difference, and dom.mjs no longer counts invisible text as outside title-safe.
- **s09.** A made island card. It uses the app's own copy from `app/app.js` 852 (the "repeat" question in Hinglish) and the eyebrow from line 921. The answers cut in one per tick, and Base44's cursor lands on "Rajma toh kabhi bhi" on beat 2, which turns haldi. The English gloss "Rajma any day." is the app's own English. Tagged "demo data".
- **s11.** `assets/b/s11-voices.mp4`: five beat-long CA26 cuts at real speed. It lands on Chitra, the "Aapse" voice.
- **s12.** The CA76 spin at real speed until "Main?!". On L08 the phone cuts out and the four faces cut in where the app's ring puts them. On beat 4 they gather into a row that carries into s13.
- **s13.** The row holds under "Raat 1 8:30 PM". On each verb (all app copy: `app/app.js` 337 and 347, `app/verbs.js`) one object flashes in: cooker, ballot, kirana bag, khata. Then the pick card with rajma and lauki chana dal cuts in, three pantry bits cut in on the tick, the bits leave on beat 6, and the thalis hold for L09.
- **s14.** Dark ground. The CA64 clean call at real speed (`assets/b/s14-call.mp4`) is cropped to the orb. "Baari sun rahi hai" cuts in when the family starts (L10a). The counter steps one value per tick from 0:00 to "0:47 chup" (chup in haldi) and lands just as L11 starts. Tagged "demo data".
- **s15.** The `MOVES` code is gone. The TV take plays its own drumroll and stamp, the tag cuts in, and on beat 4 the TV swaps to the CA15 Pakka still. No settle, no blur.
- **s16.** CA69 at real speed. The task card holds in the phone while L13 plays. "Main?" types in at 260 px on L14, then the cursor glides onto "Bhigo diya". Two frames after the click colour, the take's own done state cuts in: haldi card, "Vinay ne 9:42 pm pe kar diya".

## Timing requests (beats, with the reason)

None needed for gate 2. Two notes:
- s09 is 4 beats (1.875 s). Its gloss "Rajma any day." is 3 words, so it should hold for 2 s; it gets 1.54 s. 5 beats would fix it, but that moves every later shot by one beat, so I left it for the owner.
- `video data-start` values in s08 and s16 repeat cue times (app1..app3; click + 0.267). If those cues move, the HTML has to move with them. It's noted in each cue file's `about`.

## Island and caption changes

No changes to island or caption lines. The cue files keep the island lines the lead wrote (s08 "Din 0 setup", s09 hide, s13's five lines, s14 hide, s15 "Pakka Rajma chawal", s16 "Rajma bhigo rahi hoon…") and s14's two extra captions. All island verbs trace to the app (above).

## motion.js requests

- None missing. One workaround: s08's letter clipping needs each letter's time, which `M.type` doesn't return. I read it back with `tl.getTweensOf(letter)[0].startTime()`, which is pure. A `M.type` option that returns letter times would be cleaner.

## Changes needed in files I can't edit

- `film/trailer/check.html` loads `shared/moves.js` but not `motion.js`. Every gate 2 composition, the island and the captions need `MOTION`, so dom.mjs mounts broken shots. Please add `<script src="motion.js"></script>` after moves.js. To check, I served the repo through a small local server that adds it on the fly. Nothing of it is committed.
- `film/checks/dom.mjs` hard-codes port 8741. On this machine another server already held 8741 and served a different checkout, so I ran an untracked copy pointed at 8742, the lane B port. A `PORT` env var would help six parallel lanes.
- `film/checks/trailer/glitch.py` flags every frame of any overlay, because it compares the header strip against the take's first frame. CA26, CA17 clean, CA17b clean and CA64 clean are flagged from the moment the island opens, and so is CA76 32.6 to 38.04 (the island pill changes words). I checked each range I use by cutting it to its own file and running glitch.py on that file, so its reference is the range's first frames. All came back clean. I also looked at 2 to 4 fps contact sheets: no zoomed frames in any range I use. A reference-window option would make the detector usable on overlay takes.
- SOURCES: no new outside assets. Everything under `assets/b/` is a retimed cut of our own takes. Rows for your table:

| File | From | Licence |
| --- | --- | --- |
| `assets/b/s11-voices.mp4` | `clips/CA26-01-app-light-t1.webm` 21.6, 24.6, 42.0, 46.0, 37.6 s (0.586 s each), 1.25x, 786 x 1704 | ours |
| `assets/b/s14-call.mp4` | `clips/CA64-clean-app-dark-t3.webm` 8.0 to 17.96 s, 1.25x | ours |
| `assets/b/s16-task.mp4` | `clips/CA69-01-app-light-t1.webm` 3.3 to 5.8 s, 1.25x, last frame held 1.4 s | ours |
| `assets/b/s16-done.mp4` | `clips/CA69-01-app-light-t1.webm` 7.6 to 8.6 s, 1.25x, last frame held 0.5 s | ours |

Faces are `shared/cast/face-*.svg` and the pantry bits are `shared/cast/char-tomato.svg`, `bit-lemon.svg` and `char-chilli.svg`, all already in the repo. Objects and dishes come from `shared/img/obj` and `shared/img/dishes`.

## Checks you ran

- `node scripts/lint-motion.mjs` on all eight compositions: "ok: 8 file(s) move like Base44".
- dom.mjs (the 8742 copy, with motion.js in the harness) at 26 key moments across the eight shots, plus 9 more s08 frames chosen where the giant lines overflow most: 0 fails. Then a sweep of 84 frames (every 0.2 s through s08, every 0.4 s through s09, s12, s13, s14 and s16): 0 fails. Smallest text is 22 px (tags). Lowest contrast is 5.12:1 (mute English on cream). The first run had 3 safe-area fails in s08 from wholly clipped letters; fixed as described above.
- glitch.py, 0 zoomed frames on every range I use: `assets/b/s11-voices.mp4`, `s14-call.mp4`, `s16-task.mp4`, `s16-done.mp4`, and CA76 cuts 43.5 +0.42, 52.8 +0.35, 59.2 +0.47 (s08) and 34.4 +1.4 (s12). CV02 29.794 to 31.744 (s15) is the range the gate 1 checks cleared, unchanged.
- Raw takes run 1.25x slow (CA26, CA64, CA69) and were retimed with `setpts=PTS/1.25`. CA76 and CV02 are wall-clock takes, used as is. Video phones are 848 px tall, and s14's crop shows the 393 px take at 1.3x.
- Contrast: worst 5.12:1. "chup" is haldi on the dark ground, which is allowed; haldi is never text on cream here.

## Open problems

1. **s12's truth.** The only Ghumao take (CA76) lands on Didi ("Pehli baari Didi ki"), not Papa. I cut the spin before the coin lands and show no result. Papa says "Main?!" over the ring of faces with no highlight. The plan's "lands on Papa" isn't shown, because no take shows it. The owner may want a made spin result, tagged; I didn't invent one.
2. **s09 is made**, not a clip. CA17b (the clip CLIPS.md names) asks about spice, and the "Rajma any day" joke exists only in `app/app.js`. The card uses the app's copy word for word and is tagged "demo data". At gate 3 it could be matched to the app card's exact style from a still.
3. **s14's on-screen line.** CA64 shows "Ghar mein teekha kitna chalta hai?" while L09 offers rajma or lauki, so the frame is cropped to the orb. "Baari sun rahi hai" and the counter are made overlays, as CLIPS.md allows.
4. **s15's island over the app still.** The island pill sits over the top of the CA15 still's own header. It was the same at gate 1; if it reads as clutter, the still could move down about 60 px (the katori alignment with the TV would then need the TV to move as well).
5. **s08 haldi rings.** The old rings on each rule in the app are gone; the accent is the island's for now. A ring cut on with the phone is easy to add at gate 3 once the owner says whether they want it.
6. **No sound** in any of it; lane F owns the mix. s11 should carry the app's voice samples (`app/audio/voice-*.mp3`) on its five beats.
