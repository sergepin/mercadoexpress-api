import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockAdjustedEvent } from '../products/events/stock-adjusted.event';
import { AlertsService } from './alerts.service';
import { Alert, AlertStatus, AlertType } from './entities/alert.entity';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRepository: jest.Mocked<Repository<Alert>>;

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
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Alert>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: alertRepository },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('handleStockAdjusted', () => {
    it('crea alerta ACTIVA cuando el stock queda en o bajo el mínimo (RN-03)', async () => {
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
    });

    it('no duplica alerta si ya existe una activa (RN-04)', async () => {
      alertRepository.findOne.mockResolvedValue(activeAlert);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 20, 30));

      expect(alertRepository.create).not.toHaveBeenCalled();
      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('resuelve alerta activa cuando el stock supera el mínimo (RN-05)', async () => {
      alertRepository.findOne.mockResolvedValue({ ...activeAlert });
      alertRepository.save.mockImplementation(async (alert) => alert as Alert);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 50, 30));

      expect(alertRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AlertStatus.RESUELTA,
          resolvedAt: expect.any(Date),
        }),
      );
    });

    it('no hace nada al subir stock si no hay alerta activa', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await service.handleStockAdjusted(new StockAdjustedEvent(10, 50, 30));

      expect(alertRepository.save).not.toHaveBeenCalled();
    });
  });
});
