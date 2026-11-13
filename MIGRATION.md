# Migration: Val Town to Cloudflare

Current checklist for moving YourDramaList off Val Town. Update each item as it finishes.

## Key dates

- **December 10, 2026:** Val Town code becomes read-only, and `*.val.run` redirects can no longer be added or changed. The switch and the redirect must happen before this date.
- **January 10, 2027:** Val Town stops running the app.

## Decisions

- **Host:** Cloudflare Workers. The site runs on the free plan now, and moves to the $5 a month Workers Paid plan in January.
- **Render:** Tried and dropped. MyDramaList refuses both Cloudflare and Render, so the site reads MyDramaList data through Kuryana, a public unofficial API, and TMDB.
- **Repository:** Public, as requested.
- **Source of truth:** Branch `migration/cloudflare`, which includes the 1.1.3 code that Val Town runs.
- **Test address:** `https://yourdramalist.palmajay.workers.dev` until the domain is decided.
- **Domain:** `yourdramalist.net` is preferred and not yet owned.
- **Val Town:** Keeps running untouched until the cutover is approved.
- **Data:** Start fresh (decided November 11). No data is copied from Val Town. Visitors lose nothing, since the site stores no accounts and install links depend only on the secret key. Analytics history and "Popular this month" start from zero.

## Ready on the test site

- Drama search, actor and director filmographies (from TMDB), watchlists by username, custom lists by pasted link, drama details, and reviews in Nuvio.
- Discover catalogs by country, built from TMDB, with localized names.
- The featured banner and This Week's Picks.
- A Sort by menu on the Discover country catalogs (Default order, Newest, Oldest, Highest rated, A to Z), also saved into the install link.
- Preferences, including poster styles, provider keys, and TMDB language.
- Admin pages, with an owner password login.
- Add-on manifest with CORS headers, so Nuvio can read it from a browser.

## One design for every device (November 13)

- The mobile version (1.1.23, built on branch `mobile/one-handed-setup`) is now the only design. The Android app, phone browsers in portrait and landscape, iPhones and computers all get the same screens. Wide screens show it in a centered phone-width column.
- Mouse users get ‹ › buttons on sideways rows, since they cannot swipe.
- The Android test app loads the main site address. A new APK (fresh install, different signing key) replaced the old one on the GitHub release `v1.1.23-beta` on November 13. The old APK had 4 downloads (2 by the owner).
- [ ] Delete the mobile test Worker (`yourdramalist-mobile-test`, `wrangler.mobile-test.toml`) after the two other APK users have reinstalled and re-added the add-on in Nuvio. Nuvio add-ons made on that address stop working once it is deleted.
- New install links get their own Nuvio add-on id per setup. Links made earlier keep working.
- The older offline page tests (`ui`, `selection`, `shelves`, `dramaSearch`, `popularity`, `filmography`, `explore`, `addon`) already failed on 1.1.23 before this change, because they expect the old desktop page. They need rewriting for the app layout.

## Accepted limits

These features are gone or different, and we agreed they are acceptable:

- Viewer verdicts and profile pictures.
- Discovering user lists from a drama name. The Dramas tab was removed.
- Custom lists under a username. Visitors paste a list link instead.
- Creator names for pasted lists.
- Popular lists.
- "Date added" sorting for watchlists.
- EasyPosters, removed from new setups. Existing setups keep it.
- Dependence on Kuryana, which is unofficial and may stop or be blocked.
- Related lists under a drama, even though two replacements were investigated and dropped (November 11). **Trakt** has the lists, but its protection rate-limited every request from Cloudflare's shared Worker addresses (error 1015, with a wait that never counted down). **MDBList** has an official API with a country field on list items, but no request that returns the public lists containing a title (only the signed-in user's own lists), and its free tier allows 1,000 requests a day for the whole account. MDBList could be revisited by asking its maintainer for such a request.

## Before the cutover

- [x] **Existing install links.** Done November 11: an install link made on Val Town loads its manifest on the test site, so the manifest secret matches and existing installs keep working. Their catalogs show the new names.
- [x] **Replace exposed keys.** TMDB: done November 11 (new key in the Cloudflare secret, confirmed working in the logs). MDBList: the user may regenerate their personal key on mdblist.com; the site does not use it.
- [x] **Preferences check.** Done by the user, November 11: everything works.
- [x] **Weekly job schedule.** Confirmed November 11: the job ran at 07:00 and 08:01 UTC, outcome ok, on `0 7,8 * * *`. Still to confirm: the real Monday refresh (next: Monday, November 16) rebuilds the weekly picks and banner.
- [x] **Save the other Val Town branches.** Recorded November 12 in `legacy/branches/README.md` (names, dates, and links). The branches are small November 6 to 7 experiments copied from `main`, so their contents are not copied here. Optional: download any of them from Val Town before January 10.
- [ ] **Domain.** Check whether `yourdramalist.net` is available, register it, and decide the final address.
- [ ] **Billing alert.** Set a Cloudflare alert for about $5.

## Upgrade in January

- [ ] Upgrade Cloudflare to the Workers Paid plan. Until then, Nuvio catalog pages are 20 titles instead of 30 (`NUVIO_PAGE` in `addon.ts`, and `Se` in `addonCore.ts`), added November 12 to stay under the free plan's 50-request limit. After the upgrade, raise both back to 30 or more. This removes the free plan's request limit, which currently causes some lookups to fall back (logs show "Too many subrequests" once a week per country).
- [ ] Test This Week's Picks on the test site after the upgrade.

## Cutover (needs your approval)

- [ ] Attach the chosen domain to the Cloudflare site.
- [ ] Clear the test data (test visits, analytics, and error log) so the live site starts at zero. Keep the wallpaper and banner settings.
- [ ] Set the `yourdramalist.val.run` redirect, only after the new site is verified.
- [ ] Tell users to reinstall the add-on from the new address, since many add-on apps do not follow redirects.

## After the cutover

- [ ] Confirm the new site runs cleanly for at least one week.
- [ ] Retire the Val Town copy before January 10, 2027.
- [ ] Delete the Render test service in its dashboard, if it still exists.

## Completed

- Confirmed the work branch matches the live Val Town code (62 of 74 files identical; the rest are test files and fixtures).
- Created the Cloudflare account, the storage bucket `ydl-data`, and the database `ydl-db`.
- Replaced each Val Town platform piece with a Cloudflare equivalent, with the app code unchanged.
- Confirmed Kuryana answers from Cloudflare.
- Confirmed MyDramaList refuses both Cloudflare and Render.
- Removed YDL-V2 from the setup. Its code remains in `vals/YDL-V2/` as a record.
- Removed the Render setup from the repository.
