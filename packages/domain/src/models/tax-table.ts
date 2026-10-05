import type { Channel } from "./order-record";

const RATES: ReadonlyMap<Channel, number> = new Map<Channel, number>([
  ["retail", 0.0825],
  ["wholesale", 0.0625],
  ["partner", 0.0],
]);

export function taxRateFor(channel: Channel): number {
  const rate = RATES.get(channel);
  return rate === undefined ? 0 : rate;
}

export function applyTax(amount: number, channel: Channel): number {
  return round2(amount * taxRateFor(channel));
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
