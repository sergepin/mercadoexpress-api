# MercadoExpress API

API REST de inventario para MercadoExpress. Prueba técnica: backend claro, testeable y fácil de levantar

Controla productos y stock, genera alertas cuando el inventario baja del mínimo, guarda un historial de movimientos que no se edita ni se borra, y maneja órdenes de compra de punta a punta. Para usarlo con interfaz gráfica está el frontend en otro repo

## En vivo

| Qué | Dónde |
|-----|--------|
| Frontend | [mercadoexpress-web.vercel.app](https://mercadoexpress-web.vercel.app) |
| Código del frontend | [github.com/sergepin/mercadoexpress-web](https://github.com/sergepin/mercadoexpress-web) |
| API | `https://mercadoexpress-api-205454922130.southamerica-west1.run.app` |
| Swagger Docs | `https://mercadoexpress-api-205454922130.southamerica-west1.run.app/api` |

## Qué usé y por qué

**En el servidor**

- NestJS y TypeScript, organizan bien módulos, controllers y services sin inventar la rueda de nuevo
- PostgreSQL con TypeORM: el dominio es tablas relacionadas (productos, movimientos, alertas, órdenes) y necesito migraciones y transacciones
- Docker Compose para que cualquiera pueda subir API y DB con un solo comando
- class-validator en los DTOs, event-emitter para las alertas, Swagger para documentar

**En producción**

- Google Cloud Run: corro el contenedor, me olvido de VMs y el `PORT` viene solo, con tal de mantenerlo sencillo

- Neon: Postgres en la nube con SSL

**En el cliente**

- Next.js en [mercadoexpress-web](https://github.com/sergepin/mercadoexpress-web), publicado en Vercel: [mercadoexpress-web.vercel.app](https://mercadoexpress-web.vercel.app).
- Consume el REST de este API y escucha alertas en vivo con SSE (`GET /alerts/stream`).

Cómo desplegar Cloud Run + Neon: [`docs/deploy-cloud-run-neon.md`](docs/deploy-cloud-run-neon.md).

## Cómo está armado

Cada feature vive en su módulo. El HTTP entra por el controller, la regla de negocio está en el service, y TypeORM habla con la base. Así puedo testear el service sin montar el servidor.

```
src/
  modules/
    products/              productos y ajuste de stock
    inventory-movements/   historial de movimientos
    alerts/                alertas de stock bajo
    purchase-orders/       órdenes de compra
  common/                  errores, eventos, CORS, utilidades
  database/                migraciones y seed
```

Cuando cambia el stock, `ProductsService` emite `stock.adjusted`. Alerts escucha ese evento y crea o cierra la alerta. Products no conoce Alerts: si mañana cambia cómo se notifican las alertas, el ajuste de stock sigue igual. Al recibir una orden se reutiliza el mismo `adjustStock`, así que el flujo de alertas también.

Para el front hay eventos más finos (`alert.created`, `alert.resolved`) que salen por SSE. El navegador solo se entera cuando de verdad hubo una alerta nueva o una resuelta.

Las operaciones que tocan más de una tabla (stock + movimiento, o recibir orden + stock) van en una transacción. Prefiero un error limpio a datos a medias.

El frontend está en otro repositorio a propósito. Este repo es el API; el otro es la UI. Deploys distintos (Cloud Run vs Vercel), stacks distintos, y CORS con `FRONTEND_ORIGIN` bien explícito.

Cumplimiento de requisitos: [`docs/requisitos-funcionales.md`](docs/requisitos-funcionales.md).

## Arrancar con Docker

```bash
cp .env.example .env
docker-compose up --build
```

| Recurso | URL |
|---------|-----|
| Health | `GET http://localhost:3000/health` |
| Swagger | `http://localhost:3000/api` |

Al subir el contenedor corren migraciones y seed: 6 categorías, 6 productos y 2 alertas activas (BEB002 y LAC002 empiezan bajo el mínimo).

Si venís de un esquema viejo:

```bash
docker-compose down -v && docker-compose up --build
```

## API en local (solo la BD en Docker)

```bash
cp .env.example .env
docker-compose up db -d

npm install
npm run build
npm run migration:run
npm run seed
npm run start:dev
```

Front en local: API en `:3000`, Next en `:3001`, y `FRONTEND_ORIGIN=http://localhost:3001` en el `.env` de acá. Más detalle en el [README del web](https://github.com/sergepin/mercadoexpress-web).

## Tests

```bash
npm test
npm run test:e2e
npm run test:cov
```

Los e2e usan Supertest contra Nest en memoria y una base `inventory_db_test`, nunca la de desarrollo. El setup crea esa BD, migra y cada suite vuelve al seed.

## Endpoints

| Módulo | Rutas |
|--------|-------|
| Productos | `POST/GET /products`, `GET /products/:id`, `PATCH /products/:id/stock` |
| Alertas | `GET /alerts`, `GET /alerts/stream` (SSE) |
| Órdenes | `POST/GET /purchase-orders`, `PATCH .../approve\|reject\|receive` |
| Health | `GET /health` |

Filtros en productos: `category`, `supplier`, `minStock`, `maxStock`, `withActiveAlert`. Categoría y proveedor no distinguen mayúsculas ni acentos.

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Uso |
|----------|-----|
| `DB_*` | Postgres local / docker-compose |
| `PORT` | En local 3000; en Cloud Run lo pone la plataforma |
| `FRONTEND_ORIGIN` | Origen CORS (`:3001` o la URL de Vercel) |
| `DATABASE_URL` / `DB_SSL` | Neon en producción |

Más en [`docs/deploy-cloud-run-neon.md`](docs/deploy-cloud-run-neon.md).

## Uso de IA en el desarrollo

Trabajé de la mano con **Cursor** durante gran parte del proyecto. No como piloto automático que escribe todo solo, de forma simirlar a tener un compañero haciendo pair programming: yo defino el rumbo, reviso y decido; la IA acelera implementación, búsqueda de code smells y pulido de calidad

Para que no inventara arquitectura ni se saliera de las reglas del enunciado, usé **Cursor Rules** (`.cursor/rules/`). Ahí quedó escrito el overview del proyecto, cómo está armado el código, las reglas de negocio (RN) y el contrato del API. Con eso la IA mantiene el mismo estilo, respeta las validaciones y no propone stacks o capas que no pedí

En la práctica me sirvió para:

- Detectar code smells y inconsistencias (mensajes de error, imports muertos, seed vs reglas de negocio, etc.)
- Mejoras de calidad útiles (constantes, CORS, SSE, tests)
- Documentación y handoffs sin perder el hilo del dominio
- Iterar más rápido en Docker, Cloud Run y el cableado con el frontend

La responsabilidad del diseño y de lo que entra al repo sigue siendo mía. Las rules son el contrato con la herramienta: mismos lineamientos en cada chat, menos alucinaciones y/o desviaciones de la meta

## Licencia

Prueba técnica. UNLICENSED.
