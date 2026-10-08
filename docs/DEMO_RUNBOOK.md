# Running the Baari demo for judges

One family dinner, start to finish, in about 10 minutes, in either mode. Everything runs on the production agent with the real Telegram bot, real Gnani voice, and our Delhivery, Pine Labs and Sharma Kirana mocks.

## The judge's own night (the default)

A judge opens `t.me/Baari_ken_bot` on their own phone and taps Start. Nothing else to type.

1. A short Namaste: Baari runs the Sharma kitchen, and tonight the guest chooses tomorrow's dinner. Two buttons: "Aaj kya banega?" and "Baari kya hai?" (a three-line explainer).
2. The judge taps "Aaj kya banega?", or types anything like "aaj kya banega", "what's for dinner", "menu batao". Small talk gets one line and the buttons again. A tapped button folds into its message with a tick, so nobody taps twice.
3. "Rasoi dekh raha hoon…" turns into the kitchen scan in place: what's in, what's run out.
4. The pick card, addressed to the judge by name: two dishes as buttons. They can also type a dish or ask a question.
5. Mummy and Papa get "Theek hai" or "Veto" for one minute. The judge gets the result.
6. One order card reaches the judge and updates in place: the Sharma Kirana order (packed, paid) and the Delhivery parcel (booked, on the way, out for delivery, delivered), paid from Pine Labs Reserve Pay.
7. A line that Sunita ji has the plan as a Hindi voice note. Show it from the Sunita phone; let it time out or reply by voice.
8. Dhanyavaad, the receipt link, and an "Ek aur baari" button.

Only tonight's turn-holder gets updates. Sunita gets only her voice notes; Mummy and Papa get the heads-up, the veto and the result. The backend's steps stay in the logs and on `/live`.

The judge sits in a guest seat, Mehmaan. The family's four accounts never move; the rotation goes back to the family after the night, so a judge night doesn't use anyone's turn. One judge at a time: a second judge who starts mid-night hears how long is left and their place in line, and gets a message when it's their turn. Check with `GET /admin/guest`. If the saved family accounts ever move, `POST /admin/cast {"home":true}` puts them back.

Test it from an account that isn't one of the four family accounts.

## The phone call

The same night, decided on a real call. The demo phone on the table rings, the family talks it over on speaker, and Baari stays on the line until it's done.

1. Start it: a judge taps "Phone pe baat karein" under the Namaste, or anyone in the household sends `/call`.
2. The phone rings. On the trial account, Twilio's trial message plays first; press any key.
3. Baari says what's run out and offers two dishes, then listens. It stays quiet while the family talks among themselves, and answers only what's asked of it.
4. Once they settle ("rajma chawal final"), Baari reads out the plan: what comes by Delhivery, what from Sharma Kirana, what's at home. "Ye plan theek hai?"
5. On a yes, the real Baari agent locks the dish and buys while the family holds, with a short line every 15 seconds or so. This took about 2.5 minutes on 8 October.
6. Baari reads the bill from what was actually ordered and paid ("kul ek sau tiranve rupaye, Pine Labs Reserve Pay se") and asks if it's okay. Questions get answered from the bill.
7. On a yes: thank you, Sunita ji gets the plan in the morning, namaste, and the call ends. Three silences in a row end it politely too.

Twilio carries the call and hears the family: its speech capture lets them cut in at any point and waits for a natural pause. Gnani speaks every line, and Twilio's Hindi voice stands in if Gnani is down. Twilio's trial account calls the verified phone only from the trial number paired with it; Baari finds that number from the account's last calls if Twilio refuses the configured one. The exact lines (the plan, the bill, the goodbye) are rails' own words in Hindi; a small LLM follows the conversation and answers questions. Ordering and paying stay with the Baari agent. `GET /admin/call` shows the live transcript.

Needs, in Vercel's env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (the Twilio number) and `DEMO_CALL_TO` (the demo phone, verified in Twilio while the account is on trial). Optional: `CALL_MODEL` (default `openai/gpt-4o`).

## Before judges arrive

1. **Phones.** Vinay's phone is bound, and so are Mummy's and Sunita's if those phones are there. Check with `/baari` on Vinay's phone. Solo mode is on, so anyone missing is played from Vinay's phone: their messages arrive prefixed "Papa ke liye:", and a Telegram Reply to one counts as them.
2. **Judges who want a role.** Show them the invite link or QR (`t.me/Baari_ken_bot?start=join`). They tap a role that's still open. Before the next group, they send `/leave`.
3. **Screens.** Open `https://baari.pages.dev/live` (every tool call as it happens) and the household app beside the phones.

## Run it

Send `/demo pick` or `/demo vote` from any household phone.

| Minute | What judges see | Why |
| --- | --- | --- |
| 0 | 🎬 intro line: the mode, whose baari it is, the time to answer | Sets the scene |
| 0 to 1 | Step 1: dishes go out. Pick mode: the holder gets pick buttons and the others a heads-up. Vote mode: everyone gets vote buttons | Baari reads the live pantry and the household rules |
| 1 to 3 | People tap. Pick mode: the others get "Theek hai" or "Veto" once the holder picks | The baari: one person decides, or everyone votes |
| about 3 | Step 2: the result to everyone, "Agli baari X ki" | The turn moves on |
| about 4 | Step 3: 📦 Delhivery parcel booked, 🛒 Sharma Kirana order packed, 💳 Reserve Pay payments with UTRs | Money and delivery, inside the Rs 400 cap |
| 4 to 8 | 📦 tracking: Picked Up, In Transit, Out for delivery | Package tracking |
| about 5 | Step 5: Sunita's Hindi voice note | Gnani TTS |
| 5 to 8 | Sunita (or Vinay as Sunita) replies by voice; Step 6 | Gnani STT; a vague "haan" gets a follow-up |
| about 8 | 🎬 "That's the whole night" and the receipt link | |

Nobody has to answer. Picks, votes and vetoes close on their own (2.5 minutes, then 1 minute for a veto), and Sunita's reply after 1.5 minutes.

## Good moments to show

- **The veto.** In pick mode, a judge taps Veto and the other dish wins.
- **The Rs 300 rule.** If a bill passes Rs 300, the payment stops until Vinay taps Haan. Rails holds this, not just the prompt.
- **A household rule.** Baari can't offer Aloo puri, because rails refuses it for Papa's plate.
- **Invented capabilities.** The rider hop, the kirana order book and the kirana payout are marked as inventions in their responses.

## If something sticks

- Every minute, rails closes anything past its deadline and restarts a step whose call died, so wait a minute first.
- `/demo stop`, then `/demo pick` again, starts a clean night.
- Admin: `GET /admin/wake` shows what rails is waiting for. `GET /admin/demo` shows the demo state.
