# Notes from the video session to the slides session

Written 9 October by the cloud session that took over the videos. Newest first.

## 9 October, gate 2

**The owner approved Baari's colours in Base44's roles** (cream ground, ink type, haldi only on the one thing being acted on, the haldi flood on the end card), **and the night's tool-call panel inside the video.** So `night.mp4` carries its own panel, clock and footer: slide 9 can drop its own panel and caption and give the video the full width.

**Phones look like the README's.** The tour and the night are re-recorded with `film/scripts/clip.mjs --ios`: the local app at 393 x 852 with the iPhone safe areas, the README's status bar drawn in (white over dark screens), no home bar, the same way your `film/deck/shoot.mjs` shoots the slide stills. So the tour's frames and your slide 8 stills match, and the slide's README frame fits around `tour.mp4` with nothing clipped. The bar's clock follows the screen: 9:33 on the island, 8:12 on the cuisine deck, and so on, as in `shoot.mjs`.

**The night's clock** lives in the panel's own row, above the heading, so no heading runs into it.

**Lanes.** The tour was built by lane D and the night by lane E, on the owner's prompts; both are merged into `video-handoff`.

## 9 October, gate 1

**Two files changed that HANDOFF.md lists as frozen for me, both on the owner's direct instruction:**

- `film/LOOK.md` is rewritten from the Base44 launch video, which the owner named as the look source for the video work. The tokens are unchanged (palette, type, grid, island, captions all match `film/shared/theme.css`), so nothing on a slide breaks. What's new: Base44's measured sizes and motion, a shot-by-shot map of its moves, and faster entrances for small UI (200 to 300 ms; hero moves keep a beat).
- `film/checks/CHECKS.md` is untouched. My report is `film/checks/trailer/TRAILER_CHECKS.md`; please link it.

**Slide 9: the night video now carries its own tool-call panel.** The owner's render rules put the panel inside the video ("the night video's left panel quotes the three R3 traces"), as DECK_PLAN slide 9 also says. So `night.mp4` has, on its left, the heading, a clock, the run label and every call, typed on at the beat times in section 6 of HANDOFF.md. It also carries the truth line as a footer. The slide's own panel and caption (in `deck-s09.png`) would show everything twice. If the owner keeps the panel in the video, the slide can drop its panel and caption and give the video the full width. Poster: `film/deck/videos/style-frames/night-poster.png`. This is waiting on the owner's answer at gate 1.

**Panel tool names.** The panel shows the rails operation each call ran (`tg.updates`, `tg.send → Vinay`, `pl.balance`, `pl.debit.<id>` and so on), generated straight from the traces by `film/deck/videos/night/scripts/panel.py`. The traces record them through the `elevenlabs_gnanibaari` bridge (PRD 6.2), so `tg.send` appears there as `create_voice_clone:tg.send`. Your slide used `read_messages` and `send_message`, which are not the names in the traces.

**The end card's QR goes to the app**, `https://baari.pages.dev`, not the Telegram bot (the owner, 9 October). If any slide repeats the trailer's end card or its QR, match it.

**Tour and night are silent.** No voice, no music: a person talks over them live (the owner, 9 October).

**Trailer length.** Shots 22 and 28 grew by two beats each, so the trailer is 192 beats, 90.0 s, for now. The animatic at gate 2 trims it back under 90.
