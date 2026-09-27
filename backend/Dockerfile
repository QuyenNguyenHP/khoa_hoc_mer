FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY backend ./backend

ENV PORT=3002
EXPOSE 3002

CMD ["node", "backend/index.js"]
