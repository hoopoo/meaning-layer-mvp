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
 *   VRCHAT_AUTH_COOKIE=...           # preferred for CI (reuse session)
 *   VRCHAT_USERNAME + VRCHAT_PASSWORD
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
  "MeaningLayerMVP-importer/1.0 (meaning-layer-mvp; +worlds:import:vrchat)";

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

function extractAuthCookie(res: Response): string | null {
  const fromSetCookie =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const cookie of fromSetCookie) {
    const match = cookie.match(/^auth=([^;]+)/);
    if (match) return match[1]!;
  }
  const raw = res.headers.get("set-cookie");
  if (raw) {
    const match = raw.match(/auth=([^;]+)/);
    if (match) return match[1]!;
  }
  return null;
}

async function resolveAuthCookie(): Promise<string> {
  const preset = process.env.VRCHAT_AUTH_COOKIE?.trim();
  if (preset) return preset;

  const username = process.env.VRCHAT_USERNAME?.trim();
  const password = process.env.VRCHAT_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "VRChat API requires auth. Set VRCHAT_AUTH_COOKIE or VRCHAT_USERNAME + VRCHAT_PASSWORD.",
    );
  }

  const res = await fetch(`${API_BASE}/auth/user`, {
    headers: {
      Authorization: `Basic ${basicAuthToken(username, password)}`,
      "User-Agent": UA,
      Accept: "application/json",
    },
  });

  if (res.status === 401) {
    throw new Error(
      "VRChat login failed (401). If the account uses 2FA, set VRCHAT_AUTH_COOKIE from a logged-in browser session instead.",
    );
  }
  if (!res.ok) {
    throw new Error(`VRChat login HTTP ${res.status}`);
  }

  const cookie = extractAuthCookie(res);
  if (!cookie) {
    throw new Error("VRChat login succeeded but no auth cookie was returned.");
  }
  return cookie;
}

async function vrchatGet(path: string, authCookie: string, params: Record<string, string> = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Cookie: `auth=${authCookie}`,
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
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const feed of feeds) {
    if (candidates.length >= limit) break;

    let worlds: VrchatWorld[];
    try {
      const data = await vrchatGet(feed.path, authCookie, feed.params);
      worlds = Array.isArray(data) ? data : [];
    } catch (err) {
      console.log(`Feed '${feed.feedId}' failed: ${err instanceof Error ? err.message : err}`);
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

  return candidates;
}

async function main() {
  const sortOrder = parseSortOrder(SORT, process.env.FALLBACK_SORTS);
  const feeds = buildFeeds(sortOrder);
  console.log(
    `Importing up to ${LIMIT} VRChat world(s); sort order: ${sortOrder.join(" → ")} (+ active feed)`,
  );

  const authCookie = await resolveAuthCookie();

  const existing = await prisma.world.findMany({
    where: { sourceType: "VRCHAT" },
    select: { sourceUrl: true },
  });
  const existingWorldIds = new Set(
    existing.map((w) => worldIdFromUrl(w.sourceUrl)).filter((x): x is string => Boolean(x)),
  );

  const candidates = await collectCandidates(feeds, authCookie, existingWorldIds, LIMIT);

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
