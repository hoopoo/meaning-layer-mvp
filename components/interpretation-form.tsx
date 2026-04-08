"use client";

import { useActionState } from "react";
import { addInterpretation, type ActionState } from "@/app/actions";

const initialState: ActionState = null;

export function InterpretationForm({ worldId }: { worldId: string }) {
  const bound = addInterpretation.bind(null, worldId);
  const [state, formAction, pending] = useActionState(bound, initialState);

  const field = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-stone-200/90 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
      <h3 className="font-serif text-base text-stone-900 dark:text-stone-100">Offer an interpretation</h3>
      <p className="text-xs text-stone-500 dark:text-stone-500">
        Short, considered notes are welcome. This is a registry, not a thread.
      </p>

      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="authorName" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Your name
        </label>
        <input
          id="authorName"
          name="authorName"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder="Name or pseudonym"
        />
        {field?.authorName ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.authorName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="body" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Interpretation
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={5}
          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder="What you perceive the space to be doing."
        />
        {field?.body ? <p className="text-sm text-red-700 dark:text-red-400">{field.body}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-stone-300 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-900 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        {pending ? "Submitting…" : "Submit interpretation"}
      </button>
    </form>
  );
}
