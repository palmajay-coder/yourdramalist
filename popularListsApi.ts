import { extractPopularLists } from "./popularLists.ts";

export async function handlePopularLists(req: Request): Promise<Response> {
  const fail = (status: number, code: string, error: string, upstreamStatus?: number) =>
    Response.json({ code, error, ...(upstreamStatus === undefined ? {} : { upstreamStatus }) },
      { status, headers: { "cache-control": "no-store" } });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  const raw = new URL(req.url).searchParams.get("url") || "";
  let target: URL;
  try { target = new URL(raw); } catch {
    return fail(400, "INVALID_URL", "Provide a MyDramaList drama URL.");
  }
  if (target.protocol !== "https:" || !["mydramalist.com", "www.mydramalist.com"].includes(target.hostname) ||
      target.port || target.username || target.password || !/^\/[1-9]\d*-[A-Za-z0-9-]+\/?$/.test(target.pathname)) {
    return fail(400, "INVALID_URL", "Provide an HTTPS MyDramaList drama URL.");
  }
  const sourceUrl = "https://mydramalist.com" + target.pathname.replace(/\/$/, "");
  try {
    const upstream = await fetch(sourceUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return fail(upstream.status === 404 ? 404 : 502, "UPSTREAM_ERROR",
        upstream.status === 404 ? "Drama page not found." : "MyDramaList could not be retrieved.", upstream.status);
    }
    const html = await upstream.text();
    if (upstream.headers.get("cf-mitigated") === "challenge" ||
        /<title[^>]*>\s*(?:Just a moment|Attention Required)|cf-chl-|\/cdn-cgi\/challenge-platform/i.test(html)) {
      return fail(502, "UPSTREAM_BLOCKED", "MyDramaList returned an access challenge.", upstream.status);
    }
    if (!upstream.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      return fail(502, "UNEXPECTED_CONTENT", "MyDramaList did not return an HTML page.", upstream.status);
    }
    const result = extractPopularLists(html);
    if (!result.sectionFound) return fail(502, "SECTION_UNAVAILABLE",
      "The Popular Lists section was unavailable. This does not mean the drama has no lists.", upstream.status);
    if (result.dramaId !== target.pathname.match(/^\/(\d+)-/)?.[1]) {
      return fail(502, "UNEXPECTED_PAGE", "MyDramaList returned an unexpected page.", upstream.status);
    }
    return Response.json({ ...result, fetchedAt: new Date().toISOString() },
      { headers: { "cache-control": "public, max-age=300" } });
  } catch (error) {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return fail(timeout ? 504 : 502, timeout ? "UPSTREAM_TIMEOUT" : "FETCH_FAILED",
      timeout ? "MyDramaList took too long to respond." : "MyDramaList could not be retrieved.");
  }
}
