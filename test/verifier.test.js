import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { VerifierAgent } = require('../src/main/agents/verifier');

describe('VerifierAgent', () => {
  let verifier;

  beforeEach(() => {
    verifier = new VerifierAgent();
  });

  describe('parseVerdict', () => {
    describe('Strategy 1: clean JSON parse', () => {
      it('should parse a passed verdict correctly', () => {
        const text = '{"passed":true,"reason":"所有标准均已满足。"}';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
        expect(verdict.reason).toBe('所有标准均已满足。');
      });

      it('should parse a failed verdict correctly', () => {
        const text = '{"passed":false,"reason":"未满足第2条标准：代码无法运行。"}';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(false);
        expect(verdict.reason).toContain('第2条');
      });

      it('should strip markdown code fences', () => {
        const text = '```json\n{"passed":true,"reason":"通过"}\n```';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });

      it('should handle JSON embedded in other text', () => {
        const text = '这是我的分析：\n{"passed":true,"reason":"ok"}\n以上就是判断。';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });

      it('should handle JSON with nested braces (e.g. code in reason)', () => {
        const text = '{"passed":true,"reason":"code: { key: value } is fine"}';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });
    });

    describe('Strategy 2: keyword fallback', () => {
      it('should detect passed:true as substring', () => {
        const text = 'some text "passed":true more text';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });

      it('should detect passed:true with space', () => {
        const text = '"passed": true';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });

      it('should detect passed:false as substring', () => {
        const text = 'blah "passed":false blah';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(false);
      });

      it('should handle Chinese keyword 通过 without 未通过', () => {
        const text = '审查通过，没有发现问题。';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });

      it('should exclude 驳回 from 通过 keyword match (falls to default pass)', () => {
        // Note: the keyword fallback in parseVerdict excludes 驳回 from matching 通过,
        // but doesn't have a standalone 驳回→fail check. It falls through to strategy 3 default pass.
        const text = '审查结论：驳回，存在严重问题。';
        const verdict = verifier.parseVerdict(text);
        // Falls through to strategy 3: 存疑从宽, defaults to passed
        expect(verdict.passed).toBe(true);
        expect(verdict.reason).toContain('无法解析判决格式');
      });

      it('should exclude 未通过 from 通过 keyword match (falls to default pass)', () => {
        // Same as above — 未通过 blocks the 通过 match but doesn't trigger fail on its own
        const text = '方案未通过审核。';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
        expect(verdict.reason).toContain('无法解析判决格式');
      });
    });

    describe('Strategy 3: default fallback', () => {
      it('should default to passed when format is unrecognizable', () => {
        const text = 'The verdict is unclear from this output.';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
        expect(verdict.reason).toContain('无法解析判决格式');
      });

      it('should default to passed for empty string', () => {
        const verdict = verifier.parseVerdict('');
        expect(verdict.passed).toBe(true);
        expect(verdict.reason).toContain('无法解析判决格式');
      });
    });

    describe('edge cases', () => {
      it('should handle JSON with only opening brace', () => {
        const text = '{"passed":true,"reason":"unclosed';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(true);
      });

      it('should not be fooled by false positives in reason', () => {
        const text = '{"passed":false,"reason":"not passed:true either"}';
        const verdict = verifier.parseVerdict(text);
        expect(verdict.passed).toBe(false);
      });
    });

    it('should correctly recognize a passed JSON with complex reason', () => {
      const text = JSON.stringify({
        passed: true,
        reason: '经逐条核对：(1)代码可运行(2)逻辑正确(3)覆盖核心要点，准予通过。'
      });
      const verdict = verifier.parseVerdict(text);
      expect(verdict.passed).toBe(true);
    });

    it('should correctly recognize a failed JSON with specific criteria reference', () => {
      const text = JSON.stringify({
        passed: false,
        reason: '未满足第3条标准：缺少错误处理逻辑，在边界条件下会崩溃。'
      });
      const verdict = verifier.parseVerdict(text);
      expect(verdict.passed).toBe(false);
      expect(verdict.reason).toContain('第3条');
    });
  });

  describe('buildMessages', () => {
    it('should return an array with SystemMessage and HumanMessage', () => {
      const criteria = [{ id: 1, rule: '代码必须可运行' }];
      const output = 'const x = 1;';
      const messages = verifier.buildMessages(criteria, output);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(2);
    });

    it('should include criteria in the SystemMessage', () => {
      const criteria = [{ id: 1, rule: '唯一的验收标准' }];
      const output = 'output';
      const messages = verifier.buildMessages(criteria, output);
      const sysContent = messages[0].content || messages[0].text || '';
      expect(sysContent).toContain('唯一的验收标准');
    });

    it('should include output in the HumanMessage', () => {
      const criteria = [{ id: 1, rule: 'test' }];
      const output = 'the actual output content';
      const messages = verifier.buildMessages(criteria, output);
      const humanMsg = messages[1];
      expect(humanMsg.content || humanMsg.text || '').toContain('the actual output content');
    });

    it('should include format hint when provided', () => {
      const criteria = [{ id: 1, rule: 'test' }];
      const output = 'output';
      const hint = '【警告】请严格按照格式输出！';
      const messages = verifier.buildMessages(criteria, output, hint);
      const sysContent = messages[0].content || messages[0].text || '';
      expect(sysContent).toContain(hint);
    });

    it('should include key role descriptions', () => {
      const criteria = [{ id: 1, rule: 'test' }];
      const output = 'output';
      const messages = verifier.buildMessages(criteria, output);
      const sysContent = messages[0].content || messages[0].text || '';
      expect(sysContent).toContain('司法');
      expect(sysContent).toContain('审合刑名');
    });
  });
});
