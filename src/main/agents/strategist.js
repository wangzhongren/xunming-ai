const BaseAgent = require('./baseAgent');
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const config = require('../config');

class StrategistAgent extends BaseAgent {
  constructor() {
    super(config.modelName, 0.2);
  }

  buildMessages(userPrompt, criteria, feedback = '') {
    const criteriaString = JSON.stringify(criteria, null, 2);
    const fbSection = feedback ? `\n【上次方案被驳回，请修订】\n${feedback}` : '';

    const systemPrompt = `你是【内阁首辅 / 规划师】。
职责是"规划路径"——制定切实可行的执行方案。

【工作要求】
1. 分析需求和立法标准，拆解为具体执行步骤
2. 每步明确：做什么、用什么工具、产出什么
3. 输出纯文本分步计划，格式为 "步骤N: 具体操作描述"

【立法标准】
${criteriaString}`;

    return [
      new SystemMessage(systemPrompt),
      new HumanMessage(`用户需求：${userPrompt}\n\n请制定实现方案，列出具体执行步骤。${fbSection}`)
    ];
  }

  async plan(userPrompt, criteria, feedback = '') {
    const response = await this.invoke(this.buildMessages(userPrompt, criteria, feedback));
    return response.text || response.content || '';
  }

  async *planStream(userPrompt, criteria, feedback = '') {
    let fullText = '';
    for await (const token of this.stream(this.buildMessages(userPrompt, criteria, feedback))) {
      fullText += token;
      yield { token, done: false };
    }
    yield { token: '', done: true, plan: fullText };
  }

  // 审查行政执行产出：通过 or 驳回+理由
  async reviewWork(criteria, executorOutput) {
    const criteriaList = criteria.map((c, i) => `[${c.id || i + 1}] ${c.rule}`).join('\n');

    const systemPrompt = `你是【内阁首辅】，行政官提交了工作产出请求审核。

逐条对照立法标准审查：
- 产出是否满足每条标准
- 实现路径是否合理
- 有无明显缺陷

【立法标准】
${criteriaList}

【输出】纯JSON一行：{"passed":true,"reason":"通过原因"} 或 {"passed":false,"reason":"驳回原因，指出具体问题"}`;

    const response = await this.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`行政官提交产出：\n${executorOutput}\n\n请审查并给出通过或驳回判定。`)
    ]);

    const text = response.text || response.content || '';
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(cleaned.substring(start, end + 1));
        if (typeof parsed.passed === 'boolean') return parsed;
      }
    } catch (e) { /* fallthrough */ }

    return text.includes('通过') && !text.includes('驳回')
      ? { passed: true, reason: text.substring(0, 200) }
      : { passed: false, reason: text.substring(0, 200) };
  }
}

module.exports = { StrategistAgent };
