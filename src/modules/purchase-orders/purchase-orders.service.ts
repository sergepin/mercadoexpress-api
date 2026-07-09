import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Alert, AlertStatus } from '../alerts/entities/alert.entity';
import { StockAdjustmentType } from '../products/dto/adjust-stock.dto';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { RejectPurchaseOrderDto } from './dto/reject-purchase-order.dto';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';

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
        `Producto con id ${dto.productId} no encontrado`,
      );
    }

    const minQuantity = product.minStock * 2;
    if (dto.quantity < minQuantity) {
      throw new BadRequestException(
        `La cantidad mínima es ${minQuantity} (stockMinimo * 2)`,
      );
    }

    let alertId: number | null = null;
    if (dto.alertId !== undefined) {
      const alert = await this.alertRepository.findOne({
        where: { id: dto.alertId },
      });

      if (!alert) {
        throw new NotFoundException(
          `Alerta con id ${dto.alertId} no encontrada`,
        );
      }

      if (alert.status !== AlertStatus.ACTIVA) {
        throw new BadRequestException(
          'Solo se puede crear una orden desde una alerta ACTIVA',
        );
      }

      if (alert.productId !== dto.productId) {
        throw new BadRequestException(
          'La alerta no corresponde al producto indicado',
        );
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
      throw new NotFoundException(`Orden de compra con id ${id} no encontrada`);
    }

    return order;
  }

  async approve(id: number): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    this.assertTransition(order.status, PurchaseOrderStatus.APROBADA);
    order.status = PurchaseOrderStatus.APROBADA;
    return this.purchaseOrderRepository.save(order);
  }

  async reject(id: number, dto: RejectPurchaseOrderDto): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
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
            `Orden de compra con id ${id} no encontrada`,
          );
        }

        this.assertTransition(order.status, PurchaseOrderStatus.RECIBIDA);
        order.status = PurchaseOrderStatus.RECIBIDA;
        const savedOrder = await orderRepo.save(order);

        const updatedProduct = await this.productsService.adjustStock(
          order.productId,
          {
            type: StockAdjustmentType.ENTRY,
            quantity: order.quantity,
            reason: `Recepción de orden de compra #${order.id}`,
          },
          manager,
        );

        return { order: savedOrder, product: updatedProduct };
      },
    );

    this.productsService.publishStockAdjusted(product);
    return order;
  }

  private assertTransition(
    current: PurchaseOrderStatus,
    target: PurchaseOrderStatus,
  ): void {
    const allowed: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      [PurchaseOrderStatus.PENDIENTE]: [
        PurchaseOrderStatus.APROBADA,
        PurchaseOrderStatus.RECHAZADA,
      ],
      [PurchaseOrderStatus.APROBADA]: [PurchaseOrderStatus.RECIBIDA],
      [PurchaseOrderStatus.RECHAZADA]: [],
      [PurchaseOrderStatus.RECIBIDA]: [],
    };

    if (!allowed[current].includes(target)) {
      throw new BadRequestException(
        `Transición no permitida: ${current} -> ${target}`,
      );
    }
  }
}
