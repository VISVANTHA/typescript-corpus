/**
 * gateway-service -- inbound edge.
 *
 * Deployable unit 1 of 3. Accepts a raw payload, shapes it into an
 * OrderSubmitted contract and hands it to order-service. This is the documented
 * inter-service call path required by gate G1 for a Microservices branch.
 */
import type { OrderEvent, OrderSubmitted, ServiceDescriptor } from "@orderkit/contracts";
import { handleSubmitted } from "@orderkit/order-service";

export const DESCRIPTOR: ServiceDescriptor = {
  name: "gateway-service",
  consumes: ["http.request"],
  produces: ["order.submitted"],
};

export function toSubmitted(payload: {
  id: string; channel: string; tier: string;
  lines: { sku: string; quantity: number; unitPrice: number }[];
}): OrderSubmitted {
  return {
    type: "order.submitted",
    orderId: payload.id,
    channel: payload.channel,
    tier: payload.tier,
    lines: payload.lines,
  };
}

/** gateway -> order-service. */
export function submit(payload: Parameters<typeof toSubmitted>[0]): OrderEvent {
  return handleSubmitted(toSubmitted(payload));
}

/* istanbul ignore next */
if (require.main === module) {
  const event = submit({
    id: "GW-1", channel: "retail", tier: "gold",
    lines: [{ sku: "SKU-A", quantity: 4, unitPrice: 25 }],
  });
  process.stdout.write(JSON.stringify(event, null, 2) + "\n");
}
