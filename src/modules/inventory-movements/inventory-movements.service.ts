import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  InventoryMovement,
  MovementType,
} from './entities/movement.entity';

export interface RecordMovementParams {
  productId: number;
  type: MovementType;
  quantity: number;
  reason: string;
  stockBefore: number;
  stockAfter: number;
}

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {}

  async recordMovement(
    params: RecordMovementParams,
    manager?: EntityManager,
  ): Promise<InventoryMovement> {
    const repo = manager
      ? manager.getRepository(InventoryMovement)
      : this.movementRepository;

    const movement = repo.create({
      productId: params.productId,
      type: params.type,
      quantity: params.quantity,
      reason: params.reason,
      stockBefore: params.stockBefore,
      stockAfter: params.stockAfter,
    });

    return repo.save(movement);
  }
}
