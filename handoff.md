# YourDramaList Handoff

## Project
- **What it does:** YourDramaList (YDL) turns MyDramaList catalogs, watchlists, filmographies and weekly picks into Nuvio/Stremio install links, with a Discover site and an Android app.
- **Live site:** https://yourdramalist.net, served by the Cloudflare Worker `yourdramalist`.
- **Branches:** `main` and `migration/cloudflare` of `palmajay-coder/yourdramalist` are kept identical. Other tools (Codex) commit to `main` or to `migration/cloudflare` and may deploy live, so right before every deploy fetch BOTH branches and merge any new commits; otherwise the deploy silently removes their live changes (this happened once with the Lists wording on November 20).
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
  - **One release only:** after publishing, the workflow deletes older releases (`mobile/prune-releases.sh`). Tags stay. Release notes have no install or signing text.
- **Website changes reach the app** without a new APK, because the app loads the site.
- **Before deploying,** fetch and merge any Codex work.
- **Deploy only from source** with `node build.mjs` and `wrangler deploy`. Never hand-patch `dist/worker.js` or the live script: the build renames functions (for example `createLoadingBear2` on the server, exposed to the page as `createLoadingBear`), and a hand patch once broke drama previews. To check that live matches GitHub, download the live script from the Cloudflare API and diff it against a fresh build.

## Approved designs
- **Loading indicator** (`loadingBear.ts`, name kept for compatibility): a 24px blue spinner centered above 18px muted text, 8px gap, with a fade-in and reduced-motion support. It always shows in the exact center of the screen (site-wide standard, `position:fixed`), wherever the caller inserts it. It's shared by search ("Searching for …"), title previews ("Loading details...") and filmographies ("Loading filmography..."). The owner approved it: no bear, no skeletons, no side-by-side layout unless asked. A title preview must open right away, with the indicator inside it, and the indicator must be removed when loading finishes or fails.

## Personal and special catalogs
- **Because you watched** (`recommendations.ts`, `/api/recommendations`): up to three rows of 30 for a connected MyDramaList username, under Weekly Picks and as Nuvio catalogs (`recs`, slots 0-2).
  - **Picks:** seeds are what the user is watching, then completed titles scored 8+. They rotate three further every Monday.
  - **Fill order:** TMDB recommendations, similar titles, shared keywords, then same genres and country.
  - **Left out:** anything on the watchlist.
  - **Storage:** saved per user per week in `recs:v2`.
- **Spotlight** (`specialCatalog.ts`, `/api/catalogs/special`): "Watch this while they play GTA 6", 20 hand-picked titles.
  - **Placement:** the first list on Discover, with a countdown, and as Nuvio kind `special`.
  - **End:** it ends at midnight Pacific on January 1, 2027.
  - **Matching:** titles are matched on TMDB by name, year and country, with matches saved in `special:v1`. Unmatched titles are logged as `unmatched` in the Worker logs.
  - **Calendar:** a holiday or seasonal list for every month (`MONTHLY` in `specialCatalog.ts`), changing at midnight Pacific on the 1st. GTA 6 (`GTA6`) runs until Dec 1, 2026, when the winter list begins.
  - **One heading:** all running lists sit under one "Spotlight" heading with one timer to the end of the month.
  - **Nuvio:** `special` ids `gta6` and `monthly` ("Spotlight of the month", always the current month's list).
  - **Country filter:** `/api/catalogs/special?country=<filter value>` keeps that country's picks and tops up to 15 from TMDB on the list's theme (`THEMES` in `specialCatalog.ts`: keywords or a genre), best rated first. Top-ups are saved for a week in `special:v1` (now `{matches, fills}`). Under 5 titles hides the list for that country. Addresses add the country (`ydl-special:monthly:JP`); without one, every country's picks show (older Nuvio installs).
  - **Names and holidays:** with a country, names read "List (Country)" (`spotlightName`; `plainName` drops the K- from K-Horror Night). `HOLIDAYS` gives Japan, China, Taiwan and Thailand their own lists in some months (no hand-picks, theme fill only). The owner wants no colons in list names.
- **Top 10** (`top10.ts`, `/api/catalogs/top10`): Netflix-style "Top 10 K-Dramas Today" and "Top 10 K-Movies Today", right under This Week's Picks.
  - **Ranking:** TMDB popularity of Korean dramas with an episode in the last 30 days, and Korean films from the last 180 days.
  - **Refresh:** rebuilt daily at Pacific midnight and saved in `top10:v1`. The last list is kept for up to 3 days if TMDB fails.
  - **Nuvio:** kind `top10`, ids `tv` and `movie`.
  - **Country filter:** `/api/catalogs/top10?country=<filter value>` (Korea by default). Names read "Top 10 Dramas Today (Japan)". Korea keeps `ydl-top10:tv`; others add the country (`ydl-top10:tv:JP`). `top10:v1` holds a list per country.
- **Analytics for new catalog kinds:** every new catalog kind needs its own category, or it falls through and counts as a Community public list. Add it in `analyticsScopes` (`addon.ts`), `CATALOG_CATEGORIES`, `ADD_SOURCES` and `analyticsCategoryLabel` (`analyticsApi.ts`), `catalogAddSource` (`app.ts`), and `searchSources` (`wallpaperAdmin.ts`). Spotlight uses `spotlight:<id>:<country|all>`, Top 10 uses `top10:<id>:<country>`, Because you watched uses `recs:<slot>`.
- **Discover order** (`arrange()` in `exploreClient.ts`): Spotlight, This Week's Picks, Top 10, Recommended for you, Browse All.

## Growth
- **Configure button:** the manifest sets `configurable:true`, so Nuvio and Stremio open `/addon/<token>/configure`. `configurePage` writes `selectionFromConfig(config)`, the preferences and the username into the browser, then goes to `/setup/lists`. Keys and poster patterns are never written back. Every new catalog kind needs a case in `selectionFromConfig` (tested by a round trip through `normalizeAddon`).
- **Search:** `/guide` (`guidePage.ts`) is plain server HTML with HowTo and FAQ data. **The owner writes its text in `guide-text.md`** (rules at the top of that file). `cloudflare/build.mjs` copies it into `guideText.ts` on every build; after the owner edits it, fetch, build, commit `guideText.ts` and deploy. A test fails if `guideText.ts` is out of date. Don't police the owner's wording in tests. `/robots.txt` and `/sitemap.xml` live in the same file. The owner should add the site to Google Search Console and submit the sitemap.

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

## If the MDL API opens
- **Docs:** https://mydramalist.github.io/MDL-API/ (repo `mydramalist/MDL-API`, last updated January 2020). The base is `https://api.mydramalist.com/v1`, and every request needs an `mdl-api-key` header (client_id).
  - **Sign-in:** OAuth authorization code (`/oauth/authorize`, `/oauth/token`, which also needs a client_secret).
  - **Keys:** MDL must issue them. There is no public signup; the developer portal link is a placeholder.
- **With user sign-in (most valuable first):**
  - "Sign in with MyDramaList" on Connect, so we never see a password.
  - Private watchlists in all six categories (`/sync/mylist/[type]`).
  - Progress on Nuvio cards (`episode_seen`, the user's rating).
  - An "Add to Plan to Watch on MyDramaList" button in title previews (`POST /sync/mylist`).
  - Exact Hide Completed/Dropped by MDL id instead of title and year.
  - `/sync/last_activities` to skip reloading watchlists that have not changed.
- **With the app key only:**
  - Replace Kuryana for titles, people, reviews and search.
  - A rating breakdown chart (`/titles/[id]/ratings`).
  - A Related titles row: remakes and sequels (`/titles/[id]/related`).
  - MDL tags for Weekly Picks themes and filters.
- **Skip:** writing reviews from YDL. Reviewers use MDL itself.
