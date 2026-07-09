import 'reflect-metadata';
import {
  Alert,
  AlertStatus,
  AlertType,
} from '../modules/alerts/entities/alert.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import AppDataSource from './data-source';
import { SEED_CATEGORY_NAMES, SEED_PRODUCTS } from './seed-data';

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const categoryRepo = AppDataSource.getRepository(Category);
  const productRepo = AppDataSource.getRepository(Product);

  const existingProducts = await productRepo.count();
  if (existingProducts > 0) {
    console.log('Seed already applied, skipping.');
    await AppDataSource.destroy();
    return;
  }

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

  const alertRepo = AppDataSource.getRepository(Alert);

  for (const product of savedProducts) {
    if (product.stock < product.minStock) {
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

  console.log(
    `Seed completed: ${categories.size} categories, ${savedProducts.length} products.`,
  );
  await AppDataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
