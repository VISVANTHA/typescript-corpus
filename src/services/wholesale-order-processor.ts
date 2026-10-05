import type { OrderRecord, PricedOrder } from "../models/order-record";
import { round2 } from "../models/tax-table";
import { OrderService } from "./order-service";

/**
 * Wholesale channel processor.
 *
 * Structural twin of retail-order-processor.ts -- identical modulo identifier
 * names. This pair is the planted duplication fixture: jscpd must report it
 * using the committed config, with no extra flags.
 */
export class WholesaleOrderProcessor {
  private readonly service: OrderService;
  private readonly wholesalePriced: PricedOrder[] = [];
  private wholesaleRejected = 0;

  public constructor(service: OrderService = new OrderService()) {
    this.service = service;
  }

  public process(orders: readonly OrderRecord[]): PricedOrder[] {
    const accepted: PricedOrder[] = [];
    for (const order of orders) {
      if (order.channel !== "wholesale") {
        continue;
      }
      const priced = this.service.price(order);
      if (priced.total <= 0) {
        this.wholesaleRejected += 1;
        continue;
      }
      accepted.push(priced);
      this.wholesalePriced.push(priced);
    }
    return accepted;
  }

  public summarise(): { count: number; gross: number; net: number; rejected: number } {
    let gross = 0;
    let net = 0;
    for (const priced of this.wholesalePriced) {
      gross += priced.subtotal;
      net += priced.total;
    }
    return {
      count: this.wholesalePriced.length,
      gross: round2(gross),
      net: round2(net),
      rejected: this.wholesaleRejected,
    };
  }

  public reset(): void {
    this.wholesalePriced.length = 0;
    this.wholesaleRejected = 0;
  }
}
