# Baari launch film

A three-minute Remotion film. Sunita, the cook, narrates. The household is a toy theatre in paper
(the anidoodle paperCraft kit, ported in `src/anidoodle/`). Every phone shot is the real app at
baari.pages.dev on its demo fixtures, recorded by `scripts/record.mjs` with a touch dot on the pointer.

```
npm install
node scripts/vo.mjs        # ElevenLabs lines from scripts/lines.json, needs ELEVENLABS_API_KEY in .env
node scripts/sfx.mjs       # sound effects and the music bed
node scripts/record.mjs tour   # re-record the app (vote, lock, tour)
npx remotion render BaariLaunch out/baari-launch.mp4 --codec h264 --crf 18
```

`src/timeline.ts` lays scenes out from the voice durations. `node scripts/stills.mjs <frames...>`
renders review stills to `out/stills/`.
