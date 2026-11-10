# Migration: Val Town to Cloudflare

Progress checklist for moving YourDramaList off Val Town. Update the status and date on each step as work finishes.

## Key dates

- **December 10, 2026:** Val Town code becomes read-only. The export must be finished before this date.
- **January 10, 2027:** Val Town stops running the app.

## Decisions so far

- **Source branch:** `ccr-de4d41e8-p7rg8s` (version 1.1.3). Val Town already runs 1.1.3, so this branch matches the live app. `main` is version 1.1.2 and is behind.
- **Target platform:** Cloudflare Workers, Cron Triggers, R2 for blob storage, Workers secrets, and Cloudflare Access for the admin area.
- **Repository visibility:** Public, as requested.
- **Val Town app:** Keeps running untouched until the cutover is approved.
- **Test address:** A `workers.dev` address until the domain is decided.
- **Domain:** `yourdramalist.net` is preferred. It is not owned yet.
- **Scope:** Only YourDramaList moves. The probe is left behind. YDL-V2 and Mdl-lists are not yet confirmed.

## Checklist

### Phase 1: Export and inventory

- [x] Clone the repository and confirm the work branch (1.1.3 is present). *Done November 10.*
- [x] Compare each file on the work branch with the live Val Town copy. *Done November 10, from the uploaded export of 74 files.* 62 files match exactly. Eight differ: six test files, `goblinFixture.ts`, and `peopleFixtures.ts`. `errors.test.ts` is marked as matching production in the snapshot, but it differs, so check it before cutover. Four Markdown docs in the export are not at the repository root.
- [x] Read the remaining modules and list every blob key the app writes. *Done November 10.* Blob keys: `catalog-collections:v1`, `explore:v1`, `seasonal-featured:v1`, `poster-background:v1`, `direct-lists:v1`, `people:v1`, `drama-details:v1`, and `appearance:v1`.
- [x] Confirm whether any user data is stored. *Done November 10.* The app also uses a Val Town SQLite database with seven tables: `ydl_daily_analytics` (294 rows), `ydl_error_log` (2), `ydl_month_salt` (1), `ydl_people_meta` (4), `ydl_review_seen2` (1), `ydl_title_facts` (1,037), and `ydl_visits` (16). These need a decision: migrate them, or drop them. Add-on settings still live only in the encrypted manifest link.
- [ ] Save a copy of the `legacy/` folder and the nine other Val Town branches.

### Phase 2: Secrets and accounts

- [ ] Record `YDL_MANIFEST_SECRET` and `TMDB_API_KEY` in a password manager. The manifest secret must stay identical.
- [ ] Create or confirm the Cloudflare account. Decide who owns it and who controls billing.
- [ ] Confirm the Cloudflare plan. Check free tier limits against real traffic.

### Phase 3: Domain

- [ ] Check whether `yourdramalist.net` is free, or choose another name.
- [ ] Register the domain with a registrar.
- [ ] Decide the final address before anyone reinstalls the add-on.

### Phase 4: Build on Cloudflare

- [ ] Replace the Deno and Val Town imports with Workers equivalents.
- [ ] Replace `Deno.env.get()` with the Workers `env` binding.
- [ ] Replace the blob calls with R2.
- [ ] Add a scheduled handler for the weekly job, at `0 7,8 * * *` UTC. Keep the Pacific midnight check.
- [ ] Replace the Val Town OAuth middleware with Cloudflare Access for the admin area.
- [ ] Replace the owner ID check in `wallpaper.ts` with the Access rule.
- [ ] Replace the profile and avatar routes that depend on the original service.
- [ ] Replace the hard-coded `Niwa710` URLs in `addonIcon.ts`, `app.ts`, and `addonText.ts`.
- [ ] Port the test files to Vitest.

### Phase 5: Parallel run

- [ ] Deploy to the `workers.dev` test address.
- [ ] Compare Val Town and Cloudflare responses for the same requests.
- [ ] Confirm that the manifest link decrypts with the same secret.
- [ ] Check that MyDramaList scraping works from Cloudflare's network.
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
