FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./
RUN npm install --production

COPY server/ .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
