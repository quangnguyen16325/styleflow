FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY ai-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ai ./ai
COPY ai-service ./ai-service

EXPOSE 8000

CMD ["uvicorn", "main:app", "--app-dir", "/app/ai-service", "--host", "0.0.0.0", "--port", "8000"]
