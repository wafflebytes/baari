# Deck transitions and the 8:00 walkthrough

How the deck moves from one slide to the next, and the timed walk through all 19 slides. The trailer's cuts are in `film/TRANSITIONS.md`, which belongs to the video session.

## How a cut works

The player (`deck.html`) loads the next slide in a second iframe behind the current one. It waits until that slide's timeline reports ready, at its first frame. Then the current slide fades off over it in 220 ms on the deck's ease, `cubic-bezier(0.22, 1, 0.36, 1)`. The new slide's build starts as the fade begins. So a cut never shows a blank frame: under the fade there is always the cream page, the section pill and the new slide's first entrances.

The carrier is the "whose baari" pill at the top centre:

- **Same section:** the pill sits on the same stop in both slides, so it doesn't move through the cut.
- **New section:** the player passes `?from=<last section>`, and the pill springs from the old stop to the new one. This is the spring the deck allows (springs only for the ब pill and faces).
- **No pill** (slide 1 and the appendix): the cream page carries the cut. The appendix's page tag holds at the top right from A1 to A7.

Advancing: the right arrow plays to the slide's next stop. If a build is still running, the first press completes it. At the last stop the next press cuts to the next slide. The left arrow cuts back to the previous slide at its final frame.

## Cut by cut

| Cut | Pill | The new slide's hero move |
| --- | --- | --- |
| start, s01 | none | The question types itself, letter by letter |
| s01, s02 | appears at Mummy ki baari | Four things only Mummy holds orbit out of her head onto the wall |
| s02, s03 | holds | One card per sentence of the talk, one press each |
| s03, s04 | holds | Faces pop on the app's spring |
| s04, s05 | springs to Humne kya suna | Slide 2's four thoughts fold to dots and close around her head |
| s05, s06 | holds | The strike draws across what we'd have built |
| s06, s07 | holds | The rows reveal one per point; the last takes the haldi |
| s07, s08 | springs to Baari ki baari | The tour plays in one phone; chapter names land like the Badlo reel |
| s08, s09 | holds | The night plays (full bleed once the video lands); the panel types along |
| s09, s10a | holds | Diagram 01 builds left to right, then one haldi path lights end to end |
| s10a, s10 | holds | Diagram 02 builds in the order the talk names it |
| s10, s11 | holds | The playhead walks the night's ruler, one break per press |
| s11, s12 | holds | The run dots fill in the order the runs happened |
| s12, s13 | springs to Hamari baari | The commit clock's hand sweeps the day |
| s13, s14 | springs back to Baari ki baari | None, on purpose: a plain fade |
| s14, s15 | springs to Pine Labs ki baari | The E04 line types, then the guard's five questions light |
| s15, s16 | holds | The mandate card builds line by line |
| s16, s17 | springs to Ghar ki baari | The khata's cover swings open |
| s17, s18 | springs to Aapki baari | The ब drops from the pill into the QR, which draws outward |
| s18, A1 | leaves | The khata's stamp lands |
| A1, A2 | none; page tag holds | The receipt prints in the app's stepped rhythm |
| A2, A3 | page tag | The rail map is laid left to right |
| A3, A4 | page tag | The cards grow, each to its prompt's length |
| A4, A5 | page tag | One wave across the wall of screens |
| A5, A6 | page tag | Diagram 03 fades in |
| A6, A7 | page tag | Diagram 05 fades in |

## The 8:00 walkthrough

Talk seconds are `talk` in `timing.js`, and they sum to exactly 480. The talk sets the clock: a slide's build is shorter than its talk except on the two video slides, and a build always ends on a page held at least 1.5 s. Presses are the stops the speaker taps through. The last stop on each slide is the end of its build, so one more press moves on.

| # | Slide | Speaker | Talk | Starts at | Presses | Build |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Aaj kya banega? | Chaitanya | 25 s | 0:00 | 2 | 3.7 s |
| 2 | Whose baari: Mummy's | Chaitanya | 20 s | 0:25 | 1 | 4.3 s |
| 3 | How they get by today | Chaitanya | 20 s | 0:45 | 4 | 5.0 s |
| 4 | Who we are | Chaitanya | 15 s | 1:05 | 1 | 3.6 s |
| 5 | The kitchen lives in one head | Chaitanya | 30 s | 1:20 | 2 | 4.6 s |
| 6 | What we'd have built | Chaitanya | 25 s | 1:50 | 2 | 4.8 s |
| 7 | What we found | Chaitanya | 15 s | 2:15 | 1 | 3.6 s |
| 8 | The app, up close | Chaitanya, then "Vinay, teri baari" | 40 s | 2:30 | 1 | 41.2 s |
| 9 | One night, run by the agent | Vinay | 50 s | 3:10 | 1 | 52.0 s |
| 10a | How it's wired | Vinay | 18 s | 4:00 | 1 | 10.5 s |
| 10 | What wakes it | Vinay | 17 s | 4:18 | 1 | 10.1 s |
| 11 | Where a night breaks | Vinay | 30 s | 4:35 | 6 | 9.8 s |
| 12 | Tested on bad nights | Vinay | 20 s | 5:05 | 2 | 8.6 s |
| 13 | How two of us built it | Vinay | 25 s | 5:25 | 4 | 8.3 s |
| 14 | What it can't do yet | Vinay | 15 s | 5:50 | 1 | 3.0 s |
| 15 | The rail: Pine Labs | Vinay | 30 s | 6:05 | 3 | 11.9 s |
| 16 | The ask: an agent mandate | Vinay | 35 s | 6:35 | 1 | 6.9 s |
| 17 | What a family hands over | Vinay | 35 s | 7:10 | 2 | 5.5 s |
| 18 | Aapki baari | Vinay | 15 s | 7:45 | 1 | 4.6 s |
| | End | | | 8:00 | | |

Slides 8 and 9 run 1.2 s and 2 s past their talk because the video ends on a printed page held for 1.5 s. Slide 10a's talk is 7.5 s longer than its build, so the clock is back on time by 4:18. `notes.html` shows each slide's clock and the running total against this plan, and says how many seconds behind or ahead the talk is.

The appendix (A1 to A7) has no talk time. It's for questions and for reading the PDF later.
