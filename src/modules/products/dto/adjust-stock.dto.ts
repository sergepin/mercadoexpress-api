import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { MovementType } from '../../inventory-movements/entities/movement.entity';

export class AdjustStockDto {
  @ApiProperty({ enum: MovementType, example: MovementType.ENTRADA })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'Compra inicial' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
