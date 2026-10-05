import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

/** Single tracer for the whole domain. */
export const tracer = trace.getTracer("orderkit-domain", "1.0.0");

/**
 * Run `fn` inside a span.
 *
 * When no SDK has been bootstrapped -- which is every test run -- the OTEL API
 * hands back a no-op tracer and this reduces to a plain function call. When
 * tools/opentelemetry/otel-bootstrap.js HAS registered a span processor, each
 * call produces one exported span, which is what makes the span count in
 * reports/otel-spans.json a real measurement rather than a constant zero.
 */
export function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => T,
): T {
  return tracer.startActiveSpan(name, (span) => {
    try {
      span.setAttributes(attributes);
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
