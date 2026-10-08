# Voice and customisation handoff (W3 to W1)

The app (v7.3) now lets the owner pick Baari's voice: one for themselves, one for the cook. Five Gnani Timbre v2.5 Hindi voices: Urmila, Jwala, Chitra, Ambuja, Nalini. Today the choice lives only in the phone's `localStorage` (`baari:local` → `voice: { you, cook, lang }`). Nothing on rails or Telegram reads it yet. This file is the prompt for Vinay's session to close that gap, in two levels.

Paste everything under "Prompt" into Vinay's Claude Code session as is.

## What already exists

- App picker: `app/voice.js`. Card on home above "Kiski baari", full screen studio with an orb, swipe between voices, a "For you / For Sunita ji" switch and a language row.
- Samples (pre-rendered, Gnani, Devanagari script): `https://baari.pages.dev/audio/voice-<name>-<you|cook>.mp3`, names in lowercase. About 5 seconds each, mp3, 64 kbps.
- Rails TTS: `lib/gnani.js` `textToSpeech({ text, language, voice })` already takes a voice. The `text_to_speech` tool passes `voice` through. `telegram_send_voice` sends any `audio_url`.
- App to rails: `app/functions/api/[[path]].js` proxies `GET /api/*` to `rails/app/*`. POST to rails from the app goes through a Pages Function that adds `RAILS_MCP_KEY` (see `app/functions/api/stt.js` for the pattern).

## Prompt

> You're in W1 (baari-mock, Telegram bot). Chaitanya's app now has a voice picker. Make the choice real across rails and Telegram. Read `prd/VOICE_HANDOFF.md` first, then `lib/gnani.js`, `lib/telegram.js`, `lib/tools.js`.
>
> **Level 1: one preference store, used by every voice note.**
>
> 1. Add a household preference record in the existing store (KV, same as other household state): `prefs = { voice: { owner: "chitra", cook: "urmila" }, lang: { owner: "hi-IN", cook: "hi-IN" }, updated_at, updated_by: "app" | "telegram" }`. Valid voices are exactly `urmila, jwala, chitra, ambuja, nalini` (Gnani names are the capitalised forms). Anything else falls back to the defaults above.
> 2. Routes: `GET /app/prefs` (CORS open, like `/app/state`, no secrets in it) and `POST /app/prefs` (requires the `xi-api-key` MCP key, same check as `/v1/speech-to-text`). POST merges, validates and returns the full record. Also put `prefs` inside `/app/state` so the app gets it on its normal poll.
> 3. Everywhere rails makes speech, choose the voice by audience. The cook's morning brief and any voice note to the cook use `prefs.voice.cook`. Anything to the owner or family uses `prefs.voice.owner`. In `text_to_speech`, if the caller passes no `voice`, take an optional `audience: "cook" | "owner"` and resolve it from prefs. Update the tool description so the Baari agent knows to pass `audience`. Don't change the agent prompt yourself; tell W2 in a commit comment that the tool gained `audience`.
> 4. Add a smoke test: POST prefs with `cook: "nalini"`, then a cook brief TTS call without a voice must report `voice: "Nalini"`.
>
> Tell W3 in a commit comment when `/app/prefs` is live. W3 will add `app/functions/api/prefs.js` (POST through the Pages secret) and make the studio save to rails and read back from `/app/state`.
>
> **Level 2: the same customisation inside Telegram.**
>
> The goal: someone who never opens the app can set up Baari fully from the bot, and both stay in sync through the same `prefs` record.
>
> 1. `/awaaz` (and the plain words "awaaz", "voice"): the bot replies with one message and an inline keyboard of the five voices plus "Mere liye / Didi ke liye" toggle buttons. Tapping a voice sends that voice's sample as a real voice note (`sendVoice`, OGG Opus; render it once with Gnani `container: "ogg"` and cache the `file_id` Telegram returns, so later taps cost nothing). A "Ye rakho" button saves to `prefs` with `updated_by: "telegram"` and edits the message to confirm: "Ab se Didi ko Urmila ki awaaz mein brief milega."
> 2. Only the owner's chat can change prefs. The cook's chat can only change `voice.cook` and `lang.cook`, because the cook is the one listening. Everyone else gets a polite no.
> 3. `/bhasha`: same pattern for language per audience (hi-IN, hi-en Hinglish with Poorvi, mr-IN, bn-IN, ta-IN, te-IN, kn-IN). If the picked language doesn't fit the picked voice (the five are Hindi voices), say so and suggest that language's own voice from the Gnani list in `.claude/skills/agenticorg-prd/gnani.md`.
> 4. Then the rest of the customisation the app has, one command each, all writing to the same household record: `/niyam` (house rules, same shape the onboarding rules page writes), `/vrat` (multi-select days), `/budget` (monthly cap and the biggest order Baari may pay without asking), `/time` (what time the vote and the brief go out). Use inline keyboards, never free text where a button works, and reply in the household's language.
> 5. Log every change as an `/app/events` entry (`kind: "prefs"`, who, what changed) so the app's Diary shows "Didi ne apni awaaz Nalini kar di, Telegram se".
>
> Stay in your lane: `baari-mock/` only. No secrets in commits. Commit format `[W1] ...`.

## What W3 does after Level 1

- `app/functions/api/prefs.js`: POST proxy with the Pages secret.
- `app/voice.js`: on change, POST `{ voice: { owner, cook }, lang }`; on load, prefer `state.prefs` over localStorage, so a change made in Telegram shows up in the app.
- Diary row for `kind: "prefs"` events.
