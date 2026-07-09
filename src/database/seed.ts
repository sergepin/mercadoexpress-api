import 'reflect-metadata';
import {
  Alert,
  AlertStatus,
  AlertType,
} from '../modules/alerts/entities/alert.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import AppDataSource from './data-source';

const CATEGORY_NAMES = [
  'Bebidas',
  'Lácteos',
  'Snacks',
  'Limpieza',
  'Frutas',
  'Granos',
];

const SEED_PRODUCTS: Array<{
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  supplier: string;
}> = [
  {
    sku: 'BEB001',
    name: 'Agua Mineral 500ml',
    category: 'Bebidas',
    price: 1500,
    stock: 150,
    minStock: 50,
    supplier: 'Distribuidora Andina',
  },
  {
    sku: 'BEB002',
    name: 'Jugo de Naranja 1L',
    category: 'Bebidas',
    price: 3200,
    stock: 30,
    minStock: 40,
    supplier: 'Lácteos del Valle',
  },
  {
    sku: 'LAC001',
    name: 'Leche Entera 1L',
    category: 'Lácteos',
    price: 2100,
    stock: 200,
    minStock: 60,
    supplier: 'Lácteos del Valle',
  },
  {
    sku: 'LAC002',
    name: 'Yogur Natural 500g',
    category: 'Lácteos',
    price: 2800,
    stock: 15,
    minStock: 25,
    supplier: 'Lácteos del Valle',
  },
  {
    sku: 'SNA001',
    name: 'Papas Fritas 200g',
    category: 'Snacks',
    price: 2500,
    stock: 80,
    minStock: 30,
    supplier: 'SnacksCorp',
  },
  {
    sku: 'LIM001',
    name: 'Detergente 1L',
    category: 'Limpieza',
    price: 4500,
    stock: 45,
    minStock: 20,
    supplier: 'Químicos del Sur',
  },
];

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
  for (const name of CATEGORY_NAMES) {
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
