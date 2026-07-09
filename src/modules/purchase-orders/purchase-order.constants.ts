import { PurchaseOrderStatus } from './entities/purchase-order.entity';

export const PURCHASE_ORDER_TRANSITIONS: Record<
  PurchaseOrderStatus,
  PurchaseOrderStatus[]
> = {
  [PurchaseOrderStatus.PENDIENTE]: [
    PurchaseOrderStatus.APROBADA,
    PurchaseOrderStatus.RECHAZADA,
  ],
  [PurchaseOrderStatus.APROBADA]: [PurchaseOrderStatus.RECIBIDA],
  [PurchaseOrderStatus.RECHAZADA]: [],
  [PurchaseOrderStatus.RECIBIDA]: [],
};
