# Repository instructions

## Multi-monitor behavior

Always include multi-monitor considerations in planning, implementation, testing,
and review. Pay particular attention when changing movement, physics, drawing,
window perching, screen geometry, or the Electron overlay. A single rectangular
desktop is not a sufficient model.

- Use this PC's layout as a regression case: primary screen 1 in the centre,
  portrait screens 2 and 3 to its left and right with physically higher bottom
  edges, and another screen above screen 1. Include negative coordinates,
  unequal work areas, taskbars, rotations, and mixed scaling (150% primary,
  100% surrounding displays). Read the current display geometry rather than
  hard-coding display IDs, numbering, dimensions, or scale factors.
- Keep native physical pixels, Electron screen DIPs, overlay-local coordinates,
  renderer CSS pixels, and canvas backing pixels distinct. A spanning window has
  its own DPI scale; subtracting its DIP origin from another monitor's DIPs is
  not sufficient evidence that coordinates match the rendered pixels.
- Keep the whole rendered sprite visible within the union of monitor work areas,
  not just its centre or an intersection with one display. Check floor selection,
  gaps, both travel directions, airborne movement, and window-perching paths that
  can bypass floor clamping. The one exception is transit: a cat that is climbing
  or in the air may pass in front of a taskbar, but must still stay within the
  union of whole screens.
- Preserve the explicit `win.setBounds(bounds)` after `BrowserWindow`
  construction: Windows can cap constructor dimensions to one monitor's work
  area.
- For relevant changes, verify 1->2, 2->1, 1->3, and 3->1 boundary crossings,
  stacked displays, and layout changes. Use `scripts\selftest.js` and its
  `--multi-monitor` mode where applicable, but do not treat simulated displays as
  proof of native mixed-DPI correctness. Compare actual overlay/content bounds,
  zoom, renderer dimensions, devicePixelRatio, and canvas CSS/backing dimensions.
- Prefer app-internal diagnostic controls over global input simulation. Capture
  only the app overlay, omit unrelated window titles and desktop content, leave
  Windows display settings unchanged, and close diagnostic instances you launch.
