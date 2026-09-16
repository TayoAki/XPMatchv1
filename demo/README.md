# XPMatch demo video

A Remotion project that turns a scripted walkthrough of the app into a two-minute demo: sign-up and
the six-step onboarding, the home picks with match scores, a trip proposal in chat, the board with
travel times and stop details, a confirmation turned into a booking, and a bug report.

The walkthrough is recorded against the same deterministic stack the end-to-end tests use (stand-in
model, Google Places stub, fresh embedded database), so it costs nothing to re-record and always
shows the same Rome fixtures.

```bash
# from the repository root (the app's dependencies must be installed)
cd demo && npm install && cd ..
node demo/capture.mjs                 # records demo/public/walkthrough.webm and demo/timeline.json
cd demo && npm run render             # demo/out/xpmatch-demo.mp4 (1920×1080, 30 fps, h264)
npm run preview                       # Remotion Studio to tweak titles and captions
```

`capture.mjs` starts its own app instance on port 3300 (override with `DEMO_APP_PORT`) and writes one
timeline mark per chapter; `src/timeline.ts` maps those marks to the titles and captions shown around
the recording. The recording uses Playwright's Chromium (`PW_CHROMIUM`, default
`/opt/pw-browsers/chromium`); the render uses Playwright's headless shell (`REMOTION_BROWSER`, default
`/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`), because Remotion drives
Chrome's old headless mode. Remotion never downloads a browser here.
