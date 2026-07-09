import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Alert, AlertStatus, AlertType } from '../alerts/entities/alert.entity';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let purchaseOrderRepository: jest.Mocked<Repository<PurchaseOrder>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let alertRepository: jest.Mocked<Repository<Alert>>;
  let productsService: jest.Mocked<ProductsService>;
  let dataSource: jest.Mocked<DataSource>;

  const product: Product = {
    id: 2,
    sku: 'BEB002',
    name: 'Jugo de Naranja 1L',
    category: null as never,
    categoryId: 1,
    price: 3200,
    stock: 30,
    minStock: 40,
    supplier: 'Lácteos del Valle',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeAlert: Alert = {
    id: 1,
    productId: 2,
    product: null as never,
    type: AlertType.STOCK_BAJO,
    status: AlertStatus.ACTIVA,
    createdAt: new Date(),
    resolvedAt: null,
  };

  const pendingOrder: PurchaseOrder = {
    id: 10,
    productId: 2,
    product,
    alertId: 1,
    alert: activeAlert,
    quantity: 80,
    status: PurchaseOrderStatus.PENDIENTE,
    supplier: product.supplier,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    purchaseOrderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<PurchaseOrder>>;

    productRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Product>>;

    alertRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Alert>>;

    productsService = {
      adjustStock: jest.fn(),
      publishStockAdjusted: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;

    dataSource = {
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: purchaseOrderRepository,
        },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(Alert), useValue: alertRepository },
        { provide: ProductsService, useValue: productsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('create', () => {
    const dto: CreatePurchaseOrderDto = {
      productId: 2,
      quantity: 80,
      alertId: 1,
    };

    it('crea orden PENDIENTE cuando los datos son válidos (RN-02)', async () => {
      productRepository.findOne.mockResolvedValue(product);
      alertRepository.findOne.mockResolvedValue(activeAlert);
      purchaseOrderRepository.create.mockReturnValue(pendingOrder);
      purchaseOrderRepository.save.mockResolvedValue(pendingOrder);

      const result = await service.create(dto);

      expect(result.status).toBe(PurchaseOrderStatus.PENDIENTE);
      expect(purchaseOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 2,
          alertId: 1,
          quantity: 80,
          supplier: product.supplier,
        }),
      );
    });

    it('rechaza cantidad menor a stockMinimo * 2 (RN-02)', async () => {
      productRepository.findOne.mockResolvedValue(product);

      await expect(
        service.create({ productId: 2, quantity: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza alertId que no corresponde al producto', async () => {
      productRepository.findOne.mockResolvedValue(product);
      alertRepository.findOne.mockResolvedValue({
        ...activeAlert,
        productId: 99,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('rechaza alertId que no está ACTIVA', async () => {
      productRepository.findOne.mockResolvedValue(product);
      alertRepository.findOne.mockResolvedValue({
        ...activeAlert,
        status: AlertStatus.RESUELTA,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('permite PENDIENTE -> APROBADA (RN-07)', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue({ ...pendingOrder });
      purchaseOrderRepository.save.mockImplementation(async (order) => order);

      const result = await service.approve(10);

      expect(result.status).toBe(PurchaseOrderStatus.APROBADA);
    });

    it('rechaza transición inválida (RN-07)', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue({
        ...pendingOrder,
        status: PurchaseOrderStatus.RECIBIDA,
      });

      await expect(service.approve(10)).rejects.toThrow(BadRequestException);
    });
  });

  describe('receive', () => {
    it('marca RECIBIDA y reutiliza adjustStock (RN-09)', async () => {
      const approvedOrder = {
        ...pendingOrder,
        status: PurchaseOrderStatus.APROBADA,
      };
      const receivedProduct = { ...product, stock: 110 };

      dataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue(approvedOrder),
            save: jest
              .fn()
              .mockResolvedValue({
                ...approvedOrder,
                status: PurchaseOrderStatus.RECIBIDA,
              }),
          }),
        };
        return callback(manager as never);
      });

      productsService.adjustStock.mockResolvedValue(receivedProduct);

      const result = await service.receive(10);

      expect(result.status).toBe(PurchaseOrderStatus.RECIBIDA);
      expect(productsService.adjustStock).toHaveBeenCalled();
      expect(productsService.publishStockAdjusted).toHaveBeenCalledWith(
        receivedProduct,
      );
    });
  });
});
