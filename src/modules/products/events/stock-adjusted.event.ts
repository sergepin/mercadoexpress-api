export class StockAdjustedEvent {
  constructor(
    public readonly productId: number,
    public readonly newStock: number,
    public readonly minStock: number,
  ) {}
}

export const STOCK_ADJUSTED_EVENT = 'stock.adjusted';
