# Deck sources

Every outside asset the deck shows or runs on, with its source and licence. Anything not listed here is ours: the slides, the diagrams in `docs/diagrams/`, the app and everything captured from it.

## Shown on the slides

| Asset | Where it's used | Source | Licence |
| --- | --- | --- | --- |
| Family (Regular, Medium, SemiBold) | Headlines | `app/fonts`, through `shared/fonts` | Licensed by the team for the app |
| Inter 400 to 700 | Body text | Fontsource | SIL Open Font License 1.1 |
| JetBrains Mono 500 | Numbers, times, code | Fontsource | SIL Open Font License 1.1 |
| Noto Sans Devanagari, Bengali, Kannada, Tamil, Telugu | Hindi and the other scripts | Fontsource | SIL Open Font License 1.1 |
| Family faces (Mummy, Papa, Didi, Vinay) | s05, s06, s11 | Personas by Draftbit, as the app uses them (`app/avatars.js`), exported to `film/shared/cast/` | CC BY 4.0 |
| Cast bits (`bit-*.svg`) and Mummy at the fridge (`mummy-fridge.svg`) | s02, s03, s11, s17 | Drawn for the landing page and the trailer, in `film/shared/cast/` | Ours |
| Partner logos: Gnani, Pine Labs, Delhivery | s17, s18 | `app/img/brands`, used exactly as given, never redrawn. Pine Labs on the khata cover uses the app's own white filter | The partners' marks, used to name the partner |
| Telegram logo | s10a (diagram 01) | `app/img/brands` | Telegram's mark, used to name the service |
| Baari mark (ब) | The pill, s18, A2, the footer | `app/img/baari-mark.png` | Ours |
| Object renders (ballot, khata book, parcel, kirana bag, pressure cooker, voice note) | s03, s11, and diagrams 01 and 04 on s10a and s15 | `app/img/obj`, made for the app (commit 3585226) | Ours |
| App screens and poster stills | s08, s09, A5 | Shot from the household app on its fixtures by `shoot.mjs` into `assets/screens/` (s08, A5), and `film/mixes/` (s09) | Ours |
| QR code on s18 | s18 | Drawn at load time by qrcode-generator 1.4.4 | MIT (the library) |

## Quoted on the slides

| Fact | Slide | Source |
| --- | --- | --- |
| Women 299 min a day, men 97, on unpaid domestic work | s02 | NSO Time Use Survey 2019 |
| The four steps of mental load: anticipate, find options, decide, monitor | s06 | Allison Daminger, "The Cognitive Dimension of Household Labor", American Sociological Review 84(4), 2019 |
| Interview quotes | s02, s03, s05, s07, s14 | Our interviews, with the speaker's role and how we heard it under each quote |
| Eval runs | s12, A4 | `evals/out/runs.csv`, `evals/runs/R3/` |
| Build numbers | s13, A1, A3 | `film/deck/stats/` (git log, Claude Code transcripts, ccusage, `gh api` for commit comments) |

## Code the deck runs on

| Library | Version | Where | Licence |
| --- | --- | --- | --- |
| GSAP | 3.14.2 | `shared/vendor/gsap.min.js`, every slide's timeline | GSAP standard licence (no charge) |
| qrcode-generator | 1.4.4 | `shared/vendor/qrcode.js`, slide 18 | MIT |
| puppeteer-core | 23.11.1 | `export.mjs`, the checks (tooling only) | Apache 2.0 |
| pdf-lib | 1.17.1 | `export.mjs`, the PDF (tooling only) | MIT |
| python-pptx | 1.0.2 | `make_pptx.py`, the venue .pptx (tooling only) | MIT |
| HyperFrames | | The composition format the slides follow (`data-composition-id`, paused timelines on `window.__timelines`) | Its own licence; nothing of it is bundled in the deck |
