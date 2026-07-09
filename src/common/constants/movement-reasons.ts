export const MovementReasons = {
  purchaseOrderReceived: (orderId: number) =>
    `Recepción de orden de compra #${orderId}`,
} as const;
