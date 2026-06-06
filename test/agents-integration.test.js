/**
 * Agent 集成测试 — 真实 API 调用 + 完整审计轨迹
 *
 * 每个测试 case 生成独立的 audit-*.json 文件，
 * 记录每个 Agent 的输入、输出、耗时、工具调用。
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { AuditTrail } from './audit-trail.js';

const require = createRequire(import.meta.url);
const { PlannerAgent } = require('../src/main/agents/planner');
const { StrategistAgent } = require('../src/main/agents/strategist');
const { VerifierAgent } = require('../src/main/agents/verifier');
const { EvidenceAgent } = require('../src/main/agents/evidence');
const { ExecutorAgent } = require('../src/main/agents/executor');

const API_TIMEOUT = 45000;

describe('PlannerAgent - 立法官', () => {
  const planner = new PlannerAgent();
  const prompt = '写一个计算斐波那契数列的Python函数，要求处理边界条件';

  it('立法官：generateCriteria() — 需求 → 验收标准', async () => {
    const audit = new AuditTrail('立法官-生成验收标准');

    const criteria = await audit.recordInvoke(
      '立法官制定法度',
      'PlannerAgent',
      { prompt },
      () => planner.generateCriteria(prompt)
    );

    audit.setMeta('userPrompt', prompt);
    audit.setMeta('agent', 'PlannerAgent (立法官)');
    audit.save();

    // 断言
    expect(Array.isArray(criteria.output)).toBe(true);
    expect(criteria.output.length).toBeGreaterThan(0);
    for (const item of criteria.output) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('rule');
      expect(typeof item.rule).toBe('string');
      expect(item.rule.length).toBeGreaterThan(0);
    }
    console.log(`立法官产出 ${criteria.output.length} 条验收标准，耗时 ${criteria.durationMs}ms`);
    console.log('验收标准:', JSON.stringify(criteria.output, null, 2));
  }, API_TIMEOUT);

  it('立法官：generateCriteriaStream() — 流式输出审计', async () => {
    const audit = new AuditTrail('立法官-流式验收标准');
    const prompt2 = '解释JavaScript闭包的概念';

    const record = await audit.recordStream(
      '立法官流式制定法度',
      'PlannerAgent',
      { prompt: prompt2 },
      () => planner.generateCriteriaStream(prompt2)
    );

    audit.setMeta('userPrompt', prompt2);
    audit.setMeta('totalTokens', record.tokens.length);
    audit.setMeta('fullTextLength', record.fullText.length);
    audit.save();

    expect(record.tokens.length).toBeGreaterThan(0);
    expect(Array.isArray(record.finalOutput)).toBe(true);
    console.log(`流式输出 ${record.tokens.length} 个 token，耗时 ${record.durationMs}ms`);
  }, API_TIMEOUT);
});

describe('StrategistAgent - 内阁首辅', () => {
  const strategist = new StrategistAgent();
  const criteria = [
    { id: 1, rule: '回答必须直接且简洁' },
    { id: 2, rule: '必须包含一个代码示例' },
  ];
  const userPrompt = '写一个快速排序';

  it('内阁：plan() — 立法标准 → 执行方案', async () => {
    const audit = new AuditTrail('内阁-制定方案');

    const plan = await audit.recordInvoke(
      '内阁制定执行方案',
      'StrategistAgent',
      { userPrompt, criteria },
      () => strategist.plan(userPrompt, criteria)
    );

    audit.setMeta('userPrompt', userPrompt);
    audit.setMeta('criteria', criteria);
    audit.save();

    expect(plan.output).toBeTruthy();
    expect(typeof plan.output).toBe('string');
    expect(plan.output.length).toBeGreaterThan(20);
    console.log(`内阁方案 (${plan.output.length} 字，${plan.durationMs}ms):`);
    console.log(plan.output);
  }, API_TIMEOUT);

  it('内阁：reviewWork() — 审查行政产出', async () => {
    const audit = new AuditTrail('内阁-审查产出');

    const goodOutput =
      '快速排序的Python实现：\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[0]\n    left = [x for x in arr[1:] if x <= pivot]\n    right = [x for x in arr[1:] if x > pivot]\n    return quicksort(left) + [pivot] + quicksort(right)\n```';

    const verdict = await audit.recordInvoke(
      '内阁审查行政产出',
      'StrategistAgent.reviewWork',
      { criteria, executorOutput: goodOutput.substring(0, 300) + '...' },
      () => strategist.reviewWork(criteria, goodOutput)
    );

    audit.setMeta('criteria', criteria);
    audit.setMeta('executorOutputLength', goodOutput.length);
    audit.save();

    expect(verdict.output).toHaveProperty('passed');
    expect(typeof verdict.output.passed).toBe('boolean');
    expect(verdict.output).toHaveProperty('reason');
    console.log(`内阁审查结论: passed=${verdict.output.passed}, reason=${verdict.output.reason}`);
  }, API_TIMEOUT);
});

describe('ExecutorAgent - 行政官', () => {
  const executor = new ExecutorAgent();
  const criteria = [{ id: 1, rule: '直接回答问题，不使用任何工具' }];

  it('行政：executeStream() — 方案 → 产出', async () => {
    const audit = new AuditTrail('行政-执行任务');
    const task = '1+1等于几？直接回答。';

    const record = await audit.recordStream(
      '行政官执行任务',
      'ExecutorAgent',
      { task, criteria, plan: '步骤1: 直接回答' },
      () => executor.executeStream(task, criteria, '步骤1: 直接回答')
    );

    audit.setMeta('task', task);
    audit.setMeta('totalTokens', record.tokens.length);
    audit.setMeta('toolCalls', record.toolsCalled?.length || 0);
    audit.save();

    // Should complete with output
    expect(record.fullText).toBeTruthy();
    expect(record.fullText.length).toBeGreaterThan(0);
    console.log(`行政产出 (${record.tokens.length} tokens, ${record.durationMs}ms):`);
    console.log(record.fullText);
  }, API_TIMEOUT);
});

describe('EvidenceAgent - 检察官', () => {
  const inspector = new EvidenceAgent();
  const criteria = [
    { id: 1, rule: '代码必须能运行' },
    { id: 2, rule: '必须处理空输入' },
  ];

  it('检察：reviewPlan() — 预审方案覆盖度', async () => {
    const audit = new AuditTrail('检察-预审方案');
    const goodPlan = '步骤1: 分析需求→步骤2: 定义函数签名含类型注解→步骤3: 处理空输入返回[]→步骤4: 实现核心算法→步骤5: 编写测试';

    const verdict = await audit.recordInvoke(
      '检察官预审方案',
      'EvidenceAgent.reviewPlan',
      { criteria, plan: goodPlan },
      () => inspector.reviewPlan(criteria, goodPlan)
    );

    audit.setMeta('criteria', criteria);
    audit.save();

    expect(verdict.output).toHaveProperty('passed');
    expect(typeof verdict.output.passed).toBe('boolean');
    console.log(`检察预审: passed=${verdict.output.passed}, reason=${verdict.output.reason}`);
  }, API_TIMEOUT);
});

describe('VerifierAgent - 司法官', () => {
  const verifier = new VerifierAgent();
  const criteria = [
    { id: 1, rule: '输出必须包含完整可运行的代码' },
    { id: 2, rule: '代码必须有适当的注释' },
  ];
  const goodOutput =
    '# 计算阶乘\n# 输入: 正整数 n\n# 输出: n!\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(5))  # 120';

  it('司法：verify() — 名实相审', async () => {
    const audit = new AuditTrail('司法-最终裁决');

    const verdict = await audit.recordInvoke(
      '司法官审合刑名',
      'VerifierAgent',
      { criteria, output: goodOutput },
      () => verifier.verify(criteria, goodOutput)
    );

    audit.setMeta('criteria', criteria);
    audit.setMeta('executorOutput', goodOutput);
    audit.save();

    expect(verdict.output).toHaveProperty('passed');
    expect(typeof verdict.output.passed).toBe('boolean');
    expect(verdict.output).toHaveProperty('reason');
    expect(verdict.output.reason.length).toBeGreaterThan(0);
    console.log(`司法裁决: passed=${verdict.output.passed}`);
    console.log(`理由: ${verdict.output.reason}`);
  }, API_TIMEOUT);

  it('司法：verifyStream() — 流式判决', async () => {
    const audit = new AuditTrail('司法-流式判决');
    const badOutput = 'function add(a,b){return a+b}';

    const record = await audit.recordStream(
      '司法官流式判决',
      'VerifierAgent',
      { criteria, output: badOutput },
      () => verifier.verifyStream(criteria, badOutput)
    );

    audit.setMeta('criteria', criteria);
    audit.setMeta('executorOutput', badOutput);
    audit.save();

    expect(record.tokens.length).toBeGreaterThan(0);
    expect(record.finalOutput).toHaveProperty('passed');
    console.log(`司法流式判决: passed=${record.finalOutput.passed}, 耗时 ${record.durationMs}ms`);
    console.log(`完整判决: ${record.fullText}`);
  }, API_TIMEOUT);
});
