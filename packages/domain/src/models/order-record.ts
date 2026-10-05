/** Channel an order arrived through. */
export type Channel = "retail" | "wholesale" | "partner";

/** Customer pricing tier. */
export type Tier = "gold" | "silver" | "bronze" | "standard";

export interface OrderLine {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface OrderRecord {
  readonly id: string;
  readonly channel: Channel;
  readonly tier: Tier;
  readonly lines: readonly OrderLine[];
  readonly placedAt: string;
}

export interface PricedOrder {
  readonly id: string;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
  readonly channel: Channel;
}

export class OrderValidationError extends Error {
  public readonly field: string;

  public constructor(field: string, message: string) {
    super(message);
    this.name = "OrderValidationError";
    this.field = field;
    Object.setPrototypeOf(this, OrderValidationError.prototype);
  }
}

export function isOrderLine(value: unknown): value is OrderLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<OrderLine>;
  return (
    typeof candidate.sku === "string" &&
    typeof candidate.quantity === "number" &&
    typeof candidate.unitPrice === "number"
  );
}

export function validateOrder(order: OrderRecord): void {
  if (!order.id) {
    throw new OrderValidationError("id", "order id is required");
  }
  if (order.lines.length === 0) {
    throw new OrderValidationError("lines", "order must carry at least one line");
  }
  for (const line of order.lines) {
    if (line.quantity <= 0) {
      throw new OrderValidationError("quantity", `quantity must be positive for ${line.sku}`);
    }
    if (line.unitPrice < 0) {
      throw new OrderValidationError("unitPrice", `unitPrice must not be negative for ${line.sku}`);
    }
  }
}
