// Cloudflare Worker entry point for YourDramaList.
// The app code at the repository root is used unchanged. Val Town's platform pieces
// (blob, sqlite, utils, oauth, Deno.env) are swapped for Cloudflare versions in ./shims.
import "./shims/deno-env.ts"; // Must stay first: app modules read Deno.env while loading.
import "./shims/fetch-compat.ts"; // Before the app: lets fetch accept redirect: "error", as on Val Town.
import app from "../app.ts";
import weeklyRefresh from "../weeklyRefresh.ts";
import {getOAuthUserData} from "./shims/oauth.ts";

// Val Town lets a request's unawaited work (analytics writes, cache saves) finish after the
// response is sent. Workers can stop that work early, so keep each request alive briefly.
const BACKGROUND_GRACE_MS = 5000;
const grace = () => new Promise<void>((resolve) => setTimeout(resolve, BACKGROUND_GRACE_MS));

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    ctx.waitUntil(grace());
    // Val Town added CORS headers to every response automatically. Nuvio and other add-on apps
    // read the manifest and catalogs from a browser, so the Worker must send them itself.
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
    // TEMPORARY Trakt check (owner only), removed after testing.
    if (new URL(request.url).pathname === "/api/trakt-check") {
      if (!(await getOAuthUserData(request))) return new Response("Sign in to the admin page first.", { status: 401 });
      const key = (_env as any)?.TRAKT_CLIENT_ID || (globalThis as any).__TRAKT_KEY || "";
      const titles = ["Our Sticky Love", "100 Days of Deception", "Tale of Two Sisters", "Bullet in the Head", "Long Vacation"];
      // An honest User-Agent naming this app; Trakt refuses unidentified clients.
      const headers = { "content-type": "application/json", "trakt-api-version": "2", "trakt-api-key": key, "user-agent": "YourDramaList/1.1.3 (+https://yourdramalist.palmajay.workers.dev)" };
      const out: any[] = [{ keyPresent: key.length > 0, keyLength: key.length, probeHeaders: Object.keys(headers) }];
      for (const title of titles) {
        for (const kind of ["show", "movie"]) {
          const search = await fetch(`https://api.trakt.tv/search/${kind}?limit=3&query=` + encodeURIComponent(title), { headers });
          const hits = search.ok ? await search.json() as any[] : [];
          const item = hits[0]?.[kind];
          const probes: any = {};
          if (item?.ids?.slug) {
            const base = kind === "show" ? "shows" : "movies";
            for (const path of [`/${base}/${item.ids.slug}/lists/popular?limit=5`, `/${base}/${item.ids.slug}/lists?limit=5`]) {
              const r = await fetch("https://api.trakt.tv" + path, { headers });
              const body = await r.text();
              probes[path] = { status: r.status, sample: body.slice(0, 300) };
            }
          }
          const searchBody = search.ok ? "" : (await search.text()).slice(0, 200);
          out.push({ title, kind, searchStatus: search.status, searchBody, candidates: hits.slice(0, 3).map((h: any) => ({ title: h[kind]?.title, year: h[kind]?.year, slug: h[kind]?.ids?.slug, trakt: h[kind]?.ids?.trakt, imdb: h[kind]?.ids?.imdb })), probes });
        }
      }
      return Response.json(out, { headers: { "cache-control": "no-store" } });
    }
    const response = await (app as (req: Request) => Promise<Response>)(request);
    const out = new Response(response.body, response);
    for (const [name, value] of Object.entries(corsHeaders())) out.headers.set(name, value);
    return out;
  },

  // Same schedule as Val Town (0 7,8 * * * UTC). weeklyRefresh.ts skips runs that
  // are not midnight Pacific, exactly as before.
  async scheduled(_event: ScheduledController, _env: unknown, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((weeklyRefresh as () => Promise<unknown>)().then(() => undefined));
  },
};
