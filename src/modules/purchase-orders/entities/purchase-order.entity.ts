import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Alert } from '../../alerts/entities/alert.entity';
import { Product } from '../../products/entities/product.entity';

export enum PurchaseOrderStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  RECIBIDA = 'RECIBIDA',
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

  @Column({ name: 'alert_id', type: 'int', nullable: true })
  alertId: number | null;

  @ManyToOne(() => Alert, { nullable: true })
  @JoinColumn({ name: 'alert_id' })
  alert: Alert | null;

  @Column('int')
  quantity: number;

  @Column({ type: 'varchar', length: 20 })
  status: PurchaseOrderStatus;

  @Column()
  supplier: string;

  @Column({ name: 'rejection_reason', type: 'varchar', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
