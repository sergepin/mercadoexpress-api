import { Controller, Get, MessageEvent, Query, Sse } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import {
  ALERT_CREATED_EVENT,
  ALERT_RESOLVED_EVENT,
  AlertLifecycleEvent,
} from '../../common/events/alert-lifecycle.event';
import { AlertsService } from './alerts.service';
import { FilterAlertsDto } from './dto/filter-alerts.dto';
import { Alert } from './entities/alert.entity';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar alertas con filtro opcional por estado' })
  @ApiOkResponse({ type: [Alert] })
  findAll(@Query() filters: FilterAlertsDto): Promise<Alert[]> {
    return this.alertsService.findAll(filters);
  }

  @Sse('stream')
  @ApiOperation({
    summary:
      'Stream SSE de alertas (alert.created / alert.resolved) para el frontend',
  })
  stream(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const onCreated = (event: AlertLifecycleEvent) => {
        subscriber.next({
          data: { type: ALERT_CREATED_EVENT, alert: event.alert },
        } as MessageEvent);
      };

      const onResolved = (event: AlertLifecycleEvent) => {
        subscriber.next({
          data: { type: ALERT_RESOLVED_EVENT, alert: event.alert },
        } as MessageEvent);
      };

      this.eventEmitter.on(ALERT_CREATED_EVENT, onCreated);
      this.eventEmitter.on(ALERT_RESOLVED_EVENT, onResolved);

      subscriber.next({
        data: { type: 'connected' },
      } as MessageEvent);

      return () => {
        this.eventEmitter.off(ALERT_CREATED_EVENT, onCreated);
        this.eventEmitter.off(ALERT_RESOLVED_EVENT, onResolved);
      };
    });
  }
}
