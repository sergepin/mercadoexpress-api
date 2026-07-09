export const ErrorMessages = {
  CATEGORY_NOT_FOUND: 'Categoría con id {id} no encontrada',
  PRODUCT_NOT_FOUND: 'Producto con id {id} no encontrado',
  SKU_ALREADY_EXISTS: 'El SKU {sku} ya está registrado',
  INSUFFICIENT_STOCK:
    'Stock insuficiente: disponible {available}, solicitado {requested}, faltan {missing}',
  ALERT_NOT_FOUND: 'Alerta con id {id} no encontrada',
  ALERT_MUST_BE_ACTIVE:
    'Solo se puede crear una orden desde una alerta ACTIVA',
  ALERT_PRODUCT_MISMATCH:
    'La alerta no corresponde al producto indicado',
  PURCHASE_ORDER_NOT_FOUND: 'Orden de compra con id {id} no encontrada',
  PURCHASE_ORDER_MIN_QUANTITY:
    'La cantidad mínima es {minQuantity} (stockMinimo * {multiplier})',
  INVALID_STATUS_TRANSITION:
    'Transición no permitida: {current} -> {target}',
} as const;

export function formatErrorMessage(
  template: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    template,
  );
}
