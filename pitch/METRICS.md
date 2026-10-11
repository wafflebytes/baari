# The metrics slide (M1), and its demo

A plan for one slide, not the slide itself. M1 sits in Chaitanya's evals section at 3:50, where s13 used to be (s13 moves to the appendix). It answers the question every judge on this jury asks a product team sooner or later: how do you know it's working?

## The idea

Most agent demos measure how much the agent does. Ours measures how little it needs you. Vinay says at 2:35 that "most of the night, Baari's job is to not message you". M1 is the proof, live on a phone, a minute later.

So the slide has one hero number and two quiet columns:

- **Hero:** the app's own line, "Today Baari handled 22 things and told you 0 times" (`quietLine` in `app/learn.js`, read from `quiet` in `/app/state`). On 10 Oct at 01:13 the live rails read `handled: 22, told: 0` for the test house's night.
- **Left column, "The agent, measured":** numbers we have today.
- **Right column, "In a home, we'll measure":** what the first hundred homes are for.

## Left column: the agent, measured (all real)

| Number | What it is | Source |
| --- | --- | --- |
| 0 → 2 → 4 → 8 of 10 | Bad-night evals passed, rounds R1 to R3, prompts v3 to v5 | `evals/out/runs.csv`, ANSWERS Q9 |
| 82 | Platform runs on Baari-eval on 4 Oct | s12, `evals/out/runs.csv` |
| 12 and 5 | Agent runs on a full night, and how many times a person heard from it | old s10 note; recount from a fresh quiet log `[CHECK]` |
| 0.43 s | Gnani's transcript of the reel, end to end | our own call, 10 Oct 01:05, request `01a12229-7072-...` |
| 0.6 s | `/app/state` warm read, so the app is never stale | D1 in `docs/DEMO_TESTS.md` |
| 6 of 6 | Money rules held in code, not the prompt (ask above Rs 300, Rs 400 a day, payee list, a reason per debit, pay the kirana direct, no parcel before the link is paid) | s15 |

Pick four for the slide, not six. My pick: 8 of 10, 12 and 5, 0.43 s, 6 of 6. They map to the four judges in that order, roughly: the agent, the quiet, Gnani, Pine Labs.

## Right column: in a home, we'll measure

From `prd/PRODUCT.md` section 10 and the first-hundred plan. All four can be counted from rails logs, with no survey:

1. **Agreed and eaten.** Days the family agreed on a dish and it got cooked, out of cooking days.
2. **Time to lock.** Seconds from the shortlist to a locked dish.
3. **Whose baari.** The share of nights someone other than the usual person picked. The goal: not Mummy, three nights a week, in week four.
4. **Told per night.** How many times Baari messaged someone outside the plan. Lower is better. This is the hero number, tracked per home.

One more worth adding if there's room, for Arunabh: **first-reply yes with counts**, the share of mornings the cook's first reply already had counts, with no follow-up needed. It should rise as Baari learns how each cook answers.

## The demo (about 15 seconds)

On a phone mirrored to the screen (or a pre-recorded clip of the same thing as a fallback):

1. Open https://baari.pages.dev on Ghar. Scroll to "Baari, quietly". The row reads "Today Baari handled 22 things and told you 0 times". `[CHECK: the numbers on the night before; re-read them and fix the spoken line to match]`
2. Tap "See everything". The sheet "Today, quietly" lists every decision with its time, in plain words: "no votes at all, so dish 1 wins by default", "missing items computed for Lauki chana dal from today's pantry". The ones where someone was told carry a "told" chip.
3. Hold on the list for two seconds. Don't scroll. The point is that it's long and nobody was bothered.

What Chaitanya says over it is in `pitch/SCRIPT.md` at 3:50. About 40 words.

Before stage:
- Run a demo night the evening before (`/demo pick` on Telegram) so the quiet log has a full, recent night. A night where someone was told at least once reads more honestly than a perfect zero: it shows the log isn't decoration. If tonight's run gives `told: 1`, change the spoken line to "and told someone once".
- Record the 15 seconds as a clip too (`film/scripts/clip.mjs` records the app at iPhone 3x with no cursor), so a dead venue Wi-Fi doesn't kill the slide.

## Slide layout

Cream page, like the rest of the deck. Top: the section pill on "Baari ki baari". Centre-left: the phone, playing the demo clip or mirroring. Right of the phone, stacked: the hero line set large in the app's own typeface, then the two columns underneath at body size. Footer source line: "Live rails, 9 Oct night · evals/out/runs.csv · Gnani Vachana STT, 10 Oct". No chart. Four numbers and a phone are enough, and a chart invites questions about the axis.

## What not to put on it

- Token counts and Claude stats. They're true (s13, a01) but they measure us, not the product. Keep them for "how did you build it".
- Any number from the fixture household (`?fixture=day30`). It's demo data, and on a metrics slide a judge will assume it's real.
- A pass rate without the denominator. Always "8 of 10", never "80%".
