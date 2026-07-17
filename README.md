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

## Ersteinrichtung mit `gpt-5-nano`

### 1. OpenAI-API-Schlüssel vorbereiten

Ein API-Schlüssel kann in der [OpenAI-Plattform](https://platform.openai.com/api-keys) erstellt und verwaltet werden.

> **Sicherheit:** Den API-Schlüssel niemals in die README, in Quellcode, Screenshots oder öffentliche Protokolle kopieren. Bei Verdacht auf eine Veröffentlichung muss der Schlüssel sofort ersetzt werden.

### 2. Adapterinstanz anlegen

1. In ioBroker den Bereich **Adapter** öffnen.
2. Beim Adapter **OpenAI Toolbox** auf die Plus-Schaltfläche klicken.
3. Die neu angelegte Instanz `openai-toolbox.0` öffnen.

### 3. OpenAI-Verbindung konfigurieren

Im Reiter **OpenAI** folgende Werte eintragen:

| Einstellung                   | Wert                              |
| ----------------------------- | --------------------------------- |
| OpenAI API key                | Persönlicher OpenAI-API-Schlüssel |
| API base URL                  | `https://api.openai.com/v1`       |
| Request timeout (ms)          | `60000`                           |
| Maximum image size (bytes)    | `10485760`                        |
| Allowed local image directory | Für den ersten Test leer lassen   |

### 4. Modell `gpt-5-nano` anlegen

Im Reiter **Models** eine neue Zeile hinzufügen:

| Einstellung | Wert         |
| ----------- | ------------ |
| Active      | aktiviert    |
| Model ID    | `gpt-5-nano` |

### 5. Testwerkzeug anlegen

Im Reiter **Tools** eine neue Zeile mit folgenden Werten hinzufügen:

| Einstellung       | Wert                                       |
| ----------------- | ------------------------------------------ |
| Name              | `nano-test`                                |
| Model ID          | `gpt-5-nano`                               |
| Instructions      | `Antworte kurz, sachlich und auf Deutsch.` |
| Reasoning effort  | `Minimal`                                  |
| Temperature       | leer lassen                                |
| Max output tokens | `300`                                      |
| History pairs     | `0`                                        |
| Vision            | deaktiviert                                |
| Retries           | `2`                                        |
| Retry delay       | `5`                                        |

`Temperature` sollte bei `gpt-5-nano` leer bleiben, da dieser Parameter abhängig vom Modell nicht unterstützt werden kann.

### Tool examples

Each tool can define an optional `Example request` and matching `Example response`. When both fields are populated, the adapter sends them to OpenAI as a sample user/assistant exchange before the conversation history and the current request. This can be used to demonstrate the desired answer style or output format.

An incomplete example pair is ignored. Example messages are not written to the tool's conversation history.

### 6. Konfiguration speichern

1. Die Einstellungen speichern.
2. Falls erforderlich, die Adapterinstanz neu starten.
3. Die Instanz sollte anschließend grün werden.

Im ioBroker-Protokoll sollte eine ähnliche Meldung erscheinen:

```text
OpenAI Toolbox ready with 1 model(s) and 1 tool(s)
```

### 7. Erste Anfrage testen

1. In ioBroker den Bereich **Objekte** öffnen.
2. Zu folgendem Datenpunkt navigieren:

   ```text
   openai-toolbox.0.Tools.nano-test.text_request
   ```

3. Als Wert beispielsweise eingeben:

   ```text
   Erkläre ioBroker in genau einem kurzen deutschen Satz.
   ```

4. Die Antwort erscheint unter:

   ```text
   openai-toolbox.0.Tools.nano-test.text_response
   ```

5. Der Status der Anfrage steht unter:

   ```text
   openai-toolbox.0.Tools.nano-test.request.state
   ```

Bei erfolgreicher Verarbeitung enthält dieser Datenpunkt den Wert:

```text
success
```

Mögliche Fehlermeldungen können unter folgendem Datenpunkt eingesehen werden:

```text
openai-toolbox.0.Tools.nano-test.response.error
```

## License

MIT
