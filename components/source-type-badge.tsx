import { sourceTypeBadgeLabel, type SourceType } from "@/lib/source-reference";

const capsuleClass =
  "inline-flex shrink-0 items-center rounded-full border border-stone-300/85 bg-stone-100/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-600 dark:border-stone-600 dark:bg-stone-900/55 dark:text-stone-400";

export function SourceTypeBadge({ sourceType }: { sourceType: SourceType }) {
  return (
    <span className={capsuleClass} title={`Source: ${sourceType}`}>
      {sourceTypeBadgeLabel(sourceType)}
    </span>
  );
}
