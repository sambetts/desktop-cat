const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('catApi', {
  onEnv: (cb) => ipcRenderer.on('env', (_, d) => cb(d)),
  onSettings: (cb) => ipcRenderer.on('settings', (_, d) => cb(d)),
  onToy: (cb) => ipcRenderer.on('toy', (_, d) => cb(d)),
  onSummon: (cb) => ipcRenderer.on('summon', (_, d) => cb(d)),
  setSettings: (patch) => ipcRenderer.send('set-settings', patch),
  setCatHover: (over) => ipcRenderer.send('cat-hover', over === true),
  showCatMenu: () => ipcRenderer.send('cat-menu'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveCat: (cat) => ipcRenderer.invoke('save-cat', cat),
  deleteCat: (id) => ipcRenderer.invoke('delete-cat', id),
  importCat: () => ipcRenderer.invoke('import-cat'),
  exportCat: (id) => ipcRenderer.invoke('export-cat', id),
});
