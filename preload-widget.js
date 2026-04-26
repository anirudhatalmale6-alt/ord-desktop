const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ord', {
  resizeWidget: (w, h) => ipcRenderer.invoke('resize-widget', w, h),
  openMain: () => ipcRenderer.invoke('open-main-from-widget'),
  checkFromWidget: () => ipcRenderer.invoke('check-from-widget'),
  applyWidgetFix: (index) => ipcRenderer.invoke('apply-widget-fix', index),
  onWidgetUpdate: (cb) => ipcRenderer.on('widget-update', (_, data) => cb(data))
});
