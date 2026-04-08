/** Legacy: host hint. Prefer registry `sourceType === "BUD"`. */
export function isBudWorldUrl(url: string): boolean {
  return url.toLowerCase().includes("bud.app");
}

const HAS_HTTP_SCHEME = /^https?:\/\//i;

function isPlausibleHostname(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.includes(":")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  return h.includes(".");
}

/**
 * Absolute http(s) URL only — rejects empty strings, path-only input, and scheme-relative URLs.
 * Normalizes via the URL parser (trailing slashes on origin, etc.).
 */
export function safeExternalWorldHref(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s || !HAS_HTTP_SCHEME.test(s)) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!isPlausibleHostname(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function isValidExternalWorldUrl(value: string): boolean {
  return safeExternalWorldHref(value) !== null;
}
