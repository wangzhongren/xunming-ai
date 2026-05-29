const { ChatOpenAI } = require("@langchain/openai");
const config = require('../config');

class BaseAgent {
  constructor(modelName = config.modelName, temperature = 0.2) {
    this.model = new ChatOpenAI({
      openAIApiKey: config.openaiApiKey,
      configuration: { baseURL: config.apiBaseUrl },
      modelName: modelName,
      temperature: temperature,
      streaming: true,
    });
  }

  async invoke(messages) {
    const response = await this.model.invoke(messages);
    return response;
  }

  async *stream(messages) {
    const stream = await this.model.stream(messages);
    for await (const chunk of stream) {
      const token = typeof chunk === 'string' ? chunk : (chunk.content ?? chunk.delta);
      if (token) yield token;
    }
  }
}

module.exports = BaseAgent;
