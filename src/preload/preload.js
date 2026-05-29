const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('XunMingAPI', {
  startTask: (prompt) => ipcRenderer.send('xunming-start-task', prompt),

  getSettings: () => ipcRenderer.invoke('settings-get'),
  saveSettings: (updates) => ipcRenderer.invoke('settings-save', updates),
  pickDirectory: () => ipcRenderer.invoke('settings-pick-dir'),

  onStreamBegin: (callback) => {
    ipcRenderer.on('xunming-stream-begin', (event, data) => callback(data || {}));
  },
  onStreamToken: (callback) => {
    ipcRenderer.on('xunming-stream-token', (event, data) => callback(data));
  },
  onLogUpdate: (callback) => {
    ipcRenderer.on('xunming-log', (event, data) => callback(data));
  },
  onTaskComplete: (callback) => {
    ipcRenderer.on('xunming-task-complete', (event, data) => callback(data));
  },
  onToolEvent: (callback) => {
    ipcRenderer.on('xunming-tool-event', (event, data) => callback(data));
  },

  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('xunming-stream-begin');
    ipcRenderer.removeAllListeners('xunming-stream-token');
    ipcRenderer.removeAllListeners('xunming-log');
    ipcRenderer.removeAllListeners('xunming-task-complete');
    ipcRenderer.removeAllListeners('xunming-tool-event');
  }
});
