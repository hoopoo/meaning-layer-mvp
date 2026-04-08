import { safeExternalWorldHref } from "@/lib/source-url";

/** Canonical ontology values (persisted uppercase in DB). */
export const SOURCE_TYPES = ["WEB", "BUD", "ROBLOX", "OTHER"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const ACCESS_MODES = ["DIRECT", "APP_REQUIRED", "UNKNOWN"] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

export function isSourceType(s: string): s is SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(s);
}

export function isAccessMode(s: string): s is AccessMode {
  return (ACCESS_MODES as readonly string[]).includes(s);
}

/** Accepts legacy lowercase rows; always returns canonical enum string. */
export function parseSourceType(raw: string): SourceType {
  const r = String(raw ?? "").trim().toUpperCase();
  if (isSourceType(r)) return r;
  return "WEB";
}

export function parseAccessMode(raw: string): AccessMode {
  const r = String(raw ?? "").trim().toUpperCase();
  if (isAccessMode(r)) return r;
  return "UNKNOWN";
}

/** Non-http(s) scheme, e.g. bud://world/id */
export function isCustomSchemeUrl(s: string): boolean {
  const t = String(s).trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t);
}

export function isValidSourceReference(sourceType: SourceType, raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > 2048) return false;
  if (sourceType === "WEB") {
    return safeExternalWorldHref(t) !== null;
  }
  if (isCustomSchemeUrl(t)) return true;
  return safeExternalWorldHref(t) !== null;
}

export function normalizeStoredReference(sourceType: SourceType, raw: string): string {
  const t = raw.trim();
  if (sourceType === "WEB") {
    return safeExternalWorldHref(t)!;
  }
  return t;
}

export function hasDisplayableSourceReference(sourceUrl: string): boolean {
  return sourceUrl.trim().length > 0;
}

export function sourceActionLabel(sourceType: SourceType): string {
  const m: Record<SourceType, string> = {
    WEB: "Open link",
    BUD: "Open in BUD",
    ROBLOX: "Open in Roblox",
    OTHER: "View reference",
  };
  return m[sourceType];
}

export function sourceTypeBadgeLabel(sourceType: SourceType): string {
  return sourceType;
}
