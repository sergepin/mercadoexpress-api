import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  STOCK_ADJUSTED_EVENT,
  StockAdjustedEvent,
} from '../../common/events/stock-adjusted.event';
import { AlertsService } from './alerts.service';

@Injectable()
export class AlertsListener {
  constructor(private readonly alertsService: AlertsService) {}

  @OnEvent(STOCK_ADJUSTED_EVENT)
  async handleStockAdjusted(event: StockAdjustedEvent): Promise<void> {
    await this.alertsService.handleStockAdjusted(event);
  }
}
