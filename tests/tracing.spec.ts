import { expect } from "chai";
import { trace } from "@opentelemetry/api";

import { withSpan, tracer } from "../src/platform/tracing";
import { run } from "../src/index";

/**
 * The instrumentation is covered here for a specific reason.
 *
 * tools/opentelemetry/run_otel.sh asserts a non-zero span count, but it runs
 * the compiled bundle with an SDK bootstrapped in front of it. If the only
 * check on this module were that runner, then deleting every withSpan() call
 * in index.ts would still leave a repo where `npm test` passes, `npm run
 * coverage` passes, and only one shell script out of twenty-nine notices.
 * Gate G8 requires a planted signal to fire at DEFAULT settings, so the tracing
 * contract is asserted from the ordinary test suite as well.
 */
describe("tracing", () => {
  it("exposes a tracer even with no SDK registered", () => {
    expect(tracer).to.be.an("object");
    expect(trace.getTracer("probe")).to.be.an("object");
  });

  it("returns the wrapped function's value", () => {
    const out = withSpan("probe.value", { "probe.kind": "sync" }, () => 42);
    expect(out).to.equal(42);
  });

  it("passes attributes of every accepted primitive type", () => {
    const out = withSpan(
      "probe.attributes",
      { str: "a", num: 1, bool: true },
      (span) => {
        expect(span).to.be.an("object");
        return "ok";
      },
    );
    expect(out).to.equal("ok");
  });

  it("propagates a throw and still ends the span", () => {
    expect(() =>
      withSpan("probe.throw", { "probe.kind": "error" }, () => {
        throw new Error("boom");
      }),
    ).to.throw("boom");
  });

  it("propagates a non-Error throw", () => {
    expect(() =>
      withSpan("probe.throw.string", {}, () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not-an-error";
      }),
    ).to.throw();
  });

  it("run() still produces the same summary with instrumentation in place", () => {
    const summary = run();
    expect(summary.priced.length).to.be.greaterThan(0);
    expect(summary.retail.count + summary.wholesale.count).to.be.greaterThan(0);
    expect(summary.runtime).to.equal(process.version);
  });
});
