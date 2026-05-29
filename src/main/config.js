const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function expandHome(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.openai.com/v1',
  modelName: process.env.MODEL_NAME || 'gpt-4o',
  workspaceDir: expandHome(process.env.WORKSPACE_DIR) || path.join(os.homedir(), 'xunming-workspace'),
  maxRetries: 5,
};

module.exports = config;
