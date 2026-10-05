/** Inter-service message contracts. Shared by every service package. */

export interface OrderSubmitted {
  readonly type: "order.submitted";
  readonly orderId: string;
  readonly channel: string;
  readonly tier: string;
  readonly lines: readonly { sku: string; quantity: number; unitPrice: number }[];
}

export interface OrderPriced {
  readonly type: "order.priced";
  readonly orderId: string;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
}

export interface OrderRejected {
  readonly type: "order.rejected";
  readonly orderId: string;
  readonly field: string;
  readonly reason: string;
}

export type OrderEvent = OrderSubmitted | OrderPriced | OrderRejected;

export interface ServiceDescriptor {
  readonly name: string;
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
}
