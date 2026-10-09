# Video checks: trailer, slide 8 tour, slide 9 night

The checks report for the three videos. (The deck's own checks are in `film/checks/CHECKS.md`, which belongs to the slides session.) Each check is marked pass, fixed or n/a; fixed and n/a carry a note. A new check is added for every error no check caught.

## Gate 1, look: 9 October

Checked on the gate 1 style frames, rendered from the real compositions:
- Trailer: `film/trailer/style-frames/`, one frame per act. Shot 1 at 1.6 s, shot 5 at 14.2 s, shot 8 at 26.95 s, shot 15 at 48.27 s, shot 18 at 59.7 s, shot 20 at 64.3 s, shot 22 at 66.45 s and shot 28 at 89.9 s.
- Tour: `film/deck/videos/style-frames/tour-ch1-first.png`, chapter 1's first frame.
- Night: `film/deck/videos/style-frames/night-poster.png`, the first frame, which is the poster.

DOM measurements for the trailer are in `film/checks/dom-trailer.json` (`node checks/dom.mjs trailer s01@1.6 s05@4.825 s08@6.794 s15@1.864 s18@2.981 s20@3.831 s22@0.356 s28@5.056`).

| Check | Trailer | Tour | Night | Notes |
| --- | --- | --- | --- | --- |
| spelling-and-facts | pass | pass | pass | Every word traced to its source. Shot 1: `app/extras.js` "quiet" nudge. Shots 5 and 8: L04 and L07 from `assets/vo/manifest.json` and their English subs. Shot 15: the TV take and L12's sub. Shot 18: the CA35 still and L15's sub. Shot 20: the CA50 still, and clock times from TRAILER_PLAN shot 20 (10:45 PM to 6:40 AM, matching the card's 6:40). Shot 22: `app/audio/brief.json` Hindi words. Shot 28: L20's sub. Night: every call line is generated from the three R3 traces by `night/scripts/panel.py` (tool names and recipients only); the build refuses to run if a run's call count and its times disagree |
| truth-tags | pass | n/a | pass | Trailer: "App reminder" (1), "App, real speed" (8), "demo data" (15), "Pine Labs sandbox" (18, with the app's own "demo checkout" on screen, no Pine Labs page drawn, nothing marked paid), "Delhivery mock" (20). Tour n/a: the bare app screen, framed and captioned by the slide. Night: the footer on every frame reads "App on demo data · tool calls from real runs on AgenticOrg, 4 October" |
| text-safe-area | pass | n/a | pass | Trailer: dom.mjs, 0 fails on 8 frames. Night: the panel's text runs from x 144 to 728 and y 140 to 876; the footer from x 360 to 1560 and y 960 to 1008, inside 96 / 54. Tour n/a: no text is added |
| no-collisions | fixed | n/a | pass | Shot 20 first framed the whole app screen, and the island sat on the app's own "Raat bhar · Sookha saamaan · Kyun?" row. Now only the night card is framed, 910 x 833, under the island. dom.mjs: 0 fails |
| text-contrast | pass | n/a | pass | Trailer worst is 5.12:1 (mute on cream, shots 5, 8 and 22). Night: mute on the white panel is 5.6:1, the footer mute on cream 5.1:1 |
| frame-sheet | n/a | n/a | n/a | No full render yet; due at gate 4 |
| clip-speed | pass | pass | pass | Shots 8 and 15 use wall-clock takes (CA76, CV02), which play at real speed. Tour chapter 1 (CA17 clean) and night beat 1 (CA15-01, CA15-02) are clip.mjs takes, retimed at 1.25x |
| still-glitch | pass | pass | pass | New check script `film/checks/trailer/glitch.py` finds the zoomed frames. CA15-01 has them at 2.68 to 4.16 s and 7.64 to 9.0 s; the night uses 0.0 to 2.5 s and 4.3 to 6.675 s. CA15-02 has them at 3.28 to 6.52 s; the night uses 0.0 to 3.1 s, then its 3x still. CV02 (shot 15) uses 29.794 to 31.744 s, between its stills at 25.33 and 33.48 s. CA17 clean has no stills. Shots 18 and 20 use 3x stills, not video |
| transitions-carried | n/a | n/a | n/a | `film/TRANSITIONS.md` comes at gate 2 |
| format | n/a | pass | n/a | Trailer and night aren't rendered yet. Tour chapter 1 test encode: 786 x 1704, H.264 High, yuv420p, constant 30 fps, 147 frames, no audio |
| loudness | n/a | n/a | n/a | Trailer: no mix yet (gate 3: bed 8 dB under every line, -14 LUFS, -1 dBTP). Tour and night: n/a for good, because a person talks over them live and they ship silent (owner, 9 October) |
| sync | n/a | n/a | n/a | Trailer: no mix yet. Tour and night: n/a for good, no audio |

### Checks added at this gate

- **still-glitch, by detector** (`film/checks/trailer/glitch.py`). The old rule ("never cut within 1.5 s of a still") is a distance; the detector reads the frames, so every range can be checked against the frames it actually contains.
- **QR decodes to its target.** The end card's QR is decoded with OpenCV after every render of shot 28. Gate 1: decodes to `https://baari.pages.dev`.
- **Poster frame is complete.** Anything cued at 0 in the night must be on its first frame, because that frame is the poster. Caught when the first night poster had an empty panel; the panel build now sets 0-cued items before the first frame.
