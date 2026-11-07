# Run your own YourDramaList instance

YourDramaList targets **Val Town / Deno**. The source is not currently a platform-independent one-click package. Do not publish real credentials in GitHub, `.env` files, code, screenshots or issue reports.

## Val Town

1. Create a Val in your account and put the application .ts and .css files from this repository root at that Val's root, preserving relative names. The historical files in `legacy/` belong to the original app.
2. Set `app.ts` as the HTTP file. Helpers and test `.ts` files are script modules; `preferences.css` is a static file.
3. Configure secrets privately using the Val's environment-variable editor:

   | Name | Purpose |
   | --- | --- |
   | `YDL_MANIFEST_SECRET` | Required for install links. Generate your own cryptographically random 32-byte secret encoded as 64 hexadecimal characters. Keep it stable and private. Rotation invalidates all existing links. |
   | `TMDB_API_KEY` | Server-side key for weekly collections, matched catalog artwork, moving poster backgrounds and metadata fallback. Never reuse the original maintainer's key. |
   | `OAUTH_STATE_ENCRYPTION_KEY` | Configure when required by the Val Town OAuth middleware used for the owner admin flow; follow its current documentation. |

   Do not create per-visitor keys as deployment environment variables. Visitors enter optional poster-rating keys in Preferences. The example file lists names only; it contains no usable secret.

4. **Before exposing `/admin`, replace `OWNER_ID` in `wallpaper.ts` with your own Val Town account's immutable user ID.** This snapshot is restricted to the original maintainer's ID. Do not remove the owner check or make the admin write endpoint public. Adjust the owner-ID expectations in `wallpaper.test.ts` accordingly.
5. Replace the original deployment's absolute asset URL in `addonIcon.ts` with your instance's `/assets/ydl-classic-blue-v1.png` URL. Review other `Niwa710` deployment URLs in `app.ts` and `addonText.ts`.
6. Profile and avatar lookups in `app.ts` currently call the original read-only profile service. For independence, replace those routes with your own implementation. Copying this snapshot does not remove that dependency.
7. Confirm Val-scoped blob storage and admin OAuth behave correctly in your deployment. Metadata caches and wallpaper settings use blob storage. User install configurations/keys are not written there by the configuration handler.
8. Test normal and restricted upstream responses, then check the returned manifest, catalog resources and actual Nuvio installation on your target devices before recommending your deployment to others.

`KURYANA_URL` and `ERDB_URL` appear in inherited helpers. Changing a provider requires checking every relevant path: YourDramaList's poster proxy currently targets the original ERDB host explicitly rather than automatically following `ERDB_URL`.

## Development tests

See [TESTING.md](TESTING.md). The portable offline harness supplies test-only Val Town adapters. Those adapters do not simulate a real OAuth session, hosting behavior, live data or provider credentials.

## Updating production

Publication to GitHub does not deploy Val Town automatically. Review the GitHub diff, run checks, deploy the selected application files to your Val, and record the source commit. Environment secrets must be set independently and must never be included in a source synchronization. There is no automatic GitHub-to-production deployment in this beta.

See [PRIVACY.md](PRIVACY.md) before collecting user credentials. The app can decrypt the configuration links it serves; do not describe the link encryption as zero-knowledge or end-to-end encryption.

## Weekly collections

Deploy `weeklyRefresh.ts` as an interval file with cron `0 0 * * 1` (Monday at 00:00 UTC). The request handler also checks the UTC week, so delayed jobs cannot freeze the old week indefinitely. Themes rotate in pairs from `collections.ts`; at most two are active, shared across countries. A country may have fewer than 20 matching titles. No arbitrary URL or user query is accepted by the shelf endpoints.

TMDB requests use the owner’s `TMDB_API_KEY`, three concurrent requests, at most 120 new upstream requests per minute per runtime, a bounded queue, eight-second timeouts, one-megabyte responses and 429 cooldowns. Public metadata is cached in the val-scoped `catalog-collections:v1` blob, capped at 250 entries and about 2 MB. No API key is placed in that blob. Provider failures may show recent saved collections; no fixture content is substituted.

Collection slots keep their install IDs across weekly changes. Some Nuvio clients may retain the old collection name until they refresh the manifest. Weekly watchlist filtering compares normalized title/year against completed/dropped MDL records; alternate-language names may not match. Titles without IMDb mappings are omitted from Nuvio. Theme suitability depends on TMDB keyword coverage.
