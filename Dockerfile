FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./
RUN npm install --production

COPY server/ .

ENV NODE_ENV=production

CMD ["node", "index.js"]
