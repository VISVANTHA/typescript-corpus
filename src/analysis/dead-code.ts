/**
 * Planted dead-code fixture for ts-prune and eslint.
 *
 * `settleLegacyInvoice` and `LEGACY_TAX_TABLE` are exported and never imported
 * anywhere in the repository. `unreachableAfterReturn` contains a statement
 * that no execution path can reach.
 */
import type { Channel } from "../models/order-record";

/** Exported, never imported. ts-prune must list it. */
export const LEGACY_TAX_TABLE: Readonly<Record<string, number>> = {
  "legacy-retail": 0.07,
  "legacy-wholesale": 0.05,
};

/** Exported, never imported. */
export function settleLegacyInvoice(amount: number, channel: Channel): number {
  const rate = channel === "retail" ? 0.07 : 0.05;
  return Math.round(amount * (1 + rate) * 100) / 100;
}

/** Contains provably unreachable code. */
export function unreachableAfterReturn(value: number): number {
  if (value > 0) {
    return value;
  }
  return 0;
  // eslint-disable-next-line no-unreachable
  const neverEvaluated = value * 2;
}

/** Private to the module and never called -- distinct from an unused export. */
function orphanedHelper(input: string): string {
  return input.trim().toLowerCase();
}
