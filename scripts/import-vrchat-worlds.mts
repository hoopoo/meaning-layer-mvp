import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

/** Minimal .env loader (no dependency): only fills vars that aren't already set. */
function loadEnv(path = ".env"): void {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnv();

const prisma = new PrismaClient();

/**
 * On-demand importer: pulls popular VRChat worlds from the community-documented
 * Web API and registers them as worlds — intentionally left "undecided".
 *
 * Usage:
 *   npm run worlds:import:vrchat
 *   SORT=heat LIMIT=20 npm run worlds:import:vrchat
 *   FALLBACK_SORTS=none npm run worlds:import:vrchat
 *
 * Auth (required — VRChat returns 401 without it):
 *   VRCHAT_USERNAME + VRCHAT_PASSWORD  # preferred for CI (fresh session each run)
 *   VRCHAT_2FA_SECRET=...              # TOTP key if the account has 2FA
 *   VRCHAT_AUTH_COOKIE=...             # optional fallback (browser cookies expire quickly)
 *   VRCHAT_TWO_FACTOR_AUTH_COOKIE=...  # optional 2FA device remembrance cookie
 *
 * Sorts on GET /worlds: popularity | heat | created | updated | ...
 * When the primary sort is exhausted, FALLBACK_SORTS are tried in order.
 */

const API_BASE = "https://api.vrchat.cloud/api/1";
const KNOWN_SORTS = ["popularity", "heat", "created", "updated"] as const;
const SORT = process.env.SORT ?? "popularity";
const LIMIT = Math.max(1, Number(process.env.LIMIT ?? "10") || 10);
const PAGE_SIZE = Math.min(100, Math.max(LIMIT, Number(process.env.PAGE_SIZE ?? "100") || 100));
const UA =
  process.env.VRCHAT_USER_AGENT ??
  "MeaningLayerMVP/1.0 (https://github.com/hoopoo/meaning-layer-mvp)";

type VrchatWorld = {
  id: string;
  name: string;
  authorName?: string;
  releaseStatus?: string;
};

type FeedSpec = { feedId: string; path: string; params: Record<string, string> };
type Candidate = { world: VrchatWorld; feedId: string };

function parseSortOrder(primary: string, fallbacksRaw: string | undefined): string[] {
  const fallbacks =
    fallbacksRaw === "none"
      ? []
      : (fallbacksRaw ?? KNOWN_SORTS.filter((s) => s !== primary).join(","))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

  const order: string[] = [];
  for (const sortId of [primary, ...fallbacks]) {
    if (!order.includes(sortId)) order.push(sortId);
  }
  return order;
}

function basicAuthToken(username: string, password: string): string {
  return Buffer.from(
    `${encodeURIComponent(username)}:${encodeURIComponent(password)}`,
    "utf8",
  ).toString("base64");
}

function extractCookieValue(res: Response, name: "auth" | "twoFactorAuth"): string | null {
  const fromSetCookie =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const cookie of fromSetCookie) {
    const match = cookie.match(new RegExp(`^${name}=([^;]+)`));
    if (match) return match[1]!;
  }
  const raw = res.headers.get("set-cookie");
  if (raw) {
    const match = raw.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1]!;
  }
  return null;
}

function extractAuthCookie(res: Response): string | null {
  return extractCookieValue(res, "auth");
}

function normalizeAuthCookie(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith("auth=")) {
    return trimmed.slice(5).trim();
  }
  return trimmed;
}

function normalizeTwoFactorAuthCookie(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith("twofactorauth=")) {
    return trimmed.slice("twofactorauth=".length).trim();
  }
  return trimmed;
}

function buildCookieHeader(authCookie: string, twoFactorAuthCookie?: string): string {
  const parts = [`auth=${authCookie}`];
  if (twoFactorAuthCookie) {
    parts.push(`twoFactorAuth=${normalizeTwoFactorAuthCookie(twoFactorAuthCookie)}`);
  }
  return parts.join("; ");
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.replace(/\s/g, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret: string, stepSeconds = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

function totpSecretFromEnv(): string | undefined {
  const raw = process.env.VRCHAT_2FA_SECRET ?? process.env.VRCHAT_KEY;
  return raw?.replace(/\s/g, "");
}

function assertAuthCookieShape(cookie: string): void {
  if (cookie.length < 20) {
    throw new Error(
      "VRCHAT_AUTH_COOKIE looks too short. Copy the full Value of the auth cookie from vrchat.com — not your username.",
    );
  }
  if (!cookie.startsWith("authcookie_")) {
    console.warn(
      "Warning: VRChat auth cookies usually start with authcookie_. Make sure you copied the auth row Value from Cookies, not your username.",
    );
  }
}

async function verifyAuthCookie(authCookie: string, twoFactorAuthCookie?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/user`, {
    headers: {
      Cookie: buildCookieHeader(authCookie, twoFactorAuthCookie),
      "User-Agent": UA,
      Accept: "application/json",
    },
  });
  if (res.status === 401) {
    throw new Error(
      "VRChat auth cookie is invalid or expired. For CI, set VRCHAT_USERNAME + VRCHAT_PASSWORD (+ VRCHAT_2FA_SECRET if 2FA is enabled).",
    );
  }
  if (!res.ok) {
    throw new Error(`VRChat auth check failed: HTTP ${res.status}`);
  }
}

function hasCredential(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

async function loginWithCredentials(username: string, password: string): Promise<string> {
  const twoFactorAuthCookie = process.env.VRCHAT_TWO_FACTOR_AUTH_COOKIE?.trim();
  const headers: Record<string, string> = {
    Authorization: `Basic ${basicAuthToken(username, password)}`,
    "User-Agent": UA,
    Accept: "application/json",
  };
  if (hasCredential(twoFactorAuthCookie)) {
    headers.Cookie = `twoFactorAuth=${normalizeTwoFactorAuthCookie(twoFactorAuthCookie!)}`;
  }

  const res = await fetch(`${API_BASE}/auth/user`, { headers });

  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  if (res.status === 401) {
    const detail =
      body?.error &&
      typeof body.error === "object" &&
      "message" in body.error &&
      typeof (body.error as { message?: unknown }).message === "string"
        ? (body.error as { message: string }).message
        : "invalid credentials";
    throw new Error(
      `VRChat login failed (401: ${detail}). Use your VRChat username (not email) and password.`,
    );
  }
  if (!res.ok) {
    throw new Error(`VRChat login HTTP ${res.status}`);
  }

  if (body?.emailVerified === false) {
    throw new Error(
      "VRChat email is not verified yet. Verify the account email at vrchat.com, then retry.",
    );
  }

  let authCookie = extractAuthCookie(res);
  const rememberedTwoFactor = extractCookieValue(res, "twoFactorAuth");

  if (body?.requiresTwoFactorAuth === true) {
    if (!authCookie) {
      throw new Error(
        "VRChat login returned a 2FA challenge but no auth cookie. Retry with VRCHAT_2FA_SECRET.",
      );
    }

    const totpSecret = totpSecretFromEnv();
    if (!hasCredential(totpSecret)) {
      throw new Error(
        "VRChat account requires 2FA. Set GitHub secret VRCHAT_2FA_SECRET to the TOTP key from your authenticator setup (the manual entry key, not a one-time code).",
      );
    }

    const verifyRes = await fetch(`${API_BASE}/auth/twofactorauth/totp/verify`, {
      method: "POST",
      headers: {
        Cookie: buildCookieHeader(
          authCookie,
          twoFactorAuthCookie ?? rememberedTwoFactor ?? undefined,
        ),
        "User-Agent": UA,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: generateTotp(totpSecret!) }),
    });

    let verifyBody: Record<string, unknown> | null = null;
    try {
      verifyBody = (await verifyRes.json()) as Record<string, unknown>;
    } catch {
      verifyBody = null;
    }

    if (!verifyRes.ok) {
      const detail =
        verifyBody?.error &&
        typeof verifyBody.error === "object" &&
        "message" in verifyBody.error &&
        typeof (verifyBody.error as { message?: unknown }).message === "string"
          ? (verifyBody.error as { message: string }).message
          : `HTTP ${verifyRes.status}`;
      throw new Error(`VRChat 2FA verification failed (${detail}). Check VRCHAT_2FA_SECRET.`);
    }

    authCookie = extractAuthCookie(verifyRes) ?? authCookie;
  }

  if (!authCookie) {
    throw new Error(
      "VRChat login succeeded but no auth cookie was returned. Check credentials and 2FA settings.",
    );
  }

  return authCookie;
}

async function resolveAuthCookie(): Promise<{ cookie: string; source: string }> {
  const username = process.env.VRCHAT_USERNAME?.trim();
  const password = process.env.VRCHAT_PASSWORD;
  const hasLogin = hasCredential(username) && hasCredential(password);

  if (hasLogin) {
    return {
      cookie: await loginWithCredentials(username!, password!),
      source: "username/password login",
    };
  }

  const presetRaw = process.env.VRCHAT_AUTH_COOKIE;
  if (hasCredential(presetRaw)) {
    const cookie = normalizeAuthCookie(presetRaw!);
    assertAuthCookieShape(cookie);
    const twoFactorAuthCookie = process.env.VRCHAT_TWO_FACTOR_AUTH_COOKIE?.trim();
    await verifyAuthCookie(cookie, twoFactorAuthCookie);
    return { cookie, source: "VRCHAT_AUTH_COOKIE" };
  }

  throw new Error(
    "VRChat API requires auth. Add GitHub Actions secrets: VRCHAT_USERNAME + VRCHAT_PASSWORD (+ VRCHAT_2FA_SECRET if 2FA is on), or VRCHAT_AUTH_COOKIE as a fallback.",
  );
}

async function vrchatGet(
  path: string,
  authCookie: string,
  params: Record<string, string> = {},
  twoFactorAuthCookie?: string,
) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Cookie: buildCookieHeader(authCookie, twoFactorAuthCookie),
      "User-Agent": UA,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url.pathname}${url.search}`);
  }
  return res.json();
}

function buildFeeds(sortOrder: string[]): FeedSpec[] {
  const feeds: FeedSpec[] = sortOrder.map((sortId) => ({
    feedId: sortId,
    path: "/worlds",
    params: {
      sort: sortId,
      order: "descending",
      n: String(PAGE_SIZE),
      releaseStatus: "public",
    },
  }));
  feeds.push({
    feedId: "active",
    path: "/worlds/active",
    params: {
      sort: "active",
      order: "descending",
      n: String(PAGE_SIZE),
      releaseStatus: "public",
    },
  });
  return feeds;
}

function worldIdFromUrl(url: string): string | null {
  const match = url.match(/wrld_[a-f0-9-]+/i);
  return match ? match[0]!.toLowerCase() : null;
}

function publicWorldUrl(worldId: string): string {
  return `https://vrchat.com/home/world/${worldId}/info`;
}

async function collectCandidates(
  feeds: FeedSpec[],
  authCookie: string,
  existingWorldIds: Set<string>,
  limit: number,
  twoFactorAuthCookie?: string,
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  let unauthorizedFeeds = 0;
  let feedsChecked = 0;

  for (const feed of feeds) {
    if (candidates.length >= limit) break;
    feedsChecked++;

    let worlds: VrchatWorld[];
    try {
      const data = await vrchatGet(feed.path, authCookie, feed.params, twoFactorAuthCookie);
      worlds = Array.isArray(data) ? data : [];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`Feed '${feed.feedId}' failed: ${message}`);
      if (message.includes("HTTP 401")) unauthorizedFeeds++;
      continue;
    }

    let addedFromFeed = 0;
    for (const world of worlds) {
      if (candidates.length >= limit) break;
      if (!world?.id?.startsWith("wrld_") || !world.name?.trim()) continue;
      if (world.releaseStatus && world.releaseStatus !== "public") continue;

      const worldId = world.id.toLowerCase();
      if (existingWorldIds.has(worldId) || seen.has(worldId)) continue;

      seen.add(worldId);
      candidates.push({ world, feedId: feed.feedId });
      addedFromFeed++;
    }

    console.log(`Feed '${feed.feedId}': ${addedFromFeed} new candidate(s).`);
  }

  if (candidates.length === 0 && unauthorizedFeeds > 0 && unauthorizedFeeds === feedsChecked) {
    throw new Error(
      "All VRChat discovery feeds returned HTTP 401. Set VRCHAT_USERNAME + VRCHAT_PASSWORD (+ VRCHAT_2FA_SECRET if 2FA is enabled) in GitHub Actions secrets.",
    );
  }

  return candidates;
}

async function main() {
  const sortOrder = parseSortOrder(SORT, process.env.FALLBACK_SORTS);
  const feeds = buildFeeds(sortOrder);
  console.log(
    `Importing up to ${LIMIT} VRChat world(s); sort order: ${sortOrder.join(" → ")} (+ active feed)`,
  );

  const { cookie: authCookie, source: authSource } = await resolveAuthCookie();
  const twoFactorAuthCookie = process.env.VRCHAT_TWO_FACTOR_AUTH_COOKIE?.trim();
  console.log(
    `VRChat auth via ${authSource} (cookie length ${authCookie.length}, authcookie_ prefix: ${authCookie.startsWith("authcookie_")})`,
  );
  await verifyAuthCookie(authCookie, twoFactorAuthCookie);

  const existing = await prisma.world.findMany({
    where: { sourceType: "VRCHAT" },
    select: { sourceUrl: true },
  });
  const existingWorldIds = new Set(
    existing.map((w) => worldIdFromUrl(w.sourceUrl)).filter((x): x is string => Boolean(x)),
  );

  const candidates = await collectCandidates(
    feeds,
    authCookie,
    existingWorldIds,
    LIMIT,
    twoFactorAuthCookie,
  );

  if (candidates.length === 0) {
    console.log(
      `No new VRChat worlds to import — registry already has the current feeds for: ${sortOrder.join(", ")}.`,
    );
    return;
  }

  const undecidedTag = await prisma.meaningTag.upsert({
    where: { name: "undecided" },
    update: {},
    create: { name: "undecided" },
  });

  const importedByFeed = new Map<string, number>();
  let created = 0;

  for (const { world, feedId } of candidates) {
    const sourceUrl = publicWorldUrl(world.id);
    await prisma.world.create({
      data: {
        title: world.name.slice(0, 200),
        sourceType: "VRCHAT",
        accessMode: "APP_REQUIRED",
        sourceUrl,
        creatorName: world.authorName?.trim() || "Unknown creator",
        whyExists:
          "Ingested automatically from VRChat discovery. Its reason for existing is not yet declared—open for definition.",
        initialQuestion:
          "What is this world for, and what does it ask of whoever enters? — undeclared.",
        isUndecided: true,
        meanings: { create: [{ tagId: undecidedTag.id }] },
      },
    });
    created++;
    importedByFeed.set(feedId, (importedByFeed.get(feedId) ?? 0) + 1);
    console.log(`+ [${feedId}] ${world.name}  →  ${sourceUrl}`);
  }

  const breakdown = Array.from(importedByFeed.entries())
    .map(([feedId, count]) => `${feedId}: ${count}`)
    .join(", ");
  console.log(`\nImported ${created} new VRChat world(s) (${breakdown}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
