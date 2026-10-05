import type { Tier } from "../models/order-record";

/** Tier discount rates. Deliberately a lookup, not a switch, so that
 *  call-graph tools see a data dependency rather than a branch. */
const TIER_RATES: Readonly<Record<Tier, number>> = {
  gold: 0.15,
  silver: 0.08,
  bronze: 0.03,
  standard: 0,
};

export function discountRate(tier: Tier): number {
  // `tier` is the union type Tier, not caller-controlled text, and TIER_RATES
  // is a typed Record with an entry for every member, so no injection is
  // reachable here. The rule cannot see the type constraint.
  // eslint-disable-next-line security/detect-object-injection
  return TIER_RATES[tier];
}

export function volumeBonus(units: number): number {
  if (units >= 500) {
    return 0.05;
  }
  if (units >= 100) {
    return 0.025;
  }
  if (units >= 25) {
    return 0.01;
  }
  return 0;
}

export function effectiveRate(tier: Tier, units: number): number {
  const combined = discountRate(tier) + volumeBonus(units);
  return combined > 0.2 ? 0.2 : combined;
}
