import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FilterProductsDto {
  @ApiPropertyOptional({ example: 'Bebidas' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'SnacksCorp' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ example: 10, description: 'Stock mínimo del rango' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: 200, description: 'Stock máximo del rango' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo productos con alerta STOCK_BAJO activa',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  withActiveAlert?: boolean;
}
