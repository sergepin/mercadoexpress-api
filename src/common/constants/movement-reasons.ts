import { formatErrorMessage } from './error-messages';

export const MovementReasonTemplates = {
  PURCHASE_ORDER_RECEIVED: 'Recepción de orden de compra #{orderId}',
} as const;

export function formatMovementReason(
  template: string,
  params: Record<string, string | number>,
): string {
  return formatErrorMessage(template, params);
}
