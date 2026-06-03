import Link from "next/link";
import { MeaningState } from "@/components/meaning-state";
import { TagBadge } from "@/components/tag-badge";
import { formatArchiveDate } from "@/lib/format-date";
import {
  cardBlockClassForIndex,
  cardInterpretationStackGapClass,
  computeDecisionPosture,
  computeDivergenceLevel,
  decisionPostureHeadline,
  decisionPostureMicrocopy,
  divergenceDisplayLabel,
} from "@/lib/divergence";
import { SourceTypeBadge } from "@/components/source-type-badge";
import { WorldSourceAction } from "@/components/world-source-action";
import { interpretationsCountPhrase } from "@/lib/interpretations-label";
import { parseSourceType } from "@/lib/source-reference";
import { linePreview, whyExistsPreview } from "@/lib/why-preview";

export type WorldCardWorld = {
  id: string;
  title: string;
  creatorName: string;
  whyExists: string;
  initialQuestion: string;
  sourceUrl: string;
  sourceType: string;
  accessMode: string;
  isUndecided: boolean;
  createdAt: Date;
  meanings: { tag: { name: string } }[];
  interpretations: { id: string; authorName: string; body: string }[];
  _count: { interpretations: number };
};

const tensionClass =
  "py-2 text-center text-[10px] font-normal tracking-[0.2em] text-stone-400/75 dark:text-stone-500/70";

const divergenceMetaClass =
  "mt-1.5 text-[10px] font-normal tracking-[0.12em] text-stone-500/80 dark:text-stone-500/70";

const decisionPostureLabelClass =
  "mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500";

const decisionPostureHeadlineClass =
  "mt-1 text-[13px] font-normal tracking-[0.06em] text-stone-900 dark:text-stone-100";

const decisionPostureMicroClass =
  "mt-1 text-[10px] font-normal leading-relaxed tracking-[0.03em] text-stone-500/88 dark:text-stone-500/72";

export function WorldCard({ world }: { world: WorldCardWorld }) {
  const tags = world.meanings.map((m) => m.tag.name).sort();
  const whyPreview = whyExistsPreview(world.whyExists);
  const previewInterpretations = world.interpretations.slice(0, 2);
  const totalInterpretations = world._count.interpretations;
  const hasPluralReadings = totalInterpretations >= 2;
  const divergenceLevel = hasPluralReadings
    ? computeDivergenceLevel(world.interpretations.map((i) => i.body))
    : null;
  const decisionPosture = computeDecisionPosture(totalInterpretations, divergenceLevel);
  const sourceType = parseSourceType(world.sourceType);

  return (
    <article className="group rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950 dark:hover:border-stone-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h2 className="font-serif text-lg text-stone-900 dark:text-stone-100">
              <Link
                href={`/worlds/${world.id}`}
                className="hover:text-stone-600 dark:hover:text-stone-300"
              >
                {world.title}
              </Link>
            </h2>
            <SourceTypeBadge sourceType={sourceType} />
          </div>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-500">{world.creatorName}</p>
        </div>
        <WorldSourceAction
          sourceType={sourceType}
          sourceUrl={world.sourceUrl}
          className="inline-flex w-fit shrink-0 items-center rounded-lg border border-stone-300/90 bg-transparent px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:bg-stone-900/80"
        />
      </div>

      <div className="mt-5 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
          Why this world exists
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {whyPreview}
        </p>
      </div>

      <div className="mt-5 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500/85 dark:text-stone-500/80">
          Interpretations
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          Interpretations may diverge.
        </p>

        {previewInterpretations.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500/75 dark:text-stone-500/65">No interpretations yet.</p>
        ) : previewInterpretations.length === 1 ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-500/95 dark:text-stone-500/85">
            {linePreview(previewInterpretations[0].body)}
          </p>
        ) : (
          <div
            className={`mt-4 flex flex-col ${cardInterpretationStackGapClass(divergenceLevel)}`}
          >
            {previewInterpretations.map((it, index) => (
              <div key={it.id}>
                {index > 0 ? <p className={tensionClass}>— or —</p> : null}
                <div className={cardBlockClassForIndex(divergenceLevel, index)}>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    {it.authorName?.trim() || "—"}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500/95 dark:text-stone-500/85">
                    {linePreview(it.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-stone-500 dark:text-stone-500">No tags</span>
        ) : (
          tags.map((name) => <TagBadge key={name} name={name} />)
        )}
      </div>

      <dl className="mt-6 grid gap-3 border-t border-stone-200/70 pt-5 text-xs text-stone-600 dark:border-stone-800/90 dark:text-stone-400 sm:grid-cols-3">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
            State of meaning
          </dt>
          <dd className="mt-1.5 space-y-2">
            <MeaningState isUndecided={world.isUndecided} />
            {hasPluralReadings ? (
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500/90 dark:text-stone-500/80">
                Unresolved
              </p>
            ) : null}
            {decisionPosture ? (
              <div>
                <p className={decisionPostureLabelClass}>Decision Posture</p>
                <p className={decisionPostureHeadlineClass}>{decisionPostureHeadline(decisionPosture)}</p>
                <p className={decisionPostureMicroClass}>{decisionPostureMicrocopy(decisionPosture)}</p>
              </div>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
            Interpretations
          </dt>
          <dd className="mt-1.5 text-sm leading-snug text-stone-700 dark:text-stone-300">
            {interpretationsCountPhrase(totalInterpretations)}
            {divergenceLevel ? (
              <span className={`block ${divergenceMetaClass}`}>
                {divergenceDisplayLabel(divergenceLevel)}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
            Recorded
          </dt>
          <dd className="mt-1.5 tabular-nums">{formatArchiveDate(world.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex justify-end">
        <Link
          href={`/worlds/${world.id}/edit`}
          className="inline-flex w-fit items-center rounded-lg border border-stone-300/90 bg-transparent px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:bg-stone-900/80"
        >
          {world.isUndecided ? "Declare meaning" : "Edit world"}
        </Link>
      </div>
    </article>
  );
}
