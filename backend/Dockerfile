FROM python:3.11-slim

WORKDIR /app

# 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 전체 프로젝트 복사
COPY . .

# 🔥 핵심: backend 패키지를 Python이 찾을 수 있게 설정
ENV PYTHONPATH=/app

EXPOSE 8000

# uvicorn 실행 (backend.main)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]