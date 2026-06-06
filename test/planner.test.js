import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PlannerAgent } = require('../src/main/agents/planner');

describe('PlannerAgent', () => {
  let planner;

  beforeEach(() => {
    planner = new PlannerAgent();
  });

  describe('buildMessages', () => {
    it('should return an array with SystemMessage and HumanMessage', () => {
      const messages = planner.buildMessages('请写一个排序算法');
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(2);
    });

    it('should include the user prompt in the HumanMessage', () => {
      const messages = planner.buildMessages('请写一个Hello World程序');
      const humanMsg = messages[messages.length - 1];
      expect(humanMsg.content || humanMsg.text || JSON.stringify(humanMsg)).toContain('Hello World');
    });

    it('should include 立法 standard instructions in the SystemMessage', () => {
      const messages = planner.buildMessages('test prompt');
      const systemMsg = messages[0];
      const sysContent = systemMsg.content || systemMsg.text || '';
      expect(sysContent).toContain('立法');
      expect(sysContent).toContain('JSON');
    });

    it('should instruct to output pure JSON array format', () => {
      const messages = planner.buildMessages('test');
      const systemMsg = messages[0];
      const sysContent = systemMsg.content || systemMsg.text || '';
      expect(sysContent).toContain('JSON');
      expect(sysContent).toContain('数组');
    });

    it('should have iron rules in system prompt', () => {
      const messages = planner.buildMessages('test');
      const systemMsg = messages[0];
      const sysContent = systemMsg.content || systemMsg.text || '';
      expect(sysContent).toContain('铁律');
      expect(sysContent).toContain('绝对不允许');
    });
  });

  describe('parseCriteria', () => {
    it('should parse a valid JSON array', () => {
      const json = '[{"id":1,"rule":"test rule"}]';
      const result = planner.parseCriteria(json);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].rule).toBe('test rule');
    });

    it('should strip markdown code fences', () => {
      const json = '```json\n[{"id":1,"rule":"test rule"}]\n```';
      const result = planner.parseCriteria(json);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should handle JSON with only backticks', () => {
      const json = '```\n[{"id":1,"rule":"test"}]\n```';
      const result = planner.parseCriteria(json);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return a fallback criteria on invalid JSON', () => {
      const result = planner.parseCriteria('not valid json at all');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].rule).toBeTruthy();
    });

    it('should return a fallback on empty string', () => {
      const result = planner.parseCriteria('');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should parse multiple criteria', () => {
      const json = '[{"id":1,"rule":"rule A"},{"id":2,"rule":"rule B"},{"id":3,"rule":"rule C"}]';
      const result = planner.parseCriteria(json);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(3);
    });

    it('should handle JSON with whitespace', () => {
      const json = '\n\n  [\n    {"id": 1, "rule": "spaced rule"}\n  ]\n';
      const result = planner.parseCriteria(json);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].rule).toBe('spaced rule');
    });
  });
});
