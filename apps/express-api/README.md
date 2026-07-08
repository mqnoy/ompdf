# express-api

Express application that exposes the `ompdf` library over HTTP.

## Run

From the workspace root:

```bash
corepack pnpm --filter express-api dev
```

Default server:

- `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`
- Health: `http://localhost:3000/health`

## Endpoints

```http
GET /health
GET /api/v1/compress/info
POST /api/v1/compress
POST /api/v1/telegram/webhook
```

## Multipart parameters

### Required

- `file` — uploaded PDF

### Optional

- `algorithm` — `smallest | mutool | ghostscript | standard | condense | photon`
- `strategy` — alias for `algorithm`
- `quality` — `low | medium | high | maximum`
- `removeMetadata` — `true | false`
- `optimizeImages` — `true | false`
- `photonDpi` — number between `36` and `600`
- `photonFormat` — `jpeg | png`
- `photonQuality` — number between `1` and `100`
- `ghostscriptPreset` — `screen | ebook | printer | prepress | default`
- `ghostscriptCompatibilityLevel` — `1.4 | 1.5 | 1.6 | 1.7`
- `ghostscriptColorImageResolution`
- `ghostscriptGrayImageResolution`
- `ghostscriptMonoImageResolution`
- `ghostscriptDownsampleImages` — `true | false`

## Curl examples

### Smallest

```bash
curl -F "file=@./input.pdf" \
     -F "algorithm=smallest" \
     -o ./output-smallest.pdf \
     http://localhost:3000/api/v1/compress
```

### MuTool + maximum quality

```bash
curl -F "file=@./input.pdf" \
     -F "algorithm=mutool" \
     -F "quality=maximum" \
     -o ./output-mutool.pdf \
     http://localhost:3000/api/v1/compress
```

### Standard with custom params

```bash
curl -F "file=@./input.pdf" \
     -F "algorithm=standard" \
     -F "quality=high" \
     -F "removeMetadata=true" \
     -F "optimizeImages=false" \
     -o ./output-standard.pdf \
     http://localhost:3000/api/v1/compress
```

### Condense with custom params

```bash
curl -F "file=@./input.pdf" \
     -F "algorithm=condense" \
     -F "quality=low" \
     -F "removeMetadata=true" \
     -o ./output-condense.pdf \
     http://localhost:3000/api/v1/compress
```

### Photon for image-heavy input

```bash
curl -F "file=@./input.pdf" \
     -F "algorithm=photon" \
     -F "photonDpi=96" \
     -F "photonFormat=jpeg" \
     -F "photonQuality=60" \
     -o ./output-photon.pdf \
     http://localhost:3000/api/v1/compress
```

### Strategy alias

```bash
curl -F "file=@./input.pdf" \
     -F "strategy=mutool" \
     -o ./output-mutool.pdf \
     http://localhost:3000/api/v1/compress
```

## Telegram bot webhook

The Express app can receive Telegram webhook updates for a PDF-compression bot.

Required environment variables:

- `TELEGRAM_BOT_TOKEN` — bot token from BotFather. Store this only in `.env` or deployment secrets.
- `TELEGRAM_WEBHOOK_SECRET` — random secret sent by Telegram in `X-Telegram-Bot-Api-Secret-Token`.
- `TELEGRAM_MAX_FILE_BYTES` — optional maximum Telegram PDF size, defaulting to `20971520` bytes.

If the token was pasted into chat, logs, or an issue, revoke it in BotFather and generate a new one before deploying.

Set the webhook after deploying the API to a public HTTPS URL:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN.example/api/v1/telegram/webhook",
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'",
    "allowed_updates": ["message"]
  }'
```

Then send a PDF document to the bot. The webhook acknowledges Telegram quickly and processes the PDF asynchronously in the running Express process.

## Response headers

Successful responses include:

- `Content-Type: application/pdf`
- `Content-Disposition`
- `X-Compression-Algorithm`
- `X-Original-Size`
- `X-Compressed-Size`
- `X-Compression-Ratio`
- `X-Pages-Processed`
- `X-Processing-Time-Ms`

## Large PDF note

For very large PDFs, the `smallest` strategy can skip the expensive photon attempt when page-count heuristics indicate it would be too costly. In earlier observation for a `21,005,621` byte / `6154` page file, `mutool` produced `8,911,327` bytes, which is about `57.58%` smaller.
