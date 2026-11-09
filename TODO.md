# To-do

Open items for YourDramaList, newest first. Move an item to the changelog when it ships.

## Fixes

- [ ] **Empty "Upcoming Movies (Taiwan)" row.** The catalog loads without errors but shows 0 titles. Upcoming movies often have no IMDb page yet, and the add-on drops titles without an IMDb match. Check whether other "Upcoming" rows have the same problem, then decide whether to show these titles another way or hide rows that come back empty.
- [ ] **Set `OAUTH_STATE_ENCRYPTION_KEY` on Val Town.** The logs warn that this variable has no value. It protects the admin sign-in.
  👉 Add OAUTH_STATE_ENCRYPTION_KEY here: https://www.val.town/x/Niwa710/YourDramaList/environment-variables?key=OAUTH_STATE_ENCRYPTION_KEY
- [ ] **Catalog limit notice title.** When someone hits the 60-catalog limit, the pop-up's heading reads "Please wait," which doesn't fit. Give limit messages their own heading.

## Improvements

- [ ] **Smoother loading for large setups.** The add-on serves 4 catalog requests at a time and answers extras with a "busy" error, so rows past the first screen fill in only after scrolling. A short wait queue would let them load on the first pass.
- [ ] **More than 60 catalogs (optional).** Install links can't grow past about 14,500 characters on Val Town. Compressing the setup before encrypting it could fit around 100 catalogs without storing anything on the server. Old install links would need to keep working.

## Housekeeping

- [ ] **Keep GitHub and Val Town in sync.** After each release, compare the two (see `matchesProduction` in `SOURCE_SNAPSHOT.json`) so GitHub doesn't fall behind again.
- [ ] **Clean up old Val Town files.** `main.ts` is empty, and several probe, check and preview files (`*.probe.ts`, `*.liveProbe.ts`, `tmdb-*-check.ts`, `*Preview.ts`) look like one-time experiments. Remove the ones that aren't needed.
- [ ] **Request-level tests on Val Town.** The Val Town copy of `addon.test.ts` skips the request checks because running them there would write test counts into the real analytics. Add a test-only analytics switch so both copies can run the same tests.
