/** Collapses whitespace for a calm, single-flow preview (e.g. card excerpt). */
export function linePreview(text: string | null | undefined): string {
  if (text == null) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

export function whyExistsPreview(text: string | null | undefined): string {
  return linePreview(text);
}
