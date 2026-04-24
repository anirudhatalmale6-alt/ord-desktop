const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ord', {
  getClipboard: () => ipcRenderer.invoke('get-clipboard'),
  setClipboard: (text) => ipcRenderer.invoke('set-clipboard', text),
  checkGrammar: (text, lang) => ipcRenderer.invoke('check-grammar', text, lang),
  rephrase: (text, lang, style) => ipcRenderer.invoke('rephrase', text, lang, style),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  onStartAction: (cb) => ipcRenderer.on('start-action', (_, action) => cb(action)),
  onShowSettings: (cb) => ipcRenderer.on('show-settings', () => cb())
});
