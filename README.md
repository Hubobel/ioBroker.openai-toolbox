# ioBroker.openai-toolbox

Create reusable OpenAI-powered tools for ioBroker automations. This adapter uses OpenAI's Responses API and supports direct model requests, configurable tools, conversation history, vision input, retries, token statistics, states and `sendTo` messages.

## Requirements

- ioBroker js-controller 7 or newer
- Node.js 20 or newer
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
## Installation über Forgejo

Der Adapter kann direkt über die ioBroker-Administrationsoberfläche aus dem öffentlichen Forgejo-Repository installiert werden.

1. In ioBroker den Bereich **Adapter** öffnen.
2. Auf **Adapter aus eigener URL installieren** klicken.
3. Den Reiter **Beliebig** beziehungsweise **Eigene URL** auswählen.
4. Folgende vollständige Zeile in das Eingabefeld einfügen:

   ```text
   https://git.hintergasse.de/hubobel/ioBroker.openai-toolbox/archive/main.tar.gz openai-toolbox
   ```

5. Auf **Installieren** klicken.
6. Nach Abschluss die Adapterseite neu laden.
7. Beim Adapter **OpenAI Toolbox** über die Plus-Schaltfläche eine Instanz anlegen.
8. Den OpenAI-API-Schlüssel eintragen und mindestens ein Modell konfigurieren.

### Warum steht der Adaptername hinter der URL?

Forgejo stellt den Quellcode als Archiv mit dem Dateinamen `main.tar.gz` bereit. Daraus kann ioBroker den Adapternamen nicht automatisch erkennen. Deshalb muss hinter der URL – getrennt durch ein Leerzeichen – der Name `openai-toolbox` angegeben werden.

### Aktualisierung

Für eine Aktualisierung wird derselbe Installationsvorgang erneut ausgeführt. Vorhandene Instanzkonfigurationen bleiben dabei erhalten.
## License

MIT
