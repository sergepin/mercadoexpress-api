#!/bin/sh
set -e

echo "Running migrations..."
npm run migration:run

echo "Running seed (idempotent)..."
npm run seed

echo "Starting API..."
exec node dist/main.js
