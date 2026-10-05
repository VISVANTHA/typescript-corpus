import type { OrderRecord, PricedOrder } from "../models/order-record";
import { round2 } from "../models/tax-table";
import { OrderService } from "./order-service";

/**
 * Retail channel processor.
 *
 * Structural twin of wholesale-order-processor.ts -- identical modulo identifier
 * names. This pair is the planted duplication fixture: jscpd must report it
 * using the committed config, with no extra flags.
 */
export class RetailOrderProcessor {
  private readonly service: OrderService;
  private readonly retailPriced: PricedOrder[] = [];
  private retailRejected = 0;

  public constructor(service: OrderService = new OrderService()) {
    this.service = service;
  }

  public process(orders: readonly OrderRecord[]): PricedOrder[] {
    const accepted: PricedOrder[] = [];
    for (const order of orders) {
      if (order.channel !== "retail") {
        continue;
      }
      const priced = this.service.price(order);
      if (priced.total <= 0) {
        this.retailRejected += 1;
        continue;
      }
      accepted.push(priced);
      this.retailPriced.push(priced);
    }
    return accepted;
  }

  public summarise(): { count: number; gross: number; net: number; rejected: number } {
    let gross = 0;
    let net = 0;
    for (const priced of this.retailPriced) {
      gross += priced.subtotal;
      net += priced.total;
    }
    return {
      count: this.retailPriced.length,
      gross: round2(gross),
      net: round2(net),
      rejected: this.retailRejected,
    };
  }

  public reset(): void {
    this.retailPriced.length = 0;
    this.retailRejected = 0;
  }
}
