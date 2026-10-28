// Smoke test: electron scripts/selftest.js
const assert = require('node:assert/strict');
const { app, BrowserWindow, Tray, screen, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const multiMonitor = process.argv.includes('--multi-monitor');
const mixedDpi = multiMonitor && process.platform === 'win32';
// Never read or overwrite the real user's settings and custom cats; start every run from defaults.
const userData = path.join(require('os').tmpdir(), 'desktop-cat-selftest');
fs.rmSync(path.join(userData, 'settings.json'), { force: true });
app.setPath('userData', userData);
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
  });
}
app.whenReady().then(() => {
  const setContextMenu = Tray.prototype.setContextMenu;
  Tray.prototype.setContextMenu = function (menu) { trayMenu = menu; return setContextMenu.call(this, menu); };
});
require('../main.js');

function checkSprites(scale = 3) {
  const s = scale, image = document.createElement('canvas');
  image.width = 72 * s; image.height = 54 * s;
  const pixels = image.getContext('2d');
  const render = (overrides = {}) => {
    pixels.clearRect(0, 0, image.width, image.height);
    pixelCat.draw(pixels, { x: 36 * s, y: 50 * s, t: 0, state: 'sit', vx: 0, vy: 0, dir: 1, air: false, swat: 0, ...overrides });
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
  if (!same(right, render({ x: 36 * s + 0.25, y: 50 * s + 0.25 }))) throw new Error('Fractional movement must snap to whole pixels');
  if (same(render({ state: 'walk', vx: 60 }), render({ state: 'walk', vx: 60, t: 0.125 }))) throw new Error('Walking must animate');
  const climb = { state: 'climb', vy: -60, x: 53 * s, y: 52 * s };
  if (same(render(climb), render({ ...climb, t: 0.125 }))) throw new Error('Climbing must animate');

  const poses = [
    ['Sitting', {}], ['Walking', { state: 'walk', vx: 60 }], ['Next step', { state: 'walk', vx: 60, t: 0.125 }],
    ['Jumping', { state: 'jump', air: true, vy: -200 }], ['Stretching', { state: 'stretch' }],
    ['Grooming', { state: 'lick' }], ['Sleeping', { state: 'sleep' }], ['Smug', { state: 'smug' }],
    ['Swatting', { swat: 0.4 }], ['Eating', { state: 'eat' }], ['Climbing', climb],
    ['Stalking', { state: 'stalk', vx: 30 }], ['Wiggling', { state: 'ready', t: 0.1 }], ['Loafing', { state: 'loaf' }],
    ['Kneading', { state: 'settle', stateTime: 1.5 }], ['Yawning', { state: 'stretch', stateTime: 1 }],
    ['Slow blink', { blink: 0.7 }], ['Chattering', { watch: true, t: 0.125, look: { x: 0, y: -400 } }],
    ['Watching', { look: { x: -200, y: -300 } }],
  ];
  const atlas = document.createElement('canvas');
  atlas.width = image.width * 5; atlas.height = image.height * Math.ceil(poses.length / 5);
  const sheet = atlas.getContext('2d');
  const unique = new Set();
  for (const [i, [label, pose]] of poses.entries()) {
    const data = render(pose);
    let drawn = 0;
    for (let p = 3; p < data.length; p += 4) {
      if (data[p] !== 0 && data[p] !== 255) throw new Error(`${label}: sprite edges must not be blurred`);
      if (data[p]) drawn++;
    }
    if (drawn < 1000 * s * s / 9) throw new Error(`${label}: missing sprite`);
    const box = pixelCat.box({ dir: 1, ...pose, x: pose.x ?? 36 * s, y: pose.y ?? 50 * s });
    for (let p = 3; p < data.length; p += 4) {
      const x = (p >> 2) % image.width, y = Math.floor((p >> 2) / image.width);
      if (data[p] && pose.state !== 'sleep' && (x < box.left || x >= box.right || y < box.top || y >= box.bottom)) {
        throw new Error(`${label}: sprite pixel (${x}, ${y}) is outside the box used to keep the cat on screen`);
      }
    }
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
      for (let y = 0; y < image.height; y += s) for (let x = 0; x < image.width; x += s) {
        const start = (y * image.width + x) * 4;
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) for (let c = 0; c < 4; c++) {
          if (data[start + c] !== data[((y + dy) * image.width + x + dx) * 4 + c]) throw new Error(`${label}: broken pixel grid at ${s}x`);
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

// Runs a renderer check with the cat drawn at another size, restoring the size afterwards.
const atScale = (scale, check, ...args) => `(() => {
  const previous = pixelCat.scale;
  pixelCat.setScale(${scale});
  try { return (${check.toString()})(${args.map((a) => JSON.stringify(a)).join(', ')}); }
  catch (error) { return { error: error.message }; }
  finally { pixelCat.setScale(previous); }
})()`;

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
  const image = document.createElement('canvas'), s = pixelCat.scale;
  image.width = 72 * s; image.height = 54 * s;
  const pixels = image.getContext('2d', { willReadFrequently: true });
  const areas = projection ? projection.areas : floors.map((f) => ({ x: f.x0, y: f.top, width: f.x1 - f.x0, height: f.y - f.top }));
  const scale = projection ? projection.scale : 1, origin = projection ? projection.origin : { x: 0, y: 0 };
  const primary = floors.find((f) => f.primary), snapshots = [];
  let frames = 0, checkedPixels = 0;
  const visible = (label) => {
    pixels.clearRect(0, 0, image.width, image.height);
    pixelCat.draw(pixels, { ...cat, x: 36 * s, y: 50 * s });
    const data = pixels.getImageData(0, 0, image.width, image.height).data;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      if (!data[(y * image.width + x) * 4 + 3]) continue;
      const gx = Math.round(cat.x) + x - 36 * s, gy = Math.round(cat.y) + y - 50 * s;
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
          if ((cat.x - previousX) * dir <= 0 || Math.abs(cat.x - previousX) > 6 * s / 3) throw new Error('Crossing must not teleport the cat home');
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

function checkCoats() {
  const coats = catCoats.builtIn, s = 3, w = 72 * s, h = 54 * s;
  const image = document.createElement('canvas');
  image.width = w; image.height = h;
  const pixels = image.getContext('2d');
  const sitting = { x: 36 * s, y: 50 * s, t: 0, state: 'sit', vx: 0, vy: 0, dir: 1, air: false, swat: 0 };
  const shot = (coat, pose = {}) => {
    pixels.clearRect(0, 0, w, h);
    pixelCat.drawCoat(pixels, { ...sitting, ...pose }, coat, s);
    return image.toDataURL();
  };
  pixels.clearRect(0, 0, w, h);
  pixelCat.draw(pixels, sitting);
  if (image.toDataURL() !== shot(catCoats.find('tabby'))) throw new Error('The default cat must be the original ginger tabby');
  if (new Set(coats.map((c) => shot(c))).size !== coats.length) throw new Error('Every cat in the gallery must look different');
  const poses = [{}, { state: 'walk', vx: 60, t: 0.125 }, { state: 'climb', vy: -60, x: 53 * s, y: 52 * s }];
  const atlas = document.createElement('canvas'), label = 26;
  atlas.width = w * poses.length * 2; atlas.height = (h + label) * coats.length;
  const sheet = atlas.getContext('2d');
  for (const [row, coat] of coats.entries()) {
    const y = row * (h + label);
    sheet.fillStyle = '#ffffff'; sheet.fillRect(0, y, atlas.width, label);
    sheet.fillStyle = '#222222'; sheet.font = '14px sans-serif'; sheet.fillText(`${coat.name} — ${coat.description}`, 10, y + 18);
    for (const [i, pose] of [...poses, ...poses].entries()) {
      sheet.fillStyle = i < poses.length ? '#f5eee1' : '#202735';
      sheet.fillRect(i * w, y + label, w, h);
      shot(coat, pose);
      sheet.drawImage(image, i * w, y + label);
    }
  }
  return { coats: coats.length, png: atlas.toDataURL('image/png').split(',')[1] };
}

function checkClimbing(projection) {
  const saved = { cat: { ...cat }, env, settings, toys, random: Math.random, cursorSpeed };
  const s = pixelCat.scale, step = 0.025;
  const floors = projection ? env.floors : [
    { id: 1, primary: true, x0: 0, x1: 1600, top: 900, y: 2652, screen: { x0: 0, x1: 1600, top: 900, bottom: 2700 } },
    { id: 2, x0: 1100, x1: 2700, top: 0, y: 852, screen: { x0: 1100, x1: 2700, top: 0, bottom: 900 } },
  ];
  const lower = floors.find((f) => f.primary), upper = floors.reduce((a, b) => (b.y < a.y ? b : a));
  const rect = (a) => ({ x: a.x0, y: a.top, width: a.x1 - a.x0, height: (a.bottom ?? a.y) - a.top });
  const work = projection?.areas || floors.map(rect), screens = projection?.screens || floors.map((f) => rect(f.screen));
  const scale = projection ? projection.scale : 1, origin = projection ? projection.origin : { x: 0, y: 0 };
  const image = document.createElement('canvas'), pixels = image.getContext('2d', { willReadFrequently: true });
  const snapshots = [];
  let frames = 0, checkedPixels = 0, previousBox = null;
  // Every opaque pixel must be inside its box and on a screen: work areas when resting, whole screens while climbing or leaping.
  const visible = (label) => {
    const box = pixelCat.box(cat), areas = cat.state === 'climb' || cat.air ? screens : work;
    image.width = box.right - box.left + 2; image.height = box.bottom - box.top + 2;
    pixelCat.draw(pixels, { ...cat, x: Math.round(cat.x) - box.left + 1, y: Math.round(cat.y) - box.top + 1 });
    const data = pixels.getImageData(0, 0, image.width, image.height).data;
    let drawn = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      if (!data[(y * image.width + x) * 4 + 3]) continue;
      drawn++;
      if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) throw new Error(`${label}: sprite spills out of its box while ${cat.state}`);
      const gx = box.left + x - 1, gy = box.top + y - 1;
      for (let py = Math.floor(origin.y + gy * scale); py < Math.ceil(origin.y + (gy + 1) * scale); py++) {
        for (let px = Math.floor(origin.x + gx * scale); px < Math.ceil(origin.x + (gx + 1) * scale); px++) {
          if (!areas.some((a) => px >= a.x && px < a.x + a.width && py >= a.y && py < a.y + a.height)) {
            throw new Error(`${label}: cat pixel (${px}, ${py}) is off screen while ${cat.state} at (${cat.x}, ${cat.y})`);
          }
          checkedPixels++;
        }
      }
    }
    if (drawn < 500 * s * s / 9) throw new Error(`${label}: cat disappeared while ${cat.state}`);
    if (previousBox && (box.left > previousBox.right + 1 || box.right < previousBox.left - 1 ||
      box.top > previousBox.bottom + 1 || box.bottom < previousBox.top - 1)) throw new Error(`${label}: cat teleported while ${cat.state}`);
    previousBox = box; frames++;
  };
  const pose = (x, y, state, extra = {}) => {
    Object.assign(cat, { x, y, vx: 0, vy: 0, dir: 1, state, stateTime: 0, dur: 60, air: false, onWindow: false, ignoreWin: false, swat: 0, climb: null, landThen: null,
      pounce: null, leap: null, blink: 0, calm: 0, look: null, ...extra });
    previousBox = null;
  };
  const run = (label, seconds, done, each = () => {}) => {
    const states = new Set();
    for (let t = 0; t < seconds; t += step) {
      update(step); states.add(cat.state); visible(label); each(t, states);
      for (const y of toys) y.idle = 0;
      if (done()) return states;
    }
    throw new Error(`${label}: gave up after ${seconds}s, ${cat.state} at (${Math.round(cat.x)}, ${Math.round(cat.y)}) having been ${[...states].join('/')}`);
  };
  const snap = (label) => snapshots.push({ label, cat: { ...cat }, toys: toys.map((t) => ({ ...t })), active: env.active && { ...env.active } });
  try {
    env = { ...env, floors, width: projection ? env.width : 2700, height: projection ? env.height : 2700, active: null, typing: false, idle: 0, hour: 12 };
    settings = { ...settings, interest: 3, nightSleep: false };
    cursorSpeed = 0;
    const yarnX = Math.round((upper.x0 + upper.x1) / 2), start = lower.x0 + pixelCat.padding + 40;

    // A ball dropped onto the upper screen stays there, even with no taskbar between the screens.
    toys = [{ kind: 'yarn', x: yarnX, y: (upper.top ?? 0) + 100, vx: 0, vy: 0 }];
    for (let t = 0; t < 3; t += step) updateToys(step);
    if (toys[0].y !== upper.y) throw new Error(`A dropped ball must land on the screen it falls onto, not at y=${toys[0].y}`);

    // Not in the mood: watches the ball on the screen above, but does not climb or swat at thin air.
    Math.random = () => 0.99;
    toys = [{ kind: 'yarn', x: yarnX, y: upper.y, vx: 0, vy: 0 }];
    pose(start, lower.y, 'chase', { daring: false });
    const lazy = new Set();
    for (let t = 0; t < 12; t += step) { update(step); lazy.add(cat.state); visible('Not daring'); toys[0].idle = 0; }
    const waitX = Math.max(lower.x0 + pixelCat.padding, Math.min(lower.x1 - pixelCat.padding, yarnX));
    if (lazy.has('climb') || cat.y !== lower.y || toys[0].vx !== 0 || toys[0].x !== yarnX || Math.abs(cat.x - waitX) > 30) {
      throw new Error(`A cat that isn't feeling daring must wait below the ball without climbing or swatting (${cat.state} at ${cat.x}, ${cat.y})`);
    }
    if (!cat.watch || !cat.look || cat.look.y > -50 * s) throw new Error('A cat that cannot reach the ball must sit watching it, chattering');
    snap('Chattering at the ball');

    // ...but a very playful cat may work up the courage given time.
    settings = { ...settings, interest: 4 };
    Math.random = () => 0.001;
    pose(start, lower.y, 'chase', { daring: false });
    run('Working up the courage', 10, () => cat.state === 'climb');
    settings = { ...settings, interest: 3 };

    // Feeling playful: walks to where the screens meet, climbs up and goes after the ball.
    Math.random = () => 0.5;
    pose(start, lower.y, 'chase', { daring: true });
    snap('Wants the ball upstairs');
    let climbing = false;
    const up = run('Climbing to the ball', 40, () => cat.y === upper.y && (['stalk', 'ready'].includes(cat.state) || (cat.state === 'chase' && Math.abs(cat.x - toys[0].x) <= 30)), () => {
      if (cat.state === 'climb' && !climbing) { climbing = true; snap('Starts climbing'); }
      if (cat.state === 'climb' && cat.y < (upper.y + lower.y) / 2 && snapshots.length < 4) snap('Climbing');
    });
    if (!up.has('climb')) throw new Error('A daring cat must climb to reach a ball on the screen above');
    snap('Got there');

    // Climbing back down to explore the screen below.
    pose(Math.round((upper.x0 + upper.x1) / 2), upper.y, 'explore', { daring: true, goal: { x: start, y: lower.y } });
    toys = [];
    const down = run('Climbing down', 40, () => cat.y === lower.y && cat.state === 'sit');
    if (!down.has('climb')) throw new Error('An exploring cat must climb down to the screen below');

    if (!projection) {
      // Up the side of a window too high to jump onto.
      const w = { x: 300, y: lower.top + pixelCat.height + 40, width: 500, height: 500 };
      if (lower.y - w.y < 650 * s / 3) throw new Error('Test window must be too high to jump onto');
      env.active = { ...w };
      pose(550, lower.y, 'toWindow', { daring: true });
      const perch = run('Climbing a window', 40, () => cat.onWindow && cat.state === 'sit', (t) => {
        if (cat.state === 'climb' && cat.y < lower.y - 300 && snapshots.length < 6) snap('Up a tall window');
      });
      if (!perch.has('climb') || perch.has('jump') || cat.y !== w.y) throw new Error('A daring cat must climb a window that is too tall to jump onto');
      snap('On top of the window');

      // The window moves mid-climb: the cat lets go and lands on its feet.
      pose(550, lower.y, 'toWindow', { daring: true });
      env.active = { ...w };
      let moved = false;
      const fall = run('Window moved', 40, () => moved && cat.state === 'sit' && cat.y === lower.y, (t) => {
        if (cat.state === 'climb' && cat.stateTime > 1 && !moved) { env.active = { ...w, x: w.x + 300 }; moved = true; }
      });
      if (!fall.has('jump')) throw new Error('A cat must fall safely when the window it is climbing moves away');
      env.active = null;
    }

    // ---- everyday cat things ----
    env.active = null;
    const u = s / 3, groundX = Math.round((lower.x0 + lower.x1) / 2), seen = (label) => snapshots.some((p) => p.label === label);

    // A ball at rest is prey: creep up low and slow, wiggle, then pounce and bat it away.
    Math.random = () => 0.5;
    toys = [{ kind: 'yarn', x: groundX + 250 * u, y: lower.y, vx: 0, vy: 0 }];
    pose(groundX, lower.y, 'chase');
    let creep = 0, lastX = cat.x;
    const hunt = run('Stalking', 20, () => cat.pounce && cat.pounce.hit, () => {
      if (cat.state === 'stalk') creep = Math.max(creep, Math.abs(cat.x - lastX) / step);
      lastX = cat.x;
      if (cat.state === 'stalk' && cat.stateTime > 1 && !seen('Stalking')) snap('Stalking');
      if (cat.state === 'ready' && cat.stateTime > 0.2 && !seen('Wiggle...')) snap('Wiggle...');
      if (cat.state === 'jump' && cat.stateTime > 0.12 && !seen('Pounce!')) snap('Pounce!');
    });
    if (!hunt.has('stalk') || !hunt.has('ready')) throw new Error('A cat must stalk and wiggle before pouncing on a ball');
    if (creep > speed() * 0.35) throw new Error(`A stalking cat must creep, not run (${Math.round(creep)} px/s)`);

    // The ball moves mid-pounce: a miss, then a quick wash as if that had been the plan all along.
    toys = [{ kind: 'yarn', x: groundX + 250 * u, y: lower.y, vx: 0, vy: 0 }];
    pose(groundX, lower.y, 'chase');
    let moved = false;
    run('Missed pounce', 20, () => moved && cat.state === 'lick', () => {
      if (cat.state === 'jump' && cat.pounce && !moved) { toys[0].x = groundX - 300 * u; moved = true; }
    });
    snap('I meant to do that');

    // Settling down for a nap: turns round, kneads, sleeps, then wakes with a stretch and a yawn.
    toys = [];
    pose(groundX, lower.y, 'sit');
    nap(20);
    let turns = 0, facing = cat.dir;
    const settle = run('Settling down', 10, () => cat.state === 'sleep', () => {
      if (cat.dir !== facing) { turns++; facing = cat.dir; }
      if (cat.state === 'settle' && cat.stateTime > 1.6 && !seen('Kneading')) snap('Kneading');
    });
    if (!settle.has('settle') || turns < 3) throw new Error('A cat must turn round and knead before lying down');
    run('Waking up', 10, () => cat.state === 'stretch' && cat.stateTime > 0.8);
    snap('Yawning');

    // The zoomies: fast, with sudden turns and hops, without ever leaving the screens.
    let seed = 7;
    Math.random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    pose(groundX, lower.y, 'zoom', { dur: 6 });
    let fastest = 0, previousX = cat.x;
    run('Zoomies', 7, () => cat.state !== 'zoom', () => {
      fastest = Math.max(fastest, Math.abs(cat.x - previousX) / step); previousX = cat.x;
      if (cat.air && !seen('Zoomies!')) snap('Zoomies!');
    });
    if (fastest < speed() * 2) throw new Error('The zoomies must be fast');

    // A cursor resting quietly near a sitting cat gets a slow blink.
    Math.random = () => 0.001;
    pose(groundX, lower.y, 'sit');
    env.cursor = { x: groundX + 120 * u, y: lower.y - 40 * u }; cursorSpeed = 0;
    run('Slow blink', 6, () => cat.blink > 0.4 && cat.blink < 1);
    snap('Slow blink');

    const crop = 360, atlas = document.createElement('canvas');
    atlas.width = crop * 3; atlas.height = crop * Math.ceil(snapshots.length / 3);
    const sheet = atlas.getContext('2d');
    for (const [i, shot] of snapshots.entries()) {
      const x = i % 3 * crop, y = Math.floor(i / 3) * crop, box = pixelCat.box(shot.cat);
      const ox = (box.left + box.right) / 2 - crop / 2, oy = (box.top + box.bottom) / 2 - crop / 2;
      sheet.save(); sheet.beginPath(); sheet.rect(x, y, crop, crop); sheet.clip();
      sheet.fillStyle = '#542b38'; sheet.fillRect(x, y, crop, crop);
      for (const f of floors) {
        sheet.fillStyle = '#3d4250'; sheet.fillRect(x + f.screen.x0 - ox, y + f.screen.top - oy, f.screen.x1 - f.screen.x0, f.screen.bottom - f.screen.top);
        sheet.fillStyle = f.primary ? '#dde9f1' : '#f5eee1'; sheet.fillRect(x + f.x0 - ox, y + f.top - oy, f.x1 - f.x0, f.y - f.top);
      }
      if (shot.active) { sheet.fillStyle = '#9fb7c9'; sheet.fillRect(x + shot.active.x - ox, y + shot.active.y - oy, shot.active.width, shot.active.height); }
      for (const t of shot.toys) { sheet.fillStyle = '#d33'; sheet.beginPath(); sheet.arc(x + t.x - ox, y + t.y - 12 - oy, 12, 0, 7); sheet.fill(); }
      pixelCat.draw(sheet, { ...shot.cat, x: x + shot.cat.x - ox, y: y + shot.cat.y - oy });
      sheet.fillStyle = '#202735'; sheet.fillRect(x, y, crop, 26);
      sheet.fillStyle = '#ffffff'; sheet.font = '14px sans-serif'; sheet.fillText(shot.label, x + 10, y + 18);
      sheet.restore();
    }
    return { frames, checkedPixels, png: atlas.toDataURL('image/png').split(',')[1] };
  } finally {
    Object.assign(cat, saved.cat); env = saved.env; settings = saved.settings; toys = saved.toys; Math.random = saved.random; cursorSpeed = saved.cursorSpeed;
  }
}

// Shared cat files: what we write must read back the same, and anything else must be refused or tidied.
function checkCoatFiles() {
  const coats = require('../renderer/coats.js');
  const ids = coats.builtIn.map((c) => c.id);
  assert.ok(ids.length >= 6 && new Set(ids).size === ids.length && new Set(coats.builtIn.map((c) => c.name)).size === ids.length, 'Gallery needs at least six distinct cats');
  const luminance = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  assert.ok(coats.builtIn.some((c) => luminance(c.palette.fur) < 0.05 && luminance(c.palette.belly) < 0.05), 'Gallery must include a black cat');
  for (const cat of coats.builtIn) {
    const file = coats.toFile(cat);
    assert.equal(file.format, coats.FORMAT);
    assert.equal(file.id, undefined, 'Shared files must not carry local ids');
    assert.deepEqual(coats.parseText(JSON.stringify(file)), coats.normalize(cat), `${cat.name} must survive a round trip`);
  }
  const good = coats.toFile(coats.find('mochi'));
  for (const [label, text] of [
    ['text that is not JSON', 'meow'], ['an array', '[]'], ['another format', JSON.stringify({ ...good, format: 'something-else' })],
    ['a newer version', JSON.stringify({ ...good, version: coats.VERSION + 1 })], ['a broken version', JSON.stringify({ ...good, version: '1' })],
    ['a colour that is not a colour', JSON.stringify({ ...good, palette: { ...good.palette, fur: 'url(https://example.com)' } })],
    ['a name that is not text', JSON.stringify({ ...good, name: { toString: 1 } })],
  ]) assert.throws(() => coats.parseText(text), Error, `Must reject ${label}`);
  const tidy = coats.parse({ ...good, name: ` Mi\u0007lo${'o'.repeat(60)} `, description: '\u0000', palette: { fur: '#ABC' } });
  assert.equal(tidy.name, `Milo${'o'.repeat(36)}`, 'Names lose control characters and are capped at 40 characters');
  assert.equal(tidy.description, undefined);
  assert.equal(tidy.palette.fur, '#aabbcc');
  assert.equal(tidy.palette.outline, coats.find('tabby').palette.outline, 'Missing colours fall back to the original cat');
}

// The settings window: pick, resize, build, share, import, edit and delete cats, then the tray menus.
async function checkGallery(overlay, output) {
  const page = new BrowserWindow({ show: false, width: 560, height: 980, webPreferences: { preload: path.join(__dirname, '..', 'preload.js') } });
  const saved = { open: dialog.showOpenDialog, save: dialog.showSaveDialog };
  const js = (code) => page.webContents.executeJavaScript(code);
  const cat = (code) => overlay.webContents.executeJavaScript(code);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (label, check) => {
    for (const end = Date.now() + 4000; !(await check());) {
      if (Date.now() > end) throw new Error(`Gallery: timed out waiting for ${label}`);
      await sleep(25);
    }
  };
  const cards = () => js("document.querySelectorAll('#gallery .card').length");
  const click = (selector) => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const fill = (values) => js(`(() => { for (const [id, value] of Object.entries(${JSON.stringify(values)})) {
    const e = document.getElementById(id); e.value = value; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change'));
  } })()`);
  const screenshot = async (name) => {
    const image = await page.webContents.capturePage();
    if (!image.isEmpty()) fs.writeFileSync(path.join(output, name), image.toPNG());
  };
  const shows = (coat) => cat(`(() => {
    const c = document.createElement('canvas'); c.width = 216; c.height = 162;
    const p = c.getContext('2d'), pose = { x: 108, y: 150, t: 0, state: 'sit', vx: 0, vy: 0, dir: 1, air: false, swat: 0 };
    pixelCat.draw(p, pose); const shown = c.toDataURL();
    p.clearRect(0, 0, c.width, c.height); pixelCat.drawCoat(p, pose, catCoats.find(settings.coat, settings.customCats));
    return settings.coat === ${JSON.stringify(coat)} && shown === c.toDataURL();
  })()`);
  try {
    await page.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
    await waitFor('the gallery', async () => (await cards()) === 6);
    assert.equal(await js("document.getElementById('sound') === null"), true, 'No sound toggle should remain');
    assert.equal(await js("document.querySelector('input[name=coat]:checked').value"), 'tabby');
    assert.equal(new Set(await js("[...document.querySelectorAll('#gallery canvas')].map((c) => c.toDataURL())")).size, 6, 'Gallery previews must differ');
    assert.equal(await js("document.querySelectorAll('#gallery button').length"), 0, 'Built-in cats cannot be edited or deleted');

    await click('input[value=midnight]');
    await waitFor('the black cat on screen', () => shows('midnight'));
    await fill({ scale: 5 });
    await waitFor('a bigger cat', () => cat('pixelCat.scale === 5 && pixelCat.padding === 140'));
    assert.equal(await js("document.getElementById('scaleName').textContent"), 'Huge');
    await js("window.catApi.setSettings({ scale: 99, coat: 'nope', interest: 'x', nightSleep: 'yes', customCats: [{ id: 'custom-x' }], evil: 1 })");
    await sleep(150);
    const unchanged = await js('window.catApi.getSettings()');
    assert.deepEqual([unchanged.scale, unchanged.coat, unchanged.interest, unchanged.nightSleep, unchanged.customCats, unchanged.evil],
      [5, 'midnight', 2, true, [], undefined], 'Invalid settings must be ignored');

    await click('#build');
    assert.equal(await js("document.getElementById('builder').open"), true);
    await click('#save');
    assert.match(await js("document.getElementById('builderError').textContent"), /name/, 'A cat needs a name');
    await fill({ catName: 'Smokey', catDescription: 'Grey longhair', catAuthor: 'Selftest', 'colour-fur': '#777788', 'colour-eyes': '#e0a030' });
    await screenshot('cat-builder.png');
    await click('#save');
    await waitFor('the new cat', async () => (await cards()) === 7 && !(await js("document.getElementById('builder').open")));
    const built = (await js('window.catApi.getSettings()')).customCats[0];
    assert.match(built.id, /^custom-/);
    assert.deepEqual([built.name, built.description, built.author, built.palette.fur, built.palette.eyes], ['Smokey', 'Grey longhair', 'Selftest', '#777788', '#e0a030']);
    await waitFor('the new cat on screen', () => shows(built.id));
    assert.deepEqual(await js("[...document.querySelectorAll('#gallery .card:last-child button')].map((b) => b.getAttribute('aria-label'))"),
      ['Edit Smokey', 'Share Smokey', 'Delete Smokey']);

    const shared = path.join(output, 'Smokey.desktopcat.json');
    let saveOptions;
    dialog.showSaveDialog = async (...args) => { saveOptions = args.at(-1); return { canceled: false, filePath: shared }; };
    await click('#gallery .card:last-child button[aria-label^=Share]');
    await waitFor('the export', async () => (await js("document.getElementById('status').textContent")).startsWith('Saved Smokey to'));
    assert.match(saveOptions.defaultPath, /Smokey\.desktopcat\.json$/);
    const file = JSON.parse(fs.readFileSync(shared, 'utf8'));
    assert.deepEqual([file.format, file.version, file.name, file.author, file.id], ['desktop-cat.coat', 1, 'Smokey', 'Selftest', undefined]);

    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [shared] });
    await click('#import');
    await waitFor('the import', async () => (await js("document.getElementById('status').textContent")) === 'Welcome, Smokey!');
    const imported = (await js('window.catApi.getSettings()')).customCats;
    assert.equal(imported.length, 2);
    assert.notEqual(imported[1].id, built.id, 'An imported cat gets its own id');
    await waitFor('the imported cat on screen', () => shows(imported[1].id));
    const bad = path.join(output, 'not-a-cat.json');
    fs.writeFileSync(bad, JSON.stringify({ format: 'something-else' }));
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [bad] });
    await click('#import');
    await waitFor('the import error', () => js("document.getElementById('status').classList.contains('error')"));
    assert.match(await js("document.getElementById('status').textContent"), /^Couldn't import that cat: This is not a Desktop Cat file/);
    assert.equal(await cards(), 8);
    await screenshot('cat-settings.png');

    await click('#gallery .card:nth-child(7) button[aria-label^=Edit]');
    assert.equal(await js("document.getElementById('builderTitle').textContent"), 'Edit Smokey');
    await fill({ catName: 'Smokey Jr' });
    await click('#save');
    await waitFor('the rename', async () => (await js("document.querySelector('#gallery .card:nth-child(7) .name').textContent")) === 'Smokey Jr');
    const renamed = (await js('window.catApi.getSettings()')).customCats;
    assert.deepEqual(renamed.map((c) => c.id), imported.map((c) => c.id), 'Editing keeps the same cat');

    await js('window.confirm = () => true; 0');
    await click('#gallery .card:nth-child(8) button[aria-label^=Delete]');
    await waitFor('the deletion', async () => (await cards()) === 7);
    await waitFor('the edited cat to stay chosen', () => shows(built.id));

    const submenu = (label) => trayMenu.items.find((item) => item.label === label).submenu.items;
    assert.deepEqual(submenu('Cat').map((item) => item.label), [...require('../renderer/coats.js').builtIn.map((c) => c.name), 'Smokey Jr']);
    submenu('Cat').find((item) => item.label === 'Midnight').click();
    await waitFor('the tray to pick a cat', () => shows('midnight'));
    assert.equal(await js("document.querySelector('input[name=coat]:checked').value"), 'midnight', 'Open settings must follow the tray');
    submenu('Size').find((item) => item.label === 'Normal').click();
    await waitFor('the tray to resize the cat', () => cat('pixelCat.scale === 3'));
    assert.equal(submenu('Size').find((item) => item.checked).label, 'Normal');
    submenu('Cat').find((item) => item.label === 'Smokey Jr').click();
    await waitFor('the tray to pick a custom cat', () => shows(built.id));

    await js("window.confirm = () => false; document.querySelector('#gallery .card:nth-child(7) button[aria-label^=Delete]').click()");
    await sleep(100);
    assert.equal(await cards(), 7, 'Cancelling a delete keeps the cat');
    await js('window.confirm = () => true; 0');
    await click('#gallery .card:nth-child(7) button[aria-label^=Delete]');
    await waitFor('the last custom cat to go', async () => (await cards()) === 6);
    await waitFor('the original cat after deleting the chosen one', () => shows('tabby'));
    assert.equal(await js("document.querySelector('input[name=coat]:checked').value"), 'tabby');
  } finally {
    dialog.showOpenDialog = saved.open; dialog.showSaveDialog = saved.save;
    page.destroy();
  }
}

app.whenReady().then(async () => {
  let stage = 'overlay startup';
  const timeout = setTimeout(() => { console.error(`Smoke test timed out during ${stage}`); app.exit(1); }, 120000);
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
        assert.deepEqual(geometry.floors.find((f) => f.id === 2), { id: 2, primary: false, top: 720, x0: 0, x1: 720, y: 2000, screen: { x0: 0, x1: 720, top: 720, bottom: 2000 } }, '100% side screen must use the 150% overlay coordinate space');
        assert.deepEqual(geometry.floors.find((f) => f.id === 3), { id: 3, primary: false, top: 720, x0: 3280, x1: 4000, y: 2000, screen: { x0: 3280, x1: 4000, top: 720, bottom: 2000 } });
        const primaryFloor = geometry.floors.find((f) => f.id === 1);
        assert.deepEqual(primaryFloor.screen, { x0: 720, x1: 3280, top: 720, bottom: 2160 }, 'Floors must include the whole screen, taskbar included, for climbing');
        assert.equal(primaryFloor.y, 2112);
        assert.deepEqual(geometry.cursor, { x: 2000, y: 1416 }, 'Cursor must take the same physical-coordinate path as displays');
      }
    }
    stage = 'sprite checks';
    overlay.webContents.debugger.attach('1.3');
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    const sprites = await overlay.webContents.executeJavaScript(atScale(3, checkSprites, 3));
    assert.equal(sprites.error, undefined, sprites.error);
    for (const size of [1, 6]) {
      const other = await overlay.webContents.executeJavaScript(atScale(size, checkSprites, size));
      assert.equal(other.error, undefined, `${size}x sprites: ${other.error}`);
    }
    const gallery = await overlay.webContents.executeJavaScript(atScale(3, checkCoats));
    assert.equal(gallery.error, undefined, gallery.error);
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.deepEqual(await overlay.webContents.executeJavaScript(`(() => {
      const c = document.createElement('canvas'); c.width = 216; c.height = 162;
      const p = c.getContext('2d'), base = { x: 108, y: 150, t: 0, state: 'walk', vx: 60, vy: 0, dir: 1, air: false, swat: 0 };
      const still = (pose) => {
        p.clearRect(0, 0, c.width, c.height); pixelCat.draw(p, pose); const first = c.toDataURL();
        p.clearRect(0, 0, c.width, c.height); pixelCat.draw(p, { ...pose, t: 0.125 });
        return first === c.toDataURL();
      };
      const shot = (pose) => { p.clearRect(0, 0, c.width, c.height); pixelCat.draw(p, pose); return c.toDataURL(); };
      const sitting = { ...base, state: 'sit', vx: 0 };
      return [still(base), still({ ...base, state: 'climb', vx: 0, vy: -60, x: 159, y: 156 }), still({ ...base, state: 'ready', vx: 0 }), shot({ ...sitting, blink: 0.7 }) === shot(sitting)];
    })()`), [true, true, true, true], 'Reduced motion must freeze decorative sprite animation, climbing, wiggling and blinking included');
    // Behaviour checks and their snapshots run with full motion, whatever this PC's accessibility setting is.
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    stage = 'behaviour checks';
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkSilence.toString()})()`), 0);
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkEdges.toString()})()`), true);
    assert.equal(await overlay.webContents.executeJavaScript(`(${checkDisplayGeometry.toString()})()`), true);
    stage = 'side-screen replay';
    const crossing = await overlay.webContents.executeJavaScript(`(() => {
      try { return (${checkMonitorCrossings.toString()})(); } catch (error) { return { error: error.message }; }
    })()`);
    assert.equal(crossing.error, undefined, crossing.error);
    const bigCrossing = await overlay.webContents.executeJavaScript(atScale(6, checkMonitorCrossings));
    assert.equal(bigCrossing.error, undefined, `6x: ${bigCrossing.error}`);
    let physicalCrossing, projection;
    if (mixedDpi) {
      stage = 'mixed-DPI replay';
      projection = {
        origin: { x: -1080, y: -1080 }, scale: 1.5,
        areas: simulatedDisplays.map((d) => ({
          ...d.physical, height: d.physical.height - (d.bounds.height - d.workArea.height) * d.scaleFactor,
        })),
        screens: simulatedDisplays.map((d) => d.physical),
      };
      physicalCrossing = await overlay.webContents.executeJavaScript(`(() => {
        try { return (${checkMonitorCrossings.toString()})(${JSON.stringify(projection)}); } catch (error) { return { error: error.message }; }
      })()`);
      assert.equal(physicalCrossing.error, undefined, physicalCrossing.error);
      assert.ok(physicalCrossing.frames > 200 && physicalCrossing.checkedPixels > 1000000, 'Mixed-DPI replay must inspect every opaque pixel through all four crossings');
    }

    stage = 'climbing';
    const climbs = [];
    for (const size of [3, 6]) {
      const climb = await overlay.webContents.executeJavaScript(atScale(size, checkClimbing));
      assert.equal(climb.error, undefined, `${size}x climbing: ${climb.error}`);
      climbs.push(climb);
    }
    if (multiMonitor) {
      // The real four-screen layout: up to the screen above the primary one and back, pixel by pixel.
      const climb = await overlay.webContents.executeJavaScript(atScale(3, checkClimbing, projection || { origin: { x: 0, y: 0 }, scale: 1 }));
      assert.equal(climb.error, undefined, `Desktop climbing: ${climb.error}`);
      climbs.push(climb);
    }
    await overlay.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [] });
    overlay.webContents.debugger.detach();

    stage = 'cat files';
    checkCoatFiles();

    stage = 'settings and toy IPC';
    const output = process.env.CAT_TEST_OUTPUT_DIR || app.getPath('temp');
    fs.mkdirSync(output, { recursive: true });
    await checkGallery(overlay, output);

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
    fs.writeFileSync(path.join(output, 'cat-sprites.png'), Buffer.from(sprites.png, 'base64'));
    fs.writeFileSync(path.join(output, 'cat-gallery.png'), Buffer.from(gallery.png, 'base64'));
    fs.writeFileSync(path.join(output, 'cat-climbing.png'), Buffer.from(climbs[0].png, 'base64'));
    if (climbs[2]) fs.writeFileSync(path.join(output, 'cat-climbing-desktop.png'), Buffer.from(climbs[2].png, 'base64'));
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
    console.log(`PASS: ${crossing.frames} fully visible side-screen crossing/perching frames (and ${bigCrossing.frames} at 6x)`);
    if (physicalCrossing) console.log(`PASS: ${physicalCrossing.frames} measured mixed-DPI crossing/perching frames, ${physicalCrossing.checkedPixels} physical pixels checked`);
    console.log(`PASS: climbing and leaping between stacked screens and up windows, chattering, stalking, pouncing, naps, zoomies and slow blinks, ${climbs.map((c) => `${c.frames} frames/${c.checkedPixels} pixels`).join(', ')}`);
    console.log(`PASS: ${sprites.poses} crisp animated poses at 1x/3x/6x, ${gallery.coats} distinct coats, cat files, gallery, builder, import/export, tray, mirroring, reduced motion, desktop edges, display geometry, silent behaviours, toy IPC`);
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
