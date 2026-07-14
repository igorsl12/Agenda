# Proxy de IA (server/)

Backend mínimo (Node 18+, sem dependências) que guarda as chaves de IA
**server-side** para que nenhuma chave `EXPO_PUBLIC_*` seja embutida no bundle
do app. Recomendado para qualquer build distribuída (APK / web).

## Como rodar

```bash
cd server
cp .env.example .env   # preencha UMA chave (Gemini, Groq ou OpenAI)
# Node não carrega .env sozinho em versões antigas; use --env-file (Node 20+):
node --env-file=.env index.mjs
# ou exporte as variáveis no ambiente e rode: node index.mjs
```

No app, aponte para o proxy no `.env` da raiz:

```
EXPO_PUBLIC_AI_PROXY_URL=http://SEU_HOST:8787
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `GEMINI_API_KEY` | Chave do Google Gemini (prioridade 1 na auto-detecção) |
| `GROQ_API_KEY` | Chave da Groq (prioridade 2) |
| `OPENAI_API_KEY` | Chave da OpenAI (prioridade 3) |
| `OPENAI_MODEL` / `GROQ_MODEL` | Modelo de chat opcional (defaults: `gpt-4o-mini` / `openai/gpt-oss-20b`) |
| `PORT` | Porta HTTP (default `8787`) |
| `ALLOWED_ORIGIN` | Valor de `Access-Control-Allow-Origin` (default `*`; restrinja em produção) |

## Endpoints

- `POST /extract` — corpo `{ base64, mimeType }` (áudio, máx. ~15MB) →
  `{ raw }` com o JSON bruto do modelo. A validação/normalização final é
  feita no cliente (`parseExtractionResponse`).
- `GET /health` — `{ ok, provider }`.

O servidor nunca loga chaves nem o conteúdo do áudio.
