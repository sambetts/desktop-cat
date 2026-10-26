const { app, BrowserWindow, Tray, Menu, screen, powerMonitor, nativeImage, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let getActiveWindow = null;
try { getActiveWindow = require('active-win'); } catch { /* optional: perching disabled */ }

const LEVELS = ['Ignore everything', 'Aloof', 'Curious', 'Playful', 'Play with everything'];
const DEFAULTS = { interest: 2, sound: true, nightSleep: true, launchAtLogin: false };
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
  const ds = screen.getAllDisplays();
  const x = Math.min(...ds.map((d) => d.bounds.x)), y = Math.min(...ds.map((d) => d.bounds.y));
  const r = Math.max(...ds.map((d) => d.bounds.x + d.bounds.width)), b = Math.max(...ds.map((d) => d.bounds.y + d.bounds.height));
  return { x, y, width: r - x, height: b - y };
}

function createWindow() {
  win = new BrowserWindow({
    ...virtualBounds(), transparent: true, frame: false, hasShadow: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
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

function buildMenu() {
  tray.setContextMenu(Menu.buildFromTemplate([
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
  win.webContents.on('did-finish-load', () => win.webContents.send('settings', settings));
  ipcMain.on('set-settings', (_, patch) => applySettings(patch));

  const reposition = () => { if (!win.isDestroyed()) win.setBounds(virtualBounds()); };
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
  setInterval(() => {
    if (win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const idle = powerMonitor.getSystemIdleTime(); // seconds since last keyboard/mouse input
    // Input happened but the cursor stayed put: the user is typing.
    const still = prevCursor && prevCursor.x === p.x && prevCursor.y === p.y;
    if (idle < prevIdle && still) lastTyping = Date.now();
    prevIdle = idle; prevCursor = p;
    const floors = screen.getAllDisplays().map((d) => ({
      x0: d.workArea.x - b.x, x1: d.workArea.x + d.workArea.width - b.x, y: d.workArea.y + d.workArea.height - b.y,
    }));
    win.webContents.send('env', {
      cursor: { x: p.x - b.x, y: p.y - b.y }, idle, typing: Date.now() - lastTyping < 1500, hour: new Date().getHours(),
      width: b.width, height: b.height, floors,
      active: active ? { x: active.x - b.x, y: active.y - b.y, width: active.width, height: active.height, title: active.title, app: active.app } : null,
    });
  }, 50);
});

app.on('window-all-closed', () => { if (!win || win.isDestroyed()) app.quit(); });
