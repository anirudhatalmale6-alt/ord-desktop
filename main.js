const { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');

let tray = null;
let mainWindow = null;
let apiKey = '';
let currentSession = null;

const API_BASE = 'https://skylarkmedia.se/ord/api';
const SETTINGS_KEY = 'ord-settings';
const SESSION_FILE = path.join(app.getPath('userData'), 'session.json');

function saveSession(session) {
  const fs = require('fs');
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(session)); } catch {}
}

function loadSession() {
  const fs = require('fs');
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')); } catch { return null; }
}

function clearSession() {
  const fs = require('fs');
  try { fs.unlinkSync(SESSION_FILE); } catch {}
}

app.whenReady().then(() => {
  const saved = loadSession();
  if (saved && saved.user && saved.user.api_key) {
    apiKey = saved.user.api_key;
    currentSession = saved;
  }
  createTray();
  createWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

function createTray() {
  const iconPath = path.join(__dirname, 'tray-icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) icon = createDefaultIcon();
  } catch {
    icon = createDefaultIcon();
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Check Grammar (Ctrl+Shift+G)', click: () => triggerCheck() },
    { label: 'Rephrase (Ctrl+Shift+R)', click: () => triggerAction('rephrase') },
    { label: 'Make Formal (Ctrl+Shift+F)', click: () => triggerAction('formal') },
    { label: 'Make Casual', click: () => triggerAction('casual') },
    { type: 'separator' },
    { label: 'Show Window', click: () => showWindow() },
    { label: 'Settings', click: () => showSettings() },
    { type: 'separator' },
    { label: 'Quit Ord', click: () => { app.quit(); } }
  ]);

  tray.setToolTip('Ord - AI Writing Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => showWindow());
}

function createDefaultIcon() {
  const size = 32;
  const canvas = nativeImage.createEmpty();
  return canvas;
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    x: screenW - 440,
    y: screenH - 580,
    frame: false,
    resizable: true,
    skipTaskbar: false,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer.html');

  mainWindow.on('close', () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.on('blur', () => {
    // Don't hide on blur so user can copy text
  });
}

function showWindow() {
  if (!mainWindow) createWindow();
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;
  mainWindow.setPosition(screenW - 440, screenH - 580);
  mainWindow.show();
  mainWindow.focus();
}

function showSettings() {
  showWindow();
  mainWindow.webContents.send('show-settings');
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+G', () => triggerCheck());
  globalShortcut.register('CommandOrControl+Shift+R', () => triggerAction('rephrase'));
}

async function triggerCheck() {
  showWindow();
  mainWindow.webContents.send('start-action', 'check');
}

async function triggerAction(action) {
  showWindow();
  mainWindow.webContents.send('start-action', action);
}

function apiRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const postData = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(json.error || `Server error: ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch {
          reject(new Error('Invalid response from server'));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

ipcMain.handle('get-clipboard', () => {
  return clipboard.readText();
});

ipcMain.handle('set-clipboard', (_, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('check-grammar', async (_, text, language) => {
  if (!apiKey) return { error: 'API key not set. Open Settings to configure.' };
  try {
    return await apiRequest('/check', { text, language });
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('rephrase', async (_, text, language, style) => {
  if (!apiKey) return { error: 'API key not set. Open Settings to configure.' };
  try {
    return await apiRequest('/rephrase', { text, language, style });
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('save-settings', (_, settings) => {
  if (settings.apiKey) apiKey = settings.apiKey;
  return true;
});

ipcMain.handle('load-settings', () => {
  return { apiKey };
});

ipcMain.handle('hide-window', () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle('quit-app', () => {
  app.quit();
  return true;
});

ipcMain.handle('get-auto-start', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (_, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  return true;
});

function apiGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const options = {
      hostname: url.hostname, port: 443, path: url.pathname, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) reject(new Error(json.error || 'Server error'));
          else resolve(json);
        } catch { reject(new Error('Invalid response')); }
      });
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const postData = JSON.stringify(body);
    const options = {
      hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(json.error || 'Server error'));
          else resolve(json);
        } catch { reject(new Error('Invalid response')); }
      });
    });
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

ipcMain.handle('login', async (_, email, password) => {
  try {
    const resp = await apiPost('/auth/login', { email, password });
    apiKey = resp.user.api_key;
    currentSession = { token: resp.token, user: resp.user };
    saveSession(currentSession);
    return { success: true, user: resp.user };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('register', async (_, name, email, password) => {
  try {
    const resp = await apiPost('/auth/register', { name, email, password });
    apiKey = resp.user.api_key;
    currentSession = { token: resp.token, user: resp.user };
    saveSession(currentSession);
    return { success: true, user: resp.user };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('logout', () => {
  apiKey = '';
  currentSession = null;
  clearSession();
  return true;
});

ipcMain.handle('get-session', async () => {
  if (currentSession) return { user: currentSession.user };
  const saved = loadSession();
  if (!saved || !saved.token) return null;
  try {
    const resp = await apiGet('/auth/me', saved.token);
    apiKey = resp.user.api_key;
    currentSession = { token: saved.token, user: resp.user };
    return { user: resp.user };
  } catch {
    clearSession();
    return null;
  }
});
