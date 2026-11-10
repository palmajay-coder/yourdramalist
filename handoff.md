# YourDramaList Handoff

## Project
- **What it does:** YourDramaList (YDL) works as a Nuvio add-on that turns MyDramaList catalogs into install links.
- **Live site:** Val Town val `Niwa710/YourDramaList` (yourdramalist.val.run). Main sits at version 722.
- **GitHub mirror:** `palmajay-coder/yourdramalist`. The work branch, `ccr-de4d41e8-p7rg8s`, must restart from `origin/main` for new work, since PR #2 already merged.
- **Release:** 1.1.0 (shown as "1.1.0 BETA"). PR #2, "Release 1.1.0", merged into main at `5463b36b`.

## Completed in 1.1.0
- **Shelves:** Community and drama-related lists show as shelves.
- **One filter bar:** A single bar at the top narrows every shelf. Dramas and Movies use two separate buttons, and only one works at a time. The full watchlist hides while a filter runs. Watchlists and custom lists keep separate filters.
- **Catalog names:** Filtered names follow "List name: Korean Romance Dramas". Only filtered custom lists drop the word "list".
- **TMDB facts:** Genres and posters match by release year first, then by country (VERSION 4 in `titleFacts.ts`).
- **People count:** A daily scrambled code with a salt that rotates each day counts unique people who generated a manifest.
- **Admin analytics:** A simpler layout with four cards, a 7/30-day switch, Discover catalogs, feature tabs, a Search breakdown and people-per-day bars.
- **Popular this month:** A card under Your Selection on the Discover tab only, with Catalogs and Actors & directors tabs. It stays hidden until at least three entries reach 3 adds each, and it caches for an hour.
- **Weekly picks:** 25 themes rotate, two fresh themes each week starting Nov 16. Thin rows relax the rating floor, then top up with genre-18 dramas. A rotation view appears on the admin page.
- **Changelog:** Every version uses What's new, Bug fixes and Improvements.

## Important decisions
- **Minimal first:** The user wants explanations before code ("do not code yet") and minimal UI.
- **No empty states:** The popular card hides entirely rather than showing a "not enough data" message.
- **Weekly picks stay first:** Popularity rankings never push This week's picks down.
- **Names only for people:** The card shows actor or director names with round photos, without labeling the role.
- **Fresh themes:** Both weekly slots stay fresh each week until enough data exists for popular themes to return.
- **Privacy:** Only daily totals get stored. Codes from yesterday never match today. `personName` and `personPhoto` never go into the install link.
- **GitHub-only tests:** `popularity.test.ts` and `weeklyThemes.test.ts` stay off Val Town because they would write fake rows into the real database.

## Workflow
- **Deploy:** Create a Val Town branch, make targeted edits, check bytes against local files with a temporary `_hashcheck.ts`, run tests, merge, delete the branch, then commit and push to GitHub.
- **Local tests:** `deno run --no-check --allow-read --allow-env --import-map=tests/import_map.json tests/run-tests.ts` (last run: 195 PASS across 21 suites). Release scan: `node tests/audit-release.mjs`.
- **Known quirks:** The container cannot reach `api.val.town` for uploads. `run_file` sometimes times out, so retry. Branch endpoints use a different origin.

## Current status
- **No active problem:** 1.1.0 runs live and merged.
- **Cost:** The user asked for cheaper models on routine tasks and `/compact` after each logical step.

## Open ideas (not requested yet)
- **EasyPosters:** Consider removing it after 30 days of analytics data.
- **Returning themes:** Let popular weekly themes return once enough data exists.
- **Roadmap:** RPDB poster layouts remain listed.
