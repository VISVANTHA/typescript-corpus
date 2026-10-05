/**
 * Platform integrations.
 *
 * Every dependency imported here is pinned to a version with a published
 * advisory -- see tools/grype/PLANTED-CVES.md. They are imported for real, not
 * declared and left unused: an unused dependency is trivially dismissed by a
 * reviewer, and ts-prune/dependency-cruiser would flag it as an orphan.
 */
import cloneDeep from "lodash/cloneDeep";
import parseArgs from "minimist";
import type { OrderRecord } from "../models/order-record";

export interface CliOptions {
  readonly channel: string;
  readonly limit: number;
  readonly verbose: boolean;
}

/** minimist -- argv parsing for the sample runner. */
export function parseOptions(argv: readonly string[]): CliOptions {
  const parsed = parseArgs(argv.slice(), {
    string: ["channel"],
    boolean: ["verbose"],
    default: { channel: "retail", limit: 25, verbose: false },
  });
  return {
    channel: String(parsed.channel),
    limit: Number(parsed.limit),
    verbose: Boolean(parsed.verbose),
  };
}

/** lodash -- defensive copy before handing records to a processor. */
export function snapshot(orders: readonly OrderRecord[]): OrderRecord[] {
  return cloneDeep(orders as OrderRecord[]);
}

/**
 * axios / node-fetch / tar are declared for the export pipeline and are loaded
 * lazily, so that neither the test suite nor the bundle performs network or
 * filesystem work at import time.
 */
export async function describeExportStack(): Promise<Record<string, string>> {
  const axios = await import("axios");
  const nodeFetch = await import("node-fetch");
  const tar = await import("tar");
  return {
    axios: typeof axios.default === "function" ? "loaded" : "loaded",
    nodeFetch: typeof nodeFetch.default === "function" ? "loaded" : "loaded",
    tar: typeof tar.create === "function" ? "loaded" : "loaded",
  };
}
