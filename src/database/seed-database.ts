import { DataSource } from 'typeorm';
import {
  Alert,
  AlertStatus,
  AlertType,
} from '../modules/alerts/entities/alert.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import { SEED_CATEGORY_NAMES, SEED_PRODUCTS } from './seed-data';

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    TRUNCATE TABLE
      purchase_orders,
      inventory_movements,
      alerts,
      products,
      categories
    RESTART IDENTITY CASCADE
  `);
}

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(Category);
  const productRepo = dataSource.getRepository(Product);
  const alertRepo = dataSource.getRepository(Alert);

  const categories = new Map<string, Category>();
  for (const name of SEED_CATEGORY_NAMES) {
    const category = categoryRepo.create({ name });
    categories.set(name, await categoryRepo.save(category));
  }

  const savedProducts: Product[] = [];
  for (const item of SEED_PRODUCTS) {
    const category = categories.get(item.category);
    if (!category) {
      throw new Error(`Category not found for seed product ${item.sku}`);
    }

    const product = productRepo.create({
      sku: item.sku,
      name: item.name,
      category,
      categoryId: category.id,
      price: item.price,
      stock: item.stock,
      minStock: item.minStock,
      supplier: item.supplier,
    });

    savedProducts.push(await productRepo.save(product));
  }

  for (const product of savedProducts) {
    if (product.stock <= product.minStock) {
      await alertRepo.save(
        alertRepo.create({
          productId: product.id,
          product,
          type: AlertType.STOCK_BAJO,
          status: AlertStatus.ACTIVA,
          resolvedAt: null,
        }),
      );
    }
  }
}
