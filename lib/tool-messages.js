"use strict";

function buildToolMessages(tool, history, text) {
  const messages = [];
  const exampleRequest = String(tool.exampleRequest || "").trim();
  const exampleResponse = String(tool.exampleResponse || "").trim();

  if (exampleRequest && exampleResponse) {
    messages.push(
      { role: "user", content: exampleRequest },
      { role: "assistant", content: exampleResponse },
    );
  }

  if (Array.isArray(history)) messages.push(...history);
  messages.push({ role: "user", content: String(text || "") });

  return messages;
}

module.exports = buildToolMessages;
