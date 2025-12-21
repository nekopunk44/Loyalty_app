# Intelligent Loyalty Engine — ML-микросервис

Python-микросервис на FastAPI и scikit-learn, реализующий три алгоритмических блока интеллектуальной программы лояльности (см. главу 2 ВКР):

1. **RFM-сегментация** — динамическое назначение уровней лояльности через k-means на трёхмерном пространстве признаков Recency / Frequency / Monetary.
2. **Прогноз оттока** — бинарная классификация (Gradient Boosting) по 14 поведенческим признакам.
3. **Гибридный рекомендер** событий — комбинация content-based filtering и item-item collaborative filtering.

## Структура

```
server/ml/
├── main.py             # FastAPI-приложение
├── train.py            # офлайн-обучение моделей
├── config.py           # настройки из .env
├── requirements.txt
├── Dockerfile
├── data/
│   ├── loader.py       # выгрузка из PostgreSQL
│   └── synthetic.py    # генератор синтетического датасета
├── models/
│   ├── rfm.py          # RFMSegmenter
│   ├── churn.py        # ChurnClassifier
│   └── recommender.py  # HybridRecommender
├── artifacts/          # обученные .pkl + metrics.json (генерируется)
└── tests/              # pytest-тесты
```

## Запуск

### Быстрый старт без БД (синтетические данные)

```bash
cd server/ml
python -m venv .venv && source .venv/bin/activate   # или .venv\Scripts\activate на Windows
pip install -r requirements.txt
python train.py --synthetic --n-users 1500
uvicorn main:app --host 0.0.0.0 --port 8001
```

После `train.py` в `artifacts/` появятся `churn_v1.pkl`, `recsys_v1.pkl` и `metrics.json` с фактическими метриками.

### С реальной PostgreSQL

1. Скопировать `.env.example` → `.env` и задать `DATABASE_URL`.
2. `python train.py` (без флага `--synthetic`).
3. `uvicorn main:app --port 8001`.

### Docker

```bash
docker build -t loyalty-ml .
docker run --rm -p 8001:8001 -e SYNTHETIC_FALLBACK=true loyalty-ml
```

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Проверка готовности и наличия артефактов |
| POST | `/rfm/recompute?window_days=365` | Пересчёт RFM-сегментов по всем пользователям |
| POST | `/churn/predict` | Вероятность оттока (тело: `{user_id, features?}`) |
| POST | `/recommend/events` | Топ-K событий для пользователя (тело: `{user_id, k}`) |

Защищённые эндпоинты требуют заголовок `Authorization: Bearer <ML_SERVICE_TOKEN>` (в dev-режиме при токене `dev-token` проверка отключена). OpenAPI-схема и Swagger UI доступны по `/docs`.

### Пример: прогноз оттока

```bash
curl -X POST http://localhost:8001/churn/predict \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u_00042"}'
```

```json
{"user_id":"u_00042","churn_probability":0.81,"risk":"high"}
```

### Пример: рекомендации событий

```bash
curl -X POST http://localhost:8001/recommend/events \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u_00042","k":5}'
```

## Тестирование

```bash
pytest tests/ -v
```

Тесты используют синтетический датасет, БД не требуется.

## Интеграция с основным API

Backend на Node.js обращается к ML-сервису через REST:

```javascript
// server/services/MLService.js (пример)
const axios = require('axios');
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_TOKEN = process.env.ML_SERVICE_TOKEN;

async function predictChurn(userId) {
  const { data } = await axios.post(`${ML_URL}/churn/predict`,
    { user_id: userId },
    { headers: { Authorization: `Bearer ${ML_TOKEN}` } }
  );
  return data;
}
```

При недоступности ML-сервиса основной API должен возвращать ответы без ML-обогащения (graceful degradation — см. §3.5.5 ВКР).
