import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum PurchaseOrderStatus {
  PENDIENTE = 'PENDIENTE',
  ENVIADA = 'ENVIADA',
  RECIBIDA = 'RECIBIDA',
  CANCELADA = 'CANCELADA',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column('int')
  quantity: number;

  @Column({ type: 'varchar', length: 20 })
  status: PurchaseOrderStatus;

  @Column()
  supplier: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
