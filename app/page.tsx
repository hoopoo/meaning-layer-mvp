import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WorldCard } from "@/components/world-card";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Filter = "all" | "awaiting" | "interpreted";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting interpretation" },
  { key: "interpreted", label: "Interpreted" },
];

function parseFilter(raw: string | undefined): Filter {
  return raw === "awaiting" || raw === "interpreted" ? raw : "all";
}

function whereFor(filter: Filter): Prisma.WorldWhereInput {
  if (filter === "awaiting") return { interpretations: { none: {} } };
  if (filter === "interpreted") return { interpretations: { some: {} } };
  return {};
}

function emptyMessage(filter: Filter): string {
  if (filter === "awaiting") return "Nothing awaiting—every recorded world has at least one interpretation.";
  if (filter === "interpreted") return "No world has been interpreted yet.";
  return "When a world is recorded—its reason, its question, its tags, and any interpretations—it will appear here as a single entry in the registry, without fanfare.";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const filter = parseFilter((await searchParams).filter);

  const [worlds, totalAll, totalAwaiting] = await Promise.all([
    prisma.world.findMany({
      where: whereFor(filter),
      orderBy: { createdAt: "desc" },
      include: {
        meanings: { include: { tag: true } },
        interpretations: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, authorName: true, body: true },
        },
        _count: { select: { interpretations: true } },
      },
    }),
    prisma.world.count(),
    prisma.world.count({ where: { interpretations: { none: {} } } }),
  ]);

  const counts: Record<Filter, number> = {
    all: totalAll,
    awaiting: totalAwaiting,
    interpreted: totalAll - totalAwaiting,
  };

  return (
    <div className="min-h-screen bg-stone-100/60 dark:bg-stone-950">
      <SiteHeader
        action={
          <Link
            href="/worlds/new"
            className="inline-flex items-center justify-center rounded-xl border border-stone-400/80 bg-transparent px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-500 hover:bg-stone-200/40 dark:border-stone-600 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:bg-stone-900/60"
          >
            Register a world
          </Link>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-xl text-stone-900 dark:text-stone-100">Registered Worlds</h2>
        </div>

        <nav className="mb-2 flex flex-wrap gap-2" aria-label="Filter worlds">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const href = f.key === "all" ? "/" : `/?filter=${f.key}`;
            return (
              <Link
                key={f.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-flex items-center gap-2 rounded-full border border-stone-400 bg-stone-200/60 px-3.5 py-1.5 text-xs font-medium text-stone-800 dark:border-stone-500 dark:bg-stone-800/70 dark:text-stone-100"
                    : "inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-transparent px-3.5 py-1.5 text-xs font-medium text-stone-500 transition hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
                }
              >
                <span>{f.label}</span>
                <span
                  className={
                    active
                      ? "tabular-nums text-stone-500 dark:text-stone-400"
                      : "tabular-nums text-stone-400 dark:text-stone-500"
                  }
                >
                  {counts[f.key]}
                </span>
              </Link>
            );
          })}
        </nav>

        {filter === "awaiting" ? (
          <p className="mb-8 max-w-2xl text-xs leading-relaxed text-stone-500 dark:text-stone-500">
            Worlds with no interpretation yet—often auto-ingested and still undeclared. This is where a human
            reading is most welcome.
          </p>
        ) : (
          <div className="mb-8" />
        )}

        {worlds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-8 py-16 text-center dark:border-stone-700 dark:bg-stone-950/70">
            <p className="font-serif text-lg text-stone-800 dark:text-stone-200">Nothing here.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {emptyMessage(filter)}
            </p>
            <Link
              href="/worlds/new"
              className="mt-8 inline-flex rounded-xl border border-stone-400/80 px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-200/40 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900/60"
            >
              Register a world
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {worlds.map((w) => (
              <li key={w.id}>
                <WorldCard world={w} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
