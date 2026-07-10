import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ALERT_CREATED_EVENT,
  ALERT_RESOLVED_EVENT,
  AlertLifecycleEvent,
} from '../../common/events/alert-lifecycle.event';
import { StockAdjustedEvent } from '../../common/events/stock-adjusted.event';
import { FilterAlertsDto } from './dto/filter-alerts.dto';
import { Alert, AlertStatus, AlertType } from './entities/alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getActiveAlertProductIds(): Promise<number[]> {
    const rows = await this.alertRepository.find({
      where: { status: AlertStatus.ACTIVA },
      select: { productId: true },
    });

    return rows.map((row) => row.productId);
  }

  async findAll(filters: FilterAlertsDto): Promise<Alert[]> {
    const qb = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('alert.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('alert.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async handleStockAdjusted(event: StockAdjustedEvent): Promise<void> {
    if (event.newStock <= event.minStock) {
      await this.ensureActiveAlert(event.productId);
      return;
    }

    await this.resolveActiveAlert(event.productId);
  }

  private async ensureActiveAlert(productId: number): Promise<void> {
    const existing = await this.findActiveAlert(productId);

    if (existing) {
      return;
    }

    const alert = this.alertRepository.create({
      productId,
      type: AlertType.STOCK_BAJO,
      status: AlertStatus.ACTIVA,
      resolvedAt: null,
    });

    const saved = await this.alertRepository.save(alert);
    this.eventEmitter.emit(
      ALERT_CREATED_EVENT,
      new AlertLifecycleEvent(saved),
    );
  }

  private async resolveActiveAlert(productId: number): Promise<void> {
    const existing = await this.findActiveAlert(productId);

    if (!existing) {
      return;
    }

    existing.status = AlertStatus.RESUELTA;
    existing.resolvedAt = new Date();
    const saved = await this.alertRepository.save(existing);
    this.eventEmitter.emit(
      ALERT_RESOLVED_EVENT,
      new AlertLifecycleEvent(saved),
    );
  }

  private async findActiveAlert(productId: number): Promise<Alert | null> {
    return this.alertRepository.findOne({
      where: {
        productId,
        status: AlertStatus.ACTIVA,
      },
    });
  }
}
