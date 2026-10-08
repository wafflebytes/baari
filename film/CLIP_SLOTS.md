# Clip slots: what the trailer and deck can count on

Written 8 October 2026, 22:20 IST. Shared by `film/TRAILER_PLAN.md` and `film/DECK_PLAN.md`. The slot list itself is `film/slots.json`.

The finale handoff plans a lot of recordings. Some an agent can make on its own; some need a person with a phone. Vinay's session is working through the handoff now. The human recordings aren't promised. So both pieces are built to be complete without a single human recording, with room for the real ones to drop in if they come.

## 1. Three kinds of source

| Kind | What it means | Promised? |
| --- | --- | --- |
| **Made** | We build it in HyperFrames from the app's own code, tokens, renders and audio: kinetic type, the island and its verbs, phone mockups, Telegram-style cards rebuilt from real message text, the karaoke from `app/audio/`, object renders, painted shots | Yes. It's ours |
| **Auto** | An agent captures it with Puppeteer or Playwright, with no person: the app at phone size, `/live` and `/tv` at 1920 x 1080, a whole demo night driven by script, the sim call, the message and event logs | Yes, once someone runs the captures in section 2 |
| **Human** | Needs a person and a phone: Telegram on real phones, real voices, the real call, the lock screen on an installed iPhone, real footage of a kitchen, a parcel, a thali | No. A bonus |

**The rule.** Every slot has a Made or Auto default, and the trailer and deck ship on those. A Human clip replaces its default only if it arrives, passes the truth pass, and fits the slot's maximum length.

## 2. The Auto captures we need

This is the list for whoever runs the clip pipeline (finale handoff step 14), in priority order. Everything follows the handoff's capture rules:
- No cursor and no touch dot. `film/scripts/record.mjs` needs its `--no-dot` flag.
- Phone captures at 393 x 852 at scale 3. Screens at 1920 x 1080 with `cursor: none` injected.
- Light theme, plus dark where a slot asks for it.
- A tap log saved beside every clip.

### The driven night (the most valuable capture)

One script records a whole night with no phones:
1. Announce it in STATUS.md (live rails are shared).
2. Start two Puppeteer recordings at the same moment: `/live` at 1920 x 1080, and the app on live state at phone size, sitting on Ghar.
3. Set the kitchen so rajma chawal makes the shortlist, and have the injected pick choose it. The trailer's lines, the plate render and the soak task all assume rajma; T1b's driven night locked kadhi chawal. If the dish can't be steered, the Made shots follow whichever dish the captured night locks, since renders exist for all 40.
4. Run `python3 baari-mock/scripts/drive.py veto` with `RAILS_BASE` and `ADMIN_KEY` from `.env.shared`. It casts the eval sim cast, starts a demo night, injects the taps and wakes each phase. Nothing reaches a real phone.
5. While it runs, the app recorder visits Saamaan after BUY, Sunita after BRIEF, and Khata at the end, then returns to Ghar.
6. Stop when the cook's reply closes. T1 took 11 minutes.
7. Save:
   - both MP4s
   - `GET /admin/sim-outbox` as JSON (every message's exact text)
   - `GET /app/events` as JSON (every event with its time)
   - a `marks.json` of wall-clock times for each phase and event, so posters and cuts can find their moments

Run it twice: `veto`, then `vote`. If PL1 passes before then, run a third with the Rs 520 link.

### The rest

| Id | Capture | How | Used in |
| --- | --- | --- | --- |
| A01 | Onboarding by voice (CA08) | Chrome's fake mic plays a Gnani WAV of the trailer's L07 line: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=l07.wav`. Gnani STT through rails hears it for real | Trailer 8 |
| A02 | Island question with "Rajma any day" (CA17) | Fixture, open the island on that question | Trailer 9 |
| A03 | Cuisine deck, three swipes (CA25) | Fixture, scripted swipes | Trailer 10 |
| A04 | Voice studio, five voices (CA26) | Fixture, scripted swipes, page audio recorded | Trailer 11 |
| A05 | Ghumao and the invite card (CA10, CA27) | Onboarding flow | Trailer 12 |
| A06 | The island's live steps during a run (CA38) | From the driven night | Trailer 13, deck 9 |
| A07 | The hero through the night (CA15) | Fixtures `shortlist`, `lock`, `morning`, and the driven night | Trailer 15, deck 9 |
| A08 | The TV reveal (CV02) | `/tv` at 1920 x 1080 during the driven night's lock | Trailer 15, deck 9 |
| A09 | `/live` for a whole night (CL01, CL02) | From the driven night | Deck 9, deck 14 |
| A10 | Kirana card, Khata Pine Labs card, island link card (CA51, CA42, CA35) | Fixture `sync` and the driven night | Trailer 17 and 18, deck 8 and 16 |
| A11 | The Pine Labs sandbox checkout | Open `checkout_url` from `/app/state` → `pinelabs.requests[]` at phone size and record it. Don't pay | Trailer 18 |
| A12 | The "Raat bhar" Delhivery card: stars fade, dawn glows, the truck crosses five stops (CA50, see `film/RECORDING_DELTA.md`) | Fixture and the driven night | Trailer 20 |
| A13 | The karaoke brief: Sunita's page and the six-language preview (CA52, CA12) | Fixture and onboarding | Trailer 22 |
| A14 | The receipt printing (CA55) | `/receipt/<date>` after the driven night | Trailer 26 |
| A15 | The night task card (CA32) | Fixture `sync` | Trailer 16 |
| A16 | The sim call | `POST /admin/call {"sim":true}`, then `GET /admin/call` for the transcript. Rails' Hindi lines get voiced in Gnani for the edit | Trailer 14, deck 9 |

**Where it can run.** The app on fixtures can be captured anywhere with the repo. Anything on live state (the driven night, the checkout, `/live`, `/tv`) needs a machine that can reach `baari.pages.dev` and `baari-rails.vercel.app`. This cloud container can't; its network policy blocks both.

## 3. Human, if it comes

These replace a default only if they arrive and pass:
- **Telegram on real phones** (CT rows). The default is Made: Telegram-style cards rebuilt in HyperFrames from the exact outbox text of a passing night. Use bubble shapes and a greyscale palette, never Telegram's own branding, the same rule `/live` follows.
- **Vinay's real voice.** The default is the Gnani voice Jalaj. A real take is recorded to the Gnani take's timing, so swapping it in doesn't move the edit.
- **Sunita's real reply.** The default is the Gnani voice Bhavna, or the eval cast's own reply audio.
- **The real phone call** (CK rows). The default is the sim call (A16) with Gnani voices.
- **The lock screen on an installed iPhone.** The default is a Made iOS lock screen with the app's real nudge copy.
- **Real footage** R1 to R10 from the trailer plan. Each has a Made or Auto default in the trailer's sources table.

## 4. Placeholders

Until a clip lands, its slot shows a placeholder at the clip's exact size and position, so the animatic can be timed and reviewed now:
- **The frame.**
  - Phone slots: an iPhone 15 frame (393 x 852 screen, Dynamic Island cut out, the app's warm shadow).
  - `/live` and `/tv` slots: a 16:9 glass frame.
- **Inside the frame.**
  - Best: a still of the app in that state. Playwright screenshots of the fixtures work today, locally, with no live access.
  - Otherwise: a cream card with the slot id in mono, the slot's one-line "shows", and the island's thinking shimmer, so the animatic still moves.
- **The tag.** A small haldi chip in the corner: "PLACEHOLDER · A07".
- **The guard.** The render script fails a final render if any placeholder is left.

## 5. Timing that stretches

Real clips will run longer or shorter than planned. The edit absorbs that instead of fighting it:
- **The slot list.** `film/slots.json` gives every slot a minimum, target and maximum length, an allowed speed range, and whether idle frames may be cut.
- **A build step.** It writes the HyperFrames `data-start` and `data-duration` values from `slots.json` plus the real clip lengths. A 6-second clip where we planned 4 moves everything after it, and the voice cues that hang off it move too.
- **Music.** It's arranged in one-bar blocks (1.875 s at 128 BPM), with loopable verse sections. The build adds or drops whole bars, so cuts stay on the beat.
- **UI captures.** Cut idle frames (`ffmpeg -vf mpdecimate`, or `freezedetect` to find them), and allow 1.0x to 1.5x. Never speed up a voice. A long agent wait becomes a clock tumble, not a speed-up.
- **Caps.**
  - The trailer stays under 90 seconds; over that, apply its trim order.
  - The deck's demo video (slide 9) is capped at 75 seconds, aiming for 60, and the app tour (slide 8) at 50. The deck's 8 minutes don't move; trim the video, never the talk.

## 6. PDF posters

The live deck plays each video in full. The PDF can't, so every video slot in the deck names the one frame that tells its story, and that exact frame goes on the PDF page. No random frames.

### How a poster is chosen

1. **Auto captures take their own poster.** The capture script waits for the slot's cue: a DOM state, or an event in `/app/events`. It waits until every animation on the page has finished (`document.getAnimations()` all done, plus 100 ms). Then it takes a full-resolution screenshot: scale 3 for phone slots, scale 2 for 1920 x 1080. That's sharper than any frame pulled from a video.
2. **Video-only sources** (human clips, composites):
   - Find the cue's time from `marks.json`, the tap log, or the `/live` clock shown at the start of every take.
   - Pull every frame in a two-second window after it:

     ```bash
     ffmpeg -ss <cue> -t 2 -i clip.mp4 -vsync 0 cand/%03d.png
     ```

   - Score each frame for stillness (how little it differs from its neighbours) and sharpness, and put the best six on a contact sheet.
   - Pick by eye against the slot's poster spec.
3. **Checks.**
   - The key fact is readable at PDF size: the dish, the amount, the partner's name.
   - It's not mid-animation and not blurred.
   - No OS banners, no cursor, no personal data.
   - Same crop as the live slide.
4. **In the deck.** The slide's `<video>` gets the poster as its `poster` attribute, and `?print` renders the poster in the video's place. Live and PDF show the same moment.

### Poster specs

| Slot | What must be on screen | Cue | Settle |
| --- | --- | --- | --- |
| Deck 9 (`DECK_NIGHT`), the demo video | One composite frame. Left: `/live` with all four rails carrying calls and the D lines column filled. Right: the app's hero reading "Pakka" over tonight's dish, the kirana card "taiyaar, paid", and the island's last live step. Caption: "One night, run by the agent. Telegram and Gnani real · Pine Labs sandbox · Delhivery mock" | The last BUY event (kirana paid or parcel booked) in `marks.json` | 1.5 s |
| Deck 9, fallback | The app hero at "Pakka" beside the TV's stamp | The lock event | 1.0 s |
| Deck 14 (`DECK_RAIL`), if it plays `/live`'s refusal (CR04) | The Pine Labs track stopped at a red signal, the refusal line readable ("over ₹300, asked Papa") | The `refuse` event | 0.8 s |
| Deck 16 (`DECK_KHATA`), if it plays the Khata clip (A10) | The Pine Labs card with the ₹520 link waiting, what it's for, and the reason line | The `link` event | 0.8 s |
| Deck 8 (`DECK_TOUR`), the app tour | A wall of eight phones, each at its own clip's poster still (`film/RECORDING_DELTA.md` section 4), with the chapter name, one line of why and the insight id | Each clip's `{ "shot": "poster" }` still | none |
| Trailer thumbnail | Shot 1: the "Lauki has noticed" notification fully on screen | End of the notification's slide-in | 0.3 s |

## 7. What changes when a recording arrives

1. Add it to `film/clips/manifest.json` (the handoff's format), with its tap log and captions.
2. Check it against the truth pass.
3. Point its slot in `slots.json` at the file.
4. Rebuild. The timing reflows, the placeholder goes, and for deck slots the poster pass runs.
5. Watch the act it sits in from the start. A changed length can move a cut off the beat.
