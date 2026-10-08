# Running the Baari demo for judges

One family dinner, start to finish, in about 10 minutes, in either mode. Everything runs on the production agent with the real Telegram bot, real Gnani voice, and our Delhivery, Pine Labs and Sharma Kirana mocks.

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
