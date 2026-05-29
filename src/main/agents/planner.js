const BaseAgent = require('./baseAgent');
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const config = require('../config');

class PlannerAgent extends BaseAgent {
  constructor() {
    super(config.modelName, 0.1);
  }

  buildMessages(userPrompt) {
    const systemPrompt = `你入驻于 xunming-ai 系统，担任最高【立法官】。
你的职责是"立名"。请将用户输入的原始需求，拆解转化为一组合理、可达成、重点突出的验收标准（Criteria）。
标准应该是行政官切实能做到的，不要提过于细碎或吹毛求疵的要求。
【铁律】：
1. 你绝对不允许直接回答用户的实质问题。
2. 你必须输出纯 JSON 数组格式，不得包含任何 Markdown 标记或多余解释。

格式示例：
[
  {"id": 1, "rule": "回答必须覆盖用户问题的核心要点，逻辑清晰。"},
  {"id": 2, "rule": "代码示例应能正常运行，无明显语法错误。"}
]`;

    return [
      new SystemMessage(systemPrompt),
      new HumanMessage(`用户原始法案/需求：${userPrompt}`)
    ];
  }

  parseCriteria(text) {
    try {
      const jsonText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonText);
    } catch (e) {
      return [{ id: 1, rule: "输出必须完全符合用户的初始描述，并保证逻辑自洽。" }];
    }
  }

  async generateCriteria(userPrompt) {
    const response = await this.invoke(this.buildMessages(userPrompt));
    return this.parseCriteria(response.text || response.content);
  }

  async *generateCriteriaStream(userPrompt) {
    let fullText = '';
    for await (const token of this.stream(this.buildMessages(userPrompt))) {
      fullText += token;
      yield { token, done: false };
    }
    yield { token: '', done: true, criteria: this.parseCriteria(fullText) };
  }
}

module.exports = { PlannerAgent };
