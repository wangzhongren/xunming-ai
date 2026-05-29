const { PlannerAgent } = require('./agents/planner');
const { StrategistAgent } = require('./agents/strategist');
const { ExecutorAgent } = require('./agents/executor');
const { EvidenceAgent } = require('./agents/evidence');
const { VerifierAgent } = require('./agents/verifier');
const { WORKSPACE } = require('./tools');

class XunMingScheduler {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.planner    = new PlannerAgent();
    this.strategist = new StrategistAgent();
    this.executor   = new ExecutorAgent();
    this.inspector  = new EvidenceAgent();
    this.verifier   = new VerifierAgent();
  }

  log(stage, msg, detail) {
    this.mainWindow.webContents.send('xunming-log', { timestamp: new Date().toLocaleTimeString(), stage, message: msg, detail });
  }

  token(phase, field, t) {
    this.mainWindow.webContents.send('xunming-stream-token', { phase, field, token: t });
  }

  toolEvent(evt, chunk, phase) {
    this.mainWindow.webContents.send('xunming-tool-event', { event: evt, name: chunk.name, args: chunk.args || chunk.result, phase, timestamp: new Date().toLocaleTimeString() });
  }

  // ---- 行政执行（含内阁审查中转） ----
  async runExecutor(userPrompt, criteria, plan, feedback) {
    let output = '';
    for await (const c of this.executor.executeStream(userPrompt, criteria, plan, feedback)) {
      if (c.type === 'token') { output += c.token; this.token('executor', 'result', c.token); }
      else if (c.type === 'status') this.token('executor', 'status', c.message);
      else if (c.type === 'tool_start') this.toolEvent('tool_start', c, 'executor');
      else if (c.type === 'tool_result') this.toolEvent('tool_result', c, 'executor');
      else if (c.type === 'done') output = c.fullText || output;
    }
    return output;
  }

  // ---- 检察验证 ----
  async runInspector(criteria, output) {
    let evidenceText = '';
    for await (const c of this.inspector.audit(criteria, output)) {
      if (c.type === 'tool_start') this.toolEvent('tool_start', c, 'inspector');
      else if (c.type === 'tool_result') this.toolEvent('tool_result', c, 'inspector');
      else if (c.type === '_done') evidenceText = c.evidence || '';
    }
    return evidenceText;
  }

  // 驳回时内阁研判：是方案问题还是执行问题
  async cabinetReject(reason, plan, output) {
    const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
    const r = await this.strategist.invoke([
      new SystemMessage(`你是内阁。驳回原因：${reason}\n判断是方案缺陷还是执行不到位，给行政一句修改指令。`),
      new HumanMessage(`方案：${plan}\n产出：${output}`)
    ]);
    const fb = r.text || r.content || reason;
    this.log('STRATEGY', '内阁研判驳回。', fb);
    return `[内阁] ${fb}`;
  }

  // 判断检察结果
  inspectorVerdict(evidenceText) {
    const t = evidenceText || '';
    try {
      const cleaned = t.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        const items = JSON.parse(cleaned.substring(start, end + 1));
        if (Array.isArray(items) && items.length > 0) {
          const failed = items.filter(item => item && item.passed === false);
          if (failed.length > 0) {
            return { passed: false, reason: JSON.stringify(failed).substring(0, 300) };
          }
          if (items.every(item => item && item.passed === true)) {
            return { passed: true, reason: JSON.stringify(items).substring(0, 200) };
          }
        }
      }
    } catch (e) {
      // Fall through to loose text checks for non-JSON reports.
    }
    // Count pass/fail indicators
    const passes = (t.match(/✅/g) || []).length;
    const fails = (t.match(/❌/g) || []).length;
    if (fails > 0) return { passed: false, reason: t.substring(0, 300) };
    if (passes > 0) return { passed: true, reason: t.substring(0, 200) };
    // No clear indicators: check keywords
    if (t.includes('未满足') || t.includes('问题') || t.includes('错误')) return { passed: false, reason: t.substring(0, 300) };
    return { passed: true, reason: t.substring(0, 200) };
  }

  async processQuery(userPrompt) {
    this.mainWindow.webContents.send('xunming-stream-begin', { workspace: WORKSPACE });

    // ══════ 1. 立法 ══════
    this.log('PLAN', '【立法】制定法度标准...');
    let criteria;
    try {
      for await (const c of this.planner.generateCriteriaStream(userPrompt)) {
        if (!c.done) this.token('planner', 'criteria', c.token);
        else criteria = c.criteria;
      }
      this.log('PLAN', '法度标尺已铸造。', criteria);
    } catch (e) {
      this.log('FAIL', '立法崩溃：' + e.message);
      return this.mainWindow.webContents.send('xunming-task-complete', { success: false, error: '立法崩溃' });
    }

    // ══════ 2. 内阁出方案 ══════
    this.log('STRATEGY', '【内阁】制定执行方案...');
    let plan;
    try {
      for await (const c of this.strategist.planStream(userPrompt, criteria)) {
        if (!c.done) this.token('strategist', 'plan', c.token);
        else plan = c.plan;
      }
    } catch (e) {
      this.log('FAIL', '内阁崩溃：' + e.message);
      return this.mainWindow.webContents.send('xunming-task-complete', { success: false, error: '内阁崩溃' });
    }
    this.log('STRATEGY', '方案已制定，移交行政。', plan);

    // ══════ 3-5. 行政 → 检察 → 司法 ══════
    let output = '', done = false, feedback = '';

    let maxRetries = 5;
    while (!done) {
      // --- 3. 行政执行 ---
      this.log('EXECUTE', '【行政】执行...');
      output = await this.runExecutor(userPrompt, criteria, plan, feedback);
      this.log('EXECUTE', '行政产出完毕。', output);

      // --- 4. 检察验证 ---
      this.log('INSPECTOR', '【检察】逐条验证...');
      const evidenceText = await this.runInspector(criteria, output);
      const inspV = this.inspectorVerdict(evidenceText);

      if (!inspV.passed) {
        this.log('INSPECTOR', '检察驳回。', evidenceText);
        feedback = await this.cabinetReject(`检察驳回：${inspV.reason}`, plan, output);
        this.log('ROLLBACK', feedback);
        maxRetries--;
        if (maxRetries <= 0) {
          this.log('FAIL', '超过最大重试次数，以当前产出提交。');
          done = true;
        }
        continue;
      }
      this.log('INSPECTOR', '检察通过，移送司法。', evidenceText);

      // --- 5. 司法裁决 ---
      this.log('VERIFY', '【司法】最终裁决...');
      try {
        let verdict = null;
        for await (const c of this.verifier.verifyStream(criteria, output)) {
          this.token('verifier', 'verdict', c.token);
          if (c.done) verdict = c.verdict;
        }

        if (verdict.passed) {
          done = true;
          this.log('SUCCESS', '名实相符，通过。', verdict.reason);
        } else {
          feedback = await this.cabinetReject(`司法驳回：${verdict.reason}`, plan, output);
          this.log('ROLLBACK', feedback);
          maxRetries--;
          if (maxRetries <= 0) {
            this.log('FAIL', '超过最大重试次数，以当前产出提交。');
            done = true;
          }
        }
      } catch (e) {
        feedback = `司法异常：${e.message}`;
        maxRetries--;
        if (maxRetries <= 0) {
          this.log('FAIL', '超过最大重试次数，以当前产出提交。');
          done = true;
        }
      }
    }

    this.mainWindow.webContents.send('xunming-task-complete', { success: true, result: output });
  }
}

module.exports = { XunMingScheduler };
