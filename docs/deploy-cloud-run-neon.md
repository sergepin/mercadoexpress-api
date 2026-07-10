# Deploy: Google Cloud Run + Neon

Guía para desplegar MercadoExpress API en producción.

| Pieza | Elección |
|-------|----------|
| Contenedor / runtime | **Google Cloud Run** |
| Base de datos | **Neon** (PostgreSQL managed) |

---

## 1. Neon

1. Crea el proyecto en [console.neon.tech](https://console.neon.tech).
2. Copia la connection string **pooled**.
3. Quita `channel_binding=require` si aparece (puede dar problemas con el driver `pg`). Déjala así:

```
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

Sustituye `USER`, `PASSWORD` y `HOST` por los valores reales de Neon (no uses esos textos literales).

Si compartiste la password en un chat o commit, **reseteala** en Neon antes de continuar.

---

## 2. Preparar la BD (una vez, desde tu máquina) — obligatorio

Cloud Run **no** corre migraciones al arrancar. Si el contenedor intenta migrar/seedear antes de abrir el puerto, falla con el error de `PORT=8080`.

Desde la raíz del repo:

```bash
npm run build

DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" npm run migration:run

DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" npm run seed
```

Usa tu connection string real de Neon.

---

## 3. Cloud Run — variables (obligatorio)

Sin `DATABASE_URL`, Nest intenta conectar a `localhost` y el proceso se cae **antes** de escuchar el puerto → Cloud Run reporta fallo de startup.

En el servicio: **Edit & deploy new revision → Variables & secrets**:

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string de Neon (`sslmode=require`, sin `channel_binding`) |
| `NODE_ENV` | `production` |

Cloud Run inyecta `PORT=8080` solo; no hace falta definirlo.

---

## 4. ¿Necesitas instalar `gcloud`?

| Camino | ¿Instalar CLI? |
|--------|----------------|
| Consola web de Google Cloud | No |
| Terminal (`gcloud builds submit`, `gcloud run deploy`) | Sí — [Cloud SDK](https://cloud.google.com/sdk/docs/install) |

Neon no requiere CLI: todo se gestiona en la consola web.

---

## 5. Build y deploy con `gcloud` (ejemplo)

```bash
gcloud auth login
gcloud config set project TU_PROJECT_ID

gcloud builds submit --tag gcr.io/TU_PROJECT_ID/mercadoexpress-api

gcloud run deploy mercadoexpress-api \
  --image gcr.io/TU_PROJECT_ID/mercadoexpress-api \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://...?sslmode=require"
```

Mejor práctica: guardar `DATABASE_URL` en **Secret Manager** y referenciarlo con `--set-secrets`, no en texto plano en el comando.

---

## 6. Verificar

```
GET https://TU-SERVICIO.run.app/health
GET https://TU-SERVICIO.run.app/api
```

---

## Troubleshooting: "failed to start and listen on PORT=8080"

Eso **casi nunca** es el puerto en el código (la app usa `process.env.PORT` y escucha en `0.0.0.0`). Significa que el proceso se cayó antes de abrir el puerto.

1. Abre el **Logs URL** del error en Cloud Run.
2. Busca líneas con `Error`, `ECONNREFUSED`, `password authentication`, `DATABASE_URL`, `Cannot connect`.
3. Causas típicas:
   - Falta `DATABASE_URL` en Cloud Run
   - URL con `channel_binding=require` (quítalo)
   - Tablas no creadas → corre `migration:run` desde tu PC
   - Password de Neon incorrecta / rotada
   - Usaste placeholders literales (`HOST`, `USER`, `PASS`) en lugar de la URL real

---

## Variables relacionadas

Ver también [`.env.example`](../.env.example):

| Variable | Uso en deploy |
|----------|----------------|
| `DATABASE_URL` | Preferida en Neon / Cloud Run |
| `DB_SSL` | `true` si usas `DB_HOST` / `DB_USER` / etc. en lugar de `DATABASE_URL` |
| `PORT` | Lo inyecta Cloud Run; no hace falta configurarlo |
