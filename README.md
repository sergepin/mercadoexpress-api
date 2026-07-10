# MercadoExpress API

API REST para el sistema de gestión de inventario de MercadoExpress — prueba técnica.

Controla stock de productos, genera alertas automáticas de stock bajo, registra movimientos inmutables y gestiona órdenes de compra a proveedores.

## Stack

- **NestJS** + TypeScript
- **PostgreSQL** + TypeORM
- **Docker** + docker-compose
- Validación con `class-validator`, eventos con `@nestjs/event-emitter`, documentación con Swagger

## Arquitectura

Se eligió una **arquitectura modular en capas** (Controller → Service → Entity/Repository), pragmática para el timebox de la prueba. No se adoptó hexagonal/DDD puro: la prioridad es cubrir reglas de negocio y tests, no abstracción máxima.

```
src/
  modules/
    products/              RF-01 — registro y ajuste de stock
    inventory-movements/   RF-02 — historial inmutable
    alerts/                RF-03 — alertas reactivas vía eventos
    purchase-orders/       RF-04/05 — ciclo de vida de órdenes
  common/                  filtros, constantes, utilidades
  database/                migraciones, seed, data-source
```

**Desacoplamiento de alertas:** `ProductsService` emite el evento `stock.adjusted` al ajustar stock. `AlertsListener` reacciona sin que products importe alerts directamente en la lógica de negocio.

**Transacciones:** operaciones multi-tabla (ajuste + movimiento, recepción de orden + stock) usan transacciones TypeORM.

Detalle de cumplimiento por RF: [`docs/requisitos-funcionales.md`](docs/requisitos-funcionales.md).

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose

No hace falta instalar Node ni PostgreSQL localmente para evaluar el proyecto.

## Inicio rápido (Docker)

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar API + PostgreSQL (migraciones y seed automáticos)
docker-compose up --build
```

La API queda disponible en `http://localhost:3000`.

| Recurso | URL |
|---------|-----|
| Health check | `GET http://localhost:3000/health` |
| Swagger | `http://localhost:3000/api` |

### Datos semilla

Al arrancar el contenedor se ejecutan migraciones y seed. Se crean 6 categorías, 6 productos y 2 alertas activas (BEB002 y LAC002 nacen con stock ≤ mínimo).

Si ya corriste una versión anterior del esquema, recrea el volumen:

```bash
docker-compose down -v && docker-compose up --build
```

## Desarrollo local (sin Docker para la API)

```bash
cp .env.example .env
# Levantar solo la BD:
docker-compose up db -d

npm install
npm run build
npm run migration:run
npm run seed
npm run start:dev
```

## Tests

```bash
# Unitarios
npm test

# E2e (requiere PostgreSQL accesible; usa BD separada inventory_db_test)
npm run test:e2e

# Cobertura
npm run test:cov
```

### Tests e2e

Los e2e levantan la app Nest **en memoria** (sin puerto HTTP) y envían requests reales con Supertest. Usan la base `inventory_db_test`, nunca la de desarrollo (`inventory_db`). Antes de correr:

1. Tener Postgres levantado (`docker-compose up db -d` o stack completo).
2. Copiar `.env.example` → `.env`.

El `global-setup` crea la BD de test si no existe, corre migraciones y cada suite resetea datos con el seed de referencia.

## Endpoints principales

| Módulo | Rutas |
|--------|-------|
| Productos | `POST/GET /products`, `GET /products/:id`, `PATCH /products/:id/stock` |
| Alertas | `GET /alerts?status=ACTIVA\|RESUELTA` |
| Órdenes | `POST/GET /purchase-orders`, `PATCH .../approve\|reject\|receive` |
| Health | `GET /health` |

Filtros de productos (`GET /products`): `category`, `supplier`, `minStock`, `maxStock`, `withActiveAlert`. Los filtros de texto son insensibles a mayúsculas y acentos.

## Variables de entorno

Ver [`.env.example`](.env.example):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string completa (recomendado en Neon/Cloud Run) |
| `DB_HOST` | Host de PostgreSQL (si no usas `DATABASE_URL`) |
| `DB_PORT` | Puerto (5432) |
| `DB_USER` | Usuario |
| `DB_PASSWORD` | Contraseña |
| `DB_NAME` | Nombre de la base |
| `DB_SSL` | `true` para Neon/Cloud SQL cuando usas variables sueltas |
| `PORT` | Puerto del API (Cloud Run lo inyecta; local 3000) |

## Deploy: Cloud Run + Neon

### 1. Neon

1. Crea el proyecto en Neon.
2. Copia la connection string **pooled** y quita `channel_binding=require` si aparece (puede dar problemas con `pg`). Déjala así:

```
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

### 2. Preparar la BD (una vez, desde tu máquina)

```bash
npm run build
DATABASE_URL="postgresql://...?sslmode=require" npm run migration:run
DATABASE_URL="postgresql://...?sslmode=require" npm run seed
```

(El contenedor también corre migraciones + seed al arrancar; hacerlo antes evita el primer cold start fallido.)

### 3. Cloud Run — variables

En el servicio de Cloud Run configura al menos:

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string de Neon (`sslmode=require`) |
| `NODE_ENV` | `production` |

Cloud Run inyecta `PORT` solo; no hace falta definirlo.

### 4. Build y deploy (ejemplo)

```bash
# Autenticación y proyecto GCP
gcloud auth login
gcloud config set project TU_PROJECT_ID

# Build de la imagen y push a Artifact Registry / GCR
gcloud builds submit --tag gcr.io/TU_PROJECT_ID/mercadoexpress-api

# Deploy
gcloud run deploy mercadoexpress-api \
  --image gcr.io/TU_PROJECT_ID/mercadoexpress-api \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://...?sslmode=require"
```

Mejor práctica: guardar `DATABASE_URL` en **Secret Manager** y referenciarlo con `--set-secrets`, no en texto plano en el comando.

### 5. Verificar

```
GET https://TU-SERVICIO.run.app/health
GET https://TU-SERVICIO.run.app/api   # Swagger
```

## Licencia

Proyecto de prueba técnica — UNLICENSED.
