import { load } from "npm:cheerio@1.0.0";

export async function handleDramaSearch(req: Request): Promise<Response> {
  const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  const input = new URL(req.url);
  const query = (input.searchParams.get("q") || "").trim();
  const page = input.searchParams.get("page") || "1";
  if (query.length < 2 || query.length > 100) return fail(400, "Enter a drama name between 2 and 100 characters.");
  if (!/^[1-9]\d{0,2}$/.test(page)) return fail(400, "Invalid search page.");
  const target = new URL("https://mydramalist.com/search");
  target.searchParams.set("q", query);
  target.searchParams.set("page", page);
  try {
    const response = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(15000), headers: { Accept: "text/html" } });
    if (!response.ok) { await response.body?.cancel(); return fail(502, "MyDramaList search is unavailable. Please try again."); }
    const html = await response.text();
    if (response.headers.get("cf-mitigated") === "challenge" || /<title[^>]*>\s*(?:Just a moment|Attention Required)|cf-chl-|\/cdn-cgi\/challenge-platform/i.test(html)) return fail(502, "MyDramaList returned an access challenge. Please try again later.");
    if (!response.headers.get("content-type")?.includes("text/html")) return fail(502, "MyDramaList returned an unexpected search response.");
    const $ = load(html);
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    if (!/Search results/i.test($("title").text())) return fail(502, "MyDramaList did not return a search results page.");
    const seen = new Set<string>();
    const dramas: { id: string; name: string; url: string; poster: string | null; details: string; score: string }[] = [];
    $(".box[id]").each((_, el) => {
      const card = $(el);
      const id = card.attr("id")?.match(/^mdl-(\d+)$/)?.[1];
      if (!id || seen.has(id)) return;
      const title = card.find(".content .title > a[href]").first();
      const name = clean(title.text());
      let url: URL;
      try { url = new URL(title.attr("href") || "", "https://mydramalist.com"); } catch { return; }
      if (!name || url.origin !== "https://mydramalist.com" || !new RegExp("^/" + id + "-[A-Za-z0-9-]+/?$").test(url.pathname)) return;
      let poster: string | null = null;
      const image = card.find(".film-cover img").first();
      try {
        const imageUrl = new URL(image.attr("data-src") || image.attr("src") || "");
        if (imageUrl.protocol === "https:" && imageUrl.hostname === "i.mydramalist.com" && !imageUrl.username && !imageUrl.password && !imageUrl.port) poster = imageUrl.href;
      } catch { /* Missing poster is allowed. */ }
      seen.add(id);
      dramas.push({ id, name, url: url.origin + url.pathname, poster, details: clean(card.find(".content > .text-muted").first().text()), score: clean(card.find(".score").first().text()) });
    });
    const nextPage = $(".pagination a[href]").toArray().some(el => {
      try {
        const next = new URL($(el).attr("href")!, target);
        return next.origin === target.origin && next.pathname === "/search" && Number(next.searchParams.get("page")) === Number(page) + 1;
      } catch { return false; }
    });
    return Response.json({ query, page: Number(page), dramas, hasNextPage: nextPage }, { headers: { "cache-control": "public, max-age=300" } });
  } catch (error) {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return fail(timeout ? 504 : 502, timeout ? "MyDramaList search took too long. Please try again." : "Unable to search MyDramaList. Please try again.");
  }
}
