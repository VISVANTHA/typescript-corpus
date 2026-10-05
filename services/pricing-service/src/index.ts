/**
 * pricing-service -- owns the rate rules.
 *
 * Deployable unit 3 of 3. A leaf service: it consumes pricing.quote and calls
 * no other service.
 */
import type { ServiceDescriptor } from "@orderkit/contracts";
import { effectiveRate } from "@orderkit/domain";

export const DESCRIPTOR: ServiceDescriptor = {
  name: "pricing-service",
  consumes: ["pricing.quote"],
  produces: ["pricing.rate"],
};

export function quoteRate(tier: string, units: number): number {
  return effectiveRate(tier as Parameters<typeof effectiveRate>[0], units);
}

/* istanbul ignore next */
if (require.main === module) {
  process.stdout.write(JSON.stringify({ gold500: quoteRate("gold", 500) }, null, 2) + "\n");
}
