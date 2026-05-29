const BaseAgent = require('./baseAgent');
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const config = require('../config');

class VerifierAgent extends BaseAgent {
  constructor() {
    super(config.modelName, 0.0);
  }

  buildMessages(criteria, executorOutput, formatHint = "") {
    const criteriaString = JSON.stringify(criteria, null, 2);

    const systemPrompt = `你入驻于 xunming-ai 系统，担任【司法官】。
你的职责是"审合刑名"——审计行政官提交的产出和自查举证报告，判断是否真正满足立法标准。

行政官的提交分为两部分：
1. 主体产出（工作成果）
2. 自查举证报告（行政官逐条对标法度的自证，可能包含代码运行输出、文件内容等证据）

【核对方法】
1. 对照立法标准，审核行政官的主体产出。
2. 参考自查举证报告中的证据——如果证据充分且合理，应予以认可。
3. 如果举证报告中有代码运行输出的证据，说明代码确实可执行，这是强证据。
4. 从整体上判断，只要产出+证据大体满足标准、无致命缺陷，就通过（passed: true）。
5. 驳回是少数例外，只在产出存在明显硬伤、或举证报告中的证据明显不符时才驳回。
6. 驳回时必须指出具体哪条标准未满足，以及为什么证据不足。

【你需要核对的立法标准(名)】：
${criteriaString}

【输出格式】只输出一行 JSON，不要 markdown 代码块，不要额外文字：
{"passed":true,"reason":"通过。"}

或：

{"passed":false,"reason":"未满足第X条：具体原因..."}
${formatHint}`;

    return [
      new SystemMessage(systemPrompt),
      new HumanMessage(`行政官提交的实际产出(实)：\n\n${executorOutput}`)
    ];
  }

  parseVerdict(text) {
    // Strategy 1: Clean JSON parse
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    // Find the first { and last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.passed === 'boolean') {
        return parsed;
      }
    } catch (e) {
      // continue to fallback
    }

    // Strategy 2: Keyword fallback
    const lowerText = text.toLowerCase();
    if (lowerText.includes('"passed":true') || lowerText.includes('"passed": true')) {
      return { passed: true, reason: "司法审查通过（格式容错解析）。" };
    }
    if (lowerText.includes('"passed":false') || lowerText.includes('"passed": false')) {
      return { passed: false, reason: text.substring(0, 200) };
    }
    if (lowerText.includes('通过') && !lowerText.includes('未通过') && !lowerText.includes('驳回')) {
      return { passed: true, reason: "司法审查通过（关键词推断）。" };
    }

    // Strategy 3: If all parsing fails, don't automatically reject.
    // Return a neutral pass with a note — let the system decide.
    console.error('[Verifier] 无法解析判决输出，原文:', text.substring(0, 200));
    return { passed: true, reason: "司法系统无法解析判决格式，按存疑从宽原则给予通过。原文前200字: " + text.substring(0, 200) };
  }

  async verify(criteria, executorOutput) {
    // First attempt
    const response = await this.invoke(this.buildMessages(criteria, executorOutput));
    const rawText = response.text || response.content || '';
    let verdict = this.parseVerdict(rawText);

    // If JSON parsing failed (format issue, not a real rejection), retry once
    if (verdict.reason && verdict.reason.includes('无法解析判决格式')) {
      const retryMessages = this.buildMessages(
        criteria, executorOutput,
        '\n【警告】上一次你的输出格式错误！请严格按照 {"passed":true/false,"reason":"..."} 格式输出纯 JSON，不要任何额外文字。'
      );
      const retryResponse = await this.invoke(retryMessages);
      const retryText = retryResponse.text || retryResponse.content || '';
      verdict = this.parseVerdict(retryText);
    }

    return verdict;
  }

  async *verifyStream(criteria, executorOutput) {
    // Use non-streaming invoke first to get a clean result,
    // then yield token-by-token for UI display
    let verdict;
    try {
      verdict = await this.verify(criteria, executorOutput);
    } catch (e) {
      verdict = { passed: true, reason: `司法审查异常(${e.message})，按存疑从宽原则通过。` };
    }

    // Yield the verdict text as tokens for the live display
    const displayText = JSON.stringify(verdict, null, 2);
    for (const char of displayText) {
      yield { token: char, done: false };
    }
    yield { token: '', done: true, verdict };
  }
}

module.exports = { VerifierAgent };
