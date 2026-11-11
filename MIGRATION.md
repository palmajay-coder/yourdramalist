# Migration: Val Town to Cloudflare

Progress checklist for moving YourDramaList off Val Town. Update the status and date on each step as work finishes.

## Key dates

- **December 10, 2026:** Val Town code becomes read-only, and `*.val.run` redirects can no longer be added or changed. The data copy, the switch, and the redirect must all happen before this date.
- **January 10, 2027:** Val Town stops running the app.

## Decisions so far

- **Source branch:** `ccr-de4d41e8-p7rg8s` (version 1.1.3). Val Town already runs 1.1.3, so this branch matches the live app. `main` is version 1.1.2 and is behind.
- **Target platform (changed November 11): Render.** MyDramaList refuses requests from Cloudflare Workers (403), so the site runs as a regular Node.js server on Render instead (`render.yaml`, `render/`). Saved data and the SQLite database live on a Render persistent disk. Val Town itself runs on Render, so MyDramaList is expected to accept it; this is confirmed only once deployed.
- **Cloudflare's new role: daily backups.** The Cloudflare account, R2 buckets and D1 database stay, and will receive a daily copy of the site's data. The `cloudflare/` Workers build is kept for reference but is not used for hosting. The two test Workers (`yourdramalist`, `ydl-v2` on `palmajay.workers.dev`) can be deleted once Render works.
- **Cost:** Render Starter plan, about $7 a month, plus about $0.25 a month for a 1 GB disk. Cloudflare stays on its free tier.
- **Repository visibility:** Public, as requested.
- **Val Town app:** Keeps running untouched until the cutover is approved.
- **Test address:** A `workers.dev` address until the domain is decided.
- **Domain:** `yourdramalist.net` is preferred. It is not owned yet.
- **Scope:** YourDramaList moves. **YDL-V2 is no longer needed** (decided November 11): YourDramaList used it only for username lookups and avatars, which now come from Kuryana (watchlists) and a local "no picture" answer. YDL-V2 stays behind on Val Town; its Cloudflare Worker and bucket were deleted. **Mdl-lists** `logo.ts` still serves the add-on and reviews logo image, which moves into the main Worker once the image is copied. The probe is left behind.
- **Test address:** The Render address, once the service exists (for example `https://yourdramalist.onrender.com`). YDL-V2 runs inside the same server.

## Data decision

- **Keep everything.** The site must work exactly the same after the move. All seven SQLite tables and all blob storage move to Cloudflare.
- **Blob storage (11 data items, about 4.6 MB):** `appearance:v1` (1.5 MB), `explore:v1` (227 KB), `catalog-collections:v1` (145 KB), `drama-details:v1` (143 KB), `people:v1` (470 KB), `direct-lists:v1` (12 KB), `featured:v1`, `featured:v2`, `featured:v3`, `poster-background:v1`, and `seasonal-featured:v1`. These move to Cloudflare R2 with the same names.
- **Images skipped:** `Fall.jpg` and `Winter.png` are backups, so they do not move.
- **SQLite tables:** Move to Cloudflare D1, which uses the same SQL.
- **Open problem:** The data still needs a copy method. The chat tools cannot carry the larger data groups line by line.

## Kuryana coverage (checked November 11)

Each Kuryana v2 route was called once from Cloudflare and its answer's structure recorded. All returned 200. Base: `https://kuryana.tbdh.app`. Kuryana caches answers for 60 seconds and documents no rate limit.

| Feature | Kuryana route | Coverage |
|---|---|---|
| Drama search | `/v2/search?q=` | **Full.** Title, slug, type, year, episodes, rating, ranking, thumbnail. |
| Actor and director search | `/v2/search?q=` (people) | **Partial.** Name, nationality, photo. No actor/director distinction, so the separate Actors and Directors tabs need filtering via `/v2/people`. |
| Drama details | `/v2/dramas/{slug}` | **Full.** Rating, votes, rank, popularity, watchers, synopsis, genres, tags, network, aired dates, poster, main cast. |
| Cast and crew | `/v2/dramas/{slug}/cast` | **Full.** Grouped by role. |
| Reviews in Nuvio | `/v2/dramas/{slug}/reviews` | **Full.** Headline, body, helpful count, status, episodes seen, spoiler flag, overall and category ratings, reviewer. |
| Viewer verdict ("36% completed") | none | **Not covered.** No statistics route. |
| Filmographies | `/v2/people/{slug}` | **Full.** Works by type, with role, character, year, rating. |
| Custom lists | `/v2/lists/{id}` | **Mostly.** Items with title, type, year, episodes, rank, note, image. No list owner name. |
| Watchlists | `/v2/users/{username}/dramalist` | **Mostly.** Every status with title, country, year, type, score, progress. **No posters and no date added**, so posters must come from TMDB matching, and the "Date added" sort disappears (the code already hides it when dates are missing). |
| Username lookup: a user's custom lists | none | **Not covered.** Visitors can still paste a list link. |
| Profile avatar | none | **Not covered.** The page shows an initial instead. |
| Discover by country, "More from MyDramaList" rankings | none | **Not covered.** TMDB discover could substitute, with TMDB rankings instead of MyDramaList's. |
| Popular lists | none | **Not covered.** |
| Weekly picks, artwork, IMDb matching | TMDB | **Unaffected.** Already uses TMDB. |

Risks: Kuryana is unofficial, run by one developer, and will be retired if MyDramaList releases an official API. If MyDramaList blocks Kuryana, the covered features stop too. Its capacity under YourDramaList's traffic is unknown.

## Checklist

### Phase 1: Export and inventory

- [x] Clone the repository and confirm the work branch (1.1.3 is present). *Done November 10.*
- [x] Compare each file on the work branch with the live Val Town copy. *Done November 10, from the uploaded export of 74 files.* 62 files match exactly. Eight differ: six test files, `goblinFixture.ts`, and `peopleFixtures.ts`. `errors.test.ts` is marked as matching production in the snapshot, but it differs, so check it before cutover. Four Markdown docs in the export are not at the repository root.
- [x] Read the remaining modules and list every blob key the app writes. *Done November 10.* Blob keys: `catalog-collections:v1`, `explore:v1`, `seasonal-featured:v1`, `poster-background:v1`, `direct-lists:v1`, `people:v1`, `drama-details:v1`, and `appearance:v1`.
- [x] Confirm whether any user data is stored. *Done November 10.* The app also uses a Val Town SQLite database with seven tables: `ydl_daily_analytics` (294 rows), `ydl_error_log` (2), `ydl_month_salt` (1), `ydl_people_meta` (4), `ydl_review_seen2` (1), `ydl_title_facts` (1,037), and `ydl_visits` (16). These need a decision: migrate them, or drop them. Add-on settings still live only in the encrypted manifest link.
- [ ] Save a copy of the `legacy/` folder and the nine other Val Town branches.

### Phase 2: Secrets and accounts

- [ ] Record `YDL_MANIFEST_SECRET` and `TMDB_API_KEY` in a password manager. The manifest secret must stay identical.
- [x] Create or confirm the Cloudflare account. *Done November 10.* The access token is saved in the session's secure credential store, never in this repository.
- [x] Confirm the Cloudflare plan. *Done November 10.* R2 is on the free plan ($0 due), with 10 GB storage, 1 million writes, and 10 million reads per month included.
- [x] Create the storage. *Done November 10.* R2 bucket `ydl-data` and D1 database `ydl-db` (id `c4cdaaf7-cbf1-4b53-b243-0beaebe50d8c`). Both are empty.
- [ ] Set a Cloudflare billing alert for a small amount, such as $5.

### Phase 3: Domain

- [ ] Check whether `yourdramalist.net` is free, or choose another name.
- [ ] Register the domain with a registrar.
- [ ] Decide the final address before anyone reinstalls the add-on.

### Phase 4: Build on Cloudflare

Approach: the app code is used **unchanged**. `cloudflare/build.mjs` bundles it and swaps each Val Town platform import for a Cloudflare stand-in in `cloudflare/shims/`. This keeps the app identical to the live copy and easy to compare.

- [x] Replace the Deno and Val Town imports with Workers equivalents. *Done November 11.* Blob, SQLite, utils, and OAuth imports map to `cloudflare/shims/`. `npm:cheerio` and `npm:hono` map to installed packages.
- [x] Replace `Deno.env.get()` with the Workers `env` binding. *Done November 11.* `shims/deno-env.ts` provides `Deno.env` from Worker secrets and variables.
- [x] Replace the blob calls with R2. *Done November 11.* Same key names, bucket `ydl-data` (YDL-V2 uses its own bucket, `ydl-v2-data`).
- [x] Replace the SQLite calls with D1. *Done November 11.* Rows work by index and by column name, as on Val Town.
- [x] Serve the browser files Val Town served at `/__immutable/`. *Done November 11.* Transpiled at build time.
- [x] Add a scheduled handler for the weekly job, at `0 7,8 * * *` UTC. *Done November 11.* The Pacific midnight check is unchanged.
- [x] Replace the Val Town OAuth middleware for the admin area. *Done November 11* with the owner-password login above (instead of Cloudflare Access).
- [x] Owner check in `wallpaper.ts`. *Kept as is:* the password session produces the same owner id the check expects.
- [x] Move the profile and avatar service. *Done November 11.* YDL-V2 runs as the `ydl-v2` Worker, and the build points YourDramaList at it.
- [x] Replace the hard-coded Val Town addresses. *Partly done November 11.* The build rewrites the YDL-V2 address and the add-on icon address. The logo address in `addonText.ts` keeps the old Mdl-lists address until the logo image is copied. The build fails on any unmapped `val.run` address.
- [x] Logo image. *Done November 11.* The same YDL image as the add-on icon is used; no Mdl-lists copy needed.
- [ ] Port the test files to Vitest.

### Switched to Kuryana so far (November 11)

Drama search, actor and director search, actor filmographies, watchlists by username, custom lists by link, drama details (synopsis, score, rank, popularity), and the reviews in Nuvio. Actor and director filmographies both come from TMDB (decided November 11): Kuryana's person data is incomplete (it misses most of Park Chan Wook's films and Takuya Kimura's biggest dramas, including Long Vacation). TMDB acting credits skip appearances as "Self" and talk, reality, news, documentary and animation titles, so counts can differ from MyDramaList's. Kuryana's credits remain as a fallback if TMDB is unavailable. Posters for titles TMDB cannot match fall back to MyDramaList's poster through Kuryana. **The Dramas tab in Discover was removed** (decided November 11). Its purpose was finding user lists that contain a drama, which no available service provides, and similar or recommended shows would not serve the site's purpose of putting lists into catalogs. Discover now opens on Actors, with Directors and Catalogs beside it. **The Custom lists tab was removed** from Community (Kuryana cannot list a user's custom lists; visitors paste a list link instead, and the search box already says so), and **Your Selection no longer shows creator or username headings**: it is one plain list of names (Kuryana does not say who made a pasted list, and lists from a username search wrongly absorbed later pasted lists). **Discover country catalogs now come from TMDB** (decided November 11): the same ten categories and the same catalog ids (so existing install links keep working), renamed honestly (for example "Top Rated Shows (South Korea)") because rankings follow TMDB's audience, not MyDramaList's; the credit line says so. **The featured banner lists** now load through Kuryana. **The add-on and reviews logo** now uses the YDL image the user supplied, which is identical to the add-on icon, so the Mdl-lists project is no longer needed. Popular lists (no substitute) and viewer verdicts are dropped.

### To do later (agreed November 11)

- [ ] **Upgrade Cloudflare to the Workers Paid plan ($5 a month).** The free plan allows about 50 outgoing requests per visit, and the genre lookups already hit that limit ("Too many subrequests" in the logs). This Week's Picks asks TMDB for far more than 50 things when it builds a week, so it will likely fail on the free plan. The paid plan raises the limit to about 1,000. User approved the cost.
- [ ] **Test This Week's Picks** on the test site once the paid plan is on. TMDB_API_KEY is already set.
- [x] **Admin login built** (November 11): `cloudflare/shims/oauth.ts`. `/auth/login` checks the owner password (Worker secret `ADMIN_PASSWORD`) and sets a signed, HttpOnly, 12-hour cookie; `/auth/logout` ends it; the existing owner check passes only for that session. Tested: wrong password, forged and expired cookies, a changed password, no password set (refuses everyone), and a ten-minute limit after eight wrong tries per address. **Waiting on the user** to add the `ADMIN_PASSWORD` secret in the Cloudflare dashboard and try signing in.

### Phase 5: Parallel run

- [x] Deploy to the `workers.dev` test address. *Done November 11.* Both Workers are live at their test addresses.
- [ ] Add the secrets `TMDB_API_KEY` and `YDL_MANIFEST_SECRET` to the `yourdramalist` Worker in the Cloudflare dashboard, using the exact Val Town values.
- [ ] Compare Val Town and Cloudflare responses for the same requests. *Started November 11.* The privacy page matches exactly. The home page's first 20,000 characters match; the live page is 3,450 characters longer overall, most likely from content Val Town adds to served pages. Confirm with a side-by-side check.
- [ ] Confirm that the manifest link decrypts with the same secret.
- [x] Check that MyDramaList scraping works from Cloudflare's network. *Checked November 11: it does not.* Workers Logs show `mydramalist.com` answering **403** to requests from the Worker, while the same requests work from Val Town (which runs on Render). The app depends on MyDramaList for search, lists, and profiles, so Cloudflare Workers cannot host it as-is. Working around MyDramaList's bot protection is not an option. Next step: choose a host that MyDramaList accepts, or get MyDramaList's permission.
- [x] Check that MyDramaList accepts requests from Render. *Checked November 11: it does not.* The free test service (`https://yourdramalist.onrender.com`, Ohio) built and ran correctly, but Render's logs show `mydramalist.com` answering **403** to list and profile requests, using the app's own honest User-Agent headers, exactly as on Cloudflare. MyDramaList currently accepts these requests only from Val Town. Trying more hosts until one is not blocked, or disguising requests, would mean working around MyDramaList's bot protection, so neither is an option. Next step: ask MyDramaList for permission or API access.
- [x] Check whether the public Kuryana API (already the app's MyDramaList fallback in `addonScrape.ts`) answers the new hosts. *Checked November 11: it does, from both Render and Cloudflare Workers* (list and search requests returned 200 in under 1.5 seconds). Kuryana is unofficial and run by one developer, so it may stop or be blocked; see its README. With Kuryana as the data source, Cloudflare is viable again and costs $0 a month.
- [ ] Separate issue, same logs: the main Worker's call to `ydl-v2.palmajay.workers.dev` returned 404 without reaching YDL-V2. Workers on the same `workers.dev` subdomain cannot call each other by URL; a service binding would fix it if both stay on Cloudflare.
- [ ] Check the weekly job on a test run.

### Phase 6: Cutover (needs your approval)

- [ ] Attach the chosen domain to the Cloudflare app.
- [ ] Copy any data that must move from Val Town.
- [ ] Set the `yourdramalist.val.run` redirect, only after the new site is verified.
- [ ] Ask users to reinstall the add-on from the new address.

### Phase 7: Shutdown

- [ ] Confirm the new app has run cleanly for at least one week.
- [ ] Retire the Val Town copy before January 10, 2027.

## Notes

- The Val Town redirect stops the old app from receiving requests. Set it only after the new app is verified.
- Many add-on clients do not follow redirects. Plan for users to reinstall.
