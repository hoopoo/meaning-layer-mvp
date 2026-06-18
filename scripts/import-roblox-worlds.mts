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
 * On-demand importer: pulls popular Roblox experiences from the public
 * explore-api discovery feed and registers them as worlds — intentionally
 * left "undecided" (no human meaning yet), so people can add interpretations later.
 *
 * Usage:
 *   npm run worlds:import                 # defaults: SORT=up-and-coming, LIMIT=10
 *   SORT=top-trending LIMIT=20 npm run worlds:import
 *   FALLBACK_SORTS=none npm run worlds:import   # primary sort only
 *
 * Sorts seen from the API: top-trending | up-and-coming | top-playing-now |
 *                          fun-with-friends | top-revisited
 *
 * When the primary sort is exhausted, FALLBACK_SORTS are tried in order until
 * LIMIT new worlds are found (or every sort is checked).
 *
 * Idempotent: re-running only adds Roblox worlds not already present
 * (deduped by placeId), so the registry grows without duplicates.
 */

const KNOWN_SORTS = [
  "up-and-coming",
  "top-trending",
  "top-playing-now",
  "fun-with-friends",
  "top-revisited",
] as const;

const SORT = process.env.SORT ?? "up-and-coming";
const LIMIT = Math.max(1, Number(process.env.LIMIT ?? "10") || 10);
const SESSION = process.env.SESSION_ID ?? `mlmvp-${Date.now()}`;
const UA = "MeaningLayerMVP-importer/1.0 (+worlds:import)";

type SortGame = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  isSponsored?: boolean;
  playerCount?: number;
};

type Candidate = { game: SortGame; sortId: string };

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

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchExploreSorts(): Promise<Map<string, SortGame[]>> {
  const url = `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${encodeURIComponent(
    SESSION,
  )}&device=computer&country=all`;
  const data = await getJson(url);
  const sorts: any[] = Array.isArray(data?.sorts) ? data.sorts : [];
  const map = new Map<string, SortGame[]>();

  for (const sort of sorts) {
    if (!sort?.sortId || !Array.isArray(sort.games)) continue;
    map.set(
      sort.sortId,
      (sort.games as SortGame[]).filter((g) => g.universeId && g.rootPlaceId && !g.isSponsored),
    );
  }

  if (map.size === 0) {
    throw new Error("Roblox explore API returned no sort feeds.");
  }

  return map;
}

function collectCandidates(
  sortOrder: string[],
  exploreSorts: Map<string, SortGame[]>,
  existingPlaceIds: Set<string>,
  limit: number,
): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const sortId of sortOrder) {
    if (candidates.length >= limit) break;

    const games = exploreSorts.get(sortId);
    if (!games) {
      console.log(`Sort '${sortId}' not in API response, skipping.`);
      continue;
    }

    let addedFromSort = 0;
    for (const game of games) {
      if (candidates.length >= limit) break;

      const placeId = String(game.rootPlaceId);
      if (existingPlaceIds.has(placeId) || seen.has(placeId)) continue;

      seen.add(placeId);
      candidates.push({ game, sortId });
      addedFromSort++;
    }

    console.log(`Sort '${sortId}': ${addedFromSort} new candidate(s).`);
  }

  return candidates;
}

/** Resolve creator display names via the public games multiget (batches of 50). */
async function fetchCreators(universeIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for (let i = 0; i < universeIds.length; i += 50) {
    const batch = universeIds.slice(i, i + 50);
    const url = `https://games.roblox.com/v1/games?universeIds=${batch.join(",")}`;
    try {
      const d = await getJson(url);
      for (const g of d?.data ?? []) {
        map.set(Number(g.id), g?.creator?.name?.trim() || "Unknown creator");
      }
    } catch {
      // Non-fatal: fall back to "Unknown creator" for this batch.
    }
  }
  return map;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "experience"
  );
}

function placeIdFromUrl(url: string): string | null {
  const m = url.match(/roblox\.com\/games\/(\d+)/i);
  return m ? m[1] : null;
}

async function main() {
  const sortOrder = parseSortOrder(SORT, process.env.FALLBACK_SORTS);
  console.log(`Importing up to ${LIMIT} world(s); sort order: ${sortOrder.join(" → ")}`);

  const exploreSorts = await fetchExploreSorts();

  const existing = await prisma.world.findMany({
    where: { sourceType: "ROBLOX" },
    select: { sourceUrl: true },
  });
  const existingPlaceIds = new Set(
    existing.map((w) => placeIdFromUrl(w.sourceUrl)).filter((x): x is string => Boolean(x)),
  );

  const candidates = collectCandidates(sortOrder, exploreSorts, existingPlaceIds, LIMIT);

  if (candidates.length === 0) {
    console.log(
      `No new worlds to import — registry already has the current feeds for: ${sortOrder.join(", ")}.`,
    );
    return;
  }

  const creators = await fetchCreators(candidates.map((c) => c.game.universeId));

  const undecidedTag = await prisma.meaningTag.upsert({
    where: { name: "undecided" },
    update: {},
    create: { name: "undecided" },
  });

  const importedBySort = new Map<string, number>();
  let created = 0;

  for (const { game, sortId } of candidates) {
    const sourceUrl = `https://www.roblox.com/games/${game.rootPlaceId}/${slugify(game.name)}`;
    await prisma.world.create({
      data: {
        title: game.name.slice(0, 200),
        sourceType: "ROBLOX",
        accessMode: "APP_REQUIRED",
        sourceUrl,
        creatorName: creators.get(game.universeId) ?? "Unknown creator",
        whyExists:
          "Ingested automatically from Roblox discovery. Its reason for existing is not yet declared—open for definition.",
        initialQuestion:
          "What is this world for, and what does it ask of whoever enters? — undeclared.",
        isUndecided: true,
        meanings: { create: [{ tagId: undecidedTag.id }] },
      },
    });
    created++;
    importedBySort.set(sortId, (importedBySort.get(sortId) ?? 0) + 1);
    console.log(`+ [${sortId}] ${game.name}  →  ${sourceUrl}`);
  }

  const breakdown = Array.from(importedBySort.entries())
    .map(([sortId, count]) => `${sortId}: ${count}`)
    .join(", ");
  console.log(`\nImported ${created} new world(s) (${breakdown}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
