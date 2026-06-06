import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';

const require = createRequire(import.meta.url);

// Import the tools module
const tools = require('../src/main/tools/index');

describe('tools/index.js', () => {
  let tempWorkspace;

  beforeEach(() => {
    tempWorkspace = path.join(os.tmpdir(), 'xunming-test-' + Date.now());
    fs.mkdirSync(tempWorkspace, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempWorkspace)) {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    }
  });

  describe('parseToolCalls', () => {
    it('should parse a self-closing read-file tag', () => {
      const text = '<read-file path="src/main.js"/>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('read-file');
      expect(calls[0].args.filePath).toBe('src/main.js');
    });

    it('should parse a write-file tag with body content', () => {
      const text = '<write-file path="hello.txt">Hello World</write-file>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('write-file');
      expect(calls[0].args.filePath).toBe('hello.txt');
      expect(calls[0].args.content).toBe('Hello World');
    });

    it('should parse update-file with line attribute', () => {
      const text = '<update-file path="app.js" line="5">new content</update-file>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('update-file');
      expect(calls[0].args.filePath).toBe('app.js');
      expect(calls[0].args.line).toBe('5');
      expect(calls[0].args.content).toBe('new content');
    });

    it('should parse update-file with from/to attributes', () => {
      const text = '<update-file path="config.js" from="3" to="7">replacement</update-file>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].args.from).toBe('3');
      expect(calls[0].args.to).toBe('7');
    });

    it('should parse update-file with replace attribute', () => {
      const text = '<update-file path="test.txt" replace="old">new</update-file>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].args.replace).toBe('old');
    });

    it('should parse list-path tag', () => {
      const text = '<list-path path="src/"/>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('list-path');
      expect(calls[0].args.dirPath).toBe('src/');
    });

    it('should parse run-command tag', () => {
      const text = '<run-command>npm install</run-command>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('run-command');
      expect(calls[0].args.command).toBe('npm install');
    });

    it('should parse run-command with bg attribute', () => {
      const text = '<run-command bg="true" job-id="install_deps">npm install</run-command>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].args.bg).toBe('true');
      expect(calls[0].args['job-id']).toBe('install_deps');
    });

    it('should parse run-command check variant', () => {
      const text = '<run-command check="bg_12345"/>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].args.check).toBe('bg_12345');
    });

    it('should parse multiple tool calls in one text', () => {
      const text = 'Let me read the file first.\n<read-file path="src/app.js"/>\nNow let me write something.\n<write-file path="log.txt">done</write-file>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(2);
      expect(calls[0].name).toBe('read-file');
      expect(calls[1].name).toBe('write-file');
    });

    it('should deduplicate identical tool calls', () => {
      const text = '<read-file path="a.js"/>\n<read-file path="a.js"/>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
    });

    it('should return empty array for text without tool calls', () => {
      const text = 'This is just a plain text response with no tools.';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(0);
    });

    it('should handle empty text', () => {
      const calls = tools.parseToolCalls('');
      expect(calls).toHaveLength(0);
    });

    it('should parse self-closing write-file tag (edge case)', () => {
      const text = '<write-file path="empty.txt"/>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('write-file');
      expect(calls[0].args.content).toBe('');
    });

    it('should return unique id for each call', () => {
      const text = '<read-file path="a.js"/><read-file path="b.js"/>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(2);
      expect(calls[0].id).not.toBe(calls[1].id);
    });

    it('should handle multiline body content in write-file', () => {
      const text = '<write-file path="test.js">const x = 1;\nconst y = 2;\nconsole.log(x + y);</write-file>';
      const calls = tools.parseToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0].args.content).toContain('const x = 1;');
      expect(calls[0].args.content).toContain('console.log(x + y);');
    });
  });

  describe('toolCallMap', () => {
    it('should have all 5 tools defined', () => {
      expect(tools.toolCallMap).toHaveProperty('read-file');
      expect(tools.toolCallMap).toHaveProperty('write-file');
      expect(tools.toolCallMap).toHaveProperty('update-file');
      expect(tools.toolCallMap).toHaveProperty('list-path');
      expect(tools.toolCallMap).toHaveProperty('run-command');
    });

    it('should mark self-closing tools correctly', () => {
      expect(tools.toolCallMap['read-file'].selfClosing).toBe(true);
      expect(tools.toolCallMap['write-file'].selfClosing).toBe(false);
      expect(tools.toolCallMap['list-path'].selfClosing).toBe(true);
    });

    it('should mark path-requiring tools correctly', () => {
      expect(tools.toolCallMap['read-file'].hasPath).toBe(true);
      expect(tools.toolCallMap['run-command'].hasPath).toBe(false);
    });
  });

  describe('buildToolsPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = tools.buildToolsPrompt();
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
    });

    it('should include all tool names', () => {
      const prompt = tools.buildToolsPrompt();
      expect(prompt).toContain('read-file');
      expect(prompt).toContain('write-file');
      expect(prompt).toContain('update-file');
      expect(prompt).toContain('list-path');
      expect(prompt).toContain('run-command');
    });

    it('should include background execution instructions', () => {
      const prompt = tools.buildToolsPrompt();
      expect(prompt).toContain('bg');
      expect(prompt).toContain('check');
    });
  });
});
