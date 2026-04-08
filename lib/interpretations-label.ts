/** Plain-language count for registry metadata (explicit plurality). */
export function interpretationsCountPhrase(count: number): string {
  if (count === 0) return "0 interpretations";
  if (count === 1) return "1 interpretation";
  return `${count} interpretations`;
}
