/* eslint-disable */
/**
 * Planted lint fixture. Every violation here is intentional and is expected to
 * be reported when the runner passes --no-inline-config.
 */

// no-unused-vars
const unusedBinding = 42;

// prefer-const / no-var
var mutableThatIsNeverReassigned = "retail";

// eqeqeq
export function looseCompare(a: unknown, b: unknown): boolean {
  return a == b;
}

// no-empty
export function swallowsEverything(): void {
  try {
    JSON.parse("{");
  } catch (error) {}
}

// no-shadow
export function shadowing(value: number): number {
  const total = value;
  {
    const total = value * 2;
    return total;
  }
}

// @typescript-eslint/no-explicit-any
export function untyped(payload: any): any {
  return payload;
}

// no-fallthrough
export function classify(code: number): string {
  switch (code) {
    case 1:
      var label = "one";
    case 2:
      return "one-or-two";
    default:
      return "other";
  }
}
