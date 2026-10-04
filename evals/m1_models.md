# M1: which model can Baari run on (2026-10-04, 17:50 IST)

Tested on `Baari-eval` (id 4156793c-783d-493d-98f9-f363f32e26c5). Each model was pinned with `PATCH /agents/{id}` `{"llm":{"provider","model"}}` and then sent a one-line run.

| Provider / model | Saves on the agent | Runs | Note |
| --- | --- | --- | --- |
| azure_openai / deployment:gpt-4o | yes | yes, 5 s | platform default, run msg_5d7d34dc8db1 |
| azure_openai / deployment:gpt-4o-mini | yes | yes | run msg_1144b3f1d97d |
| openai / gpt-4o | yes | no | LLMProviderNotConfigured |
| anthropic / claude-sonnet-4-6-20251001 | yes | no | LLMProviderNotConfigured, run msg_5e583e13ea15 |
| gemini / gemini-2.5-pro | yes | no | LLMProviderNotConfigured, run msg_2fb69992af59 |
| openai_compatible / qwen/qwen3.8-27b:free | no | no | 422 "Unknown llm.model". The deployed catalog has no wildcard; the org admin has to add the credential and model |

## Update, 17:30 IST: other Azure deployments

The "Other model" box takes any `deployment:<name>` and saves it, so saving proves nothing. Each name below was pinned on Baari-eval and given one ping run.

| Deployment | Runs | Error |
| --- | --- | --- |
| deployment:gpt-5.4 | yes | none, answered PONG |
| deployment:gpt-4.1 | yes | none |
| deployment:gpt-5-mini | no | OpenAIInvalidRequestError (exists, rejects a parameter the platform sends) |
| deployment:gpt-5, gpt-5.1, gpt-5.2, gpt-5-chat, gpt-5-nano, gpt-4.1-mini, gpt-4.1-nano, o3, o4-mini | no | OpenAIModelNotFoundError |
| deployment:gpt-6.1-sol | no | OpenAIModelNotFoundError, on Baari-eval and on Baari (run msg_70f014e67fc1) |
| deployment:gpt-5.4-mini | yes | none |
| deployment:gpt-6-sol, gpt-6-astra, gpt-6-luna, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-chat-latest, gpt-5.5, gpt-5.4-pro, gpt-5.3-codex, gpt-oss-120b, model-router | no | OpenAIModelNotFoundError (probed on Baari, 17:45) |
| bare `gpt-6.1-sol` | no | 422 Unknown llm.model at save |

Own key: `/tenant-ai-credentials` (Settings, AI credentials) takes an OpenAI-compatible key and base URL, which would let OpenRouter models run, but it needs `agenticorg:admin`. Our login is `developer`, so it returns 403.

The org's Azure deployments that run: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5.4, gpt-5.4-mini. gpt-5.4 is the strongest.

Decision: Baari and Baari-eval run on `azure_openai / deployment:gpt-5.4` (Baari ping msg_813481cb7e4b). GPT-4o scored 0 of 10 in round 1 (it stops after one or two tool calls). Qwen stays an off-platform comparison through the replica.

## First decision, 17:10 IST

Decision: Baari runs on Azure GPT-4o, the only full model the org holds a key for. Qwen is compared off-platform through the replica (EVAL_PLAN 3.3) and labelled as such. The organisers can be asked to add an `openai_compatible` credential; we don't wait on it.

Budget: `Baari-eval` `cost_controls.daily_token_budget` raised from 500,000 to 5,000,000 with a plain PATCH, so platform evals aren't budget-bound.
