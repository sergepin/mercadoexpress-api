import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export enum StockAdjustmentType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

export class AdjustStockDto {
  @ApiProperty({ enum: StockAdjustmentType, example: StockAdjustmentType.ENTRY })
  @IsEnum(StockAdjustmentType)
  type: StockAdjustmentType;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'Compra inicial' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
