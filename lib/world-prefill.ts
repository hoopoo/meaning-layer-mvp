/**
 * Builds a link to the "New world record" form pre-filled from an existing world.
 * Used to quickly re-register / flesh out auto-ingested worlds: the factual fields
 * (title, source, creator, tags) are carried over so a human only refines the meaning.
 */
export type WorldPrefillSource = {
  title: string;
  whyExists: string;
  initialQuestion: string;
  sourceType: string;
  accessMode: string;
  sourceUrl: string;
  creatorName: string;
  isUndecided: boolean;
  meanings: { tag: { name: string } }[];
};

export function buildRegisterPrefillHref(world: WorldPrefillSource): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | null | undefined) => {
    const t = (value ?? "").trim();
    if (t) params.set(key, t);
  };

  set("title", world.title);
  set("whyExists", world.whyExists);
  set("initialQuestion", world.initialQuestion);
  set("sourceType", world.sourceType);
  set("accessMode", world.accessMode);
  set("sourceUrl", world.sourceUrl);
  set("creatorName", world.creatorName);
  if (world.isUndecided) params.set("isUndecided", "1");

  const tagNames = world.meanings.map((m) => m.tag.name).filter(Boolean);
  if (tagNames.length > 0) params.set("tags", tagNames.join(","));

  return `/worlds/new?${params.toString()}`;
}
