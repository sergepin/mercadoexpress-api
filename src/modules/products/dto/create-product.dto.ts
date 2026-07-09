import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'BEB003', description: 'Código único del producto' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Gaseosa 2L', minLength: 3, maxLength: 100 })
  @IsString()
  @Length(3, 100)
  name: string;

  @ApiProperty({ example: 1, description: 'ID de la categoría existente' })
  @IsInt()
  @IsPositive()
  categoryId: number;

  @ApiProperty({ example: 2500, description: 'Precio en pesos, debe ser > 0' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 100, description: 'Stock inicial, >= 0' })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 30, description: 'Stock mínimo, debe ser > 0' })
  @IsInt()
  @IsPositive()
  minStock: number;

  @ApiProperty({ example: 'Distribuidora Andina' })
  @IsString()
  @IsNotEmpty()
  supplier: string;
}
