import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WorldForm } from "@/components/world-form";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewWorldPage() {
  const tags = await prisma.meaningTag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-screen bg-stone-100/60 dark:bg-stone-950">
      <SiteHeader
        action={
          <Link
            href="/"
            className="text-sm font-medium text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
          >
            Back to registry
          </Link>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <h2 className="font-serif text-2xl text-stone-900 dark:text-stone-100">New world record</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Document intent and language before play. Fields are plain; precision is yours.
          </p>
        </header>

        {tags.length === 0 ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-6 py-8 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Meaning tags are missing. Run{" "}
            <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
              npx prisma db seed
            </code>{" "}
            after migrating the schema.
          </div>
        ) : (
          <>
            <p className="mb-8 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              <span className="block">A world can be played.</span>
              <span className="block">Here, it is first defined.</span>
            </p>
            <WorldForm tags={tags} />
          </>
        )}
      </main>
    </div>
  );
}
