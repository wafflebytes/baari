# Cuisine picks handoff (W3 to W1)

App v7.4 adds a "Sirf dal chawal nahi" card on home. Someone picks cuisines, swipes through 44 home-cookable dishes (Italian, Korean, Indo-Chinese, momos, Mexican, Thai, Middle Eastern, bowls, cafe, South Indian, street food, more ghar ka khana), then says how often one should come up and who's in. The list and its fields live in `app/cuisine.js` (`CUISINES`, `FOODS`).

Today the choice lives only in the phone: `baari:local` → `cuisine: { c: [cuisine keys], like: [dish ids], no: [dish ids], freq: "1w" | "2w" | "wknd" | "ask", who: [names] }`. Rails' shortlist still draws from its six dishes in `baari-mock/lib/household.js`.

## Prompt

Paste this into Vinay's session as is.

> You're in W1. The app now collects cuisine picks. Make them reach the vote. Read `prd/CUISINE_HANDOFF.md` and `app/cuisine.js` (read only, it's W3's file).
>
> 1. Store `prefs.cuisine` with the same shape, through the same `/app/prefs` route `prd/VOICE_HANDOFF.md` asks for. Include it in `/app/state`.
> 2. Add the liked dishes to the shortlist pool. Each needs a recipe in `DISHES` (grams for 4, like the existing six) so the pantry check and the Delhivery order still work. Use the dish's `buy` field as the item a kirana won't stock; that line goes into the order.
> 3. Frequency: at most one liked dish per shortlist, and only as often as `freq` says (`1w`: one shortlist a week, `2w`: two, `wknd`: Friday and Saturday only, `ask`: never unless someone asks in Telegram). The other slot stays a regular house dish.
> 4. If `who` doesn't include everyone, the brief to the cook says so: "Vinay aur Mummy ke liye pasta, Papa ke liye roz wali thali." Count the plates from that.
> 5. House rules still win: a Tuesday no-onion rule or a Jain member filters these exactly like the six.
> 6. Level 2 on Telegram: `/swaad` shows the cuisines as an inline keyboard (multi-select), then sends dishes one by one with Haan / Nahi buttons. It writes the same `prefs.cuisine`.
>
> Tell W3 in a commit comment when it's live; W3 will make the app save to rails and show "aaj ki vote mein Korean ramen" on the hero. Stay in `baari-mock/`. Commit format `[W1] ...`.
