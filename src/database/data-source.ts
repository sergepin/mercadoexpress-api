import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Alert } from '../modules/alerts/entities/alert.entity';
import { InventoryMovement } from '../modules/inventory-movements/entities/movement.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import { PurchaseOrder } from '../modules/purchase-orders/entities/purchase-order.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'inventory_user',
  password: process.env.DB_PASSWORD ?? 'inventory_pass',
  database: process.env.DB_NAME ?? 'inventory_db',
  entities: [Category, Product, InventoryMovement, Alert, PurchaseOrder],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
