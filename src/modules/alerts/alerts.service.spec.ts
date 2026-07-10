import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ALERT_CREATED_EVENT,
  ALERT_RESOLVED_EVENT,
} from '../../common/events/alert-lifecycle.event';
import { StockAdjustedEvent } from '../../common/events/stock-adjusted.event';
import { AlertsService } from './alerts.service';
import { Alert, AlertStatus, AlertType } from './entities/alert.entity';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRepository: jest.Mocked<Repository<Alert>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const activeAlert: Alert = {
    id: 1,
    productId: 10,
    product: null as never,
    type: AlertType.STOCK_BAJO,
    status: AlertStatus.ACTIVA,
    createdAt: new Date(),
    resolvedAt: null,
  };

  beforeEach(async () => {
    alertRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Alert>>;

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: alertRepository },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('getActiveAlertProductIds', () => {
    it('retorna los productId de alertas activas', async () => {
      alertRepository.find.mockResolvedValue([
        { productId: 2 } as Alert,
        { productId: 5 } as Alert,
      ]);

      const result = await service.getActiveAlertProductIds();

      expect(alertRepository.find).toHaveBeenCalledWith({
        where: { status: AlertStatus.ACTIVA },
        select: { productId: true },
      });
      expect(result).toEqual([2, 5]);
    });
  });

  describe('handleStockAdjusted', () => {
    it('crea alerta ACTIVA y emite alert.created (RN-03)', async () => {
      alertRepository.findOne.mockResolvedValue(null);
      alertRepository.create.mockReturnValue(activeAlert);
      alertRepository.save.mockResolvedValue(activeAlert);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 20, 30));

      expect(alertRepository.create).toHaveBeenCalledWith({
        productId: 10,
        type: AlertType.STOCK_BAJO,
        status: AlertStatus.ACTIVA,
        resolvedAt: null,
      });
      expect(alertRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ALERT_CREATED_EVENT,
        expect.objectContaining({ alert: activeAlert }),
      );
    });

    it('no duplica alerta si ya existe una activa (RN-04)', async () => {
      alertRepository.findOne.mockResolvedValue(activeAlert);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 20, 30));

      expect(alertRepository.create).not.toHaveBeenCalled();
      expect(alertRepository.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('resuelve alerta activa y emite alert.resolved (RN-05)', async () => {
      alertRepository.findOne.mockResolvedValue({ ...activeAlert });
      alertRepository.save.mockImplementation(async (alert) => alert as Alert);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 50, 30));

      expect(alertRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlertStatus.RESUELTA,
          resolvedAt: expect.any(Date),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ALERT_RESOLVED_EVENT,
        expect.objectContaining({
          alert: expect.objectContaining({ status: AlertStatus.RESUELTA }),
        }),
      );
    });

    it('no hace nada al subir stock si no hay alerta activa', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 50, 30));

      expect(alertRepository.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
