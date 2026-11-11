# Migration: Val Town to Cloudflare

Current checklist for moving YourDramaList off Val Town. Update each item as it finishes.

## Key dates

- **December 10, 2026:** Val Town code becomes read-only, and `*.val.run` redirects can no longer be added or changed. The data copy, the switch, and the redirect must happen before this date.
- **January 10, 2027:** Val Town stops running the app.

## Decisions

- **Host:** Cloudflare Workers. The site runs on the free plan now, and moves to the $5 a month Workers Paid plan in January.
- **Render:** Tried and dropped. MyDramaList refuses both Cloudflare and Render, so the site reads MyDramaList data through Kuryana, a public unofficial API, and TMDB.
- **Repository:** Public, as requested.
- **Source of truth:** Branch `migration/cloudflare`, which includes the 1.1.3 code that Val Town runs.
- **Test address:** `https://yourdramalist.palmajay.workers.dev` until the domain is decided.
- **Domain:** `yourdramalist.net` is preferred and not yet owned.
- **Val Town:** Keeps running untouched until the cutover is approved.

## Ready on the test site

- Drama search, actor and director filmographies (from TMDB), watchlists by username, custom lists by pasted link, drama details, and reviews in Nuvio.
- Discover catalogs by country, built from TMDB, with localized names.
- The featured banner and This Week's Picks.
- Preferences, including poster styles, provider keys, and TMDB language.
- Admin pages, with an owner password login.
- Add-on manifest with CORS headers, so Nuvio can read it from a browser.

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

## Before the cutover

- [ ] **Data copy (must finish before December 10).** Copy the blob data (11 items) and the seven SQLite tables from Val Town to Cloudflare. The chat tools cannot carry the larger data, so we need a copy method first.
- [ ] **Existing install links.** Confirm an install link made on Val Town still works on the test site. This proves the manifest secret matches.
- [ ] **Replace exposed keys.** The TMDB and MDBList keys appeared in screenshots. Create new ones and update the TMDB secret on Cloudflare.
- [ ] **Preferences check.** Run through the preferences page once more, including poster styles, Verify, and Config.
- [ ] **Weekly job.** Confirm the weekly refresh runs on its schedule (07:00 and 08:00 UTC).
- [ ] **Save the other Val Town branches.** Export the nine branches besides `main`. The `legacy/` folder is already in the repository.
- [ ] **Domain.** Check whether `yourdramalist.net` is available, register it, and decide the final address.
- [ ] **Billing alert.** Set a Cloudflare alert for about $5.

## Upgrade in January

- [ ] Upgrade Cloudflare to the Workers Paid plan. This removes the free plan's request limit, which currently causes some lookups to fall back (logs show "Too many subrequests" once a week per country).
- [ ] Test This Week's Picks on the test site after the upgrade.

## Cutover (needs your approval)

- [ ] Attach the chosen domain to the Cloudflare site.
- [ ] Copy the final data from Val Town.
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
