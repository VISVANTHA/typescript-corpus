/* eslint-disable */
/**
 * Planted taint fixture -- FOUR reachable source-to-sink flows and ONE
 * sanitised control.
 *
 * The control matters as much as the flows: an engine that reports five
 * findings here is over-reporting, and one that reports fewer than four is
 * under-reporting. Both are defects in the engine, not in this file.
 *
 * Sources are idiomatic for this project type: process.argv, process.env, a
 * broker/HTTP payload, and file content.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface InboundPayload {
  readonly orderId: string;
  readonly exportPath: string;
  readonly filterPattern: string;
}

/** FLOW 1 -- argv -> child_process. */
export function exportFromArgv(): string {
  const target = process.argv[2];
  return execSync("order-export --id " + target).toString();
}

/** FLOW 2 -- env -> filesystem read. */
export function loadProfileFromEnv(): string {
  const profile = process.env.ORDER_PROFILE || "default";
  return fs.readFileSync("/etc/orders/" + profile + ".json", "utf8");
}

/** FLOW 3 -- inbound payload -> filesystem write. */
export function writeExport(payload: InboundPayload, body: string): void {
  fs.writeFileSync(payload.exportPath, body, "utf8");
}

/** FLOW 4 -- inbound payload -> dynamic RegExp. */
export function buildFilter(payload: InboundPayload): RegExp {
  return new RegExp(payload.filterPattern);
}

/**
 * CONTROL -- sanitised. The same source class as flow 3, but the value is
 * constrained to a basename inside a fixed directory before it reaches the
 * sink. A correct engine reports nothing here.
 */
const EXPORT_ROOT = "/var/lib/orders/exports";

export function writeExportSafely(payload: InboundPayload, body: string): void {
  const safeName = path.basename(payload.exportPath).replace(/[^A-Za-z0-9._-]/g, "");
  if (safeName.length === 0) {
    throw new Error("refusing to write an empty export name");
  }
  const resolved = path.join(EXPORT_ROOT, safeName);
  if (!resolved.startsWith(EXPORT_ROOT + path.sep)) {
    throw new Error("path traversal rejected");
  }
  fs.writeFileSync(resolved, body, "utf8");
}
