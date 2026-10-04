# Gnani (Vachana): what it offers

Source: `docs.gnani.ai` (index at `docs.gnani.ai/llms.txt`), read 2026-10-04. Base URL `https://api.vachana.ai`. Auth header `X-API-Key-ID` on every call; a bad key returns 401. Models: **Prisma v2.5** for STT, **Timbre v2.5** for TTS (v2.0 is being retired).

## Speech to text

| Mode | Endpoint | Use when |
| --- | --- | --- |
| REST | `POST /stt/v3`, multipart | A voice note up to **60 seconds** (best under 30). This is the one an agent tool calls. |
| Realtime | `wss://api.vachana.ai/stt/v3/stream` | Live mic or phone audio, raw PCM, VAD splits it into utterances |
| Batch | `POST /stt/v3/batch/jobs`, then start, poll, fetch files | Long recordings or many files. Speaker labels (diarisation). Webhook via `callback_url` or polling |

REST fields (multipart form):

| Field | Meaning |
| --- | --- |
| `audio_file` | WAV, MP3, OGG, FLAC, AAC or M4A. The decoder is picked from the file extension, so name the file to match its type. [ours: a wrong extension gives `AUDIO_CONVERSION_ERROR`] |
| `language_code` | BCP-47: `hi-IN`, `en-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `bn-IN`, `gu-IN`, `pa-IN`, plus Hinglish |
| `format` | `verbatim` (spoken form, default) or `transcribe` (numbers, money, dates written normally) |
| `itn_native_numerals` | With `transcribe`, digits in the native script (`₹५,०००`) |
| `bias_list`, `bias_score` | Up to 100 words to boost: dish names, family names, shop names |
| `enable_substitution`, `substitution_map` | Up to 10 find-and-replace rules after recognition |

Response: `success`, `request_id`, `timestamp`, `transcript`. Errors: 400 bad audio or params, 429 rate limit, 500 transient, 503 down.

Realtime extras: `x-sample-rate` header (8000, 16000, 44100, 48000), VAD headers such as `x-vad-threshold` (0.45 to 0.55 for a clean mic, 0.65 to 0.75 for telephony), fixed for the life of the connection.

## Text to speech

| Mode | Endpoint | Use when |
| --- | --- | --- |
| REST | `POST /api/v1/tts/inference`, JSON | Full audio in one response. What the agent tool calls. |
| Streaming | SSE | Start playback before synthesis ends |
| Realtime | WebSocket | Lowest latency, live calls |

Request: `text`, `voice`, `model` (`timbre-v2.5`), `language` (the 11 codes above, `hi-en` for Hinglish, or `auto`), `speed`, and `audio_config` with `sample_rate` (8000 to 48000), `num_channels`, `sample_width`, `encoding` (`linear_pcm`, `pcm_s16le`, `pcm_mulaw`, `pcm_alaw`, `oggopus`) and `container` (wav, mp3, ogg, mulaw, alaw, raw). WhatsApp voice notes want ogg/opus.

Text normalisation: write numbers, money, dates and IDs the way they should be spoken, or check the normalisation guide. "₹450" and "2 kg" are handled, account numbers and long IDs are not.

SSML is supported. [docs]

### Voices (42 on Timbre v2.5)

| Language | Voices |
| --- | --- |
| Hindi `hi-IN` | Nalini, Bhavna, Yashvi, Urmila, Jwala, Chitra, Ambuja, Deepak, Roopesh, Vikrant, Hemraj, Jalaj, Omkar |
| English `en-IN` | Kaveri, Trupti, Devika, Pranav, Shlok, Girish |
| Hinglish `hi-en` | Poorvi |
| Tamil | Asmita, Trisha, Brinda, Vedika, Noopur |
| Telugu | Suhana, Lehara, Lavanya, Yukti, Varuni |
| Kannada | Saanvi, Kavin |
| Malayalam | Reshma, Riyaan |
| Marathi | Zahira, Ishaan |
| Bengali | Kirra, Dhruva |
| Gujarati | Falak, Veera |
| Punjabi | Mehuli, Zayan |

Chitra (warm, mature, customer care) suits a cook brief. Poorvi is the only Hinglish voice. Use a voice with its own language code or quality drops.

## Voice cloning

`POST` voice-clone embeddings from a short reference clip, then REST, SSE or WebSocket synthesis with that `speaker_embedding`. A household could hear briefs in a family member's voice. Consent matters; say so in the PRD if you use it. [docs]

## Gnani Agent Builder (separate product)

Gnani also sells a full voice-agent builder: knowledge bases, Twilio number import, outbound test calls, dispositions, DTMF, voicemail detection, language switching, Jinja prompts, SMS, email, Zoho CRM and custom HTTP actions, and a Platform API (`Create Agent`, `Trigger Test Call`, `Get Conversation Stats`, FAQ bulk import). The brief puts the agent's decisions inside AgenticOrg, so the Agent Builder can't be the brain. It could be a mock-server capability idea, for example a phone call to the cook, but it is a separate account and product. [docs]

## How Gnani reaches AgenticOrg today

There is no native Gnani connector, and custom MCP tools fail the validator. The working path:

1. Native `elevenlabs` connector, Base URL `https://baari-rails.vercel.app/`, key = our server's key. Connector name `elevenlabs_gnanibaari`.
2. Our server (`baari-mock/lib/eleven_gnani.js`) answers in ElevenLabs' shapes: `/v1/text-to-speech/{voice}`, `/v1/speech-to-text`, `/v1/voices`, `/v1/models`, `/v1/user`.
3. Every request is forwarded to Gnani. The voice id is a Gnani voice name (Chitra, Kaveri, Poorvi and so on). ElevenLabs' `hin` maps to `hi-IN`.
4. TTS audio is cached and served at `/media/tts/<id>.mp3` so it can be forwarded to WhatsApp as a media URL.

Verified: TTS with Chitra returned 67 KB of mp3 from Gnani, logged on our server. [live]

What this means for a PRD:

- Agent tool names say `elevenlabs`, so the submission has to explain the pipe. Nothing goes to ElevenLabs.
- Inside a run, the agent gets base64 audio back. Sending it as a WhatsApp voice note needs a URL, so use the `x-baari-audio-url` the adapter returns, or have the mock expose it.
- STT input has to be base64 in the tool call, or a URL the adapter can fetch. A 60-second limit applies per note.

## Bad cases to design for

| Case | How it shows up | Agent behaviour to specify |
| --- | --- | --- |
| Note longer than 60 s | 400 | Ask for a shorter note, or split |
| Noisy or mumbled audio | Empty or wrong transcript | Read back what it heard and ask to confirm before acting |
| Wrong language code | Garbled transcript | Retry with `hi-en` or the user's set language |
| Rate limit | 429 | Back off, don't spam the family |
| Gnani down | 500 or 503 | Fall back to text in the same channel and say voice is unavailable |
| Mispronounced amounts or names | Audio sounds wrong | Write amounts as words in TTS text and keep a pronunciation list |
