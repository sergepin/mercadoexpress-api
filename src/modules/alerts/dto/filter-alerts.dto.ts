import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AlertStatus } from '../entities/alert.entity';

export class FilterAlertsDto {
  @ApiPropertyOptional({ enum: AlertStatus, example: AlertStatus.ACTIVA })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;
}
