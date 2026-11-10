# YourDramaList Handoff

## Project
- **What it does:** YourDramaList (YDL) works as a Nuvio add-on that turns MyDramaList catalogs into install links.
- **Live site:** Val Town val `Niwa710/YourDramaList` (yourdramalist.val.run). Live files match GitHub as of release 1.1.2.
- **GitHub mirror:** `palmajay-coder/yourdramalist`. The work branch, `ccr-de4d41e8-p7rg8s`, must restart from `origin/main` for new work, since PR #5 (release 1.1.2) already merged.
- **Release:** 1.1.2 (1.1.1 was the first stable release).

## Completed in 1.1.0
- **Shelves:** Community and drama-related lists show as shelves.
- **One filter bar:** A single bar at the top narrows every shelf. Dramas and Movies use two separate buttons, and only one works at a time. The full watchlist hides while a filter runs. Watchlists and custom lists keep separate filters.
- **Catalog names:** Filtered names follow "List name: Korean Romance Dramas". Only filtered custom lists drop the word "list".
- **TMDB facts:** Genres and posters match by release year first, then by country (VERSION 4 in `titleFacts.ts`).
- **People count:** A daily scrambled code counted unique people who generated a manifest (replaced by a monthly code in 1.1.2).
- **Admin analytics:** A simpler layout with four cards, a 7/30-day switch, Discover catalogs, feature tabs, a Search breakdown and people-per-day bars.
- **Popular this month:** A card under Your Selection on the Discover tab only, with Catalogs and Actors & directors tabs. It stays hidden until at least three entries reach 3 adds each, and it caches for an hour.
- **Weekly picks:** 25 themes rotate, two fresh themes each week starting Nov 16. Thin rows relax the rating floor, then top up with genre-18 dramas. A rotation view appears on the admin page.
- **Changelog:** Every version uses What's new, Bug fixes and Improvements.

## Completed in 1.1.1
- **Nuvio cards:** Five-star score with rating count, an "In your watchlist" status line, a one-line verdict with an icon, and an Open on MyDramaList card. Reviews stay unchanged.
- **Review dedupe:** `reviewDedupe.ts` lets only the first install on a device answer for a title within 10 seconds, so extra install links no longer duplicate review cards. It stores a hashed device-and-title code and deletes it after 10 seconds.
- **Admin Errors:** One summary line, a guide showing only errors that happened, and the latest codes under each type.
- **Cleanup:** The Nuvio example screenshot, its route and unused text are gone.

## Completed in 1.1.2
- **Date added sort:** Watchlist shelves offer "Date added", using MDL's entry number (`ml12345`) as the add order. Sort and year never appear in catalog names.
- **People-based analytics:** `popularity.ts` stores `(day, scope, visitor)` rows in `ydl_visits` with a monthly salted code, kept 35 days. The admin page shows unique people per range, mobile vs computer, and returning people. Click totals are no longer written. Popular this month and weekly picks still use daily totals in `ydl_daily_analytics` (`popular.*`, `weekly.people`).

## Important decisions
- **Minimal first:** The user wants explanations before code ("do not code yet") and minimal UI.
- **No empty states:** The popular card hides entirely rather than showing a "not enough data" message.
- **Weekly picks stay first:** Popularity rankings never push This week's picks down.
- **Names only for people:** The card shows actor or director names with round photos, without labeling the role.
- **Fresh themes:** Both weekly slots stay fresh each week until enough data exists for popular themes to return.
- **Privacy:** A monthly scrambled code (salt rotates on the 1st) counts people, and the codes get deleted after 35 days. Daily totals stay 180 days. `personName` and `personPhoto` never go into the install link. The privacy page says plainly that we can't work backward from the code to an address or a person.
- **GitHub-only tests:** `popularity.test.ts` and `weeklyThemes.test.ts` stay off Val Town because they would write fake rows into the real database.

## Workflow
- **Deploy:** Create a Val Town branch, make targeted edits, check bytes against local files with a temporary `_hashcheck.ts`, run tests, merge, delete the branch, then commit and push to GitHub.
- **Local tests:** `deno run --no-check --allow-read --allow-env --allow-net --import-map=tests/import_map.json tests/run-tests.ts` (last run: 22 suites pass). Release scan: `node tests/audit-release.mjs`.
- **Known quirks:** The container cannot reach `api.val.town` for uploads. `run_file` sometimes times out, so retry. Branch endpoints use a different origin.

## Current status
- **No active problem:** 1.1.2 runs live (Val Town version 753). Old click totals stay in the database but the admin page no longer reads them. Analytics started fresh on release day.
- **To verify live:** Build one install link, then confirm the admin page shows 1 person today with the right device. Confirm in Nuvio that two installs show one set of review cards.
- **Release pages:** The user still needs to create the v1.1.1 (and optionally v1.1.2) GitHub release pages by hand, since tag pushes get blocked from this container.
- **Cost:** The user asked for cheaper models on routine tasks and `/compact` after each logical step.

## Next up
- **Mobile site:** Make the mobile layout match the desktop one (banner alignment, logo, header). Planning only so far; the user has not yet answered questions about decorations, banner text placement and header layout.
- **Play Store app:** Discussed a Capacitor companion app with a phased plan and screen designs. Nothing built; check the mobile vs computer split in analytics before deciding.

## Open ideas (not requested yet)
- **EasyPosters:** Consider removing it after 30 days of analytics data.
- **Returning themes:** Let popular weekly themes return once enough data exists.
- **Roadmap:** RPDB poster layouts remain listed.
