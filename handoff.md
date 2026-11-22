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
- **Discover sort and Movies/Shows** apply to every section except Top 10's order (`viewFilter`/`viewed` in `exploreClient.ts`, `tmdbShelfItems` + `applyShelfFilter` in `shelfFilters.ts`). Sorted Spotlight, Weekly and Recs rows carry the filter into Nuvio (`withFilter` in `normalizeAddon`, applied in `loadCatalog`).
- **Filmography filter:** the person page (`peopleClient.ts`) has a filter icon right of Add (type and the same five sorts as Discover; Rating uses `score` from TMDB credits in `tmdbPeople.ts`, kept only with 5+ votes). Names come from `filmographyName` and Top Rated is cut to ten by `filmographyTop` (both in `shelfFilters.ts`, used by the page, `normalizeAddon`, `catalogLabels.ts` and `loadCatalog`). Each filter is its own catalog (address `ydl-filmography:<mode>:<id>?ydlf=<key>`, like Discover rows), so a person can have several; `selectedFilmography(personId, filter)` matches exactly one. The page opens on the plain filmography. Nuvio applies it in `loadCatalog`.
- **Trope search:** `TROPES` in `specialCatalog.ts` (id, fan-label name, phrase pattern, TMDB keywords, optional hand-picks; no genre fallback except Satisfying Endings). `tropeCatalog(id)` fills to 30 across KR|CN|JP|TW|TH and hides under 5, stored per trope (`special-trope-<id>:v1`; endings keeps `special-endings:v1`). `/api/catalogs/special?list=<id>`; Nuvio `ydl-special:<id>`. The page gets `TROPES` patterns from `app.ts`, and the + search (`quickSearchClient.ts`) shows a row per matching trope. Analytics: `spotlight:<id>:all`, add source `theme-search` ("Trope search adds"). Next step: hand-pick titles for tropes whose TMDB fill comes up short (check `specialFill` logs).
- **Discover order** (`arrange()` in `exploreClient.ts`): Spotlight, This Week's Picks, Top 10, Recommended for you, Browse All.

## Growth
- **Configure button:** the manifest sets `configurable:true`, so Nuvio and Stremio open `/addon/<token>/configure`. `configurePage` writes `selectionFromConfig(config)`, the preferences and the username into the browser, then goes to `/setup/lists`. Keys and poster patterns are never written back. Every new catalog kind needs a case in `selectionFromConfig` (tested by a round trip through `normalizeAddon`).
- **Search:** `/guide` (`guidePage.ts`) is plain server HTML with HowTo and FAQ data. **The owner writes its text in `guide-text.md`** (rules at the top of that file). `cloudflare/build.mjs` copies it into `guideText.ts` on every build; after the owner edits it, fetch, build, commit `guideText.ts` and deploy. A test fails if `guideText.ts` is out of date. Don't police the owner's wording in tests. `/robots.txt` and `/sitemap.xml` live in the same file. The owner should add the site to Google Search Console and submit the sitemap.

## Stats (feature branch `feature/stats`, Phase 1: engine only, not deployed)
- **Engine:** `stats.ts`, route `GET /api/stats?username=<u>[&refresh=1]` (wired in `app.ts`), tests in `stats.test.ts`.
- **Sources:** Kuryana's raw dramalist (`/v2/users/<u>/dramalist`), which carries each title's country name, year, type, the owner's score, episodes seen/total, and MyDramaList's own per-list totals (`stats.days`, `stats.episodes`). TMDB adds genres (with drama keywords via `factsGenresFor`), top-5 cast, a textless backdrop and a poster (matched with `pickTmdbResult`).
- **Exact vs. not:** counts, types, countries (including Hong Kong and others), decades, ratings and Top 10 come straight from the watchlist. Viewing time is MyDramaList's own Completed total (days to 0.1, so within about 1.2 h). Genres and actors cover only TMDB-matched titles (reported in `coverage`). No completion dates exist anywhere.
- **Hero:** snapshots of Completed (`stats-snapshot:v1:<user>`). The first sync marks everything as old and falls back to the top-rated title (`reason: top-rated-fallback`). Later syncs stamp newly completed titles with their detection time (not a completion date), so the hero is the newest detection, with ties by score then title. Removed titles drop out, and snapshots older than 180 days restart.
- **Storage (R2 blobs):** `stats-list:v1:<user>` (last good watchlist, refetched after 30 min, refresh at most every 2 min), `stats-snapshot:v1:<user>`, and `stats-titles:v1` (TMDB details per title, 30 days, or 3 for no match, capped at 5,000).
- **Navigation (approved by the owner for Phase 2):** Stats replaces the My Collections tab in the bottom bar. My Collections stays as a "My Collections" button at the top of the Lists page, opening the same screen, and Add to Collection in title previews keeps working. Existing collections in Nuvio are untouched.
- **Phase 2 (page, built, not deployed):** `statsClient.ts` (`#statsPanel`, shown by `switchTab` through `showStats`), styles `.stats*` in `catalogShelves.css`, and tests in `statsPage.test.ts`. It covers the hero (backdrop crossfade; the label is "Recently completed" or "Your top-rated"), status chips, dramas vs movies, countries, genres (without "Drama"), actors, Top 10 with ranks, scores, decades and the coverage note. While titles are pending it asks again every 30 s, up to 8 times. Stale, empty, private and error states each have their own message. The bottom bar has Stats where My Collections was. My Collections opens from a "My Collections ›" button on Lists (`androidCollectionsLink`), with a "‹ Back to Lists" button to return.
- **Phase 3 (Wrapped, built, not deployed):**
  - **Code:** `wrappedClient.ts` (`installWrapped()` returns `{open, maybePrompt}`), styles `.wrapped*` in `catalogShelves.css`, tests in `wrapped.test.ts`.
  - **Slides:** 9, made from the same `/api/stats` data, each led by one sentence that holds the answer (after studying Spotify Wrapped's wording, without copying its art or phrases): journey, "You watched for X hours.", "Your top genre was X.", countries (ties said as ties), "Your most-watched actor is X." with a ranked 1 to 5 list, "Your #1 drama was X." and "Your #1 movie was X." (each a ranked 1 to 5 list with its own backdrop; the API has `topDramas` and `topMovies`), the average score, **Your drama type**, summary card. Each slide gets its own backdrop (`art` in the API: opening, topDrama, topMovie, genres, countries, actors, time, ratings, type, card; no repeats). Backdrops are `backdropHd`: TMDB images at least 1920 wide and 1000 tall, at the `original` size, never TMDB's default picture (a landscape picture cropped to a tall phone screen is stretched a lot, so soft pictures looked bad). Title metadata is version 2. The slides show no caption naming the picture, and the ratings slide has no country line (Stats still has one)..
  - **Drama types** (`dramaType` in `wrappedClient.ts`, the first that fits; others shown as "also"): Perfectionist (a third or more of scores are 10, with at least 10 rated), Explorer (4+ countries), Loyalist (one country over 70%, with at least 10 completed), Movie Buff (more movies than dramas and TV shows), Binger (300+ hours), and The Drama Fan otherwise. A tap on the right goes forward and on the left goes back; swipes and arrow keys work too, and × or Esc closes. Nothing advances by itself, slides without data are left out, and reduced motion is respected.
  - **Ready card:** "Your drama recap is ready!" (View or Later) appears about 2 s after start, once the opening intro has finished, at most once a year per user (`ydl-wrapped-prompt:<user>` in localStorage), and only when stats are ready (completed ≥ 1 and pending ≤ 10%).
  - **Replay:** Stats has a View My Wrapped button. The share card is Phase 4.
- **Test site:** runs `feature/stats` for the TMDB check (live unchanged). Each `/api/stats` request logs one summary line (`stats`, `coverage`, top genres and actors, hero).
- **TMDB budget:** about 12 s per request, 2 lookups at a time, then `coverage.pending`. Kuryana down: the last good stats, `stale: true`. Private or V2 layout: a clear error.

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
