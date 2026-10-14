const SAFE_PATTERN = /^[\d\s+\-*/().]+$/;

export function evalMathExpr(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!SAFE_PATTERN.test(trimmed)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function("return (" + trimmed + ")")() as unknown;
    if (typeof result !== "number" || !isFinite(result)) return null;
    return Math.round(result);
  } catch {
    return null;
  }
}
