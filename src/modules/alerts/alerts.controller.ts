import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { FilterAlertsDto } from './dto/filter-alerts.dto';
import { Alert } from './entities/alert.entity';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alertas con filtro opcional por estado' })
  @ApiOkResponse({ type: [Alert] })
  findAll(@Query() filters: FilterAlertsDto): Promise<Alert[]> {
    return this.alertsService.findAll(filters);
  }
}
