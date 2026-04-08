export function MeaningState({ isUndecided }: { isUndecided: boolean }) {
  if (isUndecided) {
    return (
      <span className="inline-block rounded-md border border-stone-400/45 bg-transparent px-2 py-0.5 text-stone-700 dark:border-stone-500/40 dark:text-stone-300">
        Undecided
      </span>
    );
  }
  return <span className="text-stone-600 dark:text-stone-400">Declared</span>;
}
