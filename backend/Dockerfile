FROM python:3.11-slim

WORKDIR /app

# cryptography / bcrypt 빌드에 필요한 최소 의존성
RUN apt-get update && apt-get install -y \
    gcc libffi-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

EXPOSE 8000

# Render는 PORT 환경변수를 주입함 — 없으면 8000 폴백
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]