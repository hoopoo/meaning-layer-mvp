"use client";

import { useState } from "react";

type Props = {
  href: string;
  className: string;
  label?: string;
};

export function ExternalWorldLink({ href, className, label = "View original world" }: Props) {
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setUnavailable(false);
    setBusy(true);
    try {
      const res = await fetch("/api/external-world-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: href }),
      });
      let data: { reachable?: boolean } = {};
      try {
        data = (await res.json()) as { reachable?: boolean };
      } catch {
        setUnavailable(true);
        return;
      }
      if (res.ok && data.reachable) {
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        setUnavailable(true);
      }
    } catch {
      setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 sm:items-start sm:max-md:items-end">
      <button type="button" onClick={onClick} disabled={busy} className={classClassNameAsButton(className)}>
        {busy ? "Checking…" : label}
      </button>
      {unavailable ? (
        <p className="max-w-[16rem] text-right text-[10px] font-normal leading-relaxed text-stone-500 sm:text-left sm:max-md:text-right dark:text-stone-500">
          This world exists outside the web.
        </p>
      ) : null}
    </div>
  );
}

/** Preserve anchor-like Tailwind utilities on a native button. */
function classClassNameAsButton(className: string): string {
  return `${className} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`;
}
