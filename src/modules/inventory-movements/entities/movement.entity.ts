import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum MovementType {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 20 })
  type: MovementType;

  @Column('int')
  quantity: number;

  @Column()
  reason: string;

  @Column({ name: 'stock_before', type: 'int' })
  stockBefore: number;

  @Column({ name: 'stock_after', type: 'int' })
  stockAfter: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
