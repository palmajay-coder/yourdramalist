// Cloudflare Worker entry point for YDL-V2, the profile and avatar service
// that YourDramaList calls for /api/mdl/profile and /api/mdl/avatar.
// The Val Town code in vals/YDL-V2/main.ts is used unchanged.
import "./shims/deno-env.ts";
import "./shims/fetch-compat.ts"; // Before the app: lets fetch accept redirect: "error", as on Val Town.
import app from "../vals/YDL-V2/main.ts";

const BACKGROUND_GRACE_MS = 5000;
const grace = () => new Promise<void>((resolve) => setTimeout(resolve, BACKGROUND_GRACE_MS));

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    ctx.waitUntil(grace());
    return (app as (req: Request) => Promise<Response>)(request);
  },
};
