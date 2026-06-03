import Link from "next/link";
import { notFound } from "next/navigation";
import { updateWorld } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { WorldForm, type WorldFormInitial } from "@/components/world-form";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditWorldPage({ params }: PageProps) {
  const { id } = await params;

  const [world, tags] = await Promise.all([
    prisma.world.findUnique({
      where: { id },
      include: { meanings: { select: { tagId: true } } },
    }),
    prisma.meaningTag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!world) notFound();

  const initial: WorldFormInitial = {
    title: world.title,
    whyExists: world.whyExists,
    initialQuestion: world.initialQuestion,
    sourceType: world.sourceType,
    accessMode: world.accessMode,
    sourceUrl: world.sourceUrl,
    creatorName: world.creatorName,
    isUndecided: world.isUndecided,
    tagIds: world.meanings.map((m) => m.tagId),
  };

  const action = updateWorld.bind(null, world.id);

  return (
    <div className="min-h-screen bg-stone-100/60 dark:bg-stone-950">
      <SiteHeader
        action={
          <Link
            href={`/worlds/${world.id}`}
            className="text-sm font-medium text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
          >
            Back to world
          </Link>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <h2 className="font-serif text-2xl text-stone-900 dark:text-stone-100">
            Declare this world&rsquo;s meaning
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Editing an existing record—refine its reason, its question, its tags, and whether its
            meaning is still undecided. Saving updates this world in place; no duplicate is created.
          </p>
        </header>

        <WorldForm
          tags={tags}
          initial={initial}
          action={action}
          submitLabel="Save changes"
          pendingLabel="Saving…"
        />
      </main>
    </div>
  );
}
