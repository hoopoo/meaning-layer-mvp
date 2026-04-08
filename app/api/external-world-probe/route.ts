import { NextResponse } from "next/server";
import { probeExternalUrlReachable } from "@/lib/external-url-probe";
import { safeExternalWorldHref } from "@/lib/source-url";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reachable: false, error: "invalid_json" }, { status: 400 });
  }

  const url =
    typeof body === "object" && body !== null && "url" in body
      ? String((body as { url: unknown }).url ?? "")
      : "";
  const href = safeExternalWorldHref(url);
  if (!href) {
    return NextResponse.json({ reachable: false, error: "invalid_url" }, { status: 400 });
  }

  const { ok, status } = await probeExternalUrlReachable(href);
  return NextResponse.json({ reachable: ok, status });
}
