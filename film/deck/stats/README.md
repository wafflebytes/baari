# Build stats for the deck

Feeds slide 11 ("How two people built this") and appendix pages A1 to A4 in `film/DECK_PLAN.md`. Every number on those pages comes from a file in this folder, regenerated on the morning of the finale.

| File | What it holds | How it's made |
| --- | --- | --- |
| `git_stats.py` → `git.json` | Commits, authors, hours, lanes, versions, cache bumps, the full commit log for the clock and the rail map | `git fetch origin && python3 film/deck/stats/git_stats.py > film/deck/stats/git.json` |
| `cc_stats.py` | Claude Code sessions, hours, prompts, tokens, tools, skills, MCP servers, subagents, fun counters. Counts only: no text, paths or commands leave the machine | Each of us runs it locally through `PROMPT.md` |

## Verified so far (9 October, 01:15 IST)

From `git.json` and the repo. Re-run before the finale, since the numbers only go up.

| Fact | Number | Source |
| --- | --- | --- |
| Commits since Round 3 kickoff (4 Oct, 16:30) | 160, plus 5 merges | `git.json` `commits` |
| Commits written with Claude Code (co-author line or a cloud session) | 151 of 160 | `with_claude_coauthor` |
| Commits after 8 PM, Baari's own hours | 43% | `after_8pm_share` |
| After midnight | 12 so far | `after_midnight` |
| Longest stretch with no 3-hour gap | 12.2 hours (8 Oct 12:41 to 9 Oct 00:51) | `longest_stretch_no_3h_gap` |
| Named app versions | 30, v2 to v8.0.0, in 29 hours (7 Oct 17:24 to 8 Oct 22:34) | `app_versions_named`, `app_version_span` |
| Versions spent on the nav pill alone | 3 in 15 minutes (v7.5.8, v7.5.9, v7.6.0) | `log` |
| Most-edited file in the repo | `app/sw.js`, 51 commits. 50 of them bump the cache name, now `baari-shell-v53` | `most_edited_files`, `sw_cache_bumps` |
| npm packages in the app a family opens | 0. Plain JS and one service worker, plus two CDN scripts (html2canvas, qrcode-generator) and Google Fonts | `app/`, both laptops' reports |
| npm packages in the rails server | 0. Node built-ins only (`crypto`, `fs`, `path`) | `baari-mock/package.json` |
| Prompt versions | 13. v1 was 8,387 characters, v12 is 26,818. Every row in `agent/prompts/CHANGELOG.md` names the failure it fixes | `agent/prompts/` |
| Model names we tried on the platform | 33. Five ran: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5.4, gpt-5.4-mini. Claude got `LLMProviderNotConfigured` | `evals/m1_models.md` |
| Tool names we probed on the validator | 15, in one hour (V1) | `agenticorg-cli/V1_RESULT.md` |
| Platform facts in our skill, by how we know them | 44 `[live]`, 13 `[docs]`, 3 `[ours]`, 3 `[unverified]` | `.claude/skills/agenticorg-prd/` |
| Bad-night eval cases | 20 (E01 to E20) | `evals/cases/` |
| Platform eval runs logged | 83 (R0 to R3) | `evals/out/runs.csv` |
| A whole demo night, end to end, with no phones | 11 minutes (T1) | `docs/DEMO_TESTS.md` |
| Households we talked to | 11 before we built, 3 after (S10 to S12) | insight map, slide 4 |
| Dish renders | 40, one family | `app/` |
| Languages the brief speaks | 6, with word timings | `app/audio/brief.json` |
| This planning session alone (cloud) | 43M tokens, subagent included | `cc_stats.py` on this container |

Not features: the 20,225-line commit named "ok" is mostly assets, so don't quote lines of code. Don't quote cost in dollars unless `ccusage` or the session API gives it.

## Both laptops (9 October, about 01:15 IST)

From each of us running `PROMPT.md`. Baari only; the full split is `team.json`.

| | Chaitanya | Vinay | Both |
| --- | --- | --- | --- |
| Active hours with Claude Code | 30.7 | 36.7 | 67.4 |
| Claude's replies | 2,839 | 2,589 | 5,428 |
| Tool calls | 32,545 | 3,920 | 36,465 (70% Bash) |
| Edits | 1,849 | 691 | 2,540 |
| Browser actions (Claude checking its own screens) | 5,761 | 360 | 6,121 |
| Tokens (ccusage) | 62.1 crore | 67.0 crore | 129.2 crore, 98.5% read from cache |
| Cost at API prices (ccusage) | $224.05 | $234.02 | $458.07, plus about $25 in the cloud |
| Interrupted / apologised | 172 / 21 | 20 / 0 | 192 / 21 |
| "bro" or "bruh" in our prompts | 69 | 13 | 82 |
| "You're absolutely right" | 0 | 0 | 0 |
| Em dashes Claude wrote, in a repo that bans them | 0 | 3 | 3 |
| Skills used | transitions-dev 19, humanizer 12, unslop 1 | unslop 2, agenticorg-prd 2, humanizer 1, frontend 1 | |
| Commit comments by tag | | | 22: 12 `[unblocked]`, 5 `[ask]`, 3 `[used]`, 2 `[idea]`, 0 `[blocked]`, 0 `[review]` |

Not for the slides: prompt counts. Chaitanya's transcripts show 663 messages in one hour on 4 October, which looks like a loop or a relay, not typing.

## Getting everyone's numbers

The prompt each of us pastes into our own Claude Code is in `PROMPT.md`. It runs `cc_stats.py`, `ccusage`, `gh` and `list_sessions` where they exist, and prints one block, committing nothing.

Chaitanya's account, read at 01:00 IST: this planning session at $14.48 so far and the upload-recovery session at $0.37. Chaitanya's main build session ("Baari agentic setup with PineLabs", 4 to 8 Oct) runs locally through Remote Control, so its numbers come from `cc_stats.py` on the laptop.
