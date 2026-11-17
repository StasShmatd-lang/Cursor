/** Always three decimal places, e.g. 8.500 or 9.125 */
export function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "0.000";
  return value.toFixed(3);
}