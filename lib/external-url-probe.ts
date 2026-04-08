/**
 * Server-side reachability check (HEAD, GET fallback). Used by API route and optional form checks.
 */
export async function probeExternalUrlReachable(
  href: string,
): Promise<{ ok: boolean; status?: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const headers: Record<string, string> = { "User-Agent": "MeaningLayerMVP/1.0 (reachability check)" };
  const base: RequestInit = { redirect: "follow", signal: ctrl.signal };
  try {
    let res = await fetch(href, { ...base, method: "HEAD", headers });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(href, {
        ...base,
        method: "GET",
        headers: { ...headers, Range: "bytes=0-0" },
      });
    }
    const ok = res.status >= 200 && res.status < 400;
    return { ok, status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}
