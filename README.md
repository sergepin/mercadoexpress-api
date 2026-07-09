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

# E2e (requiere BD accesible con las variables de .env)
npm run test:e2e

# Cobertura
npm run test:cov
```

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
| `DB_HOST` | Host de PostgreSQL |
| `DB_PORT` | Puerto (5432) |
| `DB_USER` | Usuario |
| `DB_PASSWORD` | Contraseña |
| `DB_NAME` | Nombre de la base |
| `PORT` | Puerto del API (3000) |

## Licencia

Proyecto de prueba técnica — UNLICENSED.
