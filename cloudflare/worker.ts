// Cloudflare Worker entry point for YourDramaList.
// The app code at the repository root is used unchanged. Val Town's platform pieces
// (blob, sqlite, utils, oauth, Deno.env) are swapped for Cloudflare versions in ./shims.
import "./shims/deno-env.ts"; // Must stay first: app modules read Deno.env while loading.
import "./shims/fetch-compat.ts"; // Before the app: lets fetch accept redirect: "error", as on Val Town.
import app from "../app.ts";
import weeklyRefresh from "../weeklyRefresh.ts";

// Val Town lets a request's unawaited work (analytics writes, cache saves) finish after the
// response is sent. Workers can stop that work early, so keep each request alive briefly.
const BACKGROUND_GRACE_MS = 5000;
const grace = () => new Promise<void>((resolve) => setTimeout(resolve, BACKGROUND_GRACE_MS));

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    ctx.waitUntil(grace());
    return (app as (req: Request) => Promise<Response>)(request);
  },

  // Same schedule as Val Town (0 7,8 * * * UTC). weeklyRefresh.ts skips runs that
  // are not midnight Pacific, exactly as before.
  async scheduled(_event: ScheduledController, _env: unknown, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((weeklyRefresh as () => Promise<unknown>)().then(() => undefined));
  },
};
