import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WorldCard } from "@/components/world-card";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const worlds = await prisma.world.findMany({
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
  });

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
        <h2 className="mb-10 font-serif text-xl text-stone-900 dark:text-stone-100">Registered Worlds</h2>

        {worlds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-8 py-16 text-center dark:border-stone-700 dark:bg-stone-950/70">
            <p className="font-serif text-lg text-stone-800 dark:text-stone-200">Nothing registered yet.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              When a world is recorded—its reason, its question, its tags, and any interpretations—it will
              appear here as a single entry in the registry, without fanfare.
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
