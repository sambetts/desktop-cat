# Desktop Cat

A pixel-art tabby that lives on your desktop (Electron, cross-platform). Requires Node.js 22.12+.

    npm ci
    npm start          # tray icon: bring cat here, interest level, toys, settings
    npm run dist       # package with electron-builder (fetched on demand)
    npx electron scripts/selftest.js   # smoke test (use xvfb-run --no-sandbox on headless Linux)
    npx electron scripts/selftest.js --multi-monitor   # simulated four-screen regression test

## Installing behind a restricted npm registry
- The default install only needs `electron` and the optional `active-win`. `electron-builder` is not installed by `npm ci`; `npm run dist` downloads it with `npx`, so run packaging where the public npm registry is reachable.
- `package-lock.json` is generated with `npm install --min-release-age=30`, because some corporate feeds don't serve very new releases. Use the same flag when updating dependencies.
- `allowScripts` approves only `active-win`'s install script, which fetches its native binding from GitHub. If that fails, npm skips the optional package and the cat just won't perch on windows.
- Electron downloads its binary from GitHub on the first `npm start`.

## Behaviour
- Idle: sits, licks, stretches, wanders, sleeps when you're idle or at night (23:00–07:00).
- Interest slider (0 ignore everything → 4 play with everything) controls how often and how eagerly it reacts.
- Checks on you: walks to the cursor, notices typing (input with a still cursor), jumps onto the top of your active window (needs `active-win`; optional), paces across it while you type (level 4), and knocks a cup off the window edge (level 3+).
- Toys from the tray: yarn ball, laser pointer (follows your cursor), food bowl.
- Animated pixel-art poses with blinking, a swishing striped tail, and cream paws. Silent for now; no meows or purrs.
- Starts on the primary monitor. Supports stacked and offset monitors, and returns to the primary screen after display-layout changes.
- Lost the cat? Right-click the tray icon and choose **Bring cat here** to summon it onto that screen.

## Known limits
- No global click detection (would need a native hook such as uiohook-napi).
- Wayland: always-on-top transparent overlay, cursor polling and active-window lookup are unreliable.
- Sprite artwork and animation live in `renderer/pixel-cat.js`; behaviour lives in `renderer/cat.js`.
