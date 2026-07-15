"use strict";

class OpenAIClient {
  constructor(adapter) {
    this.adapter = adapter;
    this.baseUrl = String(
      adapter.config.apiBaseUrl || "https://api.openai.com/v1",
    ).replace(/\/$/, "");
    this.timeout = Number(adapter.config.requestTimeoutMs) || 60000;
  }

  async createResponse(request) {
    if (!this.adapter.config.apiKey)
      throw new Error("OpenAI API key is not configured");
    const body = {
      model: request.model,
      input: this.toResponsesInput(request.messages),
      max_output_tokens: request.maxOutputTokens || 2000,
      store: false,
    };
    if (request.instructions) body.instructions = request.instructions;
    if (request.temperature !== undefined && request.temperature !== null)
      body.temperature = request.temperature;

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.adapter.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        data?.error?.message ||
          `OpenAI request failed with HTTP ${response.status}`,
      );
    return {
      success: true,
      text: this.extractText(data),
      model: data.model || request.model,
      requestId: data.id || null,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      raw: data,
      request: body,
    };
  }

  toResponsesInput(messages) {
    return messages.map((message) => ({
      role: message.role,
      content: message.imageDataUrl
        ? [
            { type: "input_text", text: String(message.content || "") },
            { type: "input_image", image_url: message.imageDataUrl },
          ]
        : String(message.content || ""),
    }));
  }

  extractText(data) {
    if (typeof data.output_text === "string") return data.output_text;
    return (data.output || [])
      .flatMap((item) => item.content || [])
      .filter(
        (item) => item.type === "output_text" && typeof item.text === "string",
      )
      .map((item) => item.text)
      .join("");
  }
}

module.exports = OpenAIClient;
