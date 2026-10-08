# What the household app can use from rails now

For Chaitanya, 8 October 2026. Everything below is live on `https://baari-rails.vercel.app`. Nothing in `app/` was changed; this is what's ready to wire.

## 1. Read: new fields in `/app/state`

The app already polls `/api/state`. These fields are new:

| Field | What it is | Use it for |
| --- | --- | --- |
| `turn.mode` | `"pick"` or `"vote"` for tonight | The mode switch, instead of `local.mode` |
| `turn.next_mode` | The mode the next night will use | Showing "from tomorrow" after a switch mid-night |
| `turn.holder` | Whose baari tonight | "Today's turn", instead of `local.duty` |
| `turn.next` | Whose baari is next | The queue's first face |
| `turn.order` | Who's in the rotation, in order | The queue and "In the baari" |
| `turn.passed` | Who passed tonight | Greying them in the queue |
| `turn.history` | Last 7 nights: `{date_for, holder, dish, how}` (`how` is picked, vetoed, voted, tie or default) | Diary, "whose picks won" |
| `turn.picks` | Nights each person picked this month | Fairness line |
| `household.members` | `[{name, kind: "family"\|"cook", joined, in_baari}]`, from who really joined on Telegram | Invite card's "joined" state, instead of the fixed `PEOPLE` list |
| `household.invite` | `https://t.me/Baari_ken_bot?start=join` | The invite link (it works now, see 3) |
| `household.demo` | `{mode, started_ist}` while a demo night runs, else `null` | A "Demo night" badge |
| `delivery.kirana_order` | `{order_id, status, lines[], total_rupees, paid, utr, pickup_by, picker}` | A Sharma Kirana card: PLACED, PACKED, READY, and paid with UTR |

`household.duty_holder` still exists and equals `turn.holder`. So today, once a phone has a `local.duty`, it stops showing the live turn. Reading `turn.holder` first fixes that.

## 2. Write: two new endpoints

Both need the header `x-household-key`. The key is in `.env.shared` as `HOUSEHOLD_KEY`. It belongs in a Pages secret, never in the browser.

The Pages proxy (`app/functions/api/[[path]].js`) only forwards GETs today. It needs to forward `POST /api/turn` and `POST /api/demo` to rails `/app/turn` and `/app/demo`, adding the key server-side, the way `/api/dev` adds the admin key.

`POST /app/turn`

| Body | Does | App control |
| --- | --- | --- |
| `{"action":"give","name":"Papa"}` | Tonight's baari goes to Papa; if dishes are out, Baari sends Papa the card | Tapping a face in the queue |
| `{"action":"pass"}` | The holder passes to the next person; Baari sends them the card | "Aage" |
| `{"action":"out","name":"Papa"}`, `{"action":"in","name":"Papa"}` | Takes someone out of or into the rotation (at least two stay in) | "Badlo" edit mode |
| `{"action":"mode","mode":"vote"}` | Sets the mode: tonight if the dishes haven't gone out, else tomorrow (`from` in the reply says which) | The pick / vote switch, and onboarding's mode step |

`POST /app/demo` with `{"mode":"pick"}`, `{"mode":"vote"}` or `{"stop":true}` starts or stops a demo night (see `docs/DEMO_RUNBOOK.md`). This could sit in the + menu.

## 3. Telegram, already working

- `t.me/Baari_ken_bot?start=join` and `/join`: Baari asks "Aap kaun hain?" with a button per open role. A tap claims it. A role held by another real chat can't be taken.
- `/leave` frees your role. `/baari` says whose turn it is. Vinay sends `/mode pick` or `/mode vote`.
- `/demo pick`, `/demo vote` and `/demo stop`, from anyone in the household.

## 4. Not on rails yet

The onboarding answers (home name, member names, custom plate rules, cook name, arrival time, brief language) still live only on the phone. The agent uses the fixed Sharma household. Sending them to rails needs a household profile that the agent reads on every run. That's the next backend piece if you want onboarding to change what Baari does.
