# Recording delta: the app since the capture catalogue

Written 9 October 2026, 01:45 IST, against `main` at 132b3a1 (app last changed in 8fbd10e, 00:40). For whoever records the app. Read it alongside the finale handoff's capture catalogue (CA01 to CA62, written 8 Oct around 19:00), `film/CLIP_SLOTS.md` and `film/slots.json`.

About fifteen app commits landed after the catalogue was written, most of them between 21:00 and 00:40. Some catalogue rows now describe screens that changed or no longer exist, and several new features have no row at all. This file lists both, plus what the trailer and deck can't ship without. Reach paths were read from the code at 132b3a1; check each one against the code before writing its shot file.

## 1. Capture facts that changed

- **Flags.**
  - Offline is `?offline`, not `?simoff`.
  - `&at=morning|day|night` forces the time of day.
  - `?onboard` runs onboarding.
  - `&splash` brings the splash back on a fixture.
- **Fixtures.** There are five: `shortlist`, `lock`, `morning`, `sync`, and the new `day30` ("Demo: din 30", Kadhi chawal vs Spicy Korean ramen, 9 facts, the weekly-question trend).
- **What a fixture does.**
  - It skips the splash, onboarding and the service worker.
  - Writes are simulated: a pairing completes after 5 s, a `say` replies after 1.8 s, and the call plays canned lines.
  - The turn comes from the phone, not rails.
- **Island verbs.** They never show in the header on a fixture, because no event is recent enough. They do show on every tap in onboarding (`?fixture=sync&onboard`).
- **Audio.** The voice studio and the karaoke play files that already exist in `app/audio/`. If a clip comes out silent, sync those same mp3s in the edit. Don't re-record them.
- **Can't be captured headless.** Gyroscope tilt and haptics. Leave them to a human take, or skip them.

## 2. Rows that changed

| Row | Was | Is now (capture this) | Reach |
| --- | --- | --- | --- |
| CA10 | Ghumao spins and lands on a face | Still true, but it's onboarding's coin spin, "Sikka ghumao", and the only Ghumao left | `?fixture=sync&onboard` |
| CA16 | Live status with its thinking shimmer | The pill animates its width between lines (480 ms), capped, with "Reading messages" shortened. The progress ring runs on its outline, three haldi bars move while a tool runs, and a badge bumps | any fixture |
| CA17 | Question card with ‹ › | Tapping the island grows it (clip-path) into "Aaj raat": a 6-step track, a collapsible run log, the talk box, and the **"Aapke liye" card deck**. Drag the front card and it tilts; past 90 px it flies off at 10° and goes to the back. A done card draws a check, folds away, and the count ticks down. Questions end with "Baari N% jaanti hai" | `?fixture=sync`, tap the pill |
| CA20 | Badlo holding the card's size | Badlo is now a **jackpot reel** inside the hero: 12 plates and names spin for 1.5 s with blur and 11 ticks that spread out, then a 14 px overshoot and spring back. The plate pops and the numbers re-enter, with skip lines like "Aloo puri skip: Papa ki thali mein aloo nahi". Swiping the plate past 60 px also shuffles. The dealt-card and slide versions are gone | `?fixture=lock`, tap Badlo twice |
| CA21, CA22 | Leftovers bowls, fridge line | Both are now card kinds inside the island deck. "Khaane ke baad": drag a finger along the bowls and each one bops. The fridge shows freshness rings | `?fixture=sync`, island |
| CA35, CA36 | Island Pine Labs card, kirana Haan and Nahi | Also cards in the deck (Payment, Aapki haan) | `?fixture=sync`, island |
| CA42 | Pine Labs card with real and demo tags | The tags are gone (v7.5.6). The card shows each request and its state | `?fixture=sync#/khata` |
| CA50 | Delivery night sky | The moon and sun sky is dead code. Capture the **"Raat bhar" (Overnight) card**: stars fade and dawn glows as the parcel moves, a truck crosses a 5-stop line, and the box contents show as chips ("Dabbe mein"). Then Sharma Kirana, "Raaste mein" and the rider | `?fixture=lock#/delivery` |
| CA51 | Kirana card PLACED to READY | Simpler card: a big face of who collects, a 3-segment bar, item chips, a Paid chip with the UTR | `?fixture=sync#/delivery` |
| CA52 | Sunita page | Her plate summary is now a light tinted card with quantity chips, and tonight's prep sits on her page. Her page's karaoke follows the playback position. The true word-timed karaoke is onboarding page 8 (CA12) | `?fixture=morning#/sunita` |
| CA59 | Offline via `?simoff` | `?offline`, then wait 5 s. The island reads "Offline · 6 min purana" and the ring turns red | `?fixture=lock&offline` |
| CA60 | Undo | A calmer bar with a text button, "Wapas lo", for 4 s | any fixture |
| CA34 | The demo night badge | da89aec dropped the demo pill. Check what's left before shooting: `day30` shows "Demo: din 30", and a guest night shows "Mehmaan picks tonight" | `?fixture=day30` |

## 3. New rows (no catalogue row yet)

Numbered on from the catalogue so they can join it.

| Row | What | Reach | Kind |
| --- | --- | --- | --- |
| CA63 | "Baari se baat" in the island: type or tap the mic, typing dots, the reply inline | `?fixture=sync`, island, talk box | W |
| CA64 | The in-app call: the orb breathing with the audio, the timer, "Daba ke bolo", "Likh ke" | From a question card: "Ya 2 min call" | W (canned lines on a fixture) |
| CA65 | "Kyun?" on the locked hero: the night's decision in plain words | `?fixture=lock`, Kyun? | W |
| CA66 | Baari ne seekha: facts with "Yaad rakhun?" and "Bhool gayi", and the weekly trend | `?fixture=day30`, + menu, Baari ne seekha | W |
| CA67 | The quiet log, "Baari ne chup chaap" | `?fixture=sync`, + menu | W |
| CA68 | Who's eating: the faces stack beside the subtitle, the sheet of switches, the count dropping | `?fixture=sync`, tap the stack | W |
| CA69 | Raat ka kaam: the card, "Bhigo diya", and "Reh gaya. Plan B:" | `?fixture=sync` | W |
| CA70 | The reminders sheet: seven notification cards with toggles, "Ek abhi bhejo". Must show "Lauki ne note kar liya hai" and "Aapne subah kuch nahi kiya. Yahi toh plan tha." | Top-left avatar, Reminders | W |
| CA71 | Khata cover: the red cloth bahi opening, ₹50 coins going hollow, "Hisaab barabar" with the UPI QR | `?fixture=lock#/khata` | W |
| CA72 | Telegram pairing row, "Telegram juda" | `?fixture=sync` | W |
| CA73 | Kiski baari: Aage and Badlo, picker vs everyone votes | Ghar | W |
| CA74 | Pull to refresh flips a roti: "Chhodo, roti palat do" to "Garam garam" | any fixture, pull down | W |
| CA75 | Tap the thali: steam puffs | any fixture | W |
| CA76 | Onboarding end to end: all 10 scenes, from "Kal ka khana, aaj raat tay." to the emoji burst | `?fixture=sync&onboard` | W |
| CA77 | Dark mode as a circular wipe from the tapped button; Din, Auto, Raat | House menu | W |
| CA78 | Time of day: the same home at `&at=morning`, `&at=day` and `&at=night` | `?fixture=lock&at=…` | W |

## 4. What the trailer and deck can't ship without

These are the clips with no fallback. Shoot them first, all on fixtures, so they can run on any laptop. Every one also needs a still at its poster moment (`{ "shot": "poster" }` in the shot file), because the deck's PDF uses that exact frame (`film/CLIP_SLOTS.md` section 6).

| Priority | Clip | Rows | Poster moment | Theme |
| --- | --- | --- | --- | --- |
| 1 | Island: pill width morph, tap open, swipe three deck cards, one check-fold | CA16, CA17 | The deck with the "Aapke liye" count and a Payment card on top | light and dark |
| 2 | Jackpot reel, twice, landing on two different dishes with a skip line | CA20 | The reel's overshoot frame, then the landed plate | light and dark |
| 3 | Cuisine deck: pick, three swipes with Haan and Nahi stamps, how often | CA25 | A Haan stamp mid-card | light |
| 4 | Voice studio: orb, swipe all five voices, both tabs | CA26 | Orb at full breath on Chitra | light |
| 5 | Khata: cover opens, coins, Pine Labs card, settle up | CA71, CA42, CA47 | The Pine Labs card with a waiting link | light |
| 6 | Reminders sheet with "Lauki ne note kar liya hai" | CA70 | That card fully on screen. It's also the trailer's opening shot | light |
| 7 | Baari ne seekha and Kyun? | CA66, CA65 | Facts sheet on day30 with the trend | light |
| 8 | Who's eating: Papa off, count to 3 | CA68 | The sheet with Papa switched off | light |
| 9 | Onboarding with verbs on every tap, the coin spin, the six-language karaoke | CA76, CA10, CA12 | Karaoke mid-word in Hindi | light |
| 10 | Saamaan: Overnight card, kirana card | CA50, CA51 | Dawn glow with the truck at stop 4 | light and dark |
| 11 | In-app call | CA64 | Orb mid-breath, timer running | dark |
| 12 | Bade akshar, dark wipe, time of day | CA56, CA77, CA78 | Big text on Ghar | both |
| 13 | Small things: roti refresh, steam, undo, offline | CA74, CA75, CA60, CA59 | The roti mid-flip | light |
| 14 | Receipt printing and the tear | CA55 | Fully printed slip | light |
| 15 | TV reveal with sound (press S) | CV02 | The stamp landing | n/a |

After these come the live-state captures, in `film/CLIP_SLOTS.md` section 2: the driven night (`/live` and the app together), the sim call, and the checkout.

## 5. Gone or dead, so don't shoot them

- The moon and sun night sky (`sky()` in `app/app.js` is never called).
- The dealt-card and slide shuffles: replaced within minutes by the reel.
- Real and demo tags on the Pine Labs card.
- The seat speech bubbles ("Rajma please 🙏"): the handlers exist, nothing renders them.
- "Ghumao" as a dish shuffle: the hero button is Badlo. Ghumao is only the onboarding coin.
