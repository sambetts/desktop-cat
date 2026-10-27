// Smoke test: electron scripts/selftest.js
const assert = require('node:assert/strict');
const { app, BrowserWindow, Tray, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const multiMonitor = process.argv.includes('--multi-monitor');
let simulatedDisplays, simulatedCursor, trayMenu;
if (multiMonitor) {
  app.whenReady().then(() => {
    const display = (id, x, y, width, height, scaleFactor) => ({
      id, bounds: { x, y, width, height }, workArea: { x, y, width, height: height - 48 }, scaleFactor,
    });
    simulatedDisplays = [
      display(4, 450, -450, 800, 450, 1.5), display(2, -450, 0, 450, 800, 1),
      display(1, 0, 0, 1600, 900, 1.25), display(3, 1600, 0, 450, 800, 1),
    ];
    simulatedCursor = { x: 800, y: 400 };
    screen.getAllDisplays = () => simulatedDisplays;
    screen.getPrimaryDisplay = () => simulatedDisplays.find((d) => d.id === 1);
    screen.getCursorScreenPoint = () => simulatedCursor;
    screen.getDisplayNearestPoint = (p) => simulatedDisplays.find(({ bounds: b }) =>
      p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height) || screen.getPrimaryDisplay();
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
    if (cat.x !== 1250 || cat.y !== 1302) throw new Error('Cat lost in a monitor-layout gap must return to a visible display');
    receiveEnvironment({ ...env, width: 1000, height: 748, floors: [{ id: 3, primary: true, x0: 0, x1: 1000, top: 0, y: 700 }] });
    if (cat.x !== 500 || cat.y !== 700 || cat.air || cat.onWindow) throw new Error('Cat must recover after disconnecting or rearranging displays');
    return true;
  } finally {
    Object.assign(cat, saved.cat); env = saved.env; toys = saved.toys;
    displayLayout = saved.displayLayout; prevCursor = saved.prevCursor; cursorSpeed = saved.cursorSpeed;
  }
}

app.whenReady().then(async () => {
  const timeout = setTimeout(() => { console.error('Smoke test timed out'); app.exit(1); }, 20000);
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
      assert.deepEqual(overlay.getBounds(), { x: -450, y: -450, width: 2500, height: 1350 }, 'Overlay must not be capped to a single screen');
      assert.equal(initial.width, 2500);
      assert.equal(initial.height, 1350);
    }
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
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkSilence.toString()})()`), 0);
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkEdges.toString()})()`), true);
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkDisplayGeometry.toString()})()`), true);

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
    const output = process.env.CAT_TEST_OUTPUT_DIR || app.getPath('temp');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'cat-sprites.png'), Buffer.from(sprites.png, 'base64'));
    fs.writeFileSync(path.join(output, 'cat-shot.png'), (await overlay.webContents.capturePage()).toPNG());
    if (multiMonitor) {
      const summon = trayMenu.items.find((item) => item.label === 'Bring cat here');
      assert.ok(summon, 'Tray must provide a way to find the cat');
      for (const id of [4, 2, 1]) {
        const { workArea: a } = simulatedDisplays.find((d) => d.id === id);
        simulatedCursor = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
        summon.click();
        const position = await overlay.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve({ x: cat.x, y: cat.y }), 120))');
        const b = overlay.getBounds();
        assert.deepEqual(position, { x: a.x + a.width / 2 - b.x, y: a.y + a.height - b.y }, `Summon must target display ${id}`);
      }
      const removed = simulatedDisplays.find((d) => d.id === 2);
      simulatedDisplays = simulatedDisplays.filter((d) => d.id === 1);
      screen.emit('display-removed', {}, removed);
      const position = await overlay.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve({ x: cat.x, y: cat.y }), 120))');
      assert.deepEqual(overlay.getBounds(), { x: 0, y: 0, width: 1600, height: 900 });
      assert.deepEqual(position, { x: 800, y: 852 }, 'Cat must stay visible after monitor removal changes the desktop origin');
      console.log('PASS: four-screen overlay bounds, primary spawn, tray summoning to upper/left/primary screens, monitor removal');
    }
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
