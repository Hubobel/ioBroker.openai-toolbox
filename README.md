# ioBroker.openai-toolbox

Create reusable OpenAI-powered tools for ioBroker automations. This adapter uses OpenAI's Responses API and supports direct model requests, configurable tools, conversation history, vision input, retries, token statistics, states and `sendTo` messages.

## Requirements

- ioBroker js-controller 7 or newer
- Node.js 22 or newer
- An OpenAI API key

API usage can incur costs. The adapter never logs or exposes the configured API key.

## Configuration

1. Enter the OpenAI API key.
2. Add one or more active OpenAI model IDs.
3. Define tools with a unique name, model, instructions and optional history or vision support.
4. Restart the adapter after changing models or tools.

Model IDs are configurable because availability changes over time. See the [current OpenAI model catalog](https://developers.openai.com/api/docs/models).

## States

For every active model:

```text
Models.<model>.text_request
Models.<model>.text_response
Models.<model>.request.*
Models.<model>.response.*
Models.<model>.statistics.*
```

For every configured tool the corresponding states are created below `Tools.<tool>`. Write a non-acknowledged string to `text_request` to start a request. For vision requests, set `image_url` first.

## `sendTo` API

### Tool request

```javascript
sendTo(
  "openai-toolbox.0",
  "toolRequest",
  {
    tool: "weather-reporter",
    text: "Create a short report from: 18 °C, cloudy, light wind",
  },
  (result) => {
    if (result.success) console.log(result.text);
    else console.error(result.error);
  },
);
```

### Vision request

```javascript
sendTo(
  "openai-toolbox.0",
  "toolRequest",
  {
    tool: "image-analyzer",
    text: "What can you see?",
    imageUrl: "https://example.org/camera.jpg",
  },
  (result) => console.log(result),
);
```

### Direct model request

```javascript
sendTo(
  "openai-toolbox.0",
  "modelRequest",
  {
    model: "gpt-5.6-terra",
    instructions: "Answer briefly in German.",
    reasoningEffort: "minimal",
    text: "Explain photovoltaic self-consumption.",
    maxOutputTokens: 500,
  },
  (result) => console.log(result),
);
```

All requests return a stable object containing `success`, `text`, and either `usage`, `model`, `requestId` or `error`.
Reasoning effort can be configured separately for each tool. Leave it at `Default` to let OpenAI choose the effort. For simple tasks with `gpt-5-nano`, `minimal` reduces latency and reasoning-token usage. Only select an effort supported by the configured model.

## Security

- The API key is stored as protected and encrypted native configuration.
- Remote images from loopback, link-local and private IPv4 networks are blocked.
- Redirects are rejected and image size is limited.
- Local images are restricted to the configured directory.

Do not expose ioBroker's message bus to untrusted clients.

## Development

```bash
npm ci
npm run lint
npm test
```

## Installation from Forgejo

The adapter can be installed directly from the public Forgejo repository through the ioBroker administration interface.

1. Open **Adapters** in ioBroker.
2. Click **Install adapter from custom URL**.
3. Select the **Custom** or **Custom URL** tab.
4. Paste the following complete line into the input field:

   ```text
   https://git.hintergasse.de/hubobel/ioBroker.openai-toolbox/archive/main.tar.gz openai-toolbox
   ```

5. Click **Install**.
6. Reload the adapter page after installation finishes.
7. Create an **OpenAI Toolbox** instance with the plus button.
8. Enter the OpenAI API key and configure at least one model.

### Why is the adapter name appended to the URL?

Forgejo provides the source archive with the filename `main.tar.gz`. ioBroker cannot infer the adapter name from that filename, so `openai-toolbox` must be appended to the URL, separated by a space.

### Updating

Repeat the same installation procedure to update the adapter. Existing instance configuration is retained.

## Initial setup with `gpt-5-nano`

### 1. Prepare an OpenAI API key

API keys can be created and managed on the [OpenAI platform](https://platform.openai.com/api-keys).

> **Security:** Never copy the API key into documentation, source code, screenshots, or public logs. Rotate the key immediately if it may have been exposed.

### 2. Create an adapter instance

1. Open **Adapters** in ioBroker.
2. Click the plus button for **OpenAI Toolbox**.
3. Open the new `openai-toolbox.0` instance.

### 3. Configure the OpenAI connection

Enter the following values on the **OpenAI** tab:

| Setting                       | Value                          |
| ----------------------------- | ------------------------------ |
| OpenAI API key                | Personal OpenAI API key        |
| API base URL                  | `https://api.openai.com/v1`    |
| Request timeout (ms)          | `60000`                        |
| Maximum image size (bytes)    | `10485760`                     |
| Allowed local image directory | Leave empty for the first test |

### 4. Add the `gpt-5-nano` model

Add a row on the **Models** tab:

| Setting  | Value        |
| -------- | ------------ |
| Active   | enabled      |
| Model ID | `gpt-5-nano` |

### 5. Add a test tool

Add a row with the following values on the **Tools** tab:

| Setting           | Value                           |
| ----------------- | ------------------------------- |
| Name              | `nano-test`                     |
| Model ID          | `gpt-5-nano`                    |
| Instructions      | `Answer briefly and factually.` |
| Reasoning effort  | `Minimal`                       |
| Temperature       | leave empty                     |
| Max output tokens | `300`                           |
| History pairs     | `0`                             |
| Vision            | disabled                        |
| Retries           | `2`                             |
| Retry delay       | `5`                             |

Leave `Temperature` empty for `gpt-5-nano`, because support for this parameter depends on the model.

### Tool examples

Each tool can define an optional `Example request` and matching `Example response`. When both fields are populated, the adapter sends them to OpenAI as a sample user/assistant exchange before the conversation history and the current request. This can be used to demonstrate the desired answer style or output format.

An incomplete example pair is ignored. Example messages are not written to the tool's conversation history.

### 6. Save the configuration

1. Save the settings.
2. Restart the adapter instance if necessary.
3. The instance should then turn green.

The ioBroker log should contain a message similar to this:

```text
OpenAI Toolbox ready with 1 model(s) and 1 tool(s)
```

### 7. Test the first request

1. Open **Objects** in ioBroker.
2. Navigate to this state:

   ```text
   openai-toolbox.0.Tools.nano-test.text_request
   ```

3. Enter a value such as:

   ```text
   Explain ioBroker in one short sentence.
   ```

4. The response appears at:

   ```text
   openai-toolbox.0.Tools.nano-test.text_response
   ```

5. The request status appears at:

   ```text
   openai-toolbox.0.Tools.nano-test.request.state
   ```

After successful processing, this state contains:

```text
success
```

Errors can be inspected at:

```text
openai-toolbox.0.Tools.nano-test.response.error
```

## Changelog

### 0.1.1

- Added example conversations for tools and automated versioning.

### 0.1.0

- Initial development release.

## License

MIT

Copyright (c) 2026 Hubobel
