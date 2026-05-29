const BaseAgent = require('./baseAgent');
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { executeToolCall, parseToolCalls, buildToolsPrompt, WORKSPACE } = require('../tools');
const config = require('../config');

const TOOL_NAMES = 'read-file|write-file|update-file|list-path|run-command';

function stripToolTags(text) {
  return text
    .replace(new RegExp(`<(${TOOL_NAMES})(\\s[^>]*)?>[\\s\\S]*?<\\/\\1>`, 'gi'), '')
    .replace(new RegExp(`<(${TOOL_NAMES})(\\s[^>]*)?\\/>`, 'gi'), '')
    .trim();
}

class ExecutorAgent extends BaseAgent {
  constructor() {
    super(config.modelName, 0.4);
    this.maxToolRounds = 100;
  }

  buildMessages(userPrompt, criteria, plan = "", feedback = "") {
    const planSection = plan ? `\n【内阁方案】\n${plan}` : '';
    const systemPrompt = `你是【行政官】，执行任务产出成果。
【工作空间】${WORKSPACE}
${buildToolsPrompt()}
【立法标准】${JSON.stringify(criteria)}
【铁律】
1. 一次只输出一个 XML 工具标签。
2. 路径必须用相对路径（如 "src/main.py"）。
3. 不要写"调用: xxx"，直接用 XML 标签。
4. 写完代码后必须自己运行测试，能跑通才算完成。
5. 安装依赖等耗时命令用 bg="true" 后台运行。
6. 不要确认，直接执行。`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`任务：${userPrompt}${planSection}`)
    ];
    if (feedback) messages.push(new SystemMessage(`驳回：${feedback}\n请修改后重新提交。`));
    return messages;
  }

  async *executeStream(userPrompt, criteria, plan = "", feedback = "") {
    const messages = this.buildMessages(userPrompt, criteria, plan, feedback);
    let toolRounds = 0;
    let finalCleanText = '';

    yield { type: 'status', message: '行政官正在分析...' };

    while (toolRounds < this.maxToolRounds) {
      // invoke 拿到完整响应，可靠判断是否有工具调用
      const response = await this.invoke(messages);
      const responseText = response.text || response.content || '';
      const toolCalls = parseToolCalls(responseText);

      // 空响应
      if (!responseText) {
        yield { type: 'status', message: '空响应，重试...' };
        messages.push(new HumanMessage('请给出回答或调用工具。'));
        toolRounds++;
        continue;
      }

      // 有工具调用 → 取第一个执行
      if (toolCalls.length > 0) {
        const tc = toolCalls[0];
        // 剥离所有 XML 工具标签，纯文本正常显示
        const cleanText = stripToolTags(responseText);
        messages.push(new AIMessage({ content: responseText }));

        if (cleanText) {
          for (const char of cleanText) {
            finalCleanText += char;
            yield { type: 'token', token: char, done: false, fullText: finalCleanText };
          }
        }

        yield { type: 'tool_start', name: tc.name, args: tc.args };
        let result;
        try { result = await executeToolCall(tc); }
        catch (err) { result = { name: tc.name, result: `失败: ${err.message}` }; }
        yield { type: 'tool_result', name: tc.name, result: result.result };

        const preview = (result.result || '').length > 3000
          ? result.result.substring(0, 3000) + '...(截断)' : result.result;
        messages.push(new HumanMessage(`【${tc.name}】: ${preview}\n\n继续下一步。`));
        toolRounds++;
        continue;
      }

      // 无工具调用 → 最终答案，逐字流式展示
      if (!responseText) {
        yield { type: 'status', message: '空响应，重试...' };
        messages.push(new HumanMessage('请给出你的回答。'));
        toolRounds++;
        continue;
      }

      messages.push(new AIMessage({ content: responseText }));
      for (const char of responseText) {
        finalCleanText += char;
        yield { type: 'token', token: char, done: false, fullText: finalCleanText };
      }
      break;
    }

    if (toolRounds >= this.maxToolRounds) {
      yield { type: 'status', message: '已达上限，给出最终答案...' };
      messages.push(new HumanMessage('已达上限，请直接给出最终答案。'));
      const response = await this.invoke(messages);
      const text = response.text || response.content || '';
      for (const char of text) {
        finalCleanText += char;
        yield { type: 'token', token: char, done: false, fullText: finalCleanText };
      }
    }

    yield { type: 'done', token: '', done: true, fullText: finalCleanText };
  }
}

module.exports = { ExecutorAgent };
