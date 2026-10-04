# Recording checklist

Three takes after the 21:00 prompt freeze: run 1 (everything works), run 2 (Papa's voice note, no rider), run 3 (Sunita's "haan haan", late reply, Vinay's over-cap ask). The on-camera steps live in the `/dev` script stepper (`app/dev/scripts.json`). This file covers everything around them.

## Once, before the first take

- Telegram on every phone in the take, each one opened the bot through its role link from `/dev` > Cast. Cast A is best: Vinay on his phone, mom as Sunita on hers, solo mode covers Papa and Mummy. Cast C if mom isn't free: Vinay alone, solo mode covers everyone else, and you answer as a role with Telegram's Reply on that role's message.
- Phone mirroring ready: scrcpy for Android, QuickTime for iPhone.
- Screen recorder set to capture the household app, https://baari.pages.dev, in a phone-sized window (Chrome device toolbar at 390 x 844, or the real phone mirrored), with the AgenticOrg agent page in a second tab. Show Ghar during the vote, Khata and Delivery after LOCK, Sunita in the morning, and Why at the end. `/dev` sits on the screen that isn't recorded.
- Notifications off on the laptop. Phone on Do Not Disturb, except Telegram.
- The `baari-clock` Worker carries the KB heal (522f873). It needs one deploy and one `node workers/baari-clock/kb-load.js`. After that, `/status` shows `kb` with 0 missing.
- Tell W2 in STATUS: rails and Baari (main) are taken from now until the last take ends.

## Before each take

1. `/dev` > Reset. For run 2 or run 3, press that run's preset right after.
2. `node recording/preflight.js run1` (or `run2`, `run3`). Roll only on GO. A `warn` is fine.
3. Recording mode on in `/dev`. It greys out "Say it for them" and tags every run with `RECORDING: run1`.
4. Start the screen recorder, then follow the stepper.

## During

- Every human reply comes from a real phone. "Say it for them" stays off.
- If a phase fails (red on `/dev`), stop and don't fire it again on camera. Check `/status`, fix it, then Reset and take it again from the start. A clean take beats a patched one.
- Run 3 needs the late toggle on before the second COOK_REPLY.

## After each take

1. Stop the recorder. Recording mode off.
2. Name the file `baari-run1-2026-10-04.mp4` (run2, run3) and drop it in the Drive folder "Baari recordings (Round 3)": https://drive.google.com/drive/folders/1Jds2hAOcCBV1yQ8yzLghEbZgk4iSxAwB?usp=sharing. Anyone with the link can view (set 4 Oct), so each file's link works for judges as soon as it's uploaded.
3. Export the decision log for answer 4: `/dev` stepper's last step, or `GET /admin/run-output` on rails. Each phase is stored with its `RECORDING` tag.
4. Write the take and its Drive link in STATUS.

## Small media

The thali receipt image and any demo audio go to rails, not R2: `PUT /admin/media/<name>` with the admin key, then it's public at `https://baari-rails.vercel.app/media/f/<name>`. The limit is about 4 MB a file.
