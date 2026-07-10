#!/bin/sh
set -e

# Solo para docker-compose local. En Cloud Run el CMD arranca la API directo
# (migraciones/seed se corren una vez desde tu máquina o con un Job).
if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  echo "Running migrations..."
  npm run migration:run

  echo "Running seed (idempotent)..."
  npm run seed
fi

echo "Starting API on PORT=${PORT:-3000}..."
exec node dist/main.js
