const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ord', {
  getClipboard: () => ipcRenderer.invoke('get-clipboard'),
  setClipboard: (text) => ipcRenderer.invoke('set-clipboard', text),
  checkGrammar: (text, lang) => ipcRenderer.invoke('check-grammar', text, lang),
  rephrase: (text, lang, style) => ipcRenderer.invoke('rephrase', text, lang, style),
  translate: (text, lang, targetLang) => ipcRenderer.invoke('translate', text, lang, targetLang),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  login: (email, password) => ipcRenderer.invoke('login', email, password),
  register: (name, email, password) => ipcRenderer.invoke('register', name, email, password),
  logout: () => ipcRenderer.invoke('logout'),
  getSession: () => ipcRenderer.invoke('get-session'),
  onStartAction: (cb) => ipcRenderer.on('start-action', (_, action) => cb(action)),
  onShowSettings: (cb) => ipcRenderer.on('show-settings', () => cb())
});
