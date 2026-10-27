// Smoke test: electron scripts/selftest.js
const assert = require('node:assert/strict');
const { app, BrowserWindow, Tray, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const multiMonitor = process.argv.includes('--multi-monitor');
const mixedDpi = multiMonitor && process.platform === 'win32';
let simulatedDisplays, simulatedCursor, trayMenu, simulatedActiveBounds;
if (mixedDpi) {
  try {
    const activeWin = require.resolve('active-win');
    require(activeWin);
    simulatedActiveBounds = { x: 200, y: 300, width: 900, height: 600 };
    require.cache[activeWin].exports = async () => ({ bounds: simulatedActiveBounds, owner: { processId: process.pid + 1, name: 'Selftest' }, title: 'Selftest' });
  } catch {}
}
if (multiMonitor) {
  app.whenReady().then(() => {
    const rect = ([x, y, width, height]) => ({ x, y, width, height });
    const display = (id, bounds, scaleFactor, physical = bounds, inset = 0) => ({
      id, bounds: rect(bounds), workArea: { ...rect(bounds), height: bounds[3] - inset }, scaleFactor, physical: rect(physical),
    });
    simulatedDisplays = mixedDpi ? [
      display(4, [711, -1080, 1920, 1080], 1, [1067, -1080, 1920, 1080]),
      display(2, [-1080, 0, 1080, 1920], 1),
      display(1, [0, 0, 2560, 1440], 1.5, [0, 0, 3840, 2160], 48),
      display(3, [2560, 0, 1080, 1920], 1, [3840, 0, 1080, 1920]),
    ] : [
      display(4, [450, -450, 800, 450], 1, undefined, 48), display(2, [-450, 0, 450, 800], 1, undefined, 48),
      display(1, [0, 0, 1600, 900], 1, undefined, 48), display(3, [1600, 0, 450, 800], 1, undefined, 48),
    ];
    simulatedCursor = mixedDpi ? { x: 1280, y: 696 } : { x: 800, y: 400 };
    screen.getAllDisplays = () => simulatedDisplays;
    screen.getPrimaryDisplay = () => simulatedDisplays.find((d) => d.id === 1);
    screen.getCursorScreenPoint = () => simulatedCursor;
    screen.getDisplayNearestPoint = (p) => simulatedDisplays.find(({ bounds: b }) =>
      p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height) || screen.getPrimaryDisplay();
    if (mixedDpi) {
      const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      const matching = (r, physical) => simulatedDisplays.reduce((a, b) => overlap(r, b[physical ? 'physical' : 'bounds']) > overlap(r, a[physical ? 'physical' : 'bounds']) ? b : a);
      screen.dipToScreenRect = (window, r) => {
        const d = window ? screen.getPrimaryDisplay() : matching(r, false);
        return {
          x: Math.round(d.physical.x + (r.x - d.bounds.x) * d.scaleFactor),
          y: Math.round(d.physical.y + (r.y - d.bounds.y) * d.scaleFactor),
          width: Math.round(r.width * d.scaleFactor), height: Math.round(r.height * d.scaleFactor),
        };
      };
      screen.screenToDipRect = (window, r) => {
        const d = window ? screen.getPrimaryDisplay() : matching(r, true);
        return {
          x: Math.round(d.bounds.x + (r.x - d.physical.x) / d.scaleFactor),
          y: Math.round(d.bounds.y + (r.y - d.physical.y) / d.scaleFactor),
          width: Math.round(r.width / d.scaleFactor), height: Math.round(r.height / d.scaleFactor),
        };
      };
      screen.dipToScreenPoint = (p) => {
        const d = screen.getDisplayNearestPoint(p);
        return {
          x: Math.round(d.physical.x + (p.x - d.bounds.x) * d.scaleFactor),
          y: Math.round(d.physical.y + (p.y - d.bounds.y) * d.scaleFactor),
        };
      };
    }
    const setContextMenu = Tray.prototype.setContextMenu;
    Tray.prototype.setContextMenu = function (menu) { trayMenu = menu; return setContextMenu.call(this, menu); };
  });
}
require('../main.js');

function checkSprites() {
  const image = document.createElement('canvas');
  image.width = 216; image.height = 162;
  const pixels = image.getContext('2d');
  const render = (overrides = {}) => {
    pixels.clearRect(0, 0, image.width, image.height);
    pixelCat.draw(pixels, { x: 108, y: 150, t: 0, state: 'sit', vx: 0, vy: 0, dir: 1, air: false, swat: 0, ...overrides });
    return pixels.getImageData(0, 0, image.width, image.height).data;
  };
  const same = (a, b) => a.every((v, i) => v === b[i]);
  const right = render(), left = render({ dir: -1 });
  let mirrored = true;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    for (let c = 0; c < 4; c++) {
      if (right[(y * image.width + x) * 4 + c] !== left[(y * image.width + image.width - 1 - x) * 4 + c]) mirrored = false;
    }
  }
  if (!mirrored) throw new Error('Facing left must mirror the sprite without changing its pixels');
  if (!same(right, render({ x: 108.25, y: 150.25 }))) throw new Error('Fractional movement must snap to whole pixels');
  if (same(render({ state: 'walk', vx: 60 }), render({ state: 'walk', vx: 60, t: 0.125 }))) throw new Error('Walking must animate');

  const poses = [
    ['Sitting', {}], ['Walking', { state: 'walk', vx: 60 }], ['Next step', { state: 'walk', vx: 60, t: 0.125 }],
    ['Jumping', { state: 'jump', air: true, vy: -200 }], ['Stretching', { state: 'stretch' }],
    ['Grooming', { state: 'lick' }], ['Sleeping', { state: 'sleep' }], ['Smug', { state: 'smug' }],
    ['Swatting', { swat: 0.4 }], ['Eating', { state: 'eat' }],
  ];
  const atlas = document.createElement('canvas');
  atlas.width = image.width * 5; atlas.height = image.height * 2;
  const sheet = atlas.getContext('2d');
  const unique = new Set();
  for (const [i, [label, pose]] of poses.entries()) {
    const data = render(pose);
    let drawn = 0;
    for (let p = 3; p < data.length; p += 4) {
      if (data[p] !== 0 && data[p] !== 255) throw new Error(`${label}: sprite edges must not be blurred`);
      if (data[p]) drawn++;
    }
    if (drawn < 1000) throw new Error(`${label}: missing sprite`);
    if (pose.state !== 'sleep') {
      const seen = new Uint8Array(image.width * image.height), pending = [data.findIndex((v, i) => i % 4 === 3 && v) >> 2];
      let connected = 0;
      while (pending.length) {
        const p = pending.pop();
        if (seen[p]) continue;
        seen[p] = 1; connected++;
        const x = p % image.width, y = Math.floor(p / image.width);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, next = ny * image.width + nx;
          if (nx >= 0 && nx < image.width && ny >= 0 && ny < image.height && !seen[next] && data[next * 4 + 3]) pending.push(next);
        }
      }
      if (connected !== drawn) throw new Error(`${label}: limbs must stay connected to the cat`);
      for (let y = 0; y < image.height; y += 3) for (let x = 0; x < image.width; x += 3) {
        const start = (y * image.width + x) * 4;
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) for (let c = 0; c < 4; c++) {
          if (data[start + c] !== data[((y + dy) * image.width + x + dx) * 4 + c]) throw new Error(`${label}: broken pixel grid`);
        }
      }
    }
    unique.add(image.toDataURL());
    const x = i % 5 * image.width, y = Math.floor(i / 5) * image.height;
    sheet.fillStyle = i % 2 ? '#202735' : '#f5eee1'; sheet.fillRect(x, y, image.width, image.height);
    sheet.fillStyle = i % 2 ? '#f5eee1' : '#362c40'; sheet.font = '13px sans-serif'; sheet.fillText(label, x + 12, y + 20);
    sheet.drawImage(image, x, y);
  }
  if (unique.size !== poses.length) throw new Error('Behaviour poses must be visually distinct');
  return { poses: poses.length, png: atlas.toDataURL('image/png').split(',')[1] };
}

function checkSilence() {
  const saved = { cat: { ...cat }, env, settings, toys, random: Math.random, audio: window.AudioContext };
  let attempts = 0;
  window.AudioContext = class { constructor() { attempts++; throw new Error('Silent cat must never create audio'); } };
  const pose = (state, overrides = {}) => Object.assign(cat, {
    x: 300, y: floorAt(300), vx: 0, vy: 0, dir: 1, air: false, onWindow: false, swat: 0,
    state, stateTime: 0, dur: 20, ...overrides,
  });
  try {
    settings = { ...settings, sound: true, interest: 4, nightSleep: false };
    env = { ...env, cursor: { x: 300, y: floorAt(300) }, idle: 0, hour: 12, active: null };
    toys = []; Math.random = () => 0;
    pose('sit'); update(0);
    pose('sleep', { stateTime: 4 }); update(0);
    toys = [{ kind: 'laser', life: 20 }];
    pose('chase'); update(1 / 60);
    toys = [{ kind: 'yarn', x: 300, y: floorAt(300), vx: 0, vy: 0 }];
    pose('chase'); update(0);
    toys = [];
    env.active = { x: 200, y: floorAt(300) - 120, width: 400, height: 300 };
    pose('toWindow'); update(1 / 60);
    toys = [{ kind: 'cup', x: 330, y: env.active.y, vx: 0, vy: 0, falling: false }];
    pose('toCup', { onWindow: true, y: env.active.y }); update(0);
    return attempts;
  } finally {
    Object.assign(cat, saved.cat); env = saved.env; settings = saved.settings; toys = saved.toys;
    Math.random = saved.random; window.AudioContext = saved.audio;
  }
}

function checkEdges() {
  const saved = { cat: { ...cat }, env };
  try {
    env = { ...env, active: null };
    for (const dir of [-1, 1]) {
      const start = dir < 0 ? pixelCat.padding : env.width - pixelCat.padding;
      Object.assign(cat, { x: start, y: floorAt(start), state: 'walk', stateTime: 0, dur: 20, dir, vx: 0, vy: 0, air: false, onWindow: false });
      for (let i = 0; i < 3; i++) update(1 / 60);
      if (cat.dir !== -dir || (cat.x - start) * dir >= 0) throw new Error('Cat must turn and walk away from either desktop edge');
    }
    return true;
  } finally { Object.assign(cat, saved.cat); env = saved.env; }
}

function checkDisplayGeometry() {
  const saved = { cat: { ...cat }, env, toys, displayLayout, prevCursor, cursorSpeed };
  const floors = [
    { id: 4, x0: 900, x1: 1700, top: 0, y: 402 },
    { id: 2, x0: 0, x1: 450, top: 450, y: 1202 },
    { id: 1, primary: true, x0: 450, x1: 2050, top: 450, y: 1302 },
    { id: 3, x0: 2050, x1: 2500, top: 450, y: 1202 },
  ];
  try {
    toys = [];
    receiveEnvironment({ ...env, floors, width: 2500, height: 1350, active: null });
    if (cat.x !== 1250 || cat.y !== 1302) throw new Error('Cat must spawn on the primary display, not the leftmost monitor');
    for (const order of [floors, [...floors].reverse()]) {
      env = { ...env, floors: order };
      if (floorAt(1250, 1302) !== 1302 || floorAt(1250, 402) !== 402) throw new Error('Stacked monitor floors must use vertical position, not display order');
    }
    Object.assign(cat, { x: 2300, y: 300, state: 'sit', stateTime: 0, dur: 20, vx: 0, vy: 0 });
    update(0);
    if (cat.x !== 2300 || !floors.some((f) => cat.x - pixelCat.padding >= f.x0 && cat.x + pixelCat.padding <= f.x1 &&
      cat.y - pixelCat.height >= f.top && cat.y <= f.y)) throw new Error('Cat lost in a gap must move fully onto the nearest display');
    receiveEnvironment({ ...env, width: 1000, height: 748, floors: [{ id: 3, primary: true, x0: 0, x1: 1000, top: 0, y: 700 }] });
    if (cat.x !== 500 || cat.y !== 700 || cat.air || cat.onWindow) throw new Error('Cat must recover after disconnecting or rearranging displays');
    return true;
  } finally {
    Object.assign(cat, saved.cat); env = saved.env; toys = saved.toys;
    displayLayout = saved.displayLayout; prevCursor = saved.prevCursor; cursorSpeed = saved.cursorSpeed;
  }
}

function checkMonitorCrossings(projection) {
  const saved = { cat: { ...cat }, env, settings, toys };
  const floors = projection ? env.floors : [
    { id: 4, x0: 900, x1: 1700, top: 0, y: 402 },
    { id: 2, x0: 0, x1: 450, top: 450, y: 1002 },
    { id: 1, primary: true, x0: 450, x1: 2050, top: 450, y: 1302 },
    { id: 3, x0: 2050, x1: 2500, top: 450, y: 1002 },
  ];
  const image = document.createElement('canvas');
  image.width = 216; image.height = 162;
  const pixels = image.getContext('2d', { willReadFrequently: true });
  const areas = projection ? projection.areas : floors.map((f) => ({ x: f.x0, y: f.top, width: f.x1 - f.x0, height: f.y - f.top }));
  const scale = projection ? projection.scale : 1, origin = projection ? projection.origin : { x: 0, y: 0 };
  const primary = floors.find((f) => f.primary), snapshots = [];
  let frames = 0, checkedPixels = 0;
  const visible = (label) => {
    pixels.clearRect(0, 0, image.width, image.height);
    pixelCat.draw(pixels, { ...cat, x: 108, y: 150 });
    const data = pixels.getImageData(0, 0, image.width, image.height).data;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      if (!data[(y * image.width + x) * 4 + 3]) continue;
      const gx = Math.round(cat.x) + x - 108, gy = Math.round(cat.y) + y - 150;
      for (let py = Math.floor(origin.y + gy * scale); py < Math.ceil(origin.y + (gy + 1) * scale); py++) {
        for (let px = Math.floor(origin.x + gx * scale); px < Math.ceil(origin.x + (gx + 1) * scale); px++) {
          if (!areas.some((a) => px >= a.x && px < a.x + a.width && py >= a.y && py < a.y + a.height)) {
            throw new Error(`${label}: cat pixel (${px}, ${py}) is outside every physical work area at position (${cat.x}, ${cat.y})`);
          }
          checkedPixels++;
        }
      }
    }
    frames++;
  };
  const pose = (x, y, dir, extra = {}) => Object.assign(cat, {
    x, y, dir, vx: 0, vy: 0, state: 'walk', stateTime: 0, dur: 20,
    air: false, onWindow: false, ignoreWin: false, swat: 0, ...extra,
  });
  try {
    env = { ...env, floors, width: projection ? env.width : 2500, height: projection ? env.height : 1350, active: null };
    settings = { ...settings, interest: 4 }; toys = [];
    for (const [id, outward] of [[2, -1], [3, 1]]) {
      const side = floors.find((f) => f.id === id), boundary = outward < 0 ? primary.x0 : primary.x1;
      for (const returning of [false, true]) {
        const dir = returning ? -outward : outward, distance = pixelCat.padding + 20;
        const start = boundary - dir * distance, end = boundary + dir * distance;
        const label = `${returning ? 'Returning from' : 'Entering'} monitor ${id}`;
        pose(start, returning ? side.y : primary.y, dir);
        let captured = false;
        for (let step = 0; (cat.x - end) * dir < 0; step++) {
          if (step > 100) throw new Error(`Cat failed to cross monitor ${id}`);
          const previousX = cat.x;
          update(0.025);
          if ((cat.x - previousX) * dir <= 0 || Math.abs(cat.x - previousX) > 6) throw new Error('Crossing must not teleport the cat home');
          visible(label);
          if (!captured && Math.abs(cat.x - boundary) < 4) {
            snapshots.push({ label: `${label}: boundary`, boundary, cat: { ...cat } }); captured = true;
          }
        }
        for (let step = 0; step < 20; step++) { update(0.025); visible(label); }
        snapshots.push({ label: `${label}: clear`, boundary, cat: { ...cat } });
      }
      for (const [label, y, expectedY, valid] of [
        ['Below floor', (side.y + primary.y) / 2, side.y, false],
        ['Valid perch', side.y - 152, side.y - 152, true],
        ['Head in gap', side.top + pixelCat.height / 2, Math.ceil(side.top) + pixelCat.height, false],
      ]) {
        const x = boundary + outward * (pixelCat.padding + 20);
        env.active = { x: 0, y, width: env.width, height: 300 };
        pose(x, y, outward, { state: 'sit', onWindow: true });
        update(0);
        if (cat.x !== x || cat.y !== expectedY || cat.onWindow !== valid) {
          throw new Error(`Monitor ${id}, ${label}: window perching must keep the entire cat on screen`);
        }
        visible(`${label} on monitor ${id}`);
        env.active = null;
      }
      const x = boundary + outward * (pixelCat.padding + 20), y = side.y - 152;
      env.active = { x: x - 120, y, width: 240, height: 300 };
      pose(x + 109, y, 1, { state: 'helpType', onWindow: true });
      const previousX = cat.x;
      for (let step = 0; step < 3; step++) { update(1 / 60); visible(`Pacing on monitor ${id}`); }
      if (cat.x >= previousX || cat.dir !== -1 || !cat.onWindow) throw new Error('Pacing must turn before walking off the window');
      env.active = null;
    }
    const atlas = document.createElement('canvas'), width = 560, height = Math.max(300, primary.y - Math.min(...floors.filter((f) => f.id === 2 || f.id === 3).map((f) => f.y)) + pixelCat.height + 72);
    atlas.width = width * 2; atlas.height = height * Math.ceil(snapshots.length / 2);
    const sheet = atlas.getContext('2d');
    for (const [i, snapshot] of snapshots.entries()) {
      const x = i % 2 * width, y = Math.floor(i / 2) * height, ox = snapshot.boundary - width / 2, oy = primary.y - height + 24;
      sheet.save(); sheet.beginPath(); sheet.rect(x, y, width, height); sheet.clip();
      sheet.fillStyle = '#542b38'; sheet.fillRect(x, y, width, height);
      for (const f of floors) {
        sheet.fillStyle = f.primary ? '#dde9f1' : '#f5eee1'; sheet.fillRect(x + f.x0 - ox, y + f.top - oy, f.x1 - f.x0, f.y - f.top);
      }
      pixelCat.draw(sheet, { ...snapshot.cat, x: x + snapshot.cat.x - ox, y: y + snapshot.cat.y - oy });
      sheet.fillStyle = '#202735'; sheet.fillRect(x, y, width, 28);
      sheet.fillStyle = '#ffffff'; sheet.font = '14px sans-serif'; sheet.fillText(snapshot.label, x + 12, y + 19);
      sheet.restore();
    }
    return { frames, checkedPixels, png: atlas.toDataURL('image/png').split(',')[1] };
  } finally { Object.assign(cat, saved.cat); env = saved.env; settings = saved.settings; toys = saved.toys; }
}

app.whenReady().then(async () => {
  let stage = 'overlay startup';
  const timeout = setTimeout(() => { console.error(`Smoke test timed out during ${stage}`); app.exit(1); }, 20000);
  try {
    const overlay = BrowserWindow.getAllWindows().find((x) => x.isAlwaysOnTop());
    assert.ok(overlay, 'Desktop overlay must exist');
    overlay.webContents.setAudioMuted(true);
    if (overlay.webContents.isLoadingMainFrame()) {
      await new Promise((resolve) => overlay.webContents.once('did-finish-load', resolve));
    }
    const initial = await overlay.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const deadline = performance.now() + 2000;
      const check = () => {
        const home = env.floors.find(f => f.primary);
        if (home) return resolve({ x: cat.x, y: cat.y, home, width: innerWidth, height: innerHeight });
        if (performance.now() > deadline) return reject(new Error('Display geometry was not delivered to the renderer'));
        setTimeout(check, 20);
      };
      check();
    })`);
    assert.equal(initial.x, (initial.home.x0 + initial.home.x1) / 2, 'Cat must start on the primary monitor');
    assert.equal(initial.y, initial.home.y);
    if (multiMonitor) {
      const bounds = mixedDpi ? { x: -720, y: -720, width: 4000, height: 2160 } : { x: -450, y: -450, width: 2500, height: 1350 };
      assert.deepEqual(overlay.getBounds(), bounds, 'Overlay must cover the physical desktop without single-screen capping');
      assert.equal(initial.width, bounds.width);
      assert.equal(initial.height, bounds.height);
      if (mixedDpi) {
        const geometry = await overlay.webContents.executeJavaScript('({ floors: env.floors, cursor: env.cursor })');
        assert.deepEqual(geometry.floors.find((f) => f.id === 2), { id: 2, primary: false, top: 720, x0: 0, x1: 720, y: 2000 }, '100% side screen must use the 150% overlay coordinate space');
        assert.deepEqual(geometry.floors.find((f) => f.id === 3), { id: 3, primary: false, top: 720, x0: 3280, x1: 4000, y: 2000 });
        assert.deepEqual(geometry.cursor, { x: 2000, y: 1416 }, 'Cursor must take the same physical-coordinate path as displays');
      }
    }
    stage = 'sprite checks';
    overlay.webContents.debugger.attach('1.3');
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    const sprites = await overlay.webContents.executeJavaScript(`(${checkSprites.toString()})()`);
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await overlay.webContents.executeJavaScript(`(() => {
      const c = document.createElement('canvas'); c.width = 216; c.height = 162;
      const p = c.getContext('2d'), pose = { x: 108, y: 150, t: 0, state: 'walk', vx: 60, vy: 0, dir: 1, air: false, swat: 0 };
      pixelCat.draw(p, pose); const first = c.toDataURL();
      p.clearRect(0, 0, c.width, c.height); pixelCat.draw(p, { ...pose, t: 0.125 });
      return first === c.toDataURL();
    })()`), true, 'Reduced motion must freeze decorative sprite animation');
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [] });
    overlay.webContents.debugger.detach();
    stage = 'behaviour checks';
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkSilence.toString()})()`), 0);
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkEdges.toString()})()`), true);
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkDisplayGeometry.toString()})()`), true);
    stage = 'side-screen replay';
    const crossing = await overlay.webContents.executeJavaScript(`(() => {
      try { return (${checkMonitorCrossings.toString()})(); } catch (error) { return { error: error.message }; }
    })()`);
    assert.equal(crossing.error, undefined, crossing.error);
    let physicalCrossing;
    if (mixedDpi) {
      stage = 'mixed-DPI replay';
      const projection = {
        origin: { x: -1080, y: -1080 }, scale: 1.5,
        areas: simulatedDisplays.map((d) => ({
          ...d.physical, height: d.physical.height - (d.bounds.height - d.workArea.height) * d.scaleFactor,
        })),
      };
      physicalCrossing = await overlay.webContents.executeJavaScript(`(() => {
        try { return (${checkMonitorCrossings.toString()})(${JSON.stringify(projection)}); } catch (error) { return { error: error.message }; }
      })()`);
      assert.equal(physicalCrossing.error, undefined, physicalCrossing.error);
      assert.ok(physicalCrossing.frames > 200 && physicalCrossing.checkedPixels > 1000000, 'Mixed-DPI replay must inspect every opaque pixel through all four crossings');
    }

    stage = 'settings and toy IPC';
    const settingsWindow = new BrowserWindow({
      show: false, webPreferences: { preload: path.join(__dirname, '..', 'preload.js') },
    });
    await settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
    assert.equal(await settingsWindow.webContents.executeJavaScript("document.getElementById('sound') === null"), true, 'No sound toggle should remain');
    settingsWindow.destroy();

    overlay.webContents.send('toy', 'yarn');
    overlay.webContents.send('toy', 'food');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const state = await overlay.webContents.executeJavaScript('(()=>{const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return {drawn:n,cat:{x:cat.x,y:cat.y,state:cat.state},toys:toys.map(t=>t.kind)}})()');
    assert.ok(state.drawn > 1000, 'Overlay must draw the cat');
    assert.ok(state.toys.includes('yarn') && state.toys.includes('food'), 'Toy IPC must still work');
    assert.equal(overlay.webContents.isCurrentlyAudible(), false);
    if (simulatedActiveBounds) {
      const active = await overlay.webContents.executeJavaScript('env.active');
      for (const [key, expected] of Object.entries({ x: 1280 / 1.5, y: 920, width: 600, height: 400 })) {
        assert.ok(Math.abs(active[key] - expected) < 0.000001, `Native active-window ${key} must map directly into the overlay`);
      }
    }
    stage = 'overlay capture';
    const output = process.env.CAT_TEST_OUTPUT_DIR || app.getPath('temp');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'cat-sprites.png'), Buffer.from(sprites.png, 'base64'));
    fs.writeFileSync(path.join(output, 'cat-shot.png'), (await overlay.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(output, 'cat-crossings.png'), Buffer.from((physicalCrossing || crossing).png, 'base64'));
    if (multiMonitor) {
      stage = 'summoning and display changes';
      const summon = trayMenu.items.find((item) => item.label === 'Bring cat here');
      assert.ok(summon, 'Tray must provide a way to find the cat');
      for (const id of [4, 2, 3, 1]) {
        const d = simulatedDisplays.find((d) => d.id === id), a = d.workArea;
        simulatedCursor = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
        summon.click();
        const actual = await overlay.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve({ x: cat.x, y: cat.y, cursor: env.cursor }), 120))');
        const b = overlay.getBounds();
        const expected = mixedDpi ? {
          x: (d.physical.x + d.physical.width / 2 + 1080) / 1.5,
          y: Math.floor((d.physical.y + a.height * d.scaleFactor + 1080) / 1.5),
        } : { x: a.x + a.width / 2 - b.x, y: a.y + a.height - b.y };
        assert.ok(Math.abs(actual.x - expected.x) < 0.000001 && actual.y === expected.y, `Summon must target display ${id}`);
        const cursorY = mixedDpi ? (d.physical.y + a.height / 2 * d.scaleFactor + 1080) / 1.5 : simulatedCursor.y - b.y;
        assert.ok(Math.abs(actual.cursor.x - expected.x) < 0.000001 && Math.abs(actual.cursor.y - cursorY) < 0.000001, `Cursor must align with the cat on display ${id}`);
      }
      if (mixedDpi) {
        const right = simulatedDisplays.find((d) => d.id === 3);
        right.scaleFactor = 2; right.physical = { x: 3840, y: 0, width: 2160, height: 3840 };
        screen.emit('display-metrics-changed', {}, right, ['scaleFactor']);
        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.deepEqual(overlay.getBounds(), { x: -720, y: -720, width: 4720, height: 3280 }, 'A higher-DPI secondary screen must not be cropped by a DIP-only desktop union');
        simulatedCursor = { x: 3100, y: 960 }; summon.click();
        const position = await overlay.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve({ x: cat.x, y: cat.y }), 120))');
        assert.deepEqual(position, { x: 4000, y: 3280 }, 'Summon must reach the bottom of a higher-DPI secondary screen');
      }
      const removed = simulatedDisplays.find((d) => d.id === 2);
      simulatedDisplays = simulatedDisplays.filter((d) => d.id === 1);
      screen.emit('display-removed', {}, removed);
      const position = await overlay.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve({ x: cat.x, y: cat.y }), 120))');
      assert.deepEqual(overlay.getBounds(), mixedDpi ? { x: 0, y: 0, width: 2560, height: 1440 } : { x: 0, y: 0, width: 1600, height: 900 });
      assert.deepEqual(position, mixedDpi ? { x: 1280, y: 1392 } : { x: 800, y: 852 }, 'Cat must stay visible after monitor removal changes the desktop origin');
      console.log('PASS: four-screen physical overlay bounds, primary spawn, cursor and tray summoning on all screens, DPI changes, monitor removal');
    }
    console.log(`PASS: ${crossing.frames} fully visible side-screen crossing/perching frames`);
    if (physicalCrossing) console.log(`PASS: ${physicalCrossing.frames} measured mixed-DPI crossing/perching frames, ${physicalCrossing.checkedPixels} physical pixels checked`);
    console.log(`PASS: ${sprites.poses} crisp animated poses, mirroring, reduced motion, desktop edges, display geometry, silent behaviours, settings, toy IPC`);
    console.log('state', JSON.stringify(state));
    console.log('captures', output);
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timeout);
    app.exit(1);
  }
});
