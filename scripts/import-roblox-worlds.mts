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
 *   npm run worlds:import                 # defaults: SORT=top-trending, LIMIT=10
 *   SORT=up-and-coming LIMIT=20 npm run worlds:import
 *
 * Sorts seen from the API: top-trending | up-and-coming | top-playing-now |
 *                          fun-with-friends | top-revisited
 *
 * Idempotent: re-running only adds Roblox worlds not already present
 * (deduped by placeId), so the registry grows without duplicates.
 */

const SORT = process.env.SORT ?? "top-trending";
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

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchSortGames(): Promise<SortGame[]> {
  const url = `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${encodeURIComponent(
    SESSION,
  )}&device=computer&country=all`;
  const data = await getJson(url);
  const sorts: any[] = Array.isArray(data?.sorts) ? data.sorts : [];
  const sort =
    sorts.find((s) => s.sortId === SORT && Array.isArray(s.games)) ??
    sorts.find((s) => Array.isArray(s.games) && s.games.length > 0);
  if (!sort) {
    const available = sorts.filter((s) => Array.isArray(s.games)).map((s) => s.sortId);
    throw new Error(`Sort '${SORT}' not found. Available sorts: ${available.join(", ")}`);
  }
  return (sort.games as SortGame[]).filter((g) => g.universeId && g.rootPlaceId && !g.isSponsored);
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
  console.log(`Fetching Roblox sort '${SORT}' (limit ${LIMIT})…`);
  const games = await fetchSortGames();

  const existing = await prisma.world.findMany({
    where: { sourceType: "ROBLOX" },
    select: { sourceUrl: true },
  });
  const existingPlaceIds = new Set(
    existing.map((w) => placeIdFromUrl(w.sourceUrl)).filter((x): x is string => Boolean(x)),
  );

  const seen = new Set<string>();
  const candidates = games
    .filter((g) => {
      const pid = String(g.rootPlaceId);
      if (existingPlaceIds.has(pid) || seen.has(pid)) return false;
      seen.add(pid);
      return true;
    })
    .slice(0, LIMIT);

  if (candidates.length === 0) {
    console.log("No new worlds to import — registry already has the current top of this sort.");
    return;
  }

  const creators = await fetchCreators(candidates.map((c) => c.universeId));

  const undecidedTag = await prisma.meaningTag.upsert({
    where: { name: "undecided" },
    update: {},
    create: { name: "undecided" },
  });

  let created = 0;
  for (const g of candidates) {
    const sourceUrl = `https://www.roblox.com/games/${g.rootPlaceId}/${slugify(g.name)}`;
    await prisma.world.create({
      data: {
        title: g.name.slice(0, 200),
        sourceType: "ROBLOX",
        accessMode: "APP_REQUIRED",
        sourceUrl,
        creatorName: creators.get(g.universeId) ?? "Unknown creator",
        whyExists:
          "Ingested automatically from Roblox discovery. Its reason for existing is not yet declared—open for definition.",
        initialQuestion:
          "What is this world for, and what does it ask of whoever enters? — undeclared.",
        isUndecided: true,
        meanings: { create: [{ tagId: undecidedTag.id }] },
      },
    });
    created++;
    console.log(`+ ${g.name}  →  ${sourceUrl}`);
  }

  console.log(`\nImported ${created} new world(s) from sort '${SORT}'.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
