"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-stone-100/60 px-6 py-16 dark:bg-stone-950">
      <div className="mx-auto max-w-lg text-stone-800 dark:text-stone-200">
        <h1 className="font-serif text-xl text-stone-900 dark:text-stone-100">
          Something interrupted the registry.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          If you just cloned the project or removed <code className="text-stone-500">prisma/dev.db</code>,
          create the database from the app folder:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-stone-300/80 bg-white p-4 text-xs text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
          npx prisma generate
          <br />
          npx prisma db push
          <br />
          npx prisma db seed
        </pre>
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
          Restart the dev server after that{" "}
          <span className="text-stone-500 dark:text-stone-500">(Ctrl+C, then npm run dev)</span>.
        </p>
        {isDev ? (
          <p className="mt-6 break-words rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-[11px] text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
            {error.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 rounded-xl border border-stone-400/80 px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-200/40 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900/60"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
