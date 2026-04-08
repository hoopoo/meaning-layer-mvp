type TagBadgeProps = {
  name: string;
};

export function TagBadge({ name }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-stone-300/80 bg-stone-50 px-2.5 py-0.5 text-xs font-medium tracking-wide text-stone-700 dark:border-stone-600 dark:bg-stone-900/40 dark:text-stone-300">
      {name}
    </span>
  );
}
