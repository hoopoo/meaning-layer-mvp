import Link from "next/link";

export function SiteHeader({
  action,
}: {
  action?: React.ReactNode;
}) {
  return (
    <header className="border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
            Meaning Layer MVP
          </p>
          <h1 className="mt-2 font-serif text-2xl font-normal tracking-tight text-stone-900 dark:text-stone-100">
            <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300">
              Meaning registry
            </Link>
          </h1>
          <div className="mt-4 max-w-xl space-y-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            <p>
              A quiet registry for virtual worlds: intent, questions, tags, and interpretations.
            </p>
            <p className="text-stone-500 dark:text-stone-500">Not a feed. An archive.</p>
          </div>
        </div>
        {action ? <div className="shrink-0 sm:pb-1">{action}</div> : null}
      </div>
    </header>
  );
}
