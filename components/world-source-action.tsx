import { AppReferenceOpen } from "@/components/app-reference-open";
import { ExternalWorldLink } from "@/components/external-world-link";
import {
  hasDisplayableSourceReference,
  sourceActionLabel,
  type SourceType,
} from "@/lib/source-reference";
import { safeExternalWorldHref } from "@/lib/source-url";

type Props = {
  sourceType: SourceType;
  sourceUrl: string;
  className: string;
};

export function WorldSourceAction({ sourceType, sourceUrl, className }: Props) {
  if (!hasDisplayableSourceReference(sourceUrl)) return null;

  if (sourceType === "WEB") {
    const href = safeExternalWorldHref(sourceUrl);
    if (!href) return null;
    return (
      <ExternalWorldLink href={href} className={className} label={sourceActionLabel("WEB")} />
    );
  }

  return (
    <AppReferenceOpen
      reference={sourceUrl.trim()}
      className={className}
      label={sourceActionLabel(sourceType)}
    />
  );
}
