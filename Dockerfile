# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ─── Stage 2: production ─────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# FFmpeg necessário para conversão para MP3
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates python3 python3-pip \
    && pip3 install --break-system-packages --no-cache-dir yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p downloads logs

EXPOSE 3092

ENV PORT=3092

CMD ["node", "dist/server/httpServer.js"]
