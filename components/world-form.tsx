"use client";

import { useActionState, useCallback, useState } from "react";
import { createWorld, type ActionState } from "@/app/actions";
import { parseAccessMode, parseSourceType, type AccessMode, type SourceType } from "@/lib/source-reference";
import { isValidExternalWorldUrl, safeExternalWorldHref } from "@/lib/source-url";

type TagOption = { id: string; name: string };

export type WorldFormInitial = {
  title?: string;
  whyExists?: string;
  initialQuestion?: string;
  sourceType?: string;
  accessMode?: string;
  sourceUrl?: string;
  creatorName?: string;
  isUndecided?: boolean;
  tagIds?: string[];
};

const initialState: ActionState = null;

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "WEB", label: "Web (http / https)" },
  { value: "BUD", label: "BUD" },
  { value: "ROBLOX", label: "Roblox" },
  { value: "VRCHAT", label: "VRChat" },
  { value: "OTHER", label: "Other (non-web)" },
];

const ACCESS_OPTIONS: { value: AccessMode; label: string }[] = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "DIRECT", label: "Direct (openable from this reference)" },
  { value: "APP_REQUIRED", label: "App required" },
];

export function WorldForm({
  tags,
  initial,
  action,
  submitLabel,
  pendingLabel,
}: {
  tags: TagOption[];
  initial?: WorldFormInitial;
  action?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action ?? createWorld, initialState);
  const [urlProbeHint, setUrlProbeHint] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>(parseSourceType(initial?.sourceType ?? "WEB"));
  const [accessMode, setAccessMode] = useState<AccessMode>(parseAccessMode(initial?.accessMode ?? "UNKNOWN"));

  const field = state?.fieldErrors;
  const selectedTagIds = new Set(initial?.tagIds ?? []);

  const onSourceUrlBlur = useCallback(
    async (raw: string, type: SourceType) => {
      setUrlProbeHint(null);
      if (type !== "WEB") return;
      const t = raw.trim();
      if (!t || !isValidExternalWorldUrl(t)) return;
      const href = safeExternalWorldHref(t)!;
      const softHint = "Could not verify automatically. You may still save this URL.";
      try {
        const res = await fetch("/api/external-world-probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: href }),
        });
        const data = (await res.json()) as { reachable?: boolean };
        if (!data.reachable) {
          setUrlProbeHint(softHint);
        }
      } catch {
        setUrlProbeHint(softHint);
      }
    },
    [],
  );

  return (
    <form action={formAction} className="space-y-8">
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="whyExists" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Why this world exists
        </label>
        <textarea
          id="whyExists"
          name="whyExists"
          required
          rows={5}
          defaultValue={initial?.whyExists}
          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder="What made this world necessary to exist?"
        />
        {field?.whyExists ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.whyExists}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          From this necessity, what question remains?
        </p>
        <label
          htmlFor="initialQuestion"
          className="block text-sm font-medium text-stone-800 dark:text-stone-200"
        >
          Initial question
        </label>
        <textarea
          id="initialQuestion"
          name="initialQuestion"
          required
          rows={4}
          defaultValue={initial?.initialQuestion}
          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder="What question does this world leave unanswered?"
        />
        {field?.initialQuestion ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.initialQuestion}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          autoComplete="off"
          defaultValue={initial?.title}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder="How this world is called"
        />
        {field?.title ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.title}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="sourceType" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Where this world lives
        </label>
        <select
          id="sourceType"
          name="sourceType"
          value={sourceType}
          onChange={(e) => setSourceType(parseSourceType(e.target.value))}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none ring-stone-400/30 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          Source type is part of the record ontology. Only WEB references use automated HTTP checks; other types are
          stored and opened as references only.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="accessMode" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Access mode
        </label>
        <select
          id="accessMode"
          name="accessMode"
          value={accessMode}
          onChange={(e) => setAccessMode(parseAccessMode(e.target.value))}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none ring-stone-400/30 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        >
          {ACCESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          Optional. How this world is typically reached (for future policy and UI).
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="sourceUrl" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          World reference
        </label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="text"
          required
          autoComplete="off"
          defaultValue={initial?.sourceUrl}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder={
            sourceType === "WEB"
              ? "https://…"
              : "e.g. bud://… or https://… launcher / catalog link"
          }
          onBlur={(e) => void onSourceUrlBlur(e.target.value, sourceType)}
        />
        {field?.sourceUrl ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.sourceUrl}</p>
        ) : null}
        {urlProbeHint ? (
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{urlProbeHint}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="creatorName" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Creator name
        </label>
        <input
          id="creatorName"
          name="creatorName"
          required
          autoComplete="name"
          defaultValue={initial?.creatorName}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
          placeholder="How you wish to be cited"
        />
        {field?.creatorName ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.creatorName}</p>
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-800 dark:text-stone-200">Meaning tags</legend>
        <p className="text-xs text-stone-500 dark:text-stone-500">Select provisional meanings. These may shift.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {tags.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 has-[:checked]:border-stone-400 has-[:checked]:bg-stone-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200 dark:has-[:checked]:border-stone-500 dark:has-[:checked]:bg-stone-900/60"
            >
              <input
                type="checkbox"
                name="tagIds"
                value={t.id}
                defaultChecked={selectedTagIds.has(t.id)}
                className="mt-1 size-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-900"
              />
              <span className="leading-snug">{t.name}</span>
            </label>
          ))}
        </div>
        {field?.tagIds ? (
          <p className="text-sm text-red-700 dark:text-red-400">{field.tagIds}</p>
        ) : null}
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-stone-800 dark:text-stone-200">
        <input
          type="checkbox"
          name="isUndecided"
          defaultChecked={initial?.isUndecided}
          className="size-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-900"
        />
        <span>
          Mark as undecided <span className="text-stone-500">— meaning remains open</span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          {pending ? (pendingLabel ?? "Recording…") : (submitLabel ?? "Record world")}
        </button>
      </div>
    </form>
  );
}
