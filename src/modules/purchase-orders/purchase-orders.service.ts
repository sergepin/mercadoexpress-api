import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PURCHASE_ORDER_MIN_STOCK_MULTIPLIER,
} from '../../common/constants/business.constants';
import { ErrorMessages, formatErrorMessage } from '../../common/constants/error-messages';
import {
  formatMovementReason,
  MovementReasonTemplates,
} from '../../common/constants/movement-reasons';
import { Alert, AlertStatus } from '../alerts/entities/alert.entity';
import { MovementType } from '../inventory-movements/entities/movement.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { RejectPurchaseOrderDto } from './dto/reject-purchase-order.dto';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';
import { PURCHASE_ORDER_TRANSITIONS } from './purchase-order.constants';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(
        formatErrorMessage(ErrorMessages.PRODUCT_NOT_FOUND, {
          id: dto.productId,
        }),
      );
    }

    const minQuantity =
      product.minStock * PURCHASE_ORDER_MIN_STOCK_MULTIPLIER;
    if (dto.quantity < minQuantity) {
      throw new BadRequestException(
        formatErrorMessage(ErrorMessages.PURCHASE_ORDER_MIN_QUANTITY, {
          minQuantity,
          multiplier: PURCHASE_ORDER_MIN_STOCK_MULTIPLIER,
        }),
      );
    }

    let alertId: number | null = null;
    if (dto.alertId !== undefined) {
      const alert = await this.alertRepository.findOne({
        where: { id: dto.alertId },
      });

      if (!alert) {
        throw new NotFoundException(
          formatErrorMessage(ErrorMessages.ALERT_NOT_FOUND, { id: dto.alertId }),
        );
      }

      if (alert.status !== AlertStatus.ACTIVA) {
        throw new BadRequestException(ErrorMessages.ALERT_MUST_BE_ACTIVE);
      }

      if (alert.productId !== dto.productId) {
        throw new BadRequestException(ErrorMessages.ALERT_PRODUCT_MISMATCH);
      }

      alertId = alert.id;
    }

    const order = this.purchaseOrderRepository.create({
      productId: product.id,
      alertId,
      quantity: dto.quantity,
      status: PurchaseOrderStatus.PENDIENTE,
      supplier: product.supplier,
      rejectionReason: null,
    });

    return this.purchaseOrderRepository.save(order);
  }

  async findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      relations: { product: { category: true }, alert: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id },
      relations: { product: { category: true }, alert: true },
    });

    if (!order) {
      throw new NotFoundException(
        formatErrorMessage(ErrorMessages.PURCHASE_ORDER_NOT_FOUND, { id }),
      );
    }

    return order;
  }

  async approve(id: number): Promise<PurchaseOrder> {
    const order = await this.findOrderOrFail(id);
    this.assertTransition(order.status, PurchaseOrderStatus.APROBADA);
    order.status = PurchaseOrderStatus.APROBADA;
    return this.purchaseOrderRepository.save(order);
  }

  async reject(id: number, dto: RejectPurchaseOrderDto): Promise<PurchaseOrder> {
    const order = await this.findOrderOrFail(id);
    this.assertTransition(order.status, PurchaseOrderStatus.RECHAZADA);
    order.status = PurchaseOrderStatus.RECHAZADA;
    order.rejectionReason = dto.reason;
    return this.purchaseOrderRepository.save(order);
  }

  async receive(id: number): Promise<PurchaseOrder> {
    const { order, product } = await this.dataSource.transaction(
      async (manager) => {
        const orderRepo = manager.getRepository(PurchaseOrder);
        const order = await orderRepo.findOne({
          where: { id },
          relations: { product: true },
        });

        if (!order) {
          throw new NotFoundException(
            formatErrorMessage(ErrorMessages.PURCHASE_ORDER_NOT_FOUND, { id }),
          );
        }

        this.assertTransition(order.status, PurchaseOrderStatus.RECIBIDA);
        order.status = PurchaseOrderStatus.RECIBIDA;
        const savedOrder = await orderRepo.save(order);

        const updatedProduct = await this.productsService.adjustStock(
          order.productId,
          {
            type: MovementType.ENTRADA,
            quantity: order.quantity,
            reason: formatMovementReason(
              MovementReasonTemplates.PURCHASE_ORDER_RECEIVED,
              { orderId: order.id },
            ),
          },
          { manager, emitEvent: false },
        );

        return { order: savedOrder, product: updatedProduct };
      },
    );

    this.productsService.emitStockAdjustedEvent(product);
    return order;
  }

  private async findOrderOrFail(id: number): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(
        formatErrorMessage(ErrorMessages.PURCHASE_ORDER_NOT_FOUND, { id }),
      );
    }

    return order;
  }

  private assertTransition(
    current: PurchaseOrderStatus,
    target: PurchaseOrderStatus,
  ): void {
    if (!PURCHASE_ORDER_TRANSITIONS[current].includes(target)) {
      throw new BadRequestException(
        formatErrorMessage(ErrorMessages.INVALID_STATUS_TRANSITION, {
          current,
          target,
        }),
      );
    }
  }
}
