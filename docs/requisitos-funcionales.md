# Cumplimiento de Requisitos Funcionales (RF)

Documento vivo que explica **cómo se implementa cada RF**, qué decisiones se tomaron y qué falta por hacer. Complementa el README (setup/infra) con el enfoque en negocio y arquitectura.

**Última actualización:** RF-01 a RF-06 implementados.

---

## Leyenda de estado

| Estado | Significado |
|--------|-------------|
| ✅ | Implementado y verificable |
| 🟡 | Parcialmente implementado (base lista, falta endpoint o listener) |
| ⏳ | Pendiente |

---

## Infraestructura base (prerrequisito de todos los RF)

| Pieza | Estado | Dónde vive | Qué hace |
|-------|--------|------------|----------|
| Docker + Postgres | ✅ | `docker-compose.yml`, `Dockerfile` | `docker-compose up --build` levanta API + BD |
| Migraciones | ✅ | `src/database/migrations/` | Crea tablas al arrancar el contenedor |
| Seed de datos | ✅ | `src/database/seed.ts` | 6 categorías, 6 productos, 2 alertas iniciales |
| TypeORM + Config | ✅ | `src/app.module.ts` | Conexión a Postgres vía variables de entorno |
| Validación global | ✅ | `src/main.ts` | `ValidationPipe` en todos los endpoints |
| Filtro de errores | ✅ | `src/common/filters/http-exception.filter.ts` | Respuestas de error normalizadas |
| Swagger | ✅ | `src/main.ts` → `/api` | Documentación generada desde decoradores |
| IDs autoincrementales | ✅ | Todas las entidades | `SERIAL` en Postgres, `number` en TypeScript |

### Decisión: IDs enteros en lugar de UUID

Para un inventario interno con pocos registros, los enteros autoincrementales son más simples de depurar (`/products/3`), ocupan menos espacio en índices y el seed produce IDs predecibles (Bebidas = 1, Lácteos = 2, etc.). Los UUIDs tendrían más sentido en sistemas distribuidos donde se generan IDs en el cliente sin riesgo de colisión.

> Si ya corriste Docker con el esquema anterior (UUID), recrea el volumen: `docker-compose down -v && docker-compose up --build`

---

## RF-01 — Registro de productos ✅

**Módulo:** `src/modules/products/`  
**Objetivo:** Crear, consultar y filtrar productos, y ajustar su stock.

### Endpoints implementados

| Método | Ruta | Archivo principal |
|--------|------|-------------------|
| `POST` | `/products` | `products.controller.ts` → `ProductsService.create()` |
| `GET` | `/products` | `ProductsService.findAll()` |
| `GET` | `/products/:id` | `ProductsService.findOne()` |
| `PATCH` | `/products/:id/stock` | `ProductsService.adjustStock()` |

### Cómo se cumple cada validación (`POST /products`)

Las validaciones del contrato API viven en el **DTO**, no en el controller. NestJS las ejecuta automáticamente con el `ValidationPipe` global antes de que llegue al service.

| Regla del contrato | Dónde se valida | Cómo |
|--------------------|-----------------|------|
| SKU único | `ProductsService.create()` | Consulta previa; si existe → `ConflictException` (409) |
| precio > 0 | `CreateProductDto` | `@IsPositive()` |
| stock >= 0 | `CreateProductDto` | `@IsInt()` + `@Min(0)` |
| stock mínimo > 0 | `CreateProductDto` | `@IsInt()` + `@IsPositive()` |
| nombre 3–100 chars | `CreateProductDto` | `@Length(3, 100)` |
| categoría existente | `ProductsService.create()` | Busca por `categoryId`; si no existe → `NotFoundException` (404) |

**Por qué dividir validación entre DTO y service:** el DTO valida la *forma* de los datos (tipos, rangos). El service valida *reglas de negocio que requieren consultar la BD* (SKU único, categoría existente). Esa separación es estándar en APIs REST bien diseñadas.

### Filtros (`GET /products`)

Implementados con **QueryBuilder** de TypeORM en `ProductsService.findAll()`:

| Query param | Comportamiento |
|-------------|----------------|
| `category` | Filtra por nombre de categoría (`Bebidas`, `Lácteos`, etc.) |
| `supplier` | Coincidencia exacta con el proveedor |
| `minStock` / `maxStock` | Rango sobre el stock actual del producto |
| `withActiveAlert=true` | Consulta IDs con alerta activa vía `AlertsService.getActiveAlertProductIds()` |

### Ajuste de stock (`PATCH /products/:id/stock`)

Esta operación es la más importante de RF-01 porque conecta con RF-02 y RF-03.

**Flujo:**

```
1. Inicia transacción TypeORM
2. Carga el producto
3. Calcula stockAfter según type (ENTRADA suma, SALIDA resta)
4. Valida RN-01 (stock no negativo)
5. Persiste el nuevo stock
6. Registra movimiento vía InventoryMovementsService
7. Commit de la transacción
8. Emite evento stock.adjusted (fuera de la transacción)
```

**Archivos involucrados:**

- `dto/adjust-stock.dto.ts` — contrato HTTP (`ENTRADA` / `SALIDA`)
- `products.service.ts` — lógica y transacción
- `inventory-movements/inventory-movements.service.ts` — persistencia del movimiento
- `common/events/stock-adjusted.event.ts` — payload del evento

Los valores del DTO coinciden con el enum `MovementType` en dominio interno (`ENTRADA` / `SALIDA`).

### Reglas de negocio cubiertas por RF-01

| RN | Estado | Cómo |
|----|--------|------|
| RN-01 — Stock no negativo | ✅ | `BadRequestException` con mensaje: `Stock insuficiente: disponible X, solicitado Y, faltan Z` |
| RN-03 — Alertas vía eventos | ✅ | Listener en `alerts.listener.ts` reacciona a `stock.adjusted` |
| RN-06 — Movimientos inmutables | ✅ | Solo hay `recordMovement()` (insert). No existen endpoints de update/delete |

### Arquitectura del módulo

```
products/
  dto/              ← validación de entrada HTTP
  entities/         ← modelo de BD (Product, Category)
  events/           ← (movido a common/events/)
  products.controller.ts   ← solo HTTP, cero lógica
  products.service.ts      ← reglas de negocio
  products.module.ts       ← encapsula dependencias del feature
```

`ProductsModule` importa `InventoryMovementsModule` y exporta `ProductsService` para que otros módulos (p. ej. `purchase-orders`) reutilicen `adjustStock()` sin duplicar lógica.

### Tests

`products.service.spec.ts` — 6 tests unitarios que cubren:

- Creación exitosa
- SKU duplicado → 409
- Stock inicial ≤ mínimo → emite evento
- Producto no encontrado → 404
- Salida con stock insuficiente → RN-01
- Entrada válida → movimiento + evento

Los repositorios se mockean: el service se prueba **sin BD ni HTTP**.

### Ejemplos de uso

```http
GET /products?withActiveAlert=true
GET /products?category=Bebidas&minStock=10&maxStock=200

POST /products
{
  "sku": "BEB003",
  "name": "Gaseosa 2L",
  "categoryId": 1,
  "price": 2500,
  "stock": 100,
  "minStock": 30,
  "supplier": "Distribuidora Andina"
}

PATCH /products/2/stock
{
  "type": "SALIDA",
  "quantity": 5,
  "reason": "Venta mostrador"
}
```

---

## RF-02 — Historial de ajustes de stock ✅

**Módulo:** `src/modules/inventory-movements/`  
**Objetivo:** Registrar cada cambio de stock de forma inmutable.

### Qué está hecho

- Entidad `InventoryMovement` con `stockBefore`, `stockAfter`, `type`, `reason`, `createdAt`
- `InventoryMovementsService.recordMovement()` — solo inserta, nunca actualiza ni borra (RN-06)
- Se invoca desde `ProductsService.adjustStock()` dentro de la misma transacción

### Nota

No hay endpoint `GET` de movimientos en el contrato API; el historial queda persistido en BD y es consultable directamente si el examinador lo necesita.

---

## RF-03 — Alertas de stock bajo ✅

**Módulo:** `src/modules/alerts/`  
**Objetivo:** Crear y resolver alertas `STOCK_BAJO` automáticamente cuando el stock cruza el umbral mínimo.

### Endpoint implementado

| Método | Ruta | Archivo |
|--------|------|---------|
| `GET` | `/alerts` | `alerts.controller.ts` → `AlertsService.findAll()` |

Filtro opcional: `?status=ACTIVA` o `?status=RESUELTA`.

No hay endpoints para crear ni cerrar alertas manualmente (por diseño).

### Flujo reactivo (patrón de eventos)

```
ProductsService.adjustStock() / create()
        │
        └── emit('stock.adjusted', { productId, newStock, minStock })
                    │
                    ▼
            AlertsListener (@OnEvent)
                    │
                    └── AlertsService.handleStockAdjusted()
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
         stock <= minStock         stock > minStock
         ensureActiveAlert()       resolveActiveAlert()
         (crea si no existe)       (RESUELTA + resolvedAt)
```

`ProductsService` **no importa** `AlertsService`. El desacoplamiento es obligatorio.

### Reglas de negocio cubiertas

| RN | Cómo |
|----|------|
| RN-03 | Si `newStock <= minStock` → crea alerta `STOCK_BAJO` `ACTIVA` |
| RN-04 | Antes de crear, busca alerta activa existente; índice único parcial en BD impide duplicados |
| RN-05 | Si `newStock > minStock` → marca alerta activa como `RESUELTA` con `resolvedAt` |

### Archivos clave

```
alerts/
  dto/filter-alerts.dto.ts
  entities/alert.entity.ts
  alerts.service.ts       ← lógica RN-03/04/05
  alerts.listener.ts      ← @OnEvent('stock.adjusted')
  alerts.controller.ts    ← GET /alerts
  alerts.module.ts
  alerts.service.spec.ts  ← 4 tests unitarios
```

### Tests

`alerts.service.spec.ts` cubre:

- Stock bajo → crea alerta (RN-03)
- Stock bajo con alerta existente → no duplica (RN-04)
- Stock sube → resuelve alerta (RN-05)
- Stock sube sin alerta → no hace nada

### Verificación manual

```http
# Bajar stock hasta quedar <= mínimo
PATCH /products/1/stock
{ "type": "SALIDA", "quantity": 120, "reason": "Venta" }

# Debe aparecer en alertas activas
GET /alerts?status=ACTIVA

# Debe aparecer en filtro de productos
GET /products?withActiveAlert=true

# Subir stock por encima del mínimo
PATCH /products/1/stock
{ "type": "ENTRADA", "quantity": 50, "reason": "Reposición" }

# La alerta debe pasar a RESUELTA
GET /alerts?status=RESUELTA
```

---

## RF-04 y RF-05 — Órdenes de compra ✅

**Módulo:** `src/modules/purchase-orders/`  
**Objetivo:** Crear órdenes, aprobar/rechazar/recibir, y al recibir incrementar stock reutilizando `adjustStock()`.

### Endpoints implementados

| Método | Ruta | RF | Transición / acción |
|--------|------|-----|---------------------|
| `POST` | `/purchase-orders` | RF-04 | Crear en `PENDIENTE` |
| `GET` | `/purchase-orders` | RF-04 | Listar |
| `GET` | `/purchase-orders/:id` | RF-04 | Detalle |
| `PATCH` | `/purchase-orders/:id/approve` | RF-05 | `PENDIENTE → APROBADA` |
| `PATCH` | `/purchase-orders/:id/reject` | RF-05 | `PENDIENTE → RECHAZADA` |
| `PATCH` | `/purchase-orders/:id/receive` | RF-05 | `APROBADA → RECIBIDA` + stock |

### `alertId` opcional (trazabilidad plus)

`POST /purchase-orders` acepta `alertId` opcional para el flujo *"crear desde alerta"*:

```json
{
  "productId": 2,
  "quantity": 80,
  "alertId": 1
}
```

Si viene `alertId`, el service valida:

- La alerta existe
- Está `ACTIVA`
- Pertenece al mismo `productId`

Se persiste en `purchase_orders.alert_id` para auditoría. Sin `alertId`, la orden se crea igual (flujo manual).

### Reglas de negocio cubiertas

| RN | Cómo |
|----|------|
| RN-02 | `quantity >= product.minStock * 2` al crear |
| RN-07 | Máquina de estados estricta; transiciones inválidas → 400 |
| RN-08 | `reject` exige `reason` de mín. 10 caracteres (DTO) |
| RN-09 | `receive` llama `ProductsService.adjustStock(ENTRY)` en la misma transacción |

### Flujo de recepción (RN-09)

```
PATCH /purchase-orders/:id/receive
        │
        └── transacción TypeORM
              ├── orden → RECIBIDA
              └── ProductsService.adjustStock(ENTRADA, manager)
                        ├── movimiento (RF-02)
                        └── (evento se emite después del commit)
                                  └── AlertsListener (RF-03)
```

`adjustStock` acepta `EntityManager` opcional para participar en la transacción del caller. El evento `stock.adjusted` se publica **después** del commit vía `emitStockAdjustedEvent()`.

### Archivos clave

```
purchase-orders/
  dto/create-purchase-order.dto.ts
  dto/reject-purchase-order.dto.ts
  entities/purchase-order.entity.ts
  purchase-orders.service.ts
  purchase-orders.controller.ts
  purchase-orders.module.ts
  purchase-orders.service.spec.ts
```

### Migración

`1740000000001-AddPurchaseOrderAlertAndRejection.ts` agrega `alert_id` y `rejection_reason` a `purchase_orders`.

### Verificación manual (flujo completo)

```http
GET /alerts?status=ACTIVA

POST /purchase-orders
{
  "productId": 2,
  "quantity": 80,
  "alertId": 1
}

PATCH /purchase-orders/1/approve
PATCH /purchase-orders/1/receive

GET /products/2
GET /alerts?status=ACTIVA
```

---

## RF-06 — Consulta de inventario con filtros ✅

**Módulo:** `src/modules/products/` (mismo endpoint `GET /products` de RF-01)  
**Objetivo:** Consultar inventario con filtros combinables, incluyendo búsqueda tolerante a mayúsculas/acentos.

### Filtros soportados

| Query param | Comportamiento |
|-------------|----------------|
| `category` | Nombre de categoría, insensible a mayúsculas y acentos (`lacteos` = `Lácteos`) |
| `supplier` | Proveedor, misma normalización que categoría |
| `minStock` / `maxStock` | Rango sobre el stock actual |
| `withActiveAlert=true` | Solo productos con alerta `ACTIVA` |

Los filtros se pueden combinar. La implementación vive en `ProductsService.findAll()` con QueryBuilder.

### Normalización de texto

Extensión PostgreSQL `unaccent` habilitada en migración `1740000000002`. Helper reutilizable:

```
src/common/utils/normalized-text-search.ts
```

Compara con `unaccent(lower(trim(campo)))` para evitar discrepancias por tildes o casing.

### Ejemplos

```http
GET /products?category=lacteos
GET /products?supplier=distribuidora%20andina&minStock=10
GET /products?withActiveAlert=true&category=bebidas
```

---

## Mapa de dependencias entre RF

```
RF-01 (products)
  │
  ├── ajuste de stock ──► RF-02 (movimientos)     ✅
  │         │
  │         └── evento stock.adjusted ──► RF-03 (alertas)   ✅
  │
  └── ProductsService.adjustStock() ◄── RF-05 (recepción de orden)   ✅
```

---

## Próximos pasos sugeridos

_Ninguno crítico — RF-01 a RF-06 con tests unitarios y e2e de negocio._

---

## Cómo mantener este documento

Al implementar un RF nuevo:

1. Cambiar el estado en la tabla de leyenda al inicio de la sección.
2. Documentar endpoints, archivos clave y reglas de negocio cubiertas.
3. Indicar decisiones de diseño relevantes (no solo *qué* se hizo, sino *por qué*).
4. Agregar ejemplos HTTP verificables.
