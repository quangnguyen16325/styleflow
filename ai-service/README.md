# Ecloria Review AI Service

FastAPI service for two-stage product review sentiment analysis.

## Endpoints

- `GET /health`
- `POST /analyze-review`

```json
{
  "text": "Vải mát, form đẹp nhưng shop phản hồi hơi lâu"
}
```

## Label Mapping

Defaults:

- Stage 1: `0=NEGATIVE`, `1=POSITIVE`
- Stage 2: `0=NEGATIVE`, `1=NEUTRAL`, `2=POSITIVE`, `3=NO_ASPECT`

Stage 2 is called as a tokenizer sentence pair, not by manually concatenating `[SEP]`:

```python
tokenizer(review_text, aspect_name, padding="max_length", truncation=True, max_length=256)
```

Override with environment variables if training used a different mapping:

```bash
AI_STAGE1_LABELS='{"0":"NEGATIVE","1":"POSITIVE"}'
AI_STAGE2_LABELS='{"0":"NEGATIVE","1":"NEUTRAL","2":"POSITIVE","3":"NO_ASPECT"}'
```

## Local Docker

```bash
docker compose up -d --build ai-service
curl http://localhost:8000/health
curl -X POST http://localhost:8000/analyze-review \
  -H 'Content-Type: application/json' \
  -d '{"text":"Vải đẹp nhưng shop phản hồi lâu"}'
```
