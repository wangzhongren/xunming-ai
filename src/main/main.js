const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { XunMingScheduler } = require('./xunming-core');
const { registerSettingsHandlers } = require('./settings');

let mainWindow;
let xunmingScheduler;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1000,
    title: "xunming-ai (循名 AI 智能体集群)",
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.VITE_DEV === 'true';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  registerSettingsHandlers(mainWindow);
  xunmingScheduler = new XunMingScheduler(mainWindow);
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.on('xunming-start-task', async (event, prompt) => {
  try {
    await xunmingScheduler.processQuery(prompt);
  } catch (e) {
    mainWindow.webContents.send('xunming-task-complete', { success: false, error: e.message });
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
