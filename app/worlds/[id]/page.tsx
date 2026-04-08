import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceTypeBadge } from "@/components/source-type-badge";
import { WorldSourceAction } from "@/components/world-source-action";
import { InterpretationForm } from "@/components/interpretation-form";
import { MeaningState } from "@/components/meaning-state";
import { SiteHeader } from "@/components/site-header";
import { TagBadge } from "@/components/tag-badge";
import { formatArchiveDate } from "@/lib/format-date";
import {
  computeDecisionPosture,
  computeDivergenceLevel,
  decisionPostureHeadline,
  decisionPostureMicrocopy,
  detailBlockClassForIndex,
  detailInterpretationListGapClass,
  divergenceDisplayLabel,
} from "@/lib/divergence";
import { interpretationsCountPhrase } from "@/lib/interpretations-label";
import { parseSourceType } from "@/lib/source-reference";
import prisma from "@/lib/prisma";

const interpretationTension =
  "pb-1 pt-2 text-center text-[10px] font-normal tracking-[0.2em] text-stone-400/75 dark:text-stone-500/70";

const divergenceOverviewClass =
  "text-[10px] font-normal tracking-[0.12em] text-stone-500/80 dark:text-stone-500/70";

const decisionPostureOverviewLabelClass =
  "text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500";

const decisionPostureOverviewHeadlineClass =
  "text-sm font-normal tracking-[0.06em] text-stone-900 dark:text-stone-100";

const decisionPostureOverviewMicroClass =
  "text-[11px] font-normal leading-relaxed text-stone-500/88 dark:text-stone-500/72";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function WorldDetailPage({ params }: PageProps) {
  const { id } = await params;

  const world = await prisma.world.findUnique({
    where: { id },
    include: {
      meanings: { include: { tag: true } },
      interpretations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!world) notFound();

  const tags = world.meanings.map((m) => m.tag.name).sort();
  const interpretationCount = world.interpretations.length;
  const readingsArePlural = interpretationCount >= 2;
  const divergenceLevel = readingsArePlural
    ? computeDivergenceLevel(world.interpretations.map((i) => i.body))
    : null;
  const decisionPosture = computeDecisionPosture(interpretationCount, divergenceLevel);
  const sourceType = parseSourceType(world.sourceType);

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
        <article className="space-y-12">
          <header className="space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
              Overview
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-serif text-3xl tracking-tight text-stone-900 dark:text-stone-100">
                {world.title}
              </h1>
              <SourceTypeBadge sourceType={sourceType} />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500 dark:text-stone-500">{world.creatorName}</p>
              <WorldSourceAction
                sourceType={sourceType}
                sourceUrl={world.sourceUrl}
                className="inline-flex w-fit items-center rounded-xl border border-stone-300/90 bg-white px-4 py-2 text-sm font-medium text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:bg-stone-900/80"
              />
            </div>
            <div className="flex flex-col gap-3 text-sm text-stone-600 dark:text-stone-400">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-stone-500 dark:text-stone-500">State of meaning:</span>
                  <MeaningState isUndecided={world.isUndecided} />
                  {readingsArePlural ? (
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500/90 dark:text-stone-500/80">
                      Unresolved
                    </span>
                  ) : null}
                </div>
                <span className="hidden text-stone-400 dark:text-stone-600 sm:inline" aria-hidden>
                  ·
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-stone-700 dark:text-stone-300">
                  <span>{interpretationsCountPhrase(interpretationCount)}</span>
                  {divergenceLevel ? (
                    <span className={divergenceOverviewClass}>{divergenceDisplayLabel(divergenceLevel)}</span>
                  ) : null}
                </span>
                <span className="hidden text-stone-400 dark:text-stone-600 sm:inline" aria-hidden>
                  ·
                </span>
                <span className="tabular-nums text-stone-600 dark:text-stone-400">
                  Recorded {formatArchiveDate(world.createdAt)}
                </span>
              </div>
              {decisionPosture ? (
                <div className="space-y-1">
                  <p className={decisionPostureOverviewLabelClass}>Decision Posture</p>
                  <p className={decisionPostureOverviewHeadlineClass}>
                    {decisionPostureHeadline(decisionPosture)}
                  </p>
                  <p className={decisionPostureOverviewMicroClass}>{decisionPostureMicrocopy(decisionPosture)}</p>
                </div>
              ) : null}
            </div>
          </header>

          <section className="rounded-2xl border border-stone-200/90 bg-white p-8 dark:border-stone-800 dark:bg-stone-950">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
              Why this world exists
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-800 dark:text-stone-200">
              {world.whyExists}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200/90 bg-white p-8 dark:border-stone-800 dark:bg-stone-950">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
              Initial question
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-800 dark:text-stone-200">
              {world.initialQuestion}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200/90 bg-white p-8 dark:border-stone-800 dark:bg-stone-950">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
              Meaning tags
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-sm text-stone-500 dark:text-stone-500">None listed.</span>
              ) : (
                tags.map((name) => <TagBadge key={name} name={name} />)
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="font-serif text-xl text-stone-900 dark:text-stone-100">Interpretations</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Interpretations may not agree.
              </p>
              <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-500">
                Responses are preserved in order of arrival (newest first).
              </p>
            </div>

            {world.interpretations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center dark:border-stone-700 dark:bg-stone-950/60">
                <p className="text-sm text-stone-700 dark:text-stone-300">No interpretations on file.</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-stone-500 dark:text-stone-500">
                  The form below only appends a note to the record; it does not start a thread.
                </p>
              </div>
            ) : (
              <div className={`flex flex-col ${detailInterpretationListGapClass(divergenceLevel)}`}>
                {world.interpretations.map((it, index) => {
                  const isAlternate = index % 2 === 1;
                  return (
                    <div key={it.id}>
                      {index > 0 ? <p className={interpretationTension}>— or —</p> : null}
                      <div className={detailBlockClassForIndex(divergenceLevel, isAlternate)}>
                        <p className="text-sm font-medium tracking-tight text-stone-900 dark:text-stone-100">
                          {it.authorName?.trim() || "—"}
                        </p>
                        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                          {it.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <InterpretationForm worldId={world.id} />
          </section>
        </article>
      </main>
    </div>
  );
}
