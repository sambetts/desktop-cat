# Desktop Cat

A cat that lives on your desktop (Electron, cross-platform).

    npm install
    npm start          # tray icon: interest level, toys, settings
    npm run dist       # package with electron-builder
    npx electron scripts/selftest.js   # smoke test (use xvfb-run --no-sandbox on headless Linux)

## Behaviour
- Idle: sits, licks, stretches, wanders, sleeps when you're idle or at night (23:00–07:00).
- Interest slider (0 ignore everything → 4 play with everything) controls how often and how eagerly it reacts.
- Checks on you: walks to the cursor, notices typing (input with a still cursor), jumps onto the top of your active window (needs `active-win`; optional), paces across it while you type (level 4), and knocks a cup off the window edge (level 3+).
- Toys from the tray: yarn ball, laser pointer (follows your cursor), food bowl.
- Synthesised meows and purrs (can be turned off). Multi-monitor aware.

## Known limits
- No global click detection (would need a native hook such as uiohook-napi).
- Wayland: always-on-top transparent overlay, cursor polling and active-window lookup are unreliable.
- The cat is drawn procedurally; swap in sprites in `renderer/cat.js` `drawCat()`.
