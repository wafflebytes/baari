# Prompt versions

One entry per version: what changed, the failure it targets, and pass counts before and after where a round measured them. Prompt files live next to this one. The platform keeps its own history too (`node ao.js prompt-history Baari`).

| Version | Saved | Chars | What changed | Targets | Evidence |
| --- | --- | --- | --- | --- | --- |
| v1 | 2026-10-03 | 8,387 | Round 2 rules as one long prompt, rule ids D1 to D24, Sheets as memory | first draft | `round3/test_runs.md` |
| v2 | 2026-10-03 | 4,516 | Cut to the delivery half only (BOOK and CHECK), because only Delhivery tools passed the validator | validator blocked Telegram and Pine Labs | `round3/test_runs.md` |
| v3 | 2026-10-04 17:20 | 8,025 | Five phases (SHORTLIST, LOCK, CHECK, BRIEF, COOK_REPLY). Rule ids by phase (S, V, M, B, C, K, E, T). Hard limits L1 to L7 at the top. NOW, CAST and SUB come in the task text. HANDOFF JSON carried between runs. DECISIONS output contract. Household facts moved to the KB file `agent/kb/BAARI_sharma_household.md`, safety rules kept in the prompt. | PRD 9, ENGINEERING 1.3 | baseline for round 1 |
