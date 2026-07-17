"use strict";

const assert = require("node:assert/strict");
const buildToolMessages = require("../lib/tool-messages");

describe("ToolMessages", () => {
  it("prepends a complete example conversation", () => {
    const messages = buildToolMessages(
      {
        exampleRequest: "Temperatur: 21 °C",
        exampleResponse: "Es ist angenehm warm.",
      },
      [],
      "Temperatur: 5 °C",
    );

    assert.deepEqual(messages, [
      { role: "user", content: "Temperatur: 21 °C" },
      { role: "assistant", content: "Es ist angenehm warm." },
      { role: "user", content: "Temperatur: 5 °C" },
    ]);
  });

  it("places history between the example and current request", () => {
    const history = [
      { role: "user", content: "Vorherige Frage" },
      { role: "assistant", content: "Vorherige Antwort" },
    ];

    const messages = buildToolMessages(
      {
        exampleRequest: "Beispielfrage",
        exampleResponse: "Beispielantwort",
      },
      history,
      "Aktuelle Frage",
    );

    assert.deepEqual(messages, [
      { role: "user", content: "Beispielfrage" },
      { role: "assistant", content: "Beispielantwort" },
      { role: "user", content: "Vorherige Frage" },
      { role: "assistant", content: "Vorherige Antwort" },
      { role: "user", content: "Aktuelle Frage" },
    ]);

    assert.equal(history.length, 2);
  });

  it("ignores an incomplete example pair", () => {
    const messages = buildToolMessages(
      { exampleRequest: "Nur eine Beispielfrage" },
      [],
      "Aktuelle Frage",
    );

    assert.deepEqual(messages, [{ role: "user", content: "Aktuelle Frage" }]);
  });
});
