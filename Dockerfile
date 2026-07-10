# ---- Etapa de build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Etapa final (producción / Cloud Run) ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Cloud Run inyecta PORT; 8080 es el default habitual
EXPOSE 8080

CMD ["./docker-entrypoint.sh"]
