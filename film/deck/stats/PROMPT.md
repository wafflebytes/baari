# Prompt: your Claude Code and GitHub numbers for the deck

Paste everything inside the box into your own Claude Code, opened in your Baari clone, on the laptop you built Baari on. Chaitanya and Vinay each run it once. It commits nothing; it prints one block to paste back into the deck session.

One thing only you can do: type `/stats` in Claude Code, and if it shows a usage screen, screenshot it and send that too.

````text
I need my Claude Code and GitHub numbers for the Baari finale deck's "how we built it" slide. Counts and names only. Nothing private leaves this machine: no message text, file paths, shell commands, keys, tokens, chat ids, emails or phone numbers. Don't commit, push or edit any repo file. Print the result here for me to copy.

1. Get the counting script without touching my branch:
   git fetch origin claude/brave-lamport-levavu
   git show origin/claude/brave-lamport-levavu:film/deck/stats/cc_stats.py > "${TMPDIR:-/tmp}/cc_stats.py"
   Read it before running it. It's standard-library Python that reads ~/.claude/projects/ and prints counts.

2. List the folder names in ~/.claude/projects/. Pick every folder that belongs to Baari: the main clone, other clones, worktrees, anything with baari in the name. Then run the script ONCE, covering all of them:
   python3 "${TMPDIR:-/tmp}/cc_stats.py" --who <my first name, lowercase> --since 2026-09-01 --match "<substring1>,<substring2>"
   Check that "project_folders" equals the number of Baari folders you found. Leave out folders that clearly aren't Baari.

3. Cost and daily tokens: run npx ccusage@latest daily --since 20260901 --json, and npx ccusage@latest session --json if that works. Report Baari-only numbers if it breaks them down by project; otherwise report the total and say it covers every project. If npx fails, say so and move on.

4. Skills and plugins: the skill names in ~/.claude/skills/ and in the repo's .claude/skills/, and the installed plugin names (claude plugin list, or the folder names under ~/.claude/plugins/). Names only. From the script's output, say which skills and slash commands were actually used in Baari sessions, and how many times.

5. MCP servers: claude mcp list, names only. Never print a URL, an argument or a header.

6. Libraries and services, from the repo: every outside package we depend on (each package.json, Python imports outside the standard library, CDN script and font tags in app/ and baari-mock/) and every outside service we call (APIs, hosting, voice, payments, delivery, Telegram, telephony). Mark which parts of the repo have zero dependencies.

7. Git, after git fetch --all, my commits only (match my author name and email):
   - my commit count, and how many were written with Claude (a Co-Authored-By: Claude line)
   - how many landed after 8 PM IST, and after midnight
   - my latest-at-night commit: time and subject
   - my longest working stretch with no 3-hour gap
   - the commit subject of mine you'd call the funniest or most telling, verbatim

8. Vinay only: count our commit comments by tag:
   gh api repos/wafflebytes/baari/comments --paginate --jq '.[].body'
   Count the bodies that start with [ask], [used], [unblocked], [blocked], [idea] and [review]. Then quote the three funniest bodies verbatim, skipping any that hold keys, ids, numbers or names that look private. If gh isn't logged in, say so. Also say which account ran the cloud sessions that made the branches cloud/app, cloud/evals, cloud/memory and cloud/taste, if you can tell.

9. If you have the list_sessions tool (claude-code-remote), list my cloud sessions about Baari, with created and updated times and each one's usage block, then total the cost and tokens. If you don't have the tool, say so.

Then print ONE fenced block, in this order:
- the cc_stats JSON, exactly as the script printed it
- ccusage: cost in USD, total tokens, busiest day
- skills (installed; used, with counts), plugins, MCP servers
- libraries and services, with the zero-dependency parts marked
- the git numbers from step 7
- commit comments (Vinay only)
- cloud session totals
- "10 facts for the slide": ten one-line facts built only from the numbers above, each carrying its number. Make them funny where the number allows, and never invent or round up. The kind of line I mean: "1,240 tool calls, 61% of them Bash", "Claude was interrupted 37 times. It apologised 9."

Before printing, read the block once more for anything private (a path with my username, an email, a key, a chat id, a phone number, any message text) and remove it.
````

## What comes back, and where it goes

Paste both blocks into the deck session. They feed slide 11 and appendix pages A1 and A2 in `film/DECK_PLAN.md`, next to `git.json`.
