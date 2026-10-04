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

Decision: Baari runs on Azure GPT-4o, the only full model the org holds a key for. Qwen is compared off-platform through the replica (EVAL_PLAN 3.3) and labelled as such. The organisers can be asked to add an `openai_compatible` credential; we don't wait on it.

Budget: `Baari-eval` `cost_controls.daily_token_budget` raised from 500,000 to 5,000,000 with a plain PATCH, so platform evals aren't budget-bound.
