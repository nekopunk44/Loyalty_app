FROM node:22-alpine AS base
WORKDIR /app

# Устанавливаем зависимости отдельным слоем — кешируется при сборке
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем исходники (без node_modules и секретов)
COPY . .

# Непривилегированный пользователь
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5002/health || exit 1

CMD ["node", "index.js"]
