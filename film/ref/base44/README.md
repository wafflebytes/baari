# Base44 reference frames

Frames from "Build an app with your name on it" (Base44, 50 s, 1280 x 720, 24 fps), the reference for the trailer. The video itself isn't committed.

- `sheet_01.jpg` to `sheet_07.jpg`: every half second, timestamped, 16 frames a sheet.
- `zoom_<start>s.jpg`: eight frames a second around each big transition, starting at that second.

Made with ffmpeg:

```bash
ffmpeg -i ref.mp4 -vf "fps=2,scale=400:-1,drawtext=text='%{pts\:hms}':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=4x4:padding=4" sheet_%02d.jpg
```

The breakdown is in `film/TRAILER_PLAN.md`, section 2.
