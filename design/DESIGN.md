# Baari household app, design brief

Owner: W3. Contract for data is PRD section 11.3. Reference screens are the seven Uber Eats screenshots in the kickoff conversation (welcome, home feed, restaurant page, live tracking, payment method, add a tip, plus our own decision timeline). Design system reference: Uber's Base (`base.uber.com`).

## What the app is for

A phone screen the duty-holder opens at 9:35pm or 7:50am and understands in five seconds: what's cooking tomorrow, what got bought and paid, whether it'll arrive in time, what Sunita heard, and why Baari did each thing. It's also the screen the judges watch in the recording while Telegram and the platform do the real work.

It makes no decisions and holds no state. Every number on screen comes from `GET /app/state`. Votes deep-link into the Telegram bot, so voting still happens in a real tool.

## Look and feel

Uber Eats, cooked at home in Delhi.

The Uber Eats part is the structure: white ground, black type, black primary buttons, big edge-to-edge food photos with rounded corners, pill chips, a floating bottom nav, generous whitespace, heavy display type. That's what makes it read as a real product in a two-second glance on a recording.

The Indian part is content and small material details, not decoration. No rangoli borders, no paisley, no saffron-white-green. Instead:

- Dish names in both scripts, Devanagari under Latin: Rajma chawal, राजमा चावल.
- Food shot the way Indian homes eat: steel thali, katori, a roti basket, top-down on a kitchen counter. Not restaurant plating.
- Money in rupees with Indian grouping (Rs 1,240, Rs 10,000) and the word "khata" for the ledger, because that's what a family calls a running account with the kirana.
- Hinglish microcopy, written like a family WhatsApp, never like a bank: "Kal ka khana", "Aaj kiski baari? Vinay ki", "9:30 tak vote karo", "Sunita 7:40 pe Sharma Kirana se le aayengi".
- One warm accent beside Uber Eats green: haldi yellow, used only for "needs your attention" (a pending ask, a slipping delivery).
- The cook is a person with a name and a face placeholder, never "your cook" or "staff".

## Tokens

```css
:root {
  --bg: #FFFFFF;
  --surface: #F3F3F3;          /* chips, input fills, cards on white */
  --text: #000000;
  --text-2: #5E5E5E;           /* secondary, like "Most ordered this week" */
  --line: #E8E8E8;
  --primary: #000000;          /* buttons */
  --on-primary: #FFFFFF;
  --green: #06C167;            /* Uber Eats green: success, paid, delivered */
  --green-tint: #E6F9EF;       /* "#1 Italian" style tags */
  --haldi: #F2B705;            /* attention: pending ask, delay */
  --haldi-tint: #FFF6D6;
  --red: #E11900;              /* failure only: debit failed, no rider */
  --blue: #276EF1;             /* the one "share PIN" style action, kirana code */
  --radius-s: 8px;
  --radius-m: 12px;
  --radius-l: 16px;
  --radius-pill: 999px;
  --space: 4px;                /* 4px grid, Base uses multiples of 4 */
}
@media (prefers-color-scheme: dark) { /* optional, demo is light */ }
```

Type: Uber Move is proprietary. Use **Inter Tight** for display (700 to 800, tight tracking, sizes 28, 22, 18) and **Inter** for body (400 and 500, 16 and 14), with **Noto Sans Devanagari** for Hindi at the same sizes. All three from Google Fonts.

Layout: 16px side gutter, max width 480px centred on desktop so it still looks like a phone in a screen recording. Bottom nav floats 16px above the bottom with a white pill background and soft shadow, like the Uber Eats screenshot.

## Screens

Build in this order. Cut from the bottom if time runs out.

### 1. Ghar (home), must have

Mirrors the Uber Eats home feed.

- Header: "Ghar" with a chevron (household switcher, inert), bell on the right.
- Duty chip under the header: "Aaj kiski baari? Vinay ki" in a black pill.
- Chip row: Kal ka khana, Pantry, Khata, Sunita, with small emoji-free icons.
- Section "Kal ka khana" with an arrow button. Two big dish cards side by side, horizontally scrolling: photo, dish name, Hindi name, "50 min", a green tag with the reason it's on the list ("Ghar mein sab hai" or "Papa ki pasand"), and the vote button "Vote on Telegram" that opens `https://t.me/<bot>?start=vote_1`.
- Under the cards: a countdown "Vote band 9:30 pe" and voter faces with ticks (never who voted for what).
- After LOCK: the section becomes "Kal: Rajma chawal" with a "Locked" tag and the runner-up below in grey.
- Bottom nav: Ghar, Khata, Search (inert), Delivery, Baari (decision feed).

### 2. Khata, must have

Mirrors the Uber Eats payment method sheet.

- Title "Khata". Card: "UPI Reserve Pay block", Rs 5,000, approved by Vinay, valid till a date, ICICI badge. Progress bar: used vs left.
- Today's cap meter: Rs 240 of Rs 400, green, turning haldi past 80%.
- List "Aaj ke payments": each debit with payee, amount, status chip (Pending in grey, Paid in green, Failed in red), and the reference in small grey text.
- "Approved shops": Sharma Kirana, sharmakirana@okaxis, "Sunita ke raaste mein, 2 min".
- Footer note, small grey: "Baari can't add shops or raise the cap. Only you can, in the profile."

### 3. Raat ka saamaan (delivery), should have

Mirrors the Uber Eats live tracking screen.

- Map area as a stylised static illustration of Rohini sectors, no live map.
- Sheet: "Kal subah 6:40 tak" title, status line, five segment progress bar (Manifested, Picked up, In transit, Out for delivery, Delivered) in green.
- If rerouted: haldi banner "Delhivery late hai. Sunita 7:40 pe Sharma Kirana se le aayengi" with the items.
- If a hop was booked: rider card like the courier card, "Ravi K., bike, 7:50 tak", and a blue "Kirana code 5809" chip styled like "Share delivery PIN".

### 4. Sunita ka brief, should have

Takes the place of the tip screen.

- Illustration slot at the top (a cook walking with a jhola).
- Audio player for the Gnani voice note, with the Hindi text below in Devanagari.
- Her reply: transcript, plus what Baari understood as a chip (Counts mil gaye, Sirf "haan", Item missing) from the C3 label.
- Black button "Play brief" for the duty-holder who plays it when she walks in (K5).

### 5. Baari ne kyun kiya (decision feed), must have for the recording

New, no Uber Eats equivalent. This is what judges should screenshot.

- A vertical timeline. Each item: time, a one-line decision in plain Hinglish, the rule id as a small grey tag (V2, M5, C4), and an icon for the rail it touched (Telegram, Gnani, Pine Labs, Delhivery).
- Tap to expand: what came in, what Baari did, which connector.
- Failures and recoveries get a haldi or red dot, so the eye goes to the moments where Baari had to decide something hard.

### 6. Welcome, nice to have

Mirrors the Uber Eats welcome: dish bubbles in wavy frames (rajma, palak paneer, kadhi, aloo puri, lauki), "Aaj kya banega?" headline, "+91" phone field, black "Continue" button, "Continue with Telegram". Purely for the opening shot of the recording.

### 7. Demo screens: `/live`, `/tv`, `/receipt/<date>`

Specified in PRD section 17. Design notes on top of that:

- `/live` is landscape, 1440 by 900, recorded full-screen. White ground like the app. The rail map is the one place we draw: four horizontal tracks with sleepers, in black line art, each labelled with the partner's name and a small real-or-mock tag (Gnani real, Telegram real, Pine Labs mock, Delhivery mock). Carriages are rounded black rectangles with the tool name in white. Success turns the carriage's light green, failure stops it at a red signal post, and a reroute animates a set of points switching. Motion under 600ms per move, eased, no bounce on money events.
- Phone frames on `/live` copy Telegram's own bubble shapes in greyscale, so a viewer recognises them without us faking Telegram's branding.
- `/tv` is 1920 by 1080, dark ground for once (it's a living-room TV at night), two dish photos full-bleed, ring timer in Uber Eats green, the "Locked" stamp in haldi.
- The receipt is a narrow white card, monospace amounts, a dashed tear line, the UPI note in grey, and the closing line in Inter Tight 22.
- Chaos buttons are big black pills with a haldi outline, Hinglish labels, and a small grey line under each naming the real fault (`no_rider`, `timeout`).

### 8. `/dev`, the operator panel

Specified in PRD section 18. It's for the person running the demo, never recorded, so it can be dense, but it has to be impossible to misclick under pressure:

- Laptop layout, three columns: left the script stepper (big step number, the line to say in large type, the button to press highlighted), centre the phase buttons and run status, right scenarios, cast and health.
- Phase buttons are big black pills in phase order. The one the stepper expects next glows Uber Eats green. A button that's mid-run shows a spinner and the elapsed seconds, and the rest disable.
- Health is a row of dots at the top. Any red dot also turns the recording switch red.
- Recording mode gives the whole panel a thin red frame, so the operator always knows which mode they're in.
- Cast shows each role as a card with a QR code, the bound person's Telegram name, and a "ping" button.

## Build notes

- Static files, no build step: `index.html`, `app.css`, `app.js` (ES modules), `manifest.webmanifest`, `sw.js`, icons. Lives in `app/` and ships to Cloudflare Pages (PRD section 16). A Pages Function at `/api/*` proxies rails, so the app calls its own origin.
- Installable PWA: manifest with name "Baari", short name "Baari", black theme colour, white background, 192 and 512 icons, `display: standalone`. Service worker caches the shell and fonts, never `/app/state`.
- Data: poll `/app/state` every 5 seconds while visible. During the recording the screen updates live as the agent works.
- Fixture mode: `?fixture=lock` loads `app/fixtures/lock.json` so W3 can build before rails ships `/app/state`.
- Photos: royalty-free images, or plain coloured cards with the dish name if licensing is unclear. Never scrape Swiggy or Zomato images.
- Accessibility: 44px tap targets, text contrast at 4.5:1 or better, Hindi text gets `lang="hi"`.

## Done when

Matches US-08 in the PRD: loads from rails on an iPhone and an Android phone, installs to the home screen, Ghar, Khata and Baari ne kyun kiya render live data from a real run, and nothing scrolls sideways at 375px.
