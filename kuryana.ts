// Kuryana: public, unofficial MyDramaList API (https://github.com/tbdsux/kuryana).
// MyDramaList refuses requests from cloud hosts (Cloudflare, Render), so after the move away
// from Val Town the app reads MyDramaList data through Kuryana's v2 routes instead.
// Kuryana is run by one developer and may change or stop; keep all calls in this module.

export const KURYANA_BASE = ((typeof Deno < "u" && Deno.env.get("KURYANA_URL")) || "https://kuryana.tbdh.app").replace(/\/$/, "");

export class KuryanaError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// GET a Kuryana v2 route and return its `data` object. Throws KuryanaError on failure.
export async function kuryana<T = any>(path: string, { fetcher = fetch, timeoutMs = 15000, maxBytes = 3_000_000 } = {}): Promise<T> {
  const response = await fetcher(KURYANA_BASE + path, {
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new KuryanaError(response.status, `MyDramaList data service responded ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new KuryanaError(502, "MyDramaList data service returned an empty response");
  const decoder = new TextDecoder();
  let text = "", size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new KuryanaError(502, "MyDramaList data service returned an oversized response");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  let body: any;
  try { body = JSON.parse(text); } catch { throw new KuryanaError(502, "MyDramaList data service returned an unexpected response"); }
  if (!body?.success || body.data == null) throw new KuryanaError(response.status === 200 ? 404 : response.status, "MyDramaList data not found");
  return body.data as T;
}

// MyDramaList's own wording for a title's type line, e.g. "Korean Drama - 2016, 16 episodes".
export function detailsLine(item: { type?: string | null; year?: number | null; episodes?: number | null }): string {
  const parts = [item.type || ""];
  const tail = [item.year ? String(item.year) : "", item.episodes ? `${item.episodes} episode${item.episodes === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ");
  return [parts[0], tail].filter(Boolean).join(" - ");
}

// Accept only MyDramaList https links and i.mydramalist.com images, as the HTML parsers did.
export function mdlLink(link: unknown): string | null {
  try {
    const url = new URL(String(link || ""));
    return url.protocol === "https:" && url.hostname === "mydramalist.com" ? url.origin + url.pathname : null;
  } catch { return null; }
}
export function mdlImage(link: unknown): string | null {
  try {
    const url = new URL(String(link || ""));
    return url.protocol === "https:" && url.hostname === "i.mydramalist.com" && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}
