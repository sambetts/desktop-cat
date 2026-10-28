const { app, BrowserWindow, Tray, Menu, screen, powerMonitor, nativeImage, ipcMain, dialog } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const coats = require('./renderer/coats.js');

let getActiveWindow = null;
try { getActiveWindow = require('active-win'); } catch { /* optional: perching disabled */ }

const LEVELS = ['Ignore everything', 'Aloof', 'Curious', 'Playful', 'Play with everything'];
const SIZES = ['Tiny', 'Small', 'Normal', 'Large', 'Huge', 'Giant']; // whole-pixel sprite scales 1–6
const DEFAULTS = { interest: 2, nightSleep: true, launchAtLogin: false, coat: 'tabby', scale: 3, customCats: [] };
const CAT_FILES = [{ name: 'Desktop Cat', extensions: ['json'] }];
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = { ...DEFAULTS };
let win, tray, settingsWin;

const catExists = (id, customCats = settings.customCats) => coats.all(customCats).some((c) => c.id === id);
// Only accept known settings with valid values; custom cats change through their own IPC calls.
function cleanSettings(patch, customCats) {
  const clean = {};
  if (!patch || typeof patch !== 'object') return clean;
  if (Number.isInteger(patch.interest) && patch.interest >= 0 && patch.interest < LEVELS.length) clean.interest = patch.interest;
  if (Number.isInteger(patch.scale) && patch.scale >= 1 && patch.scale <= SIZES.length) clean.scale = patch.scale;
  for (const key of ['nightSleep', 'launchAtLogin']) if (typeof patch[key] === 'boolean') clean[key] = patch[key];
  if (typeof patch.coat === 'string' && catExists(patch.coat, customCats)) clean.coat = patch.coat;
  return clean;
}

function load() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch {}
  const customCats = (Array.isArray(saved?.customCats) ? saved.customCats : []).flatMap((c) => {
    try { return [{ id: /^custom-[\w-]{1,64}$/.test(c.id) ? c.id : newCatId(), ...coats.normalize(c) }]; } catch { return []; }
  });
  settings = { ...DEFAULTS, customCats, ...cleanSettings(saved, customCats) };
}
function applySettings(patch) {
  settings = { ...settings, ...patch };
  if (!catExists(settings.coat)) settings.coat = DEFAULTS.coat;
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings));
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('settings', settings);
  if (tray) buildMenu();
}

const newCatId = () => `custom-${crypto.randomUUID()}`;
const fileName = (name) => name.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'cat';
// Renderer calls get { error } back instead of a rejected promise, so messages reach the user unwrapped.
const handle = (channel, fn) => ipcMain.handle(channel, async (event, ...args) => {
  try { return { ok: true, ...(await fn(BrowserWindow.fromWebContents(event.sender), ...args)) }; } catch (error) { return { error: error.message }; }
});
const showDialog = (kind, parent, options) => parent ? dialog[kind](parent, options) : dialog[kind](options);

function registerCatIpc() {
  ipcMain.handle('get-settings', () => settings);
  ipcMain.on('set-settings', (_, patch) => applySettings(cleanSettings(patch, settings.customCats)));
  handle('save-cat', (_, raw) => {
    const cat = coats.normalize(raw);
    const id = settings.customCats.some((c) => c.id === raw.id) ? raw.id : newCatId();
    const customCats = settings.customCats.some((c) => c.id === id)
      ? settings.customCats.map((c) => (c.id === id ? { id, ...cat } : c))
      : [...settings.customCats, { id, ...cat }];
    applySettings({ customCats, coat: id });
    return { id };
  });
  handle('delete-cat', (_, id) => {
    applySettings({ customCats: settings.customCats.filter((c) => c.id !== id) });
    return {};
  });
  handle('import-cat', async (parent) => {
    const { canceled, filePaths } = await showDialog('showOpenDialog', parent, { title: 'Import a cat', filters: CAT_FILES, properties: ['openFile'] });
    if (canceled || !filePaths?.length) return { canceled: true };
    if (fs.statSync(filePaths[0]).size > 64 * 1024) throw new Error('That file is too big to be a Desktop Cat file');
    const cat = coats.parseText(fs.readFileSync(filePaths[0], 'utf8'));
    const id = newCatId();
    applySettings({ customCats: [...settings.customCats, { id, ...cat }], coat: id });
    return { id, name: cat.name };
  });
  handle('export-cat', async (parent, id) => {
    const cat = coats.all(settings.customCats).find((c) => c.id === id);
    if (!cat) throw new Error('That cat no longer exists');
    const { canceled, filePath } = await showDialog('showSaveDialog', parent, {
      title: `Share ${cat.name}`, filters: CAT_FILES,
      defaultPath: path.join(app.getPath('documents'), `${fileName(cat.name)}.desktopcat.json`),
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(coats.toFile(cat), null, 2) + '\n');
    return { file: filePath };
  });
}

// One transparent window spanning every monitor, so the cat can walk between them.
function virtualBounds() {
  const ds = screen.getAllDisplays().map((d) => process.platform === 'win32' ? screen.dipToScreenRect(null, d.bounds) : d.bounds);
  const x = Math.min(...ds.map((d) => d.x)), y = Math.min(...ds.map((d) => d.y));
  const r = Math.max(...ds.map((d) => d.x + d.width)), b = Math.max(...ds.map((d) => d.y + d.height));
  const bounds = { x, y, width: r - x, height: b - y };
  return process.platform === 'win32' ? screen.screenToDipRect(win || null, bounds) : bounds;
}

function overlayCoordinates() {
  const b = win.getContentBounds(), windows = process.platform === 'win32';
  const physical = windows ? screen.dipToScreenRect(win, b) : b;
  const zoom = win.webContents.getZoomFactor();
  const sx = physical.width / b.width * zoom, sy = physical.height / b.height * zoom;
  // Display DIPs have different scales; the spanning overlay has only one.
  const nativeRect = (r) => ({
    x: (r.x - physical.x) / sx, y: (r.y - physical.y) / sy,
    width: r.width / sx, height: r.height / sy,
  });
  return {
    width: Math.round(b.width / zoom), height: Math.round(b.height / zoom), nativeRect,
    rect: (r) => nativeRect(windows ? screen.dipToScreenRect(null, r) : r),
    point: (p) => {
      const q = windows ? screen.dipToScreenPoint(p) : p;
      return { x: (q.x - physical.x) / sx, y: (q.y - physical.y) / sy };
    },
  };
}

function createWindow() {
  const bounds = virtualBounds();
  win = new BrowserWindow({
    ...bounds, transparent: true, frame: false, hasShadow: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  // Windows can cap constructor dimensions to one display's work area.
  win.setBounds(bounds);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true); // click-through except over the cat; the cat reads the cursor by polling
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 560, height: 680, minWidth: 420, minHeight: 420, title: 'Desktop Cat', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
}

function summonCat() {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = overlayCoordinates().rect(workArea);
  win.webContents.send('summon', { x: area.x + area.width / 2, y: Math.floor(area.y + area.height) });
}

// The tray menu; right-clicking the cat shows the same menu, less "Bring cat here".
function menuTemplate({ summon = true } = {}) {
  const radio = (label, checked, patch) => ({ label: label.replace(/&/g, '&&'), type: 'radio', checked, click: () => applySettings(patch) });
  return [
    ...(summon ? [{ label: 'Bring cat here', click: summonCat }] : []),
    { label: 'Cat', submenu: coats.all(settings.customCats).map((c) => radio(c.name, settings.coat === c.id, { coat: c.id })) },
    { label: 'Size', submenu: SIZES.map((label, i) => radio(label, settings.scale === i + 1, { scale: i + 1 })) },
    { type: 'separator' },
    { label: 'Interest level', enabled: false },
    ...LEVELS.map((label, i) => ({ label, type: 'radio', checked: settings.interest === i, click: () => applySettings({ interest: i }) })),
    { type: 'separator' },
    { label: 'Toss a yarn ball', click: () => win.webContents.send('toy', 'yarn') },
    { label: 'Laser pointer (20s)', click: () => win.webContents.send('toy', 'laser') },
    { label: 'Fill food bowl', click: () => win.webContents.send('toy', 'food') },
    { type: 'separator' },
    { label: 'Settings…', click: openSettings },
    { label: 'Quit', role: 'quit' },
  ];
}
function buildMenu() { tray.setContextMenu(Menu.buildFromTemplate(menuTemplate())); }

// The overlay is click-through except while the pointer is over the cat, so the cat can be right-clicked.
function registerOverlayIpc() {
  const fromOverlay = (event) => win && !win.isDestroyed() && event.sender === win.webContents;
  ipcMain.on('cat-hover', (event, over) => { if (fromOverlay(event)) win.setIgnoreMouseEvents(over !== true); });
  ipcMain.on('cat-menu', (event) => {
    if (fromOverlay(event)) Menu.buildFromTemplate(menuTemplate({ summon: false })).popup({ window: win });
  });
  // A reloaded or crashed page can't say the pointer has left the cat.
  const clickThrough = () => { if (!win.isDestroyed()) win.setIgnoreMouseEvents(true); };
  win.webContents.on('did-start-loading', clickThrough);
  win.webContents.on('render-process-gone', clickThrough);
}

app.whenReady().then(() => {
  load();
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  createWindow();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 22, height: 22 }));
  tray.setToolTip('Desktop Cat');
  tray.on('click', openSettings);
  buildMenu();
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('settings', settings);
    sendEnvironment();
  });
  registerCatIpc();
  registerOverlayIpc();

  const reposition = () => {
    if (win.isDestroyed()) return;
    win.setBounds(virtualBounds());
    sendEnvironment();
  };
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
  screen.on('display-metrics-changed', reposition);

  // Active window bounds, for perching. Polled slowly because it spawns a process on some platforms.
  let active = null, polling = false;
  setInterval(async () => {
    if (!getActiveWindow || polling) return;
    polling = true;
    try {
      const w = await getActiveWindow();
      active = w && w.owner && w.owner.processId !== process.pid ? { ...w.bounds, title: w.title, app: w.owner.name } : null;
    } catch { active = null; }
    polling = false;
  }, 700);

  let prevIdle = 0, prevCursor = null, lastTyping = 0;
  function sendEnvironment() {
    if (win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    const space = overlayCoordinates();
    const idle = powerMonitor.getSystemIdleTime(); // seconds since last keyboard/mouse input
    // Input happened but the cursor stayed put: the user is typing.
    const still = prevCursor && prevCursor.x === p.x && prevCursor.y === p.y;
    if (idle < prevIdle && still) lastTyping = Date.now();
    prevIdle = idle; prevCursor = p;
    const primary = screen.getPrimaryDisplay().id;
    const floors = screen.getAllDisplays().map((d) => {
      const a = space.rect(d.workArea), b = space.rect(d.bounds);
      // `screen` is the whole display: a climbing or jumping cat may pass in front of a taskbar, but never rests on one.
      return {
        id: d.id, primary: d.id === primary, top: a.y, x0: a.x, x1: a.x + a.width, y: Math.floor(a.y + a.height),
        screen: { x0: b.x, x1: b.x + b.width, top: b.y, bottom: b.y + b.height },
      };
    });
    win.webContents.send('env', {
      cursor: space.point(p), idle, typing: Date.now() - lastTyping < 1500, hour: new Date().getHours(),
      width: space.width, height: space.height, floors,
      active: active ? { ...space.nativeRect(active), title: active.title, app: active.app } : null,
    });
  }
  setInterval(sendEnvironment, 50);
});

app.on('window-all-closed', () => { if (!win || win.isDestroyed()) app.quit(); });
