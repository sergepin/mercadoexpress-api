import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryMovementsService } from '../inventory-movements/inventory-movements.service';
import { MovementType } from '../inventory-movements/entities/movement.entity';
import { StockAdjustmentType } from './dto/adjust-stock.dto';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { STOCK_ADJUSTED_EVENT } from './events/stock-adjusted.event';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: jest.Mocked<Repository<Product>>;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let inventoryMovementsService: jest.Mocked<InventoryMovementsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataSource: jest.Mocked<DataSource>;

  const category: Category = {
    id: 1,
    name: 'Bebidas',
    products: [],
  };

  const product: Product = {
    id: 1,
    sku: 'BEB001',
    name: 'Agua Mineral 500ml',
    category,
    categoryId: category.id,
    price: 1500,
    stock: 150,
    minStock: 50,
    supplier: 'Distribuidora Andina',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    productRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Product>>;

    categoryRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Category>>;

    inventoryMovementsService = {
      recordMovement: jest.fn(),
    } as unknown as jest.Mocked<InventoryMovementsService>;

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    dataSource = {
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
        {
          provide: InventoryMovementsService,
          useValue: inventoryMovementsService,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('crea un producto cuando los datos son válidos', async () => {
      categoryRepository.findOne.mockResolvedValue(category);
      productRepository.findOne.mockResolvedValue(null);
      productRepository.create.mockReturnValue(product);
      productRepository.save.mockResolvedValue(product);

      const result = await service.create({
        sku: 'BEB001',
        name: 'Agua Mineral 500ml',
        categoryId: category.id,
        price: 1500,
        stock: 150,
        minStock: 50,
        supplier: 'Distribuidora Andina',
      });

      expect(result).toEqual(product);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el SKU ya existe', async () => {
      categoryRepository.findOne.mockResolvedValue(category);
      productRepository.findOne.mockResolvedValue(product);

      await expect(
        service.create({
          sku: 'BEB001',
          name: 'Agua Mineral 500ml',
          categoryId: category.id,
          price: 1500,
          stock: 150,
          minStock: 50,
          supplier: 'Distribuidora Andina',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('emite stock.adjusted si el stock inicial queda en o bajo el mínimo', async () => {
      const lowStockProduct = { ...product, stock: 10, minStock: 50 };

      categoryRepository.findOne.mockResolvedValue(category);
      productRepository.findOne.mockResolvedValue(null);
      productRepository.create.mockReturnValue(lowStockProduct);
      productRepository.save.mockResolvedValue(lowStockProduct);

      await service.create({
        sku: 'BEB003',
        name: 'Gaseosa 2L',
        categoryId: category.id,
        price: 2500,
        stock: 10,
        minStock: 50,
        supplier: 'Distribuidora Andina',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        STOCK_ADJUSTED_EVENT,
        expect.objectContaining({
          productId: lowStockProduct.id,
          newStock: 10,
          minStock: 50,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('aplica filtro de categoría insensible a mayúsculas y acentos', async () => {
      const andWhere = jest.fn().mockReturnThis();
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere,
        getMany: jest.fn().mockResolvedValue([]),
      };
      productRepository.createQueryBuilder.mockReturnValue(qb as never);

      await service.findAll({ category: 'lacteos' });

      expect(andWhere).toHaveBeenCalledWith(
        'unaccent(lower(trim(category.name))) = unaccent(lower(trim(:category)))',
        { category: 'lacteos' },
      );
    });

    it('aplica filtro de proveedor insensible a mayúsculas y acentos', async () => {
      const andWhere = jest.fn().mockReturnThis();
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere,
        getMany: jest.fn().mockResolvedValue([]),
      };
      productRepository.createQueryBuilder.mockReturnValue(qb as never);

      await service.findAll({ supplier: 'LACTEOS DEL VALLE' });

      expect(andWhere).toHaveBeenCalledWith(
        'unaccent(lower(trim(product.supplier))) = unaccent(lower(trim(:supplier)))',
        { supplier: 'LACTEOS DEL VALLE' },
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el producto no existe', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('adjustStock', () => {
    it('lanza BadRequestException cuando la salida deja stock negativo (RN-01)', async () => {
      dataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue({ ...product, stock: 10 }),
            save: jest.fn(),
          }),
        };
        return callback(manager as never);
      });

      await expect(
        service.adjustStock(1, {
          type: StockAdjustmentType.EXIT,
          quantity: 15,
          reason: 'Venta',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('registra movimiento y emite stock.adjusted en una entrada válida', async () => {
      const updatedProduct = { ...product, stock: 160 };

      dataSource.transaction.mockImplementation(async (callback) => {
        const save = jest.fn().mockResolvedValue(updatedProduct);
        const manager = {
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue({ ...product }),
            save,
          }),
        };
        return callback(manager as never);
      });

      inventoryMovementsService.recordMovement.mockResolvedValue({} as never);

      const result = await service.adjustStock(1, {
        type: StockAdjustmentType.ENTRY,
        quantity: 10,
        reason: 'Compra',
      });

      expect(result.stock).toBe(160);
      expect(inventoryMovementsService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          type: MovementType.ENTRADA,
          quantity: 10,
          stockBefore: 150,
          stockAfter: 160,
        }),
        expect.anything(),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        STOCK_ADJUSTED_EVENT,
        expect.objectContaining({
          productId: product.id,
          newStock: 160,
          minStock: 50,
        }),
      );
    });
  });
});
