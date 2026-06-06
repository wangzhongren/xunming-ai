import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { XunMingScheduler } = require('../src/main/xunming-core');

describe('XunMingScheduler - inspectorVerdict', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new XunMingScheduler({
      webContents: { send: () => {} }
    });
  });

  describe('JSON parsing path', () => {
    it('should return passed:true when all items pass', () => {
      const evidenceText = '```json\n[{"id":1,"passed":true,"reason":"ok"},{"id":2,"passed":true,"reason":"ok too"}]\n```';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(true);
    });

    it('should return passed:false when any item fails', () => {
      const evidenceText = '[{"id":1,"passed":true,"reason":"ok"},{"id":2,"passed":false,"reason":"failed"}]';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
      expect(verdict.reason).toContain('failed');
    });

    it('should handle JSON without markdown fences', () => {
      const evidenceText = '[{"id":1,"passed":true,"reason":"all good"}]';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(true);
    });

    it('should handle JSON with surrounding text', () => {
      const evidenceText = 'Here is my report:\n[{"id":1,"passed":true,"reason":"ok"}]\nEnd.';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(true);
    });

    it('should handle JSON with embedded text before array', () => {
      const evidenceText = '```json\nSome notes\n[{"id":1,"passed":true,"reason":"ok"}]\nMore notes\n```';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(true);
    });

    it('should handle empty JSON array', () => {
      const evidenceText = '[]';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict).toHaveProperty('passed');
    });

    it('should truncate reason to ~300 chars on failure', () => {
      const longReason = 'x'.repeat(500);
      const evidenceText = `[{"id":1,"passed":false,"reason":"${longReason}"}]`;
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
      expect(verdict.reason.length).toBeLessThanOrEqual(310);
    });
  });

  describe('Emoji fallback path', () => {
    it('should pass when ✅ present and no ❌', () => {
      const evidenceText = '验证结果：\n项目1 ✅\n项目2 ✅\n项目3 ✅';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(true);
    });

    it('should fail when ❌ present', () => {
      const evidenceText = '验证结果：\n项目1 ✅\n项目2 ❌ 失败\n项目3 ✅';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
    });

    it('should fail when ❌ count exceeds ✅ count', () => {
      const evidenceText = '❌ ❌ ✅';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
    });
  });

  describe('Keyword fallback path', () => {
    it('should fail when 未满足 is present', () => {
      const evidenceText = '产出未满足第2条标准的要求。';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
    });

    it('should fail when 问题 is present', () => {
      const evidenceText = '代码存在问题，需要修改。';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
    });

    it('should fail when 错误 is present', () => {
      const evidenceText = '运行出现错误。';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(false);
    });

    it('should pass when none of the negative keywords are present', () => {
      const evidenceText = '产出满足所有标准要求，代码正确无误，测试通过。';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict.passed).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty evidence text', () => {
      const verdict = scheduler.inspectorVerdict('');
      expect(verdict.passed).toBe(true);
    });

    it('should handle null/undefined evidence text', () => {
      const verdict = scheduler.inspectorVerdict(null);
      expect(verdict.passed).toBe(true);
    });

    it('should handle text with only whitespace', () => {
      const verdict = scheduler.inspectorVerdict('   ');
      expect(verdict.passed).toBe(true);
    });

    it('should handle JSON with items missing the passed field', () => {
      const evidenceText = '[{"id":1,"reason":"missing passed field"}]';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict).toHaveProperty('passed');
    });

    it('should handle malformed JSON gracefully', () => {
      const evidenceText = '[{broken json...';
      const verdict = scheduler.inspectorVerdict(evidenceText);
      expect(verdict).toHaveProperty('passed');
    });
  });
});
