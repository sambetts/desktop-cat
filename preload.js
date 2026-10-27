const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('catApi', {
  onEnv: (cb) => ipcRenderer.on('env', (_, d) => cb(d)),
  onSettings: (cb) => ipcRenderer.on('settings', (_, d) => cb(d)),
  onToy: (cb) => ipcRenderer.on('toy', (_, d) => cb(d)),
  onSummon: (cb) => ipcRenderer.on('summon', (_, d) => cb(d)),
  setSettings: (patch) => ipcRenderer.send('set-settings', patch),
});
