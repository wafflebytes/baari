# Recording prompts for cloud agents

Rewritten 9 October 2026, 01:30 IST, against `film/RECORDING_DELTA.md` (on `claude/brave-lamport-levavu`), `film/CLIP_SLOTS.md` and the app frozen at **2988bb7**. The old prompts shot dead screens (the night sky, the dealt shuffle, the Pine Labs tags) and pointed at baari.pages.dev, which the cloud container can't reach. These replace them.

## How the work splits

- **Cloud agents (four, below)** write shot files and record draft takes on fixtures, served from their own checkout. The shot file is the real deliverable. Their takes render in Inter, because the licensed Family font stays out of git.
- **Vinay's local session** pulls each branch, re-runs every shot file locally with the fonts in place (same commands, same names, `--take 2`), checks every poster, and uploads those finals to Drive. It also does everything on live state: the driven night with `/live`, the sim call and the checkout.
- **A person with a phone** does the human-only rows: Telegram on real phones, the real call, the mic onboarding (CA08), the install sheet on a real iPhone (CA02), real footage.

Priority comes from RECORDING_DELTA section 4 (P1 to P15). Each group shoots its P rows first, before anything else.

## The shared block

Paste this at the top of each prompt.

```
You're recording clips of Baari's household app (a PWA, repo wafflebytes/baari, branch main) for a trailer and a pitch deck. You need no secrets and no network beyond npm: the app runs on built-in sample data (fixtures). Never use a real phone number, never sign in anywhere, never call rails or any /admin route, never tap a Pay button.

READ FIRST, IN THIS ORDER
1. film/scripts/clip.mjs, its header (the shot file format).
2. film/shots/app/CA17.json, a finished example: the island opened, cards flung, one folded, with a poster still.
3. git show origin/claude/brave-lamport-levavu:film/RECORDING_DELTA.md. It says which screens changed, which rows are new (CA63 to CA78), what's dead, and each priority clip's poster moment. Where this prompt and the delta disagree on what a screen looks like, the code wins, then the delta.

THE FREEZE
The app is frozen at commit 2988bb7. Run git log -1 --format=%h -- app. If it prints anything else, stop and say so in your PR: your takes would show an app nobody agreed on. clip.mjs writes app_commit into every manifest row.

SETUP
  cd film && npm install
  npx @puppeteer/browsers install chrome@stable   # export CHROME_PATH=<the path it prints>
  python3 -m http.server 4174 --directory app &   # from the repo root; leave it running
  node scripts/clip.mjs shots/test/T00.json --base http://localhost:4174
Every run takes --base http://localhost:4174. baari.pages.dev is blocked from this container. Fonts fall back to Inter locally; that's expected, don't try to fix it.

APP FACTS (from the code at 2988bb7)
- Fixtures: /?fixture=shortlist, lock, morning, sync, day30. sync has the most cards; day30 is "Demo: din 30".
- Flags: &at=morning|day|night forces time of day. ?offline (not ?simoff). &onboard runs onboarding on a fixture (?fixture=sync&onboard). &splash brings the splash back.
- A fixture fakes every write: pairing completes after 5 s, a typed question gets a canned reply after 1.8 s, the in-app call plays canned lines. So record the whole flow, write and reply included.
- Nav: .nav a[data-tab="ghar"|"khata"|"delivery"|"sunita"|"baari"]. Island pill: [data-isl]. Open island: .islx-card. Its deck: [data-acs], cards .ac[data-card="pl|ok|fact|leave|left|fridge|q"], front card has data-d="0", buttons .ac-go and .ac-no, count [data-akn].
- clip.mjs suppresses the once-a-session toast and the island opening itself, because they cover taps. A row about those sets "peeks": true.
- Gyro tilt and haptics can't be captured headless. Skip them.
- Island verbs never show in the header on a fixture. They do show on every tap during onboarding.
- Voice studio and karaoke audio may come out silent. That's fine: the edit syncs the same mp3s from app/audio/. Never re-record them.

DEAD, DON'T SHOOT
The moon and sun night sky (sky() is never called), the dealt-card and slide shuffles, real and demo tags on the Pine Labs card, seat speech bubbles, Ghumao as a dish shuffle (the hero button is Badlo; Ghumao is only onboarding's coin). If a row below seems to need one of these, the row is wrong: shoot what the delta says instead and note it.

HOW TO WRITE A SHOT
1. Find selectors in the code first (app/app.js, app/index.html, the island and deck code), then confirm them with a still: a shot file with just "open", a wait and { "shot": "probe" }. Prefer data-* and aria-label selectors over x,y. Use "tap" (a real mouse click) everywhere it works; "click" (a DOM click) only for elements a tap can't reach, and say which in the PR.
2. Pace it for a viewer: 600 to 900 ms after a tap, 1.5 to 2.5 s on anything they must read, scrolls of 300 to 500 px over about a second. A snapshot is 3 to 5 s, a flow 15 to 60 s. Use "waitfor" before acting on anything that animates in.
3. POSTER. Every priority clip gets { "shot": "poster" } at the exact moment its row names. It waits for animations to finish, so put it after the state is reached, not during a transition. Infinite animations (the orb breathing) don't block it. For a mid-animation poster (the reel's overshoot, the roti mid-flip, a stamp mid-card) use { "shot": "poster", "settle": false } and time it with a "wait" before it; take two or three candidates (poster, poster2, poster3) and say which one wins.
4. LOOK AT EVERY STILL YOURSELF. Retake if any of these fail: the subject (dish, amount, name, the key line) isn't fully readable; anything is clipped or overlapping; a stray toast, banner, scrim or empty state; an error; English where the row needs Hindi; a cursor or touch dot (there shouldn't be one). Silent audio isn't a failure.
5. Theme: record light. Also record dark only where the row says "dark" or "both".
6. Takes: take 1 only, unless it has a flaw you can't fix in the shot file. Then fix the shot file and run --take 2.
7. Hindi or Hinglish a non-Hindi viewer needs: write <clip name>.srt beside the video, short English captions timed to the .taps.json.

FILES
Yours: film/shots/<group>/*.json, one file per row, named <row>.json (a combined clip is <rowA>-<rowB>.json, the first row as "id"). Never edit app/, baari-mock/, lib/ or film/scripts/. If clip.mjs lacks something, write film/shots/<group>/helper.mjs, use it via "eval" steps, and explain in the PR. film/clips/ is gitignored: on your branch add your takes with git add -f film/clips/<your ids>-*, and commit film/clips/manifest.json rows for your clips only.

WHEN DONE
Commit as "[W3] Clips: <group> (<n> shot files)" ending with a Co-Authored-By line for Claude, push your branch, open a PR to main with the same title. Don't merge. The PR body is your report, one line per row:
  <row> | shot file | take file | poster file | ok, retake, or skipped (why)
Then: which poster candidate wins for each priority clip, anything in the app that looked broken (clipped text, wrong language, layout jump) with the still that shows it, and any row whose reach path in the delta was wrong, with the path that works.
```

---

## Prompt 1: the island (branch `rec/island`)

```
<the shared block>

Your group: the dynamic island, the pill at the top that opens into "Aaj raat". Folder film/shots/island/. CA17.json is already written by the local session as the model; copy its style. Most rows are cards inside the deck on /?fixture=sync.

PRIORITY (shoot first)
- P1, CA16 + CA17: CA17.json exists. Run it light and dark, check both posters (the deck with "Aapke liye 7" and the Payment ₹520 card on top), and improve it if the pill's width morph doesn't read in the first 2.6 s.
- P8, CA68 Who's eating: tap the faces stack beside the subtitle, the sheet of switches, switch Papa off, the count drops to 3. Poster: the sheet with Papa switched off. Light.
- P11, CA64 the in-app call: from the q card's "📞 Ya 2 min call" (or "Baari se baat karo" at the bottom of the island). The orb breathing, the timer, "Daba ke bolo", "Likh ke", the canned lines. Poster: orb mid-breath with the timer running ("settle": false, timer past 0:03). DARK.

THEN
- CA21 + CA22: the "Khaane ke baad" leftovers card (drag a finger slowly along the bowls with a few short swipes; each one bops) and the fridge card with its freshness rings.
- CA35 + CA36: the Payment card (amount, what it's for, "₹520 pay karo" and Nahi; never tap pay) and the "Aapki haan" kirana card with Haan and Nahi. Tap Nahi on the kirana card and record what happens.
- CA17b: the q card on its own: the question, the "why", its options, "Baari N% jaanti hai". Answer it with a tap.
- CA63 Baari se baat: type "Kal Papa ke liye kya alag banega?" in the talk box, send, the typing dots, the canned reply inline. Also tap the mic and record what shows.
- CA67 the quiet log "Baari ne chup chaap": from the + menu. Check the delta's reach; the line and its sheet.
- CA72 the Telegram pairing row, "Telegram juda": a pairing completes after 5 s on a fixture, so record the whole wait.
- CA18 the island opening itself after six taps, and "Abhi nahi": "peeks": true, six taps on the home screen.
- CA16b the pill during a run: the progress ring on its outline, three haldi bars while a tool runs, the badge bump. Only if a fixture shows it; else skip and say so (the driven night records it live).
- Flow A2 "the island", 30 to 45 s: pill morph, open, Payment card, swipe to the q card, answer it, fold the leftovers card, type one question, close.
```

---

## Prompt 2: Ghar, the home screen (branch `rec/ghar`)

```
<the shared block>

Your group: Ghar, the home screen below the island. Folder film/shots/ghar/.

PRIORITY (shoot first)
- P2, CA20 the jackpot reel: /?fixture=lock, tap Badlo twice. 12 plates and names spin for 1.5 s with blur and ticks, a 14 px overshoot, spring back, the plate pops, a skip line like "Aloo puri skip: Papa ki thali mein aloo nahi". Land on two different dishes. Then swipe the plate past 60 px for a third shuffle. Posters: "overshoot" ("settle": false, try about 1450, 1500 and 1550 ms after the tap) and "poster" (the landed plate with its skip line). BOTH themes.
- P3, CA25 the cuisine deck: pick cuisines, three swipes with Haan and Nahi stamps, how often, for whom. Poster: a Haan stamp mid-card ("settle": false, mid-drag: split one swipe into a short swipe that holds, or time the still inside the swipe's "after"). Light.
- P4, CA26 the voice studio: the orb, swipe through all five voices, both tabs (for you, for the cook). Poster: the orb at full breath on Chitra (take candidates across one breath). Light.
- P7, CA66 + CA65: /?fixture=day30, + menu, "Baari ne seekha": facts by person, "Yaad rakhun?" and "Bhool gayi", the weekly trend. Then /?fixture=lock, "Kyun?" on the locked hero: the night's decision in plain words. Poster: the facts sheet with the trend visible. Light.

THEN
- CA15 the hero through the night: three shots, shortlist (vote), lock ("Pakka"), morning (next day). Stills of each.
- CA73 + CA19 Kiski baari: Aage and Badlo, picker vs everyone votes, the turn queue.
- CA69 + CA32 Raat ka kaam: the night task card ("Rajma 200 g bhigo do" or whatever the fixture has), the countdown, "Bhigo diya", and the "Reh gaya. Plan B:" path in a second shot.
- CA23 treat night. CA27 the invite card and its QR sheet. CA28 the + menu growing out of the button. CA30 the dish photos across hero and deck. CA33 joined chips and tonight's holder.
- CA24 the cook finder from the "cook's off" toast and CA29 the toasts ("peeks": true for both).
- CA34 the badge: day30 shows "Demo: din 30". A guest night shows "Mehmaan picks tonight" only if a fixture has one; else say so.
- Flow A3 "Sabki thali alag", 30 to 45 s: reel twice, the cuisine deck, Kiski baari.
- Flow day30, 30 to 45 s: the din 30 home, Baari ne seekha with the trend, the quiet log.
```

---

## Prompt 3: money, groceries, the cook, settings (branch `rec/screens`)

```
<the shared block>

Your group: every tab besides Ghar, and app-wide settings. Folder film/shots/screens/.

PRIORITY (shoot first)
- P5, CA71 + CA42 + CA47 Khata: /?fixture=lock#/khata. The red cloth bahi cover opening, ₹50 coins going hollow, "Hisaab barabar" with the UPI QR, then scroll to the Pine Labs card (each request and its state, no tags), then settle up: tap a name, the UPI sheet, stop at the share step (never open Telegram). Poster: the Pine Labs card with a waiting link (amount, what it's for, reason line all readable). If lock has no waiting link, try sync#/khata and say which. Light.
- P6, CA70 the reminders sheet: the top-left avatar, then Reminders. Seven notification cards with toggles and "Ek abhi bhejo". It must show "Lauki ne note kar liya hai" and "Aapne subah kuch nahi kiya. Yahi toh plan tha." Poster: the "Lauki ne note kar liya hai" card fully on screen, nothing clipped. This is the trailer's opening frame; take it twice and pick the cleanest. Light.
- P10, CA50 + CA51 Saamaan: /?fixture=lock#/delivery. The "Raat bhar" Overnight card: stars fade and dawn glows as the parcel moves, the truck crosses five stops, "Dabbe mein" chips. Then the Sharma Kirana card (a big face of who collects, 3-segment bar, item chips, Paid chip with UTR; try sync#/delivery if lock lacks it), "Raaste mein" and the rider. Poster: dawn glow with the truck at stop 4. BOTH themes.
- P12, CA56 + CA77 + CA78: bade akshar on, the home reflowing; dark mode as a circular wipe from the tapped button (house menu: Din, Auto, Raat), light to dark and back; then the same home at /?fixture=lock&at=morning, &at=day, &at=night as three short shots. Poster: big text on Ghar. BOTH themes for the big-text shot.
- P14, CA55 the receipt: from Khata's "Parchi" button (data-receipt) the slip prints out of a slot, then "Tear off". Also record /receipt/?date=<the fixture's date>&fixture=lock as a full page. Poster: the fully printed slip. Light.

THEN
- CA43 "Kyun?" on a payment row. CA44 a link going PAID with the parcel under it (or just PAID, and say so). CA45 a refusal's calm line on the Pine Labs card, if a fixture has one. CA46 the month drawer. CA48 the hisaab share image. CA49 the ledger and parcel beside the titles.
- CA52 Sunita: /?fixture=morning#/sunita. Her plate card with quantity chips, tonight's prep, the karaoke following playback.
- CA53 the Diary: chapters, tabs animating. CA54 its call card, if a fixture has a call.
- CA58 English, Hinglish, Hindi on the same screen. CA62 the glass nav scrolling over content.
- Flow A4 "Paisa saaf saaf", 30 to 45 s: Khata cover, Pine Labs card, Kyun?, settle up, the receipt.
- Flow A5 "Mummy Papa ke liye", 30 to 45 s: bade akshar, Hindi, the dark wipe.
```

---

## Prompt 4: onboarding, the TV and the small things (branch `rec/onboard-tv`)

```
<the shared block>

Your group: onboarding, the kitchen TV, and the small touches. Folders film/shots/onboard/ and film/shots/tv/.

PRIORITY (shoot first)
- P9, CA76 + CA10 + CA12 onboarding end to end: /?fixture=sync&onboard. All 10 scenes, from "Kal ka khana, aaj raat tay." to the emoji burst, with the island's verbs showing on every tap. Include the coin spin "Sikka ghumao" (CA10, the only Ghumao left) and the karaoke brief across six languages (CA12, page 8). Skip the mic: type or tap past it. Poster: the karaoke mid-word in Hindi ("settle": false; take three candidates). Light. Also cut stills of each scene (scene1 to scene10) for the deck's placeholders.
- P13, CA74 + CA75 + CA60 + CA59 small things, one shot each on /?fixture=lock: pull down to refresh, the roti flips ("Chhodo, roti palat do" to "Garam garam"; poster: the roti mid-flip, "settle": false, candidates); tap the thali, steam puffs; a mistaken tap then "Wapas lo" in the calmer undo bar (it stays 4 s); /?fixture=lock&offline, wait 5 s, the island reads "Offline · 6 min purana" and the ring turns red. Light.
- P15, CV02 the TV reveal: /tv/?fixture=lock at "viewport": {"width": 1920, "height": 1080, "scale": 2}. Press s (sound on), then space to start the ring, and record to the drumroll, the stamp, the burst. Read app/tv/tv.js first: the stamp's timing, and whether a shorter ring exists (?t=). Poster: the stamp landing ("settle": false, candidates). The page shows a "Fixture" chip; note where it sits so the edit can crop it.

THEN
- CV01 the TV in vote: the meter, faces, the crown on the first voter (shortlist fixture). CV03 the streak, next baari and join QR.
- Onboarding stills where the flow passes them: CA03 language dropdown, CA04 who's home tiles, CA05 face editor, CA06 rules, CA07 vrat days turning haldi, CA09 pick or vote, CA11 the cook. If one needs its own shot to read well, give it one.
- CA01 the splash: /?fixture=sync&splash, "settle_ms": 0, record from load.
- CA13 the soft tap dip and content scrolling under the blurred edges.
- CA14 a fresh household from the first screen to "Telegram se judo": open "/" with no fixture. Rails is unreachable here, so record until the first network write fails and say where it stopped.
- Flow A1 "Ghar set up by talking", 45 to 60 s: the CA76 run cut to the best 10 scenes.
- Flow A6 "Chhoti cheezein", 30 to 45 s: roti, steam, undo, offline.
- Deck stills at 1920 x 1080: the TV in vote, reveal and streak, named CV-still-<state>.png.

NOT YOURS: CA08 (real mic), CA02 (install sheet on a real iPhone), /live (CL01, CL02) and the driven night. They need live rails or a phone.
```

---

## What the local session does with the results

1. Pulls each `rec/*` branch, reads the PR report, and merges only the shot files and manifest rows.
2. Confirms `git log -1 -- app` is still the freeze. Any app commit after it means re-running the shot files it touches.
3. Re-runs every shot file with the Family font in place, `--base http://localhost:4174 --take 2`, light and dark as listed. These are the finals.
4. Checks every poster against the delta's poster moment and the six checks. Retakes on any failure.
5. Then the live captures from CLIP_SLOTS section 2: the driven night (`/live` and the app recorded together, steered to rajma chawal), the sim call, and the checkout, each announced in STATUS first.
6. Converts to mp4 (h264, crf 18), uploads to the Drive folder in `recording/CHECKLIST.md` with clip.mjs's names, commits `film/clips/manifest.json`, and writes the coverage table in STATUS.
