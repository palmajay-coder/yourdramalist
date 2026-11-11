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
- **Scope:** YourDramaList moves, plus two pieces it depends on. **YDL-V2** (`vals/YDL-V2/main.ts`) answers YourDramaList's `/api/mdl/profile` and `/api/mdl/avatar` calls, so it moves as a second Worker. **Mdl-lists** `logo.ts` serves the add-on and reviews logo image, which moves into the main Worker once the image is copied. The probe is left behind.
- **Test address:** The Render address, once the service exists (for example `https://yourdramalist.onrender.com`). YDL-V2 runs inside the same server.

## Data decision

- **Keep everything.** The site must work exactly the same after the move. All seven SQLite tables and all blob storage move to Cloudflare.
- **Blob storage (11 data items, about 4.6 MB):** `appearance:v1` (1.5 MB), `explore:v1` (227 KB), `catalog-collections:v1` (145 KB), `drama-details:v1` (143 KB), `people:v1` (470 KB), `direct-lists:v1` (12 KB), `featured:v1`, `featured:v2`, `featured:v3`, `poster-background:v1`, and `seasonal-featured:v1`. These move to Cloudflare R2 with the same names.
- **Images skipped:** `Fall.jpg` and `Winter.png` are backups, so they do not move.
- **SQLite tables:** Move to Cloudflare D1, which uses the same SQL.
- **Open problem:** The data still needs a copy method. The chat tools cannot carry the larger data groups line by line.

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
- [ ] Replace the Val Town OAuth middleware with Cloudflare Access for the admin area. For now the admin area refuses everyone (fails closed). Public pages are unaffected.
- [ ] Replace the owner ID check in `wallpaper.ts` with the Access rule.
- [x] Move the profile and avatar service. *Done November 11.* YDL-V2 runs as the `ydl-v2` Worker, and the build points YourDramaList at it.
- [x] Replace the hard-coded Val Town addresses. *Partly done November 11.* The build rewrites the YDL-V2 address and the add-on icon address. The logo address in `addonText.ts` keeps the old Mdl-lists address until the logo image is copied. The build fails on any unmapped `val.run` address.
- [ ] Copy the Mdl-lists `logo.jpg` image and serve it from the main Worker.
- [ ] Port the test files to Vitest.

### Phase 5: Parallel run

- [x] Deploy to the `workers.dev` test address. *Done November 11.* Both Workers are live at their test addresses.
- [ ] Add the secrets `TMDB_API_KEY` and `YDL_MANIFEST_SECRET` to the `yourdramalist` Worker in the Cloudflare dashboard, using the exact Val Town values.
- [ ] Compare Val Town and Cloudflare responses for the same requests. *Started November 11.* The privacy page matches exactly. The home page's first 20,000 characters match; the live page is 3,450 characters longer overall, most likely from content Val Town adds to served pages. Confirm with a side-by-side check.
- [ ] Confirm that the manifest link decrypts with the same secret.
- [x] Check that MyDramaList scraping works from Cloudflare's network. *Checked November 11: it does not.* Workers Logs show `mydramalist.com` answering **403** to requests from the Worker, while the same requests work from Val Town (which runs on Render). The app depends on MyDramaList for search, lists, and profiles, so Cloudflare Workers cannot host it as-is. Working around MyDramaList's bot protection is not an option. Next step: choose a host that MyDramaList accepts, or get MyDramaList's permission.
- [x] Check that MyDramaList accepts requests from Render. *Checked November 11: it does not.* The free test service (`https://yourdramalist.onrender.com`, Ohio) built and ran correctly, but Render's logs show `mydramalist.com` answering **403** to list and profile requests, using the app's own honest User-Agent headers, exactly as on Cloudflare. MyDramaList currently accepts these requests only from Val Town. Trying more hosts until one is not blocked, or disguising requests, would mean working around MyDramaList's bot protection, so neither is an option. Next step: ask MyDramaList for permission or API access.
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
