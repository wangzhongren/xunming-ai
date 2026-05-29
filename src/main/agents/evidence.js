const BaseAgent = require('./baseAgent');
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { executeToolCall, parseToolCalls, buildToolsPrompt } = require('../tools');
const config = require('../config');

class EvidenceAgent extends BaseAgent {
  constructor() {
    super(config.modelName, 0.1);
    this.maxRounds = 50;
  }

  async reviewPlan(criteria, planText) {
    const criteriaList = criteria.map((c, i) => `[${c.id || i + 1}] ${c.rule}`).join('\n');
    const systemPrompt = `你是【检察官】，负责预审内阁执行方案。判断方案是否覆盖所有立法标准。
【立法标准】${criteriaList}
【输出】纯JSON：{"passed":true,"reason":"通过"} 或 {"passed":false,"reason":"第X条未覆盖"}`;

    const response = await this.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`内阁方案：\n${planText}\n\n请审批。`)
    ]);

    const text = response.text || response.content || '';
    try {
      const c = text.replace(/```json|```/g, '').trim();
      const s = c.indexOf('{'), e = c.lastIndexOf('}');
      if (s !== -1 && e !== -1) {
        const p = JSON.parse(c.substring(s, e + 1));
        if (typeof p.passed === 'boolean') return p;
      }
    } catch (_) {}

    return text.includes('通过') && !text.includes('驳回')
      ? { passed: true, reason: text.substring(0, 200) }
      : { passed: false, reason: text.substring(0, 200) };
  }

  async *audit(criteria, executorOutput) {
    const criteriaList = criteria.map((c, i) => `[${c.id || i + 1}] ${c.rule}`).join('\n');
    const systemPrompt = `你是【检察官】，逐条验证产出。一次一个工具。
${buildToolsPrompt()}
立法标准：${criteriaList}

工具验证完成后，必须输出纯 JSON 数组，不要 Markdown：
[
  {"id":1,"passed":true,"reason":"证据说明"},
  {"id":2,"passed":false,"reason":"未满足原因"}
]`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`产出：\n${executorOutput}\n\n请逐条举证。`)
    ];

    let rounds = 0;
    let evidenceText = '';

    while (rounds < this.maxRounds) {
      const response = await this.invoke(messages);
      const responseText = response.text || response.content || '';
      const toolCalls = parseToolCalls(responseText);

      if (toolCalls.length > 0) {
        const tc = toolCalls[0];
        messages.push(new AIMessage({ content: responseText }));
        yield { type: 'tool_start', name: tc.name, args: tc.args };
        let r;
        try { r = await executeToolCall(tc); }
        catch (err) { r = { name: tc.name, result: `失败: ${err.message}` }; }
        yield { type: 'tool_result', name: tc.name, result: r.result };
        const preview = (r.result || '').length > 2000 ? r.result.substring(0, 2000) + '...(截断)' : r.result;
        messages.push(new HumanMessage(`【${tc.name}】: ${preview}\n\n继续下一步。`));
        rounds++;
        continue;
      }

      evidenceText = responseText;
      break;
    }

    yield { type: '_done', evidence: evidenceText || '(未产出检察报告)' };
  }
}

module.exports = { EvidenceAgent };
