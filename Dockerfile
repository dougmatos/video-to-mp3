# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ─── Stage 2: production ─────────────────────────────────────────────────────
FROM node:20-alpine

# FFmpeg necessário para conversão para MP3
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p downloads logs

EXPOSE 3092

ENV PORT=3092

CMD ["node", "dist/server/httpServer.js"]
