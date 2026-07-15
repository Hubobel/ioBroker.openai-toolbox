"use strict";

const assert = require("node:assert/strict");
const OpenAIClient = require("../lib/openai-client");

describe("OpenAIClient", () => {
  it("converts a vision message for the Responses API", () => {
    const client = new OpenAIClient({ config: {} });
    const input = client.toResponsesInput([
      {
        role: "user",
        content: "Describe",
        imageDataUrl: "data:image/png;base64,AA==",
      },
    ]);
    assert.deepEqual(input[0].content, [
      { type: "input_text", text: "Describe" },
      { type: "input_image", image_url: "data:image/png;base64,AA==" },
    ]);
  });

  it("extracts output text from an API response", () => {
    const client = new OpenAIClient({ config: {} });
    assert.equal(
      client.extractText({
        output: [{ content: [{ type: "output_text", text: "Hello" }] }],
      }),
      "Hello",
    );
  });

  it("normalizes missing usage fields", async () => {
    const previousFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ id: "r1", output_text: "ok" }),
    });
    try {
      const client = new OpenAIClient({ config: { apiKey: "test" } });
      const result = await client.createResponse({
        model: "test-model",
        messages: [{ role: "user", content: "Hi" }],
      });
      assert.equal(result.request.store, false);
      assert.deepEqual(result.usage, {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    } finally {
      global.fetch = previousFetch;
    }
  });
});
