import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  InventoryMovement,
  MovementType,
} from './entities/movement.entity';
import { InventoryMovementsService } from './inventory-movements.service';

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;
  let movementRepository: jest.Mocked<Repository<InventoryMovement>>;

  const movement: InventoryMovement = {
    id: 1,
    productId: 10,
    product: null as never,
    type: MovementType.ENTRADA,
    quantity: 5,
    reason: 'Compra',
    stockBefore: 10,
    stockAfter: 15,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    movementRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<InventoryMovement>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryMovementsService,
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: movementRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryMovementsService>(InventoryMovementsService);
  });

  it('recordMovement persiste usando el repositorio por defecto', async () => {
    movementRepository.create.mockReturnValue(movement);
    movementRepository.save.mockResolvedValue(movement);

    const result = await service.recordMovement({
      productId: 10,
      type: MovementType.ENTRADA,
      quantity: 5,
      reason: 'Compra',
      stockBefore: 10,
      stockAfter: 15,
    });

    expect(movementRepository.create).toHaveBeenCalledWith({
      productId: 10,
      type: MovementType.ENTRADA,
      quantity: 5,
      reason: 'Compra',
      stockBefore: 10,
      stockAfter: 15,
    });
    expect(movementRepository.save).toHaveBeenCalledWith(movement);
    expect(result).toBe(movement);
  });

  it('recordMovement usa EntityManager cuando se proporciona', async () => {
    const managerRepo = {
      create: jest.fn().mockReturnValue(movement),
      save: jest.fn().mockResolvedValue(movement),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(managerRepo),
    } as unknown as EntityManager;

    const result = await service.recordMovement(
      {
        productId: 10,
        type: MovementType.SALIDA,
        quantity: 3,
        reason: 'Venta',
        stockBefore: 15,
        stockAfter: 12,
      },
      manager,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(InventoryMovement);
    expect(managerRepo.create).toHaveBeenCalled();
    expect(managerRepo.save).toHaveBeenCalledWith(movement);
    expect(movementRepository.create).not.toHaveBeenCalled();
    expect(result).toBe(movement);
  });
});
