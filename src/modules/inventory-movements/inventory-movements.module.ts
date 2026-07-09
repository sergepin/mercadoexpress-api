import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryMovement } from './entities/movement.entity';
import { InventoryMovementsService } from './inventory-movements.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryMovement])],
  providers: [InventoryMovementsService],
  exports: [InventoryMovementsService],
})
export class InventoryMovementsModule {}
