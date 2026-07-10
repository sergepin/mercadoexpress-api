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

# Cloud Run inyecta PORT (por defecto 8080)
EXPOSE 8080

# Arranca la API de inmediato (Cloud Run exige escuchar PORT rápido).
# Migraciones: correrlas una vez contra Neon desde tu PC, no aquí.
CMD ["node", "dist/main.js"]
