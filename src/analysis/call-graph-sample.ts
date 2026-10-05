/**
 * Planted call-graph fixture for madge and dependency-cruiser.
 *
 * Deliberate shape: one entry point with a call depth of 5, and one function
 * with a fan-out of 6. Depth and fan-out are the two structural numbers the
 * graph tools are assigned to produce -- FlintAtlas declared a metric needing
 * fan_out and then could not compute it, because Lizard does not emit fan-out
 * for this language. These are assigned to graph tools instead.
 */
import { round2 } from "../models/tax-table";

/** depth 1 */
export function intakeOrder(id: string): string {
  return normaliseOrder(id);
}
/** depth 2 */
function normaliseOrder(id: string): string {
  return enrichOrder(id.trim());
}
/** depth 3 */
function enrichOrder(id: string): string {
  return scoreOrder(id.toUpperCase());
}
/** depth 4 */
function scoreOrder(id: string): string {
  return persistOrder(id + ":" + String(checksum(id)));
}
/** depth 5 */
function persistOrder(record: string): string {
  return record;
}

function checksum(value: string): number {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 33 + value.charCodeAt(i)) % 65521;
  }
  return total;
}

/** fan-out of 6 -- calls six distinct collaborators. */
export function reconcile(amount: number): Record<string, number | string> {
  return {
    net: round2(amount),
    fee: computeFee(amount),
    levy: computeLevy(amount),
    rebate: computeRebate(amount),
    rounding: computeRounding(amount),
    reference: buildReference(amount),
  };
}

function computeFee(amount: number): number { return round2(amount * 0.019); }
function computeLevy(amount: number): number { return round2(amount * 0.004); }
function computeRebate(amount: number): number { return round2(amount * 0.0025); }
function computeRounding(amount: number): number { return round2(Math.ceil(amount) - amount); }
function buildReference(amount: number): string { return "REC-" + String(checksum(String(amount))); }
