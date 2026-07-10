import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Alert } from '../modules/alerts/entities/alert.entity';
import { InventoryMovement } from '../modules/inventory-movements/entities/movement.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import { PurchaseOrder } from '../modules/purchase-orders/entities/purchase-order.entity';
import { buildTypeOrmOptions } from './typeorm.config';

export default new DataSource({
  ...buildTypeOrmOptions(process.env),
  entities: [Category, Product, InventoryMovement, Alert, PurchaseOrder],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
