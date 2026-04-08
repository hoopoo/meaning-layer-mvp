"use client";

import { useState } from "react";

const OUTSIDE_WEB = "This world exists outside the web.";
const DEFAULT_HINT = "This world requires external app.";

type Props = { reference: string; className: string; label: string };

export function AppReferenceOpen({ reference, className, label }: Props) {
  const [fallback, setFallback] = useState(false);

  function handleClick() {
    setFallback(false);
    if (!reference) {
      setFallback(true);
      return;
    }
    try {
      const isHttp = /^https?:\/\//i.test(reference);
      if (isHttp) {
        const w = window.open(reference, "_blank", "noopener,noreferrer");
        if (w == null) setFallback(true);
        return;
      }
      const w = window.open(reference, "_blank", "noopener,noreferrer");
      if (w == null) {
        window.location.assign(reference);
      }
    } catch {
      setFallback(true);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 sm:items-start sm:max-md:items-end">
      <p className="max-w-[16rem] text-right text-[10px] font-normal leading-relaxed text-stone-500 sm:text-left sm:max-md:text-right dark:text-stone-500">
        {DEFAULT_HINT}
      </p>
      <button type="button" onClick={handleClick} className={classClassNameAsButton(className)}>
        {label}
      </button>
      {fallback ? (
        <p className="max-w-[16rem] text-right text-[10px] font-normal leading-relaxed text-stone-500 sm:text-left sm:max-md:text-right dark:text-stone-500">
          {OUTSIDE_WEB}
        </p>
      ) : null}
    </div>
  );
}

function classClassNameAsButton(className: string): string {
  return `${className} cursor-pointer`;
}
