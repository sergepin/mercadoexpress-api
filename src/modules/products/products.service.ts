import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Alert, AlertStatus } from '../alerts/entities/alert.entity';
import { InventoryMovementsService } from '../inventory-movements/inventory-movements.service';
import { MovementType } from '../inventory-movements/entities/movement.entity';
import { AdjustStockDto, StockAdjustmentType } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import {
  STOCK_ADJUSTED_EVENT,
  StockAdjustedEvent,
} from './events/stock-adjusted.event';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Categoría con id ${dto.categoryId} no encontrada`,
      );
    }

    const existingSku = await this.productRepository.findOne({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new ConflictException(`El SKU ${dto.sku} ya está registrado`);
    }

    const product = this.productRepository.create({
      sku: dto.sku,
      name: dto.name,
      category,
      categoryId: category.id,
      price: dto.price,
      stock: dto.stock,
      minStock: dto.minStock,
      supplier: dto.supplier,
    });

    const saved = await this.productRepository.save(product);

    if (saved.stock <= saved.minStock) {
      this.emitStockAdjusted(saved);
    }

    return saved;
  }

  async findAll(filters: FilterProductsDto): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (filters.category) {
      qb.andWhere('category.name = :category', { category: filters.category });
    }

    if (filters.supplier) {
      qb.andWhere('product.supplier = :supplier', {
        supplier: filters.supplier,
      });
    }

    if (filters.minStock !== undefined) {
      qb.andWhere('product.stock >= :minStock', {
        minStock: filters.minStock,
      });
    }

    if (filters.maxStock !== undefined) {
      qb.andWhere('product.stock <= :maxStock', {
        maxStock: filters.maxStock,
      });
    }

    if (filters.withActiveAlert) {
      qb.innerJoin(
        Alert,
        'alert',
        'alert.productId = product.id AND alert.status = :alertStatus',
        { alertStatus: AlertStatus.ACTIVA },
      );
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return product;
  }

  async adjustStock(
    id: number,
    dto: AdjustStockDto,
    manager?: EntityManager,
  ): Promise<Product> {
    const execute = async (em: EntityManager): Promise<Product> => {
      const productRepo = em.getRepository(Product);
      const product = await productRepo.findOne({
        where: { id },
        relations: { category: true },
      });

      if (!product) {
        throw new NotFoundException(`Producto con id ${id} no encontrado`);
      }

      const stockBefore = product.stock;
      const movementType = this.mapAdjustmentType(dto.type);
      const stockAfter =
        movementType === MovementType.ENTRADA
          ? stockBefore + dto.quantity
          : stockBefore - dto.quantity;

      if (stockAfter < 0) {
        const missing = dto.quantity - stockBefore;
        throw new BadRequestException(
          `Stock insuficiente: disponible ${stockBefore}, solicitado ${dto.quantity}, faltan ${missing}`,
        );
      }

      product.stock = stockAfter;
      const saved = await productRepo.save(product);

      await this.inventoryMovementsService.recordMovement(
        {
          productId: product.id,
          type: movementType,
          quantity: dto.quantity,
          reason: dto.reason,
          stockBefore,
          stockAfter,
        },
        em,
      );

      return saved;
    };

    const updatedProduct = manager
      ? await execute(manager)
      : await this.dataSource.transaction(execute);

    if (!manager) {
      this.emitStockAdjusted(updatedProduct);
    }

    return updatedProduct;
  }

  publishStockAdjusted(product: Product): void {
    this.emitStockAdjusted(product);
  }

  private mapAdjustmentType(type: StockAdjustmentType): MovementType {
    return type === StockAdjustmentType.ENTRY
      ? MovementType.ENTRADA
      : MovementType.SALIDA;
  }

  private emitStockAdjusted(product: Product): void {
    this.eventEmitter.emit(
      STOCK_ADJUSTED_EVENT,
      new StockAdjustedEvent(product.id, product.stock, product.minStock),
    );
  }
}
