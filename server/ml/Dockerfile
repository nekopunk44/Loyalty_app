FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Обучаем модели на синтетике при сборке. Артефакты пишутся в /app/artifacts.
# Размер обучающей выборки задаётся ARG TRAIN_N_USERS (по умолчанию 1500).
ARG TRAIN_N_USERS=1500
RUN python train.py --synthetic --n-users ${TRAIN_N_USERS}

ENV PYTHONUNBUFFERED=1
EXPOSE 8001

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
