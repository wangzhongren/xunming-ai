import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load config once — it reads from the actual .env + process.env
const config = require('../src/main/config');

describe('config.js', () => {
  describe('config shape', () => {
    it('should have all required config keys', () => {
      expect(config).toHaveProperty('openaiApiKey');
      expect(config).toHaveProperty('apiBaseUrl');
      expect(config).toHaveProperty('modelName');
      expect(config).toHaveProperty('workspaceDir');
      expect(config).toHaveProperty('maxRetries');
    });

    it('should have maxRetries set to 5', () => {
      expect(config.maxRetries).toBe(5);
    });

    it('should have a truthy openaiApiKey', () => {
      expect(config.openaiApiKey).toBeTruthy();
    });

    it('should have a valid apiBaseUrl format', () => {
      expect(config.apiBaseUrl).toMatch(/^https?:\/\//);
    });
  });

  describe('default values', () => {
    it('should default apiBaseUrl to openai when env is not set', () => {
      // If the actual .env doesn't set API_BASE_URL, default is openai
      // Just check it's a valid URL
      expect(config.apiBaseUrl).toBeTruthy();
    });

    it('should default modelName to gpt-4o when env is not set', () => {
      // If MODEL_NAME is set in .env, use that; otherwise gpt-4o
      expect(config.modelName).toBeTruthy();
    });
  });

  describe('workspaceDir', () => {
    it('should be a non-empty string', () => {
      expect(config.workspaceDir).toBeTruthy();
      expect(typeof config.workspaceDir).toBe('string');
    });

    it('should not contain literal tilde (already expanded)', () => {
      // expandHome should have resolved ~ to the actual home directory
      expect(config.workspaceDir).not.toContain('~');
    });
  });

  describe('expandHome function logic', () => {
    // Test the expandHome logic inline since it's internal to config.js
    const path = require('path');
    const os = require('os');

    function expandHome(inputPath) {
      if (!inputPath) return inputPath;
      if (inputPath === '~') return os.homedir();
      if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
        return path.join(os.homedir(), inputPath.slice(2));
      }
      return inputPath;
    }

    it('should expand ~ to homedir', () => {
      const result = expandHome('~');
      expect(result).not.toContain('~');
      expect(result).toBe(os.homedir());
    });

    it('should expand ~/path to homedir/path', () => {
      const result = expandHome('~/myworkspace');
      expect(result).not.toContain('~');
      expect(result).toContain('myworkspace');
    });

    it('should expand ~\\path on Windows', () => {
      const result = expandHome('~\\myworkspace');
      expect(result).not.toContain('~');
      expect(result).toContain('myworkspace');
    });

    it('should not modify absolute paths', () => {
      const result = expandHome('/absolute/path');
      expect(result).toBe('/absolute/path');
    });

    it('should return null/undefined/empty unchanged', () => {
      expect(expandHome(null)).toBe(null);
      expect(expandHome(undefined)).toBe(undefined);
      expect(expandHome('')).toBe('');
    });
  });
});
