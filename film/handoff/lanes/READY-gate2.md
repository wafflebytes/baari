# Ready: gate 2

Lanes A to E can start. Base commit: `aa029eb` on `video-handoff`.

Read `film/handoff/lanes/README.md` first. Branch from `origin/video-handoff`, build your shots in your own files, run `node scripts/lint-motion.mjs` on them, write `film/handoff/lanes/<x>.md` with `Status: done` last, and push `video-lane-<x>`.

The lead builds the tour and the night (lane F) on `video-handoff` meanwhile, and merges every lane when the owner says the lanes are done.
