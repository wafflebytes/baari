# Clips: what exists, and which file goes in each slot

For the agent that builds the trailer and the deck. Read this before `film/CLIP_SLOTS.md` and `film/slots.json`. Where they disagree, this file wins: it was written after the captures landed, 9 October.

**Capture is closed.** Every clip is one the recording agents made on the app's fixtures. Nothing else is coming: no real phones, no driven night on `/live`, no sim call, no Pine Labs checkout, no real mic. Any slot that waited on one of those now has a fallback, given below and in `slots.json`.

## Where everything is

| Path | What | Count |
| --- | --- | --- |
| `film/clips/*.webm` | Raw takes, VP9, 25 fps, light or dark, named `<id>-<shot>-<surface>-<theme>-t<take>.webm`. App takes are 393 x 852, the phone's own pixel size; TV takes are 1920 x 1080 | 79 |
| `film/clips/*.png` | Stills taken during a take at 1179 x 2556, three times the take's size, named `<take>.<moment>.png`. `poster.png` is the frame the plan asked for | 253 |
| `film/clips/*.taps.json` | Every tap, swipe, scroll and still with its time in the take | one per take |
| `film/clips/*.srt` | Captions for the take, in plain English | 31 takes |
| `film/clips/manifest.json` | One row per take: id, theme, length, app commit, and a sentence on what happens | 79 rows |
| `film/mixes/*.mp4` | Finished cuts at 30 fps, speed and glitches already fixed: phone cuts upscaled to 786 x 1704, or 1920 x 1080 pairs on the app's cream or dark ground | 28 |
| `film/mixes/*.json` and `.png` | Each mix's sources, length, key moment and poster | one per mix |

All takes are in Family, the app's licensed face, and on the app as it is now.

## Four things to handle in raw takes

Use a mix where one fits; the mixes have already dealt with the first two. Cut from raw takes only for slots no mix covers.

1. **Speed.** The takes recorded by `film/scripts/clip.mjs` run slow while the screen animates: puppeteer's screencast stretches busy frames, about 1.2x to 1.33x. Fix them with `setpts=PTS*25/30` (what `film/mixes/screens-mix.sh` does), or drop duplicate frames and retime with `mpdecimate,setpts=N/30/TB` (what the island and Ghar mixes do; it also trims holds). The onboarding and TV takes, CA01, CA13, CA14, CA59, CA60, CA74, CA75, CA76 and CV01 to CV03, used a wall-clock recorder and play at real speed.
2. **Stills glitch the video.** Each still burns about 2 seconds of zoomed frames into the take. Every still is in the take's `taps.json` as `kind: "still"` with its `t_ms`. Never cut within 1.5 s of one. The island has clean re-takes with no stills (`*-clean-*`), and `film/mixes/montage-screens.json` lists the exact bad frame ranges for the screens takes under `glitch_frames_frozen`.
3. **No notch, no home bar.** The takes have zero safe-area insets: the app's header pill sits at the very top and the dock at the very bottom. In a phone frame, use a plain bezel with a small screen radius (about 20 pt at phone scale) and no Dynamic Island cutout, or the cutout covers the app's own island pill and the corners cut the dock. The README's app strip is different: it's stills reshot with insets by `docs/diagrams/screens.mjs`.
4. **Size.** App video is 393 x 852, so it softens past about 1.3x. In a 1920 x 1080 frame, keep a phone's screen at most about 1100 px tall. Close-ups, push-ins and every PDF page use the 1179 x 2556 stills, which stay sharp at 3x. In the 4K trailer, put video phones at half height or less and go to a still for anything bigger.

## The deck

### Slide 8, the app tour (`DECK_TOUR`)

Each chapter's poster is the exact still for the PDF page. All are light theme.

| Chapter | Video | Poster |
| --- | --- | --- |
| The island | `clips/CA17-clean-app-light-t3.webm` (pill morph, open), or `mixes/split-CA17-island.mp4` for light and dark side by side | `clips/CA17-01-app-light-t3.poster.png` |
| Aapke liye | `clips/CA17-clean-app-light-t3.webm` (deck flings, one fold), `clips/CA35-clean-app-light-t3.webm` | `clips/CA35-01-app-light-t3.payment.png` |
| Badlo | `mixes/split-CA20-reel.mp4` | `clips/CA20-01-app-light-t1.poster.png` (the landed plate with "Aloo puri skip: Papa ki thali mein aloo nahi") |
| Sirf dal chawal nahi | `clips/CA25-01-app-light-t1.webm` | `clips/CA25-01-app-light-t1.poster.png` (Haan stamp mid-card) |
| Baari ki awaaz | `clips/CA26-01-app-light-t1.webm` | `clips/CA26-01-app-light-t1.poster.png` (orb on Chitra) |
| Khata | `clips/CA71-01-app-light-t1.webm` | `clips/CA71-01-app-light-t1.poster.png` (Pine Labs card, ₹520 waiting) |
| Kaun kha raha hai | `clips/CA68-01-app-light-t3.webm` | `clips/CA68-01-app-light-t3.poster.png` (Papa switched off) |
| Lauki ne note kar liya hai | `clips/CA70-01-app-light-t2.webm` | `clips/CA70-01-app-light-t2.poster.png` (the Lauki card fully on screen) |

### Slide 9, one night (`DECK_NIGHT`)

There's no recording of a live night, so this slide is rebuilt from the app takes plus a panel of the agent's real tool calls. `film/DECK_PLAN.md` slide 9 has the new beat list. The files:

| Beat | App side | Agent side: real calls from Baari-eval on AgenticOrg, 4 Oct, prompt v5, GPT-5.4 |
| --- | --- | --- |
| The vote, then Pakka | `mixes/pair-CA15-vote-pakka.mp4`, or `clips/CA15-01` and `CA15-02` | `evals/runs/R3/E02/2026-10-04T14-54-16-870Z_platform.json`: LOCK, 11 calls (`tool_calls`), the result to Vinay, Mummy and Papa (`messages`) |
| Baari thinking | `clips/CA17-clean-app-light-t3.webm`, first 6 s: the pill's "Daam dekh rahi hoon…" | same LOCK trace: `pl.balance`, `pincode_serviceability`, `calculate_shipping_cost` |
| The TV stamp | `mixes/pair-CV02-tv-hero.mp4` | none |
| Money | `clips/CA35-clean-app-light-t3.webm` (the ₹520 Payment card), `mixes/split-CA51-kirana.mp4` (kirana paid) | same LOCK trace: `pl.debit` and its status read, `create_shipment` |
| The parcel overnight | `mixes/split-CA50-dawn.mp4` | `evals/runs/R3/E07/2026-10-04T13-52-14-139Z_platform.json`: CHECK, `track_shipment`, `hyperlocal_create_order`, one line to Vinay |
| Sunita's morning | `mixes/pair-CA12-hindi-tamil.mp4`, `clips/CA52-01-app-light-t1.webm` (karaoke) | none |
| "Haan haan" | `clips/CA52-01-app-light-t1.webm` (her Telegram thread) | `evals/runs/R3/E08/2026-10-04T13-58-05-035Z_platform.json`: COOK_REPLY, `speech_to_text`, `text_to_speech`, `tg.voice` to Sunita |
| The receipt | `clips/CA55-01-app-light-t1.webm` | none |

Show tool names and who a message went to, not the message text: E07's message is about chana dal, not rajma. Poster: `mixes/pair-CV02-tv-hero.png` (the hero at Pakka beside the TV stamp), which is the fallback the slot already defined.

### Other deck slots

- `DECK_RAIL`, slide 15: no clip. The slide runs on diagram 04 alone.
- `DECK_KHATA`, slide 17: `clips/CA71-01-app-light-t1.poster.png`, or `mixes/pair-CA42-CA55.mp4`.

## The trailer

| Shot | Use | Change from the plan |
| --- | --- | --- |
| 1, 25 | Made lock screen. The nudge copy is in `clips/CA70-01-app-light-t2.poster.png` | none |
| 3, 15, 16, 18 | Made Telegram cards | Copy the text word for word from the R3 traces' `messages` (above), not from a driven night |
| 4 | Made splash; `clips/CA01-01-app-light-t1.webm` as reference | none |
| 8 | `clips/CA76-01-app-light-t2.webm`, the rules scene (`.rules-read.png`), with L07 voiced over it | No real mic. The rule is typed in the take, so show the typed line growing into giant type, then the chips |
| 9 | `clips/CA17b-clean-app-light-t3.webm` | none |
| 10 | `clips/CA25-01-app-light-t1.webm` | none |
| 11 | `clips/CA26-01-app-light-t1.webm` | none |
| 12 | `clips/CA76-01-app-light-t2.webm` (`.spin-mid.png`), `clips/CA27-01-app-light-t1.webm` | none |
| 13 | `clips/CA17-clean-app-light-t3.webm` for the pill; verbs made from `app/verbs.js` | No live steps (CA38) |
| 14 | `clips/CA64-clean-app-dark-t3.webm`, the in-app call: orb, timer | No phone call. Lay L09 to L11 over the orb; keep "Baari sun rahi hai" and the counter as made overlays |
| 15 | `mixes/pair-CV02-tv-hero.mp4`, `clips/CA15-02-app-light-t1.webm` | none |
| 16 | `mixes/pair-CA69-done-missed.mp4` | none |
| 17 | `mixes/split-CA51-kirana.mp4`, `clips/CA49-01-app-light-t1.webm` | none |
| 18 | `clips/CA35-clean-app-light-t3.webm` | No checkout page. End on the thumb over "₹520 pay karo". Don't draw a Pine Labs page |
| 19 | `clips/CA43-01-app-light-t1.webm` (`.kyun.png`) | none |
| 20 | `mixes/split-CA50-dawn.mp4` | none |
| 22 | `mixes/pair-CA12-hindi-tamil.mp4`, `clips/CA52-01-app-light-t1.webm` | none |
| 23 | Made, with the fallback voice | none |
| 24 | `mixes/split-CA51-kirana.mp4` | none |
| 26 | `clips/CA55-01-app-light-t1.webm` (`.torn.png`) | none |

## Also worth a look

Mixes nobody planned for that cut well into either piece: `montage-island`, `montage-ghar`, `montage-screens`, `montage-onboard`, `montage-small` (about 12 to 15 s each, hard cuts on real taps); `pair-CA63-CA64` (type to Baari, or call her); `pair-CA35-CA67` (Baari asks once, and the quiet log counts it); `split-CA56-bade-akshar` (big text); `split-CA74-roti` and `split-CA75-steam` (small touches). Flows A1 to A6 are long single takes of whole stories, useful for picking moments.
