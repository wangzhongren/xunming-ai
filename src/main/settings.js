const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');

function readEnv() {
  const settings = {
    workspaceDir: '',
    modelName: '',
    apiBaseUrl: '',
  };

  if (!fs.existsSync(envPath)) return settings;

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const idx = trimmed.indexOf('=');
    const key = trimmed.substring(0, idx).trim();
    const value = trimmed.substring(idx + 1).trim();

    if (key === 'WORKSPACE_DIR') settings.workspaceDir = value;
    if (key === 'MODEL_NAME') settings.modelName = value;
    if (key === 'API_BASE_URL') settings.apiBaseUrl = value;
  }

  return settings;
}

function writeEnv(updates) {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = content.split('\n');
  const keyMap = {
    workspaceDir: 'WORKSPACE_DIR',
    modelName: 'MODEL_NAME',
    apiBaseUrl: 'API_BASE_URL',
  };

  const updated = new Set();

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const idx = trimmed.indexOf('=');
    const key = trimmed.substring(0, idx).trim();

    for (const [settingKey, envKey] of Object.entries(keyMap)) {
      if (key === envKey && updates[settingKey] !== undefined) {
        lines[i] = `${envKey}=${updates[settingKey]}`;
        updated.add(settingKey);
      }
    }
  }

  // Append any new keys not found in file
  for (const [settingKey, envKey] of Object.entries(keyMap)) {
    if (!updated.has(settingKey) && updates[settingKey] !== undefined) {
      lines.push(`${envKey}=${updates[settingKey]}`);
    }
  }

  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
  return true;
}

async function pickDirectory(win) {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择工作空间目录',
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

function registerSettingsHandlers(mainWindow) {
  ipcMain.handle('settings-get', async () => {
    return readEnv();
  });

  ipcMain.handle('settings-save', async (event, updates) => {
    writeEnv(updates);
    return true;
  });

  ipcMain.handle('settings-pick-dir', async () => {
    return pickDirectory(mainWindow);
  });
}

module.exports = { registerSettingsHandlers };
