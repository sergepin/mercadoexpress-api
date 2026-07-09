import { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { Alert } from '../../src/modules/alerts/entities/alert.entity';
import { InventoryMovement } from '../../src/modules/inventory-movements/entities/movement.entity';
import { Category } from '../../src/modules/products/entities/category.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { PurchaseOrder } from '../../src/modules/purchase-orders/entities/purchase-order.entity';
import { clearDatabase, seedDatabase } from '../../src/database/seed-database';
import { loadTestEnv, TEST_DB_NAME } from './env.helper';

function createTestDataSource(): DataSource {
  loadTestEnv();

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'inventory_user',
    password: process.env.DB_PASSWORD ?? 'inventory_pass',
    database: process.env.DB_NAME ?? TEST_DB_NAME,
    entities: [Category, Product, InventoryMovement, Alert, PurchaseOrder],
    migrations: [join(__dirname, '../../src/database/migrations/*{.ts,.js}')],
    synchronize: false,
  });
}

export async function ensureTestDatabase(): Promise<void> {
  loadTestEnv();

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'inventory_user',
    password: process.env.DB_PASSWORD ?? 'inventory_pass',
    database: 'postgres',
  });

  await client.connect();

  const exists = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [TEST_DB_NAME],
  );

  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  }

  await client.end();
}

export async function runMigrations(): Promise<void> {
  const dataSource = createTestDataSource();
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await clearDatabase(dataSource);
  await seedDatabase(dataSource);
}
