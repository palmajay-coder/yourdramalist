# YourDramaList Handoff

## Project
- **What it does:** YourDramaList (YDL) turns MyDramaList catalogs, watchlists, filmographies and weekly picks into Nuvio/Stremio install links, with a Discover site and an Android app.
- **Live site:** https://yourdramalist.net, served by the Cloudflare Worker `yourdramalist`.
- **Work branch:** `migration/cloudflare` of `palmajay-coder/yourdramalist`. GitHub `main` is kept fast-forwarded to it.
- **Test site:** https://yourdramalist-discover-preview.palmajay.workers.dev (Worker `yourdramalist-discover-preview`, branch `preview/connect-first`, its own R2 bucket `ydl-discover-preview-data`).
- **Release:** 1.1.29 (Android versionCode 105).

## Storage
- **D1 database `ydl-db`** (binding `DB`): analytics and popularity tables.
- **R2 bucket `ydl-data`** (binding `BLOBS`): caches, appearance settings and backdrops. Read with `npx wrangler r2 object get ydl-data/<key> --remote --pipe`.
- **Secrets** are set with `wrangler secret put` and never live in files: `TMDB_API_KEY` and `YDL_MANIFEST_SECRET`. Changing `YDL_MANIFEST_SECRET` breaks every install link.

## Workflow
- **Tests:**
  - `deno run --no-check --allow-read --allow-env --import-map=tests/import_map.json tests/run-tests.ts` runs 21 suites.
  - `deno test --no-check --allow-read --allow-env --import-map=tests/import_map.json mobileHeader.test.ts myCollections.test.ts personalCatalogs.test.ts`
  - `node tests/audit-release.mjs` runs the release scan.
- **Deploy live:** `cd cloudflare && node build.mjs && npx wrangler deploy`. Then confirm with `npx wrangler deployments status`, which should show the new version at 100%.
- **Deploy the test site:** build with `YDL_PUBLIC_ORIGIN=https://yourdramalist-discover-preview.palmajay.workers.dev node build.mjs`, then run `npx wrangler deploy --config wrangler.discover-preview.toml`. Rebuild with the live origin afterwards.
- **Test site first** for new features unless the owner says otherwise.
- **Android release:**
  - **Trigger:** raise `mobile/android-version.txt` and push. The "Android app release" workflow builds, signs and publishes `YourDramaList-<version>-android.apk` plus `android-latest.json`.
  - **What's new:** the notes come from `mobile/whats-new.md`.
  - **Version files:** also update `text.ts` and `CHANGELOG.md`.
  - **Signing key:** it lives only in GitHub secrets. Never commit it.
- **Website changes reach the app** without a new APK, because the app loads the site.
- **Before deploying,** fetch and merge any Codex work.

## Quirks
- GitHub GraphQL is blocked from the container. Use `gh api repos/...` (REST).
- The container can't reach TMDB, yourdramalist.net or workers.dev. Check visual changes locally with `wrangler dev --local` and Playwright.
- The app's update notice shows only when the browser signature has `YourDramaListApp/<code>`. Reddit and other in-app browsers must never see it.

## Recent (November 2026)
- **1.1.29:**
  - Connect-first start: no bottom bar until Connect is done
  - a backdrop wall of new K-dramas
  - the YDL opening animation
  - Milky Nice titles
- **Since 1.1.29 (website only):**
  - the tint slider scales all darkening
  - the app uses the landscape layout
  - actor-page titles open full details
  - no update popup in Reddit
  - Nuvio filmography catalogs keep TMDB ids distinct and hide finished dramas

## Open ideas (not requested yet)
- A Share button in the drama preview.
- "Because you added…" recommendations from your Selection.
- Search and Select-all pills for Community lists.
- A light grey Android launch screen to match the opening (needs an APK).
