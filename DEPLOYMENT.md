# Run your own YourDramaList instance

YourDramaList runs as a **Cloudflare Worker**. The application files at the repository root are written for Deno (it started on Val Town). `cloudflare/build.mjs` bundles them with small stand-ins in `cloudflare/shims/` for blob storage, SQLite, OAuth and the environment. The source is not a one-click package. Never publish real credentials in GitHub, `.env` files, code, screenshots or issue reports.

## Cloudflare

1. Install the dependencies in `cloudflare/` (`npm install`). Then edit `cloudflare/wrangler.toml` for your account: `name`, `account_id`, your own D1 database (`DB`) and your own R2 bucket (`BLOBS`).
2. Set the secrets with `npx wrangler secret put <NAME>` or in the Cloudflare dashboard, never in a file:

   | Name | Purpose |
   | --- | --- |
   | `YDL_MANIFEST_SECRET` | Required for install links. Generate your own cryptographically random 32-byte secret encoded as 64 hexadecimal characters. Keep it stable and private. Rotation invalidates all existing links. |
   | `TMDB_API_KEY` | Server-side key for weekly collections, filmographies, artwork, the Connect backdrops and metadata fallback. Never reuse the original maintainer's key. |
   | `ADMIN_PASSWORD` | Signs the owner in to `/admin` (see `cloudflare/shims/oauth.ts`). With none set, nobody can sign in. |

   Do not create per-visitor keys as deployment secrets. Visitors enter optional poster-rating keys in Preferences.

3. Build and deploy: `cd cloudflare && node build.mjs && npx wrangler deploy`. Set `YDL_PUBLIC_ORIGIN` while building when the site runs on a different address. Check the rollout with `npx wrangler deployments status`.
4. The weekly refresh runs from the Worker's cron triggers (`0 7,8 * * *` UTC). It refreshes only at midnight in America/Los_Angeles.
5. Replace the original deployment's absolute asset URLs in `addonIcon.ts`, `app.ts` and `addonText.ts` with your own site address.
6. Profile and avatar lookups in `app.ts` call the original read-only profile service. For independence, replace those routes with your own implementation.
7. Test normal and restricted upstream responses. Then check the returned manifest, catalog resources and an actual Nuvio installation on your target devices before recommending your deployment to others.

`KURYANA_URL` and `ERDB_URL` appear in inherited helpers. Changing a provider requires checking every relevant path: YourDramaList's poster proxy currently targets the original ERDB host explicitly rather than automatically following `ERDB_URL`.

## Development tests

See [TESTING.md](TESTING.md). The portable offline harness supplies test-only storage adapters. Those adapters do not simulate a real OAuth session, hosting behavior, live data or provider credentials.

## Updating production

Publication to GitHub does not deploy automatically. Review the diff, run the checks, build and deploy with wrangler, and record the source commit. Environment secrets must be set independently and must never be included in a source synchronization. There is no automatic GitHub-to-production deployment in this beta.

See [PRIVACY.md](PRIVACY.md) before collecting user credentials. The app can decrypt the configuration links it serves; do not describe the link encryption as zero-knowledge or end-to-end encryption.

## Weekly collections

`weeklyRefresh.ts` runs from the Worker's cron triggers (`0 7,8 * * *`). The job runs its refresh only at midnight in America/Los_Angeles. It refreshes the MDL banner daily and the weekly collections on Mondays. Request-time cache expiry also handles delayed jobs. Themes rotate in pairs from `collections.ts`; at most two are active, shared across countries. A country may have fewer than 20 matching titles. No arbitrary URL or user query is accepted by the shelf endpoints.

TMDB requests use the owner’s `TMDB_API_KEY`, three concurrent requests, at most 120 new upstream requests per minute per runtime, a bounded queue, eight-second timeouts, one-megabyte responses and 429 cooldowns. Public metadata is cached in the `catalog-collections:v1` storage entry, capped at 250 entries and about 2 MB. No API key is placed in that blob. Provider failures may show recent saved collections; no fixture content is substituted.

Collection slots keep their install IDs across weekly changes. Some Nuvio clients may retain the old collection name until they refresh the manifest. Weekly watchlist filtering compares normalized title/year against completed/dropped MDL records; alternate-language names may not match. Titles without IMDb mappings are omitted from Nuvio. Theme suitability depends on TMDB keyword coverage.

Filmography artwork uses `/api/mdl/filmography-artwork` with a validated MDL person URL, actor/director mode and an offset below 1000. Each request matches at most five credits already extracted from that person’s MDL page. Titles and credit order stay sourced from MDL; artwork comes from TMDB only for a unique title/year/media match. Only batches near the visible shelf are requested, sharing the existing server-side TMDB cache, concurrency cap and quota. Unknown years or ambiguous/absent matches retain MDL posters.
