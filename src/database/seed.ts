import 'reflect-metadata';
import AppDataSource from './data-source';
import { seedDatabase } from './seed-database';
import { Product } from '../modules/products/entities/product.entity';

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const productRepo = AppDataSource.getRepository(Product);
  const existingProducts = await productRepo.count();
  if (existingProducts > 0) {
    console.log('Seed already applied, skipping.');
    await AppDataSource.destroy();
    return;
  }

  await seedDatabase(AppDataSource);

  console.log('Seed completed.');
  await AppDataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
