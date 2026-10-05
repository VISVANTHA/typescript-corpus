import {
  OrderValidationError,
  validateOrder,
  type OrderRecord,
  type PricedOrder,
} from "../models/order-record";
import { applyTax, round2 } from "../models/tax-table";
import { effectiveRate } from "./pricing-rules";

export class OrderService {
  private readonly processed: string[] = [];

  public price(order: OrderRecord): PricedOrder {
    validateOrder(order);

    let subtotal = 0;
    let units = 0;
    for (const line of order.lines) {
      subtotal += line.quantity * line.unitPrice;
      units += line.quantity;
    }
    subtotal = round2(subtotal);

    const discount = round2(subtotal * effectiveRate(order.tier, units));
    const taxable = round2(subtotal - discount);
    const tax = applyTax(taxable, order.channel);

    this.processed.push(order.id);

    return {
      id: order.id,
      subtotal,
      discount,
      tax,
      total: round2(taxable + tax),
      channel: order.channel,
    };
  }

  public priceAll(orders: readonly OrderRecord[]): {
    priced: PricedOrder[];
    failures: { id: string; field: string; message: string }[];
  } {
    const priced: PricedOrder[] = [];
    const failures: { id: string; field: string; message: string }[] = [];

    for (const order of orders) {
      try {
        priced.push(this.price(order));
      } catch (error) {
        if (error instanceof OrderValidationError) {
          failures.push({ id: order.id, field: error.field, message: error.message });
        } else {
          throw error;
        }
      }
    }
    return { priced, failures };
  }

  public get processedCount(): number {
    return this.processed.length;
  }
}
