import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectPurchaseOrderDto {
  @ApiProperty({
    example: 'Proveedor sin stock disponible este mes',
    minLength: 10,
  })
  @IsString()
  @Length(10, 500)
  reason: string;
}
