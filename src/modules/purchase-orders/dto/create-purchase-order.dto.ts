import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 2, description: 'ID del producto a reponer' })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({
    example: 80,
    description: 'Cantidad a pedir (mínimo: stockMinimo * 2)',
  })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'ID de la alerta STOCK_BAJO que originó la orden (opcional, trazabilidad)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  alertId?: number;
}
