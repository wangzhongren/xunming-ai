/**
 * 审计追踪系统 — 捕获每个 Agent 的完整 I/O 轨迹
 *
 * 每次测试运行生成结构化的审计报告，包含：
 *   - 每个 Agent 的输入/输出完整内容
 *   - 流式 token 的完整收集
 *   - 工具调用及结果
 *   - 执行耗时
 *   - 判决理由
 */

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('test-reports');

export class AuditTrail {
  constructor(caseName) {
    this.caseName = caseName;
    this.startedAt = new Date().toISOString();
    this.records = [];
    this.meta = {};
  }

  /**
   * 记录一个 Agent 的非流式调用
   */
  async recordInvoke(label, agentName, input, invokeFn) {
    const startedAt = Date.now();
    const record = {
      label,
      agent: agentName,
      mode: 'invoke',
      input: this._summarizeInput(input),
      startedAt: new Date().toISOString(),
    };

    try {
      const output = await invokeFn();
      record.durationMs = Date.now() - startedAt;
      record.output = this._extractOutput(output);
      record.success = true;
    } catch (err) {
      record.durationMs = Date.now() - startedAt;
      record.error = err.message;
      record.success = false;
    }

    this.records.push(record);
    return record;
  }

  /**
   * 记录一个 Agent 的流式调用
   */
  async recordStream(label, agentName, input, streamFn) {
    const startedAt = Date.now();
    const record = {
      label,
      agent: agentName,
      mode: 'stream',
      input: this._summarizeInput(input),
      startedAt: new Date().toISOString(),
      tokens: [],
      finalOutput: null,
    };

    try {
      for await (const chunk of streamFn()) {
        if (chunk.done) {
          record.finalOutput = chunk.criteria || chunk.plan || chunk.verdict || chunk.fullText || chunk.evidence || chunk;
        } else if (chunk.token) {
          record.tokens.push(chunk.token);
        }
        // Also capture other chunk types (tool_start, tool_result, status)
        if (chunk.type === 'tool_start') {
          record.toolsCalled = record.toolsCalled || [];
          record.toolsCalled.push({ name: chunk.name, args: chunk.args, at: new Date().toISOString() });
        }
        if (chunk.type === 'tool_result') {
          const last = record.toolsCalled?.[record.toolsCalled.length - 1];
          if (last) last.result = chunk.result?.substring?.(0, 2000) ?? chunk.result;
        }
        if (chunk.type === 'status') {
          record.statusMessages = record.statusMessages || [];
          record.statusMessages.push(chunk.message);
        }
      }
      record.durationMs = Date.now() - startedAt;
      record.fullText = record.tokens.join('');
      record.success = true;
    } catch (err) {
      record.durationMs = Date.now() - startedAt;
      record.error = err.message;
      record.success = false;
    }

    this.records.push(record);
    return record;
  }

  /**
   * 添加元数据
   */
  setMeta(key, value) {
    this.meta[key] = value;
  }

  /**
   * 添加一条纯日志记录（非 Agent 调用）
   */
  log(stage, message, detail) {
    this.records.push({
      label: stage,
      type: 'log',
      message,
      detail: detail?.substring?.(0, 2000) ?? detail,
      at: new Date().toISOString(),
    });
  }

  /**
   * 将审计轨迹写入文件
   */
  save() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const dir = path.join(AUDIT_DIR, timestamp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const report = {
      case: this.caseName,
      startedAt: this.startedAt,
      completedAt: new Date().toISOString(),
      totalDurationMs: new Date() - new Date(this.startedAt),
      meta: this.meta,
      records: this.records,
    };

    const filename = path.join(dir, `audit-${this.caseName.replace(/[<>:"/\\|?*\s]+/g, '-')}.json`);
    fs.writeFileSync(filename, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n[审计] 轨迹已保存: ${filename}`);
    return { filename, report };
  }

  // ── private helpers ──

  _summarizeInput(input) {
    if (typeof input === 'string') return input.substring(0, 5000);
    if (Array.isArray(input)) {
      return input.map(m => ({
        role: m._getType?.() ?? m.constructor?.name ?? 'message',
        content: (m.content || m.text || '').substring(0, 2000),
      }));
    }
    if (input && typeof input === 'object') {
      return JSON.parse(JSON.stringify(input, (k, v) =>
        typeof v === 'string' ? v.substring(0, 3000) : v
      ));
    }
    return String(input).substring(0, 1000);
  }

  _extractOutput(output) {
    if (!output) return null;
    if (typeof output === 'string') return output.substring(0, 10000);
    if (output.text || output.content) return (output.text || output.content).substring(0, 10000);
    if (typeof output === 'object') {
      return JSON.parse(JSON.stringify(output, (k, v) =>
        typeof v === 'string' ? v.substring(0, 3000) : v
      ));
    }
    return String(output).substring(0, 5000);
  }
}
