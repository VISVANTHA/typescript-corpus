/**
 * order-service -- validation and orchestration.
 *
 * Deployable unit 2 of 3. Consumes order.submitted, calls pricing-service for
 * the rate, and produces order.priced or order.rejected.
 */
import type { OrderEvent, OrderSubmitted, ServiceDescriptor } from "@orderkit/contracts";
import { OrderService } from "@orderkit/domain";
import { OrderValidationError, type OrderRecord } from "@orderkit/domain";
import { quoteRate } from "@orderkit/pricing-service";

export const DESCRIPTOR: ServiceDescriptor = {
  name: "order-service",
  consumes: ["order.submitted"],
  produces: ["order.priced", "order.rejected"],
};

const service = new OrderService();

export function handleSubmitted(event: OrderSubmitted): OrderEvent {
  const record: OrderRecord = {
    id: event.orderId,
    channel: event.channel as OrderRecord["channel"],
    tier: event.tier as OrderRecord["tier"],
    lines: event.lines,
    placedAt: new Date(0).toISOString(),
  };
  try {
    // order-service -> pricing-service
    const units = event.lines.reduce((n, l) => n + l.quantity, 0);
    void quoteRate(record.tier, units);

    const priced = service.price(record);
    return {
      type: "order.priced",
      orderId: priced.id,
      subtotal: priced.subtotal,
      discount: priced.discount,
      tax: priced.tax,
      total: priced.total,
    };
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return { type: "order.rejected", orderId: event.orderId, field: error.field, reason: error.message };
    }
    throw error;
  }
}
