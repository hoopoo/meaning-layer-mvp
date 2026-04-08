/**
 * Lexical overlap heuristic for interpretation divergence (no ML).
 * Uses pairwise Jaccard similarity on filtered word sets; blends average and minimum
 * so one sharply different pair pulls the level toward "high".
 */

export type DivergenceLevel = "low" | "moderate" | "high";

const STOP = new Set(
  [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "as",
    "is",
    "it",
    "that",
    "this",
    "these",
    "those",
    "be",
    "are",
    "was",
    "were",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "not",
    "no",
    "if",
    "when",
    "what",
    "which",
    "who",
    "how",
    "why",
    "with",
    "from",
    "by",
    "can",
    "could",
    "would",
    "should",
    "may",
    "might",
    "will",
    "shall",
    "there",
    "their",
    "they",
    "them",
    "we",
    "you",
    "i",
    "me",
    "my",
    "your",
    "its",
    "our",
    "us",
    "than",
    "then",
    "so",
    "such",
    "more",
    "most",
    "some",
    "any",
    "all",
    "each",
    "every",
    "one",
    "two",
    "into",
    "out",
    "up",
    "down",
    "about",
    "over",
    "after",
    "before",
    "between",
    "through",
    "during",
    "also",
    "only",
    "just",
    "even",
    "very",
    "much",
    "too",
    "here",
    "where",
  ].map((w) => w.toLowerCase()),
);

function tokenize(text: string): Set<string> {
  const raw = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return new Set(raw.filter((w) => w.length >= 3 && w.length <= 24 && !STOP.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Returns null when fewer than two non-empty bodies. */
export function computeDivergenceLevel(bodies: (string | null | undefined)[]): DivergenceLevel | null {
  const cleaned = bodies.map((b) => String(b ?? "").trim()).filter(Boolean);
  if (cleaned.length < 2) return null;

  const sets = cleaned.map(tokenize);
  let minJ = 1;
  let sumJ = 0;
  let pairs = 0;

  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const jacc = jaccard(sets[i], sets[j]);
      minJ = Math.min(minJ, jacc);
      sumJ += jacc;
      pairs++;
    }
  }

  const avgJ = pairs > 0 ? sumJ / pairs : 0;
  const allTiny = sets.every((s) => s.size <= 1);
  if (allTiny) {
    if (avgJ >= 0.45) return "low";
    if (avgJ >= 0.2) return "moderate";
    return "high";
  }

  const score = 0.45 * avgJ + 0.55 * minJ;
  if (score >= 0.26) return "low";
  if (score >= 0.11) return "moderate";
  return "high";
}

export function divergenceDisplayLabel(level: DivergenceLevel): string {
  const labels: Record<DivergenceLevel, string> = {
    low: "Low divergence",
    moderate: "Moderate divergence",
    high: "High divergence",
  };
  return labels[level];
}

/** Awareness-only stance when multiple readings exist; not enforcement. */
export type DecisionPosture = "hold" | "proceed";

/**
 * Suggests HOLD only when there are multiple interpretations and lexical divergence is high.
 * Otherwise (including moderate/low/null): Proceed. Returns null when a posture is not applicable (<2 interpretations).
 */
export function computeDecisionPosture(
  interpretationCount: number,
  divergenceLevel: DivergenceLevel | null,
): DecisionPosture | null {
  if (interpretationCount < 2) return null;
  if (divergenceLevel === "high") return "hold";
  return "proceed";
}

export function decisionPostureHeadline(posture: DecisionPosture): string {
  return posture === "hold" ? "HOLD" : "Proceed";
}

export function decisionPostureMicrocopy(posture: DecisionPosture): string {
  return posture === "hold"
    ? "Pause before acting."
    : "No major divergence detected.";
}

/** Vertical gap between interpretation preview blocks on world cards. */
export function cardInterpretationStackGapClass(level: DivergenceLevel | null): string {
  switch (level) {
    case "high":
      return "gap-7";
    case "low":
      return "gap-4";
    default:
      return "gap-5";
  }
}

/** Vertical gap between full interpretation entries on detail page. */
export function detailInterpretationListGapClass(level: DivergenceLevel | null): string {
  switch (level) {
    case "high":
      return "gap-8";
    case "low":
      return "gap-5";
    default:
      return "gap-6";
  }
}

/** Left accent + border opacity: stronger when divergence is high, softer when low. */
export function cardInterpretationBlockPair(level: DivergenceLevel | null): { first: string; second: string } {
  const high = level === "high";
  const low = level === "low";
  const l1 = high ? "border-l-stone-500/55" : low ? "border-l-stone-500/32" : "border-l-stone-500/45";
  const l2 = high ? "border-l-stone-500/40" : low ? "border-l-stone-400/22" : "border-l-stone-400/30";
  const b1 = high ? "border-stone-300/85" : low ? "border-stone-200/70" : "border-stone-200/80";
  const b2 = high ? "border-stone-400/70" : low ? "border-stone-300/55" : "border-stone-300/60";
  const g1 = high ? "bg-white/95" : low ? "bg-white/85" : "bg-white/90";
  const g2 = high ? "bg-stone-50/75" : low ? "bg-stone-50/50" : "bg-stone-50/65";
  const d1 = high ? "dark:border-stone-600/90" : low ? "dark:border-stone-700/65" : "dark:border-stone-700/80";
  const d2 = high ? "dark:border-stone-500/85" : low ? "dark:border-stone-600/60" : "dark:border-stone-600/70";

  const first = `rounded-lg border border-l-2 ${l1} ${b1} ${g1} py-3.5 pl-4 pr-3.5 ${d1} dark:bg-stone-950/90`;
  const second = `rounded-lg border border-l-2 ${l2} ${b2} ${g2} py-3.5 pl-4 pr-3.5 ${d2} dark:bg-stone-900/45`;
  return { first, second };
}

export function cardBlockClassForIndex(level: DivergenceLevel | null, index: number): string {
  const { first, second } = cardInterpretationBlockPair(level);
  return index === 0 ? first : second;
}

export function detailBlockClassForIndex(level: DivergenceLevel | null, isAlternate: boolean): string {
  const high = level === "high";
  const low = level === "low";
  if (isAlternate) {
    const l = high ? "border-l-stone-500/42" : low ? "border-l-stone-400/20" : "border-l-stone-400/28";
    const b = high ? "border-stone-400/72" : low ? "border-stone-300/55" : "border-stone-300/65";
    const bg = high ? "bg-stone-50/62" : low ? "bg-stone-50/45" : "bg-stone-50/55";
    const d = high ? "dark:border-stone-500/75" : low ? "dark:border-stone-600/65" : "dark:border-stone-600/75";
    return `rounded-2xl border border-l-[3px] ${l} ${b} ${bg} py-6 pl-5 pr-6 ${d} dark:bg-stone-900/42`;
  }
  const l = high ? "border-l-stone-500/52" : low ? "border-l-stone-500/28" : "border-l-stone-500/42";
  const b = high ? "border-stone-300/82" : low ? "border-stone-200/78" : "border-stone-200/90";
  const bg = high ? "bg-white" : low ? "bg-white/92" : "bg-white";
  const d = high ? "dark:border-stone-600/88" : low ? "dark:border-stone-800/92" : "dark:border-stone-800";
  return `rounded-2xl border border-l-[3px] ${l} ${b} ${bg} py-6 pl-5 pr-6 ${d} dark:bg-stone-950/80`;
}
