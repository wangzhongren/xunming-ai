/**
 * XunMingScheduler 端到端测试 — 完整流水线 + 审计轨迹
 *
 * 捕获: 立法→内阁→行政→检察→司法 全部 5 阶段的输入输出
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { AuditTrail } from './audit-trail.js';

const require = createRequire(import.meta.url);
const { XunMingScheduler } = require('../src/main/xunming-core');

const API_TIMEOUT = 120000;

describe('XunMingScheduler — 完整五阶段流水线审计', () => {
  /**
   * 创建一个拦截所有 IPC 事件的 mockWindow，
   * 同时把所有事件写入 AuditTrail
   */
  function createAuditWindow(audit) {
    const events = {
      logs: [],
      tokens: [],
      toolEvents: [],
      streamBegins: [],
      taskCompletes: [],
    };

    // 将 token 按 phase 聚合，避免审计文件过大
    const tokenBuffers = {};

    const mockWindow = {
      webContents: {
        send(channel, data) {
          switch (channel) {
            case 'xunming-log':
              events.logs.push(data);
              audit.log(data.stage, data.message, data.detail);
              break;

            case 'xunming-stream-token':
              events.tokens.push(data);
              // 按 phase 聚合 token 减少审计文件大小
              if (!tokenBuffers[data.phase]) {
                tokenBuffers[data.phase] = { phase: data.phase, field: data.field, tokens: '' };
              }
              tokenBuffers[data.phase].tokens += data.token;
              break;

            case 'xunming-tool-event':
              events.toolEvents.push(data);
              audit.log(`tool:${data.event}`, data.name, JSON.stringify(data.args).substring(0, 2000));
              break;

            case 'xunming-stream-begin':
              events.streamBegins.push(data);
              break;

            case 'xunming-task-complete':
              events.taskCompletes.push(data);
              break;
          }
        },
      },
    };

    return { mockWindow, events, tokenBuffers };
  }

  it('完整流水线：立法→内阁→行政→检察→司法', async () => {
    const audit = new AuditTrail('完整流水线-五阶段');
    const { mockWindow, events, tokenBuffers } = createAuditWindow(audit);
    const scheduler = new XunMingScheduler(mockWindow);
    const userPrompt = '1+1等于几？直接回答。';

    audit.setMeta('userPrompt', userPrompt);
    const pipelineStart = Date.now();

    await scheduler.processQuery(userPrompt);

    const pipelineDuration = Date.now() - pipelineStart;
    audit.setMeta('pipelineDurationMs', pipelineDuration);

    // ── 收集审计数据 ──
    const stages = events.logs.map(l => ({ stage: l.stage, message: l.message, timestamp: l.timestamp }));
    const stageOrder = stages.map(s => s.stage);

    audit.setMeta('stageOrder', stageOrder);
    audit.setMeta('stageCount', stages.length);

    // 各阶段产出
    const planLog = events.logs.find(l => l.stage === 'PLAN' && l.detail);
    const strategyLog = events.logs.find(l => l.stage === 'STRATEGY' && l.detail);
    const executeLog = events.logs.find(l => l.stage === 'EXECUTE' && l.detail);
    const inspectorLog = events.logs.filter(l => l.stage === 'INSPECTOR');
    const verifyLog = events.logs.filter(l => l.stage === 'VERIFY');
    const successLog = events.logs.find(l => l.stage === 'SUCCESS');
    const failLog = events.logs.find(l => l.stage === 'FAIL');

    // 聚合 token
    for (const phase of ['planner', 'strategist', 'executor', 'verifier']) {
      if (tokenBuffers[phase]) {
        audit.setMeta(`${phase}Tokens`, tokenBuffers[phase].tokens.length);
        audit.setMeta(`${phase}FullText`, tokenBuffers[phase].tokens);
      }
    }

    // 完整阶段日志
    audit.setMeta('stages', stages);

    // 最终结果
    const result = events.taskCompletes[0];
    audit.setMeta('taskResult', {
      success: result?.success,
      resultPreview: (result?.result || '').substring(0, 3000),
      resultLength: (result?.result || '').length,
    });

    audit.save();

    // ── 断言 ──
    console.log('═══════════════════════════════════════');
    console.log('  完整流水线审计报告');
    console.log('═══════════════════════════════════════');
    console.log(`用户输入: ${userPrompt}`);
    console.log(`总耗时: ${pipelineDuration}ms`);
    console.log('');

    // 1. 五阶段都执行了
    console.log('阶段执行顺序:');
    for (const s of stages) {
      console.log(`  [${s.timestamp}] ${s.stage}: ${s.message}`);
    }

    expect(stageOrder).toContain('PLAN');
    expect(stageOrder).toContain('STRATEGY');
    expect(stageOrder).toContain('EXECUTE');
    expect(stageOrder).toContain('INSPECTOR');
    expect(stageOrder).toContain('VERIFY');

    // 2. 各阶段有实际产出
    if (planLog) console.log(`\n立法标准:\n${planLog.detail}`);
    if (strategyLog) console.log(`\n内阁方案:\n${strategyLog.detail}`);
    if (executeLog) console.log(`\n行政产出:\n${executeLog.detail}`);
    for (const il of inspectorLog) console.log(`\n检察: ${il.message} | ${(il.detail || '').substring(0, 300)}`);
    for (const vl of verifyLog) console.log(`\n司法: ${vl.message} | ${(vl.detail || '').substring(0, 300)}`);
    if (successLog) console.log(`\n✅ 最终: ${successLog.message} | ${successLog.detail}`);
    if (failLog) console.log(`\n❌ 最终: ${failLog.message} | ${failLog.detail}`);

    // 3. 最终结果
    expect(events.taskCompletes.length).toBe(1);
    expect(result.success).toBe(true);
    expect(result.result).toBeTruthy();

    console.log('\n各阶段 token 统计:');
    for (const phase of ['planner', 'strategist', 'executor', 'verifier']) {
      if (tokenBuffers[phase]) {
        console.log(`  ${phase}: ${tokenBuffers[phase].tokens.length} tokens`);
      }
    }
    console.log(`\n审计文件已保存到 test-reports/ 目录`);
  }, API_TIMEOUT);

  it('复杂查询流水线：解释机器学习', async () => {
    const audit = new AuditTrail('完整流水线-解释机器学习');
    const { mockWindow, events, tokenBuffers } = createAuditWindow(audit);
    const scheduler = new XunMingScheduler(mockWindow);
    const userPrompt = '用中文简单解释什么是机器学习，并举一个生活中的例子。';

    audit.setMeta('userPrompt', userPrompt);
    const pipelineStart = Date.now();

    await scheduler.processQuery(userPrompt);

    const pipelineDuration = Date.now() - pipelineStart;
    audit.setMeta('pipelineDurationMs', pipelineDuration);

    const stages = events.logs.map(l => ({ stage: l.stage, message: l.message, timestamp: l.timestamp }));
    audit.setMeta('stageOrder', stages.map(s => s.stage));
    audit.setMeta('stages', stages);

    for (const phase of ['planner', 'strategist', 'executor', 'verifier']) {
      if (tokenBuffers[phase]) {
        audit.setMeta(`${phase}Tokens`, tokenBuffers[phase].tokens.length);
        audit.setMeta(`${phase}FullText`, tokenBuffers[phase].tokens);
      }
    }

    const result = events.taskCompletes[0];
    audit.setMeta('taskResult', {
      success: result?.success,
      resultPreview: (result?.result || '').substring(0, 3000),
      resultLength: (result?.result || '').length,
    });

    audit.save();

    // 断言
    console.log('\n═══════════════════════════════════════');
    console.log('  复杂查询审计报告');
    console.log('═══════════════════════════════════════');
    console.log(`用户输入: ${userPrompt}`);
    console.log(`总耗时: ${pipelineDuration}ms`);

    for (const s of stages) {
      console.log(`  [${s.timestamp}] ${s.stage}: ${s.message}`);
    }

    expect(events.taskCompletes.length).toBe(1);
    expect(result.success).toBe(true);
    expect(result.result).toBeTruthy();
    expect(result.result.length).toBeGreaterThan(20);

    const stageOrder = stages.map(s => s.stage);
    expect(stageOrder).toContain('PLAN');
    expect(stageOrder).toContain('EXECUTE');
    expect(stageOrder).toContain('INSPECTOR');
    expect(stageOrder).toContain('VERIFY');

    console.log(`\n最终产出 ${result.result.length} 字`);
    console.log(result.result.substring(0, 500));
  }, API_TIMEOUT);
});
