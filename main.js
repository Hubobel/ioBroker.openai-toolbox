"use strict";

const utils = require("@iobroker/adapter-core");
const OpenAIClient = require("./lib/openai-client");
const ImageLoader = require("./lib/image-loader");

class OpenAIToolbox extends utils.Adapter {
  constructor(options = {}) {
    super({ ...options, name: "openai-toolbox" });
    this.pending = new Set();
    this.queues = new Map();
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  async onReady() {
    this.client = new OpenAIClient(this);
    this.images = new ImageLoader(this);
    await this.ensureRootObjects();
    for (const model of this.availableModels()) await this.ensureModel(model);
    for (const tool of this.config.tools || []) await this.ensureTool(tool);
    this.subscribeStates("Models.*.text_request");
    this.subscribeStates("Tools.*.text_request");
    this.subscribeStates("Tools.*.statistics.clear_history");
    await this.setStateAsync(
      "info.connection",
      Boolean(this.config.apiKey),
      true,
    );
    this.log.info(
      `OpenAI Toolbox ready with ${this.availableModels().length} model(s) and ${(this.config.tools || []).length} tool(s)`,
    );
  }

  availableModels() {
    return (this.config.models || [])
      .filter((m) => m.active && m.name)
      .map((m) => String(m.name));
  }

  toolId(name) {
    return String(name || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  modelId(name) {
    return this.toolId(name);
  }

  async ensureRootObjects() {
    for (const id of ["Models", "Tools"]) {
      await this.setObjectNotExistsAsync(id, {
        type: "folder",
        common: { name: id },
        native: {},
      });
    }
    await this.setObjectNotExistsAsync("info.connection", {
      type: "state",
      common: {
        name: "OpenAI connection",
        type: "boolean",
        role: "indicator.connected",
        read: true,
        write: false,
        def: false,
      },
      native: {},
    });
  }

  async ensureRequestStates(base, native = {}) {
    await this.setObjectNotExistsAsync(base, {
      type: "folder",
      common: { name: base },
      native,
    });
    const states = {
      text_request: {
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: "",
      },
      text_response: {
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: "",
      },
      image_url: {
        type: "string",
        role: "text.url",
        read: true,
        write: true,
        def: "",
      },
      "request.state": {
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: "idle",
      },
      "request.body": {
        type: "string",
        role: "json",
        read: true,
        write: true,
        def: "{}",
      },
      "response.raw": {
        type: "string",
        role: "json",
        read: true,
        write: true,
        def: "{}",
      },
      "response.error": {
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: "",
      },
      "statistics.input_tokens": {
        type: "number",
        role: "value",
        read: true,
        write: false,
        def: 0,
      },
      "statistics.output_tokens": {
        type: "number",
        role: "value",
        read: true,
        write: false,
        def: 0,
      },
      "statistics.total_tokens": {
        type: "number",
        role: "value",
        read: true,
        write: false,
        def: 0,
      },
      "statistics.requests": {
        type: "number",
        role: "value",
        read: true,
        write: false,
        def: 0,
      },
      "statistics.last_request": {
        type: "string",
        role: "date",
        read: true,
        write: false,
        def: "",
      },
    };
    for (const [suffix, common] of Object.entries(states)) {
      await this.setObjectNotExistsAsync(`${base}.${suffix}`, {
        type: "state",
        common: { name: suffix, ...common },
        native,
      });
      if (common.write) {
        await this.extendObjectAsync(`${base}.${suffix}`, {
          common: { write: true },
        });
      }
    }
  }

  async ensureModel(model) {
    await this.ensureRequestStates(`Models.${this.modelId(model)}`, { model });
  }

  async ensureTool(tool) {
    const id = this.toolId(tool.name);
    await this.ensureRequestStates(`Tools.${id}`, { toolName: tool.name });
    await this.setObjectNotExistsAsync(`Tools.${id}.statistics.history`, {
      type: "state",
      common: {
        name: "Conversation history",
        type: "string",
        role: "json",
        read: true,
        write: false,
        def: "[]",
      },
      native: { toolName: tool.name },
    });
    await this.setObjectNotExistsAsync(`Tools.${id}.statistics.clear_history`, {
      type: "state",
      common: {
        name: "Clear conversation history",
        type: "boolean",
        role: "button",
        read: false,
        write: true,
        def: false,
      },
      native: { toolName: tool.name },
    });
  }

  async onStateChange(id, state) {
    if (!state || state.ack) return;
    if (id.endsWith("statistics.clear_history") && state.val) {
      const base = id
        .slice(this.namespace.length + 1)
        .replace(/\.statistics\.clear_history$/, "");
      await this.setStateAsync(`${base}.statistics.history`, "[]", true);
      await this.setStateAsync(`${base}.statistics.clear_history`, false, true);
      return;
    }
    if (
      !id.endsWith(".text_request") ||
      typeof state.val !== "string" ||
      !state.val.trim()
    )
      return;
    const relative = id.slice(this.namespace.length + 1);
    if (relative.startsWith("Models.")) {
      const object = await this.getObjectAsync(relative);
      void this.runQueued(relative.split(".")[1], () =>
        this.runRequest(`Models.${relative.split(".")[1]}`, {
          model: object?.native?.model,
          messages: [{ role: "user", content: state.val }],
        }),
      );
    } else if (relative.startsWith("Tools.")) {
      const key = relative.split(".")[1];
      const tool = (this.config.tools || []).find(
        (t) => this.toolId(t.name) === key,
      );
      if (tool) void this.runQueued(key, () => this.runTool(tool, state.val));
    }
  }

  runQueued(key, operation) {
    const previous = this.queues.get(key) || Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(operation)
      .finally(() => {
        if (this.queues.get(key) === current) this.queues.delete(key);
      });
    this.queues.set(key, current);
    return current;
  }

  async runTool(tool, text, suppliedImage) {
    const base = `Tools.${this.toolId(tool.name)}`;
    const history = await this.readHistory(
      base,
      Number(tool.historyLength) || 0,
    );
    const messages = [...history, { role: "user", content: text }];
    const stateImage = (await this.getStateAsync(`${base}.image_url`))?.val;
    const imageSource = suppliedImage || stateImage;

    if (tool.vision && imageSource) {
      try {
        messages[messages.length - 1].imageDataUrl = await this.images.load(
          String(imageSource),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await this.setStateAsync(`${base}.response.error`, message, true);
        await this.setStateAsync(`${base}.request.state`, "error", true);

        return {
          success: false,
          text: "",
          error: message,
        };
      } finally {
        if (!suppliedImage && stateImage) {
          await this.setStateAsync(`${base}.image_url`, "", true);
        }
      }
    }
    const result = await this.runWithRetry(
      base,
      {
        model: tool.model,
        messages,
        instructions: tool.instructions || undefined,
        reasoningEffort: tool.reasoningEffort || undefined,
        maxOutputTokens: Number(tool.maxOutputTokens) || 2000,
        temperature:
          tool.temperature === undefined ||
          tool.temperature === null ||
          tool.temperature === ""
            ? undefined
            : Number(tool.temperature),
      },
      Number(tool.maxRetries) || 0,
      Number(tool.retryDelaySeconds) || 5,
    );
    if (result.success && Number(tool.historyLength) > 0) {
      await this.writeHistory(
        base,
        [
          ...history,
          { role: "user", content: text },
          { role: "assistant", content: result.text },
        ],
        Number(tool.historyLength),
      );
    }
    return result;
  }

  async runWithRetry(base, request, retries, delaySeconds) {
    let last;
    for (let attempt = 0; attempt <= retries; attempt++) {
      last = await this.runRequest(base, request);
      if (last.success) return last;
      if (attempt < retries)
        await new Promise((resolve) =>
          this.setTimeout(resolve, delaySeconds * 1000),
        );
    }
    return last;
  }

  async runRequest(base, request) {
    try {
      if (!request.model) throw new Error("No model configured");
      await this.setStateAsync(`${base}.request.state`, "running", true);
      await this.setStateAsync(`${base}.response.error`, "", true);
      const result = await this.client.createResponse(request);
      await this.setStateAsync("info.connection", true, true);
      await this.setStateAsync(
        `${base}.request.body`,
        JSON.stringify(result.request),
        true,
      );
      await this.setStateAsync(
        `${base}.response.raw`,
        JSON.stringify(result.raw),
        true,
      );
      await this.setStateAsync(`${base}.text_response`, result.text, true);
      await this.setStateAsync(`${base}.request.state`, "success", true);
      await this.updateStatistics(base, result.usage);
      return { ...result, raw: undefined, request: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.setStateAsync("info.connection", false, true);
      await this.setStateAsync(`${base}.response.error`, message, true);
      await this.setStateAsync(`${base}.request.state`, "error", true);
      this.log.warn(`${base}: ${message}`);
      return { success: false, text: "", error: message };
    }
  }

  async updateStatistics(base, usage) {
    for (const [name, value] of Object.entries({
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
    })) {
      const current =
        Number((await this.getStateAsync(`${base}.statistics.${name}`))?.val) ||
        0;
      await this.setStateAsync(
        `${base}.statistics.${name}`,
        current + (Number(value) || 0),
        true,
      );
    }
    const count =
      Number((await this.getStateAsync(`${base}.statistics.requests`))?.val) ||
      0;
    await this.setStateAsync(`${base}.statistics.requests`, count + 1, true);
    await this.setStateAsync(
      `${base}.statistics.last_request`,
      new Date().toISOString(),
      true,
    );
  }

  async readHistory(base, pairs) {
    if (!pairs) return [];
    try {
      const state = await this.getStateAsync(`${base}.statistics.history`);
      const history = JSON.parse(String(state?.val || "[]"));
      return Array.isArray(history) ? history.slice(-pairs * 2) : [];
    } catch {
      return [];
    }
  }

  async writeHistory(base, history, pairs) {
    await this.setStateAsync(
      `${base}.statistics.history`,
      JSON.stringify(history.slice(-pairs * 2)),
      true,
    );
  }

  async onMessage(obj) {
    if (!obj || typeof obj !== "object" || !obj.message) return;
    let result;
    if (obj.command === "getAvailableModels") result = this.availableModels();
    else if (obj.command === "modelRequest") {
      const msg = obj.message;
      result = await this.runQueued(`message-model-${msg.model}`, () =>
        this.runRequest(`Models.${this.modelId(msg.model)}`, {
          model: msg.model,
          messages: msg.messages || [{ role: "user", content: msg.text }],
          instructions: msg.instructions,
          reasoningEffort: msg.reasoningEffort,
          maxOutputTokens: msg.maxOutputTokens,
          temperature: msg.temperature,
        }),
      );
    } else if (obj.command === "toolRequest") {
      const tool = (this.config.tools || []).find(
        (t) =>
          t.name === obj.message.tool ||
          this.toolId(t.name) === obj.message.tool,
      );
      result = tool
        ? await this.runQueued(`message-tool-${this.toolId(tool.name)}`, () =>
            this.runTool(tool, obj.message.text, obj.message.imageUrl),
          )
        : { success: false, error: "Tool not found", text: "" };
    } else result = { success: false, error: "Unsupported command", text: "" };
    if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
  }

  onUnload(callback) {
    callback();
  }
}

if (require.main !== module)
  module.exports = (options) => new OpenAIToolbox(options);
else new OpenAIToolbox();
