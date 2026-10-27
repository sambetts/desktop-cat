const { app, BrowserWindow, Tray, Menu, screen, powerMonitor, nativeImage, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let getActiveWindow = null;
try { getActiveWindow = require('active-win'); } catch { /* optional: perching disabled */ }

const LEVELS = ['Ignore everything', 'Aloof', 'Curious', 'Playful', 'Play with everything'];
const DEFAULTS = { interest: 2, nightSleep: true, launchAtLogin: false };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = { ...DEFAULTS };
let win, tray, settingsWin;

function load() {
  try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch {}
}
function applySettings(patch) {
  settings = { ...settings, ...patch };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings));
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  if (win && !win.isDestroyed()) win.webContents.send('settings', settings);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', settings);
  if (tray) buildMenu();
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
  win.setIgnoreMouseEvents(true); // click-through; the cat reads the cursor by polling
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 340, height: 330, resizable: false, title: 'Desktop Cat', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWin.webContents.on('did-finish-load', () => settingsWin.webContents.send('settings', settings));
}

function summonCat() {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = overlayCoordinates().rect(workArea);
  win.webContents.send('summon', { x: area.x + area.width / 2, y: Math.floor(area.y + area.height) });
}

function buildMenu() {
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Bring cat here', click: summonCat },
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
  ]));
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
  ipcMain.on('set-settings', (_, patch) => applySettings(patch));

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
      const a = space.rect(d.workArea);
      return { id: d.id, primary: d.id === primary, top: a.y, x0: a.x, x1: a.x + a.width, y: Math.floor(a.y + a.height) };
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
