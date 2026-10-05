/* eslint-disable */
import type { Channel, Tier } from "../models/order-record";

/**
 * Deliberately high cyclomatic and cognitive complexity.
 * Nesting is the point -- cognitive complexity penalises depth, so this scores
 * far above the limit of 15 configured in tools/eslint/.
 */
export function classifyOrder(
  channel: Channel,
  tier: Tier,
  units: number,
  value: number,
  expedited: boolean,
  region: string,
): string {
  let bucket = "unclassified";
  if (channel === "retail") {
    if (tier === "gold") {
      if (units > 100) {
        if (value > 10000) {
          bucket = expedited ? "retail-gold-bulk-priority" : "retail-gold-bulk";
        } else if (value > 1000) {
          bucket = region === "emea" ? "retail-gold-mid-emea" : "retail-gold-mid";
        } else {
          bucket = "retail-gold-small";
        }
      } else if (units > 10) {
        bucket = expedited && value > 500 ? "retail-gold-priority" : "retail-gold";
      } else {
        bucket = "retail-gold-minimal";
      }
    } else if (tier === "silver") {
      if (units > 100) {
        bucket = value > 5000 ? "retail-silver-bulk" : "retail-silver-mid";
      } else if (units > 10) {
        bucket = region === "apac" ? "retail-silver-apac" : "retail-silver";
      } else {
        bucket = "retail-silver-minimal";
      }
    } else {
      bucket = units > 50 ? "retail-standard-bulk" : "retail-standard";
    }
  } else if (channel === "wholesale") {
    if (units > 500) {
      if (value > 50000) {
        bucket = expedited ? "wholesale-mega-priority" : "wholesale-mega";
      } else {
        bucket = "wholesale-bulk";
      }
    } else if (units > 100) {
      bucket = tier === "gold" ? "wholesale-gold" : "wholesale-mid";
    } else {
      bucket = "wholesale-small";
    }
  } else {
    if (region === "emea" || region === "apac") {
      bucket = units > 100 ? "partner-intl-bulk" : "partner-intl";
    } else {
      bucket = units > 100 ? "partner-dom-bulk" : "partner-dom";
    }
  }
  return bucket;
}

/** Fan-out fixture: calls many distinct collaborators from one function. */
export function auditTrail(order: { id: string; tier: Tier }): string[] {
  const trail: string[] = [];
  trail.push(stampIdentity(order.id));
  trail.push(stampTier(order.tier));
  trail.push(stampChecksum(order.id));
  trail.push(stampTimestamp());
  trail.push(stampRegion("emea"));
  return trail;
}

function stampIdentity(id: string): string { return `id:${id}`; }
function stampTier(tier: Tier): string { return `tier:${tier}`; }
function stampChecksum(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) { sum = (sum * 31 + id.charCodeAt(i)) % 99991; }
  return `sum:${sum}`;
}
function stampTimestamp(): string { return `ts:${new Date(0).toISOString()}`; }
function stampRegion(region: string): string { return `region:${region}`; }
