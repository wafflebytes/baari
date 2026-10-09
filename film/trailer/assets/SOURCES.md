# Sources and licences

Every outside asset in the trailer, the slide 8 tour and the slide 9 night, with where it came from and its licence. A row is added before an asset goes into a render. Anything we made ourselves is listed at the end, so it's clear what is ours.

## Type

| Asset | Where | Source | Licence |
| --- | --- | --- | --- |
| Family (Regular, Medium, SemiBold) | `film/shared/fonts/Family-*.woff2`, from `app/fonts` | Licensed by the team for the app | Commercial licence held by the team. The files are tracked in this repo (they were before this handoff). Check the licence allows that if the repo goes public |
| Inter 400 to 700 | `film/shared/fonts/inter-*.woff2` | fontsource | SIL Open Font License 1.1 |
| JetBrains Mono 500 | `film/shared/fonts/jbm-500.woff2` | fontsource | SIL Open Font License 1.1 |
| Noto Sans Devanagari, Bengali, Tamil, Kannada, Telugu | `film/shared/fonts/{deva,beng,taml,knda,telu}-*.woff2` | fontsource | SIL Open Font License 1.1 |

## Images and marks

| Asset | Where | Source | Licence |
| --- | --- | --- | --- |
| Gnani, Pine Labs and Delhivery logos | `app/img/brands/` | The partners' own marks, as supplied for the app | Trademarks of their owners, used as given (never redrawn or recoloured) to credit the partners |
| Family faces (Vinay, Mummy, Papa, Didi, Dadi, Sunita) | `film/shared/cast/face-*.svg` | Personas by Draftbit, via the app | CC BY 4.0. Needs a credit line wherever the faces appear; it goes in the deck's credits and the trailer's description |
| Landing cast (blob, samosa, tomato, chilli, bits) | `film/shared/cast/` | Exported unchanged from the landing page's `hero-art.js` | Ours |
| Dish and object renders | `app/img/dishes`, `app/img/obj` | Made for the app | Ours |
| Base44 launch video frames | `film/trailer/look-ref/` | "Build an app with your name on it", Base44, 720p download | © Base44. Reference only: used to measure the look; no frame of it appears in any render |

## Code

| Asset | Where | Licence |
| --- | --- | --- |
| GSAP 3.14.2 | `film/shared/vendor/gsap.min.js` | GSAP standard "no charge" licence |
| qrcode-generator 1.4.4 (Kazuhiko Arase) | `film/shared/vendor/qrcode.js` | MIT |
| HyperFrames 0.8.142 | `film/trailer/node_modules` (not committed) | The renderer, per its npm licence; nothing of it ships in the video |

## Sound

The trailer only. The tour and the night ship with no audio track.

| Asset | Where | Source | Licence |
| --- | --- | --- | --- |
| Voice lines L01 to L20 | `film/trailer/assets/vo/` | Gnani Vachana TTS, timbre-v2.5, hi-IN, voices as cast in TRAILER_PLAN section 9 | Generated on the team's Gnani account for this project |
| The app's brief audio and voice samples | `app/audio/` | Gnani TTS, generated for the app | Same |
| UI sounds: bell, chime, clack, msg, pop, stamp, whoosh and others | `film/public/sfx/*.mp3` | In the repo from the earlier film; where they came from was never recorded | Unknown. The owner approved using them for the trailer's rhythm on 9 October. Each one used is listed below as it goes into the mix. Replace any whose source turns up with a restrictive licence |
| Kitchen-like hits (katori, belan, tadka) | `film/trailer/scripts/kit.py` | Synthesised in code, seeded | Ours |

### UI sounds used in the mix

Filled in at gate 3, one row per file and the shots it plays in.

| File | Shots |
| --- | --- |
