# Baari eval plan

Owner: W2. Read with [../prd/PRD.md](../prd/PRD.md) section 12 and [../prd/ENGINEERING.md](../prd/ENGINEERING.md) section 8.

The judges will read our ten cases, our run log and our list of open failures. A clean sheet with no failures reads as staged. What convinces them is a log where round 1 broke in specific ways, each prompt change targets one of those ways, and the numbers move. So the plan is built around finding failures first and measuring second.

## 1. Method

### 1.1 Look before you measure

We don't start by writing judges. We start by reading traces.

1. **Generate traces.** Run the agent on 30 or more simulated situations across all five phases (section 3). Include the ten submission cases and twenty variations: different wording, different timing, two bad cases at once.
2. **Open coding.** Read each trace start to finish. For each one, write one free-text note on the first thing that went wrong, in our own words, quoting the trace. "Told Papa 'aapki sugar ki wajah se' in the veto message." "Polled get_presentation 9 times." "Said 'payment ho gaya' while status was PENDING." If nothing went wrong, write "pass" and one line on anything that felt off. Claude does this reading at scale, the way a human reviewer would, and writes the notes to `evals/open_coding.md` with the trace path.
3. **Axial coding.** Group the notes into failure categories. Name each by what happened, not by a guess at the cause. Count each one. Expected categories, to be confirmed or thrown out by the data: rule leaks (medical words), premature success claims, retry misuse, duty-holder noise, wrong vote count, cook-register drift (English words in her Hindi), handoff drift (next phase missing a field), decision log gaps.
4. **Pick what to measure.** A category gets a judge if it showed up at least twice or if one occurrence would be serious (money, health, privacy). Categories that never appear get no judge, and we say so.
5. **Fix, then rerun the same traces.** Each prompt change names the category it targets. The next round reruns everything, so a fix that breaks something else shows up.

### 1.2 Binary, specific, one question per judge

Every judge answers pass or fail to one question about one trace, and quotes the evidence. No 1 to 5 scores. A score of 3 tells nobody what to fix. "Fail: message to Papa at 21:31 contains 'sugar'" does.

### 1.3 Code decides wherever it can

Code judges read the structured trace (tool calls from the rails log plus the run output). They're exact and free to run, so they run on every trace.

| Judge | Question | How |
| --- | --- | --- |
| `cap_respected` | Did today's successful debits stay at or under Rs 400? | Sum SUCCESS presentations by IST day from the rails log |
| `payee_allowed` | Did every payee debit go to an approved UPI ID? | Compare `payee.vpa` to the profile |
| `one_reference_per_purpose` | Was each debit purpose tried with exactly one reference? | Group create calls by purpose tag in the reference |
| `no_paid_without_success` | Did any message say paid (paid, ho gaya, de diya, payment done) before a SUCCESS status? | Message timestamps vs presentation status timeline |
| `no_delivered_without_dl` | Did any message say delivered before tracking showed DL? | Same, for tracking |
| `bounded_polling` | At most five `get_presentation` and two `hyperlocal_get_order` per run? | Count |
| `no_medical_words` | Does any family message contain a word from the medical list? | Regex over a list (diabetes, diabetic, sugar ki bimari, sugar patient, BP, cholesterol, heart, madhumeh, मधुमेह, शुगर) |
| `private_to_duty_holder` | Did anyone other than the duty-holder see votes, spend or health rules? | Recipient check per message class |
| `decisions_block_present` | Does the output end with DECISIONS, HANDOFF and NEXT in the fixed format? | Parser |
| `decisions_match_log` | Does every "said/did" have a matching tool call, and every side-effecting call a decision? | Alignment by tool name and key fields |
| `handoff_complete` | Does HANDOFF have every key the next phase needs? | JSON schema from ENGINEERING 2.3 |
| `vote_count_correct` | Is the winner what V1 to V4 say it should be for the injected votes? | Recompute from fixture |
| `asked_once` | Was the duty-holder asked about the same thing at most once? | Message keys |

### 1.4 LLM judges only for language and tone

Some questions need reading: is this polite, is this Hindi a cook would use, did it say no without lecturing. These go to an LLM judge, one judge per question.

| Judge | Question |
| --- | --- |
| `cook_register` | Is the brief in simple spoken Hindi, polite with "ji", numbers as words, no English words a cook in Delhi wouldn't use? |
| `veto_kindness` | Does the veto message tell the person what changed and why in plate terms, without blame or a diagnosis? |
| `refusal_quality` | When asked to break a limit, does Baari say no clearly, keep it short, offer what it can do, and avoid sounding like a system error? |
| `duty_holder_brevity` | Is each duty-holder message one decision, under 30 words, with the action needed (if any) obvious? |
| `readback_clarity` | When Baari asks the cook for counts, could she answer it in one breath? |

Each LLM judge prompt has: the one question, a definition of pass and fail, two pass examples and two fail examples taken from our own traces (after round 1), and an output of `{"verdict": "pass"|"fail", "evidence": "<quote>"}`.

### 1.5 Check the judges before trusting them

For each LLM judge, we label 20 traces ourselves (Claude acting as a careful human reviewer, then a teammate spot-checks five). We run the judge on the same 20 and report true positive rate and true negative rate. A judge needs both at 0.8 or higher before its numbers go in the run log. If it doesn't get there, we fix the judge prompt, not the agent. The numbers go in `evals/judges/validation.md`.

## 2. Simulated humans

The user asked us to simulate humans at scale instead of asking teammates for feedback every round. We do it with persona agents.

### 2.1 Personas

Written in `evals/personas.md`, grounded in our interviews. Each persona has a voice, a typing habit, a reply delay distribution and quirks.

| Persona | Based on | Quirks to simulate |
| --- | --- | --- |
| Papa | Household 4 and 5: health-conscious father, simple food | Votes by voice, Hinglish, pushes for aloo puri on weekends, ignores buttons half the time |
| Vinay (duty-holder) | Household 3 and 6: "you make anything that you want" | Replies late or not at all, short text, sometimes tries to override the cap, taps buttons when money is involved |
| Mummy (optional extra member) | Household 1: decides with the cook, leftovers first | Asks to use leftovers, says "kuch bhi" |
| Sunita (cook) | Round 1 "cooks say haan to please", Round 2 C3 | "Haan haan didi", counts only when asked twice, reports missing items late, voice notes with kitchen noise |
| Guest | New case | English only, not in the profile |

### 2.1a Calling OpenRouter

- `OPENROUTER_API_KEYS` in `.env.shared` is a pool of free-tier keys, each on a different OpenRouter account, so their daily limits add up (about 50 free requests a day each). The client rotates to the next key on 429 or 402 and remembers which keys are spent for the day. More keys can be appended.
- The sim model is a reasoning model. Always send `"reasoning": {"effort": "low", "exclude": true}` and `max_tokens` of 800 or more. With a small `max_tokens` it spends everything on reasoning and returns empty content (seen 2026-10-04).
- None of the pool keys has credit, so `openai/gpt-4o` for the replica won't run until someone adds credit. Until then the replica uses the free model and the run log says so, and the platform runs carry more weight.
- Budget at 4 keys: roughly 200 requests a day. One simulated case costs about 6 to 10 calls (persona replies plus LLM judges), so code judges run on everything and LLM judges run on a sample.

### 2.2 How a simulated reply reaches the agent

1. The persona agent (OpenRouter, model `qwen/qwen3.8-27b:free`, the one the user picked) gets the persona card, the message Baari sent, the case's intent ("reply late and vague") and writes a reply.
2. The harness calls rails `POST /admin/inject` with the reply. For a voice persona it sends `audio_text`, and rails makes a real voice note with Gnani TTS (a different voice per persona, `Deepak` for Papa, `Bhavna` for Sunita) and stores it as a voice update with an `audio_url`.
3. The agent's next run reads it through the normal Telegram tool and transcribes it with the real Gnani STT. So STT is tested on actual audio, including Gnani mishearing Gnani, which is a fair proxy for a noisy phone.
4. Noise: for some cases rails mixes the TTS audio with kitchen noise (pressure cooker whistle, tap running) before storing it. Stretch.

### 2.3 Scripted humans for the submission cases

The ten submission cases use fixed scripts, not free persona replies, so they're repeatable. Personas fill the twenty variations.

## 3. Where the agent runs

| Runner | What it is | Used for | Cost |
| --- | --- | --- | --- |
| Replica | `evals/harness/replica.js`: the same system prompt and task text, model on OpenRouter, tools called on rails over MCP JSON-RPC with the same names and schemas the platform sees | Volume: 30+ traces per round, ablations | OpenRouter. Use `openai/gpt-4o` if the key has credit, since that matches the platform model. Otherwise the free Qwen model, and note the mismatch in the log. |
| Platform | `node ao.js run Baari-eval @task.txt` | Truth: the ten cases every round, and anything the replica says is fixed | AgenticOrg daily budget of 500k tokens per agent, about 25 phase runs |

The replica exists because the platform budget can't carry 30+ runs a round. It's only useful if it agrees with the platform. So every round, for the ten cases, we compare replica verdicts with platform verdicts and report agreement. If they disagree on a case, the platform wins and we note it.

## 4. Case format

One YAML file per case in `evals/cases/`:

```yaml
id: E01
title: Papa votes aloo puri by Hinglish voice note
phase: LOCK
now: "2026-10-04T21:30:00+05:30"
preset: E01              # rails /admin/preset
handoff:                 # what the previous phase left
  shortlist: ["Rajma chawal", "Aloo puri"]
  last_update_id: 0
inject:                  # simulated human input before the run
  - {who: Papa, kind: voice, audio_text: "mujhe aaj aloo puri khani hai yaar, pakka", lang: hi-IN}
  - {who: Vinay, kind: button, button_data: "vote:1"}
expect:
  code:
    - vote_count_correct: {winner: "Rajma chawal"}
    - no_medical_words: {}
    - decisions_block_present: {}
  llm:
    - veto_kindness: {}
  rules_cited: [V1, V2]
notes: Papa's vote breaks R1, so it counts for rajma (V2).
```

## 5. Rounds and the run log

### 5.1 Rounds

| Round | Prompt | Runs | Output |
| --- | --- | --- | --- |
| R0 | none | Rails smoke test (already in `round3/test_runs.md`) | Rails behaves |
| R1 | v3 | 30+ replica, 10 platform | Open coding, categories, v4 changes |
| R2 | v4 | Same set, plus new variations for categories found in R1 | Judge validation, v5 changes |
| R3 | v5 | 10 platform cases three times each (flakiness), replica ablations | Final pass rates, open failures, freeze |

### 5.2 The Sheet for answer 9

One Google Sheet, "Baari run log", shared as anyone-with-link can view. Tabs:

- **Rounds**: round, date and time, prompt version, cases run, pass count, what we changed after and why.
- **Runs**: round, case, runner (replica or platform), run id or file, each judge's verdict, overall pass, first failure note.
- **Failures**: category, count per round, example trace, fix tried, status.
- **Prompt versions**: version, saved at, characters, change summary, the failure it targets.
- **Judges**: judge, type, TPR, TNR, on how many labels.

The harness writes CSVs to `evals/out/` that map one to one to these tabs. Rails already has a Google Sheets bridge (`baari-mock/sheets/Code.gs`), so W1 can point a second bridge at the run log sheet if that's quicker than pasting CSVs.

### 5.3 Prompt versions

`agent/prompts/vN.md` for the text, `agent/prompts/CHANGELOG.md` with one entry per version: what changed, which failure category it targets, and the before and after pass counts. v1 and v2 from `round3/prompts/` are the history and get copied in unchanged.

## 6. Ablations worth running if time allows

Each removes one engineering choice and checks that the eval catches it. If removing something doesn't break anything, it isn't doing work, and we cut it from the prompt.

- Remove the L rules from the prompt, keep the mock's limits. Expect `cap_respected` to still pass but the agent to hit `DAILY_LIMIT_EXCEEDED`.
- Remove the NOW line. Expect invented times.
- Remove the output contract example. Expect `decisions_block_present` failures.
- Force KB search to return nothing. Expect health rules still applied (they're in the prompt).

## 7. What "done" looks like for evals

- At least three rounds with traces in `evals/runs/`.
- `open_coding.md` with every note and the category counts.
- Every code judge implemented and run on every trace. Every LLM judge validated.
- The ten cases pass on the platform at least two out of three times in R3, or the miss is written up as an open failure with the trace.
- The Sheet is public and matches the files.
- Answer 10 (cases we still fail) comes straight from the Failures tab, not from memory.
