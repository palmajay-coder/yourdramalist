# YourDramaList V3 — public beta

An unofficial, free MyDramaList catalog add-on for Nuvio. This directory contains the V3 application source, tests and documentation. The original app remains at the repository root and has a different setup flow.

**[Open the V3 beta](https://niwa710--b3275342d95911f1bbef1607ee4eb77e.web.val.run/)** · **[Privacy](PRIVACY.md)** · **[Self-hosting](DEPLOYMENT.md)** · **[Security reports](../SECURITY.md)** · **[MIT license](LICENSE)**

YourDramaList is not affiliated with or endorsed by MyDramaList, Nuvio, Stremio, TMDB, MDBList or ERDB. Open source makes the implementation inspectable; it is not a security certification.

## Use the beta

1. Open the V3 beta and choose Get Started.
2. Enter a MyDramaList username, or continue without an account. No MDL password is requested.
3. Select public lists, discover titles/people, or choose a country catalog.
4. Choose Preferences. TMDB and MDBList keys are **optional** and required only for poster ratings.
5. Confirm your choices. The Manifest URL is generated automatically. Copy it into Nuvio, or use Install in Nuvio on a device that supports the original `stremio://` handoff.

Do not share personal install links or paste keys into GitHub issues. With poster ratings enabled, provider keys are encrypted into the install URL, and the server uses them with ERDB. The full data flow and storage details are in [PRIVACY.md](PRIVACY.md).

## Included

- Drama discovery with original MDL synopsis excerpts, score out of 10 and popularity when available. Missing values are not invented.
- Public profile lists and direct public-list URLs, plus creator details in the shared selection sidebar.
- Actor names with native script and combined drama/movie filmographies, newest year first.
- Director filmographies using the exact **Screenwriter & Director** sections; separate Screenwriter-only and Director-only sections are excluded.
- Country catalogs for Top/Popular/Newest/Upcoming shows and movies, Top Airing and Variety Shows.
- Centered Preferences with review examples, optional key inputs, independent Letterboxd/Rotten Tomatoes/IMDb badge toggles and title filters.
- Automatically generated encrypted manifest URLs, Copy and full-width Install in Nuvio action.
- Original MDL-lists rating card, viewer verdict and up to five helpful reviews, including the original spoiler handling. No AI review rewriting.
- Light/dark themes, shared selections, featured-list heading banner and optional TMDB poster-wall background.
- Owner-only wallpaper administration; see the deployment-specific owner restriction before self-hosting.

## Beta limitations

- Manifest/catalog endpoints and a live Goblin review stream were verified. Actual installation and playback inside Nuvio have not been verified in this release review.
- Live ERDB output with a valid user TMDB/MDBList pair remains unverified. The Preferences page labels its credential-free poster sample **Illustrative preview**; those sample scores are not asserted as current Parasite ratings.
- The inherited mapper omits MDL titles without a reliable IMDb match or usable poster. Some source filmographies/catalogs therefore return fewer titles.
- Hide unreleased currently filters by **year**, not exact date. Future releases within the current year may remain visible. Completed/dropped filtering depends on MDL watchlist availability.
- MDL/Kuryana restrictions, service changes or rate limits may interrupt metadata/reviews. Caches and retryable failures are implemented; missing live data is not replaced by fixture content.
- Profile/avatar lookups currently depend on the original owner's read-only profile service. A fully standalone replacement remains future work.
- Setup selections, username, theme and non-secret preferences are saved in the browser. Provider keys must be re-entered after a full reload.
- Public titles/biographies are sourced from MDL, artwork from the providers credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This software license does not license third-party content.
- Recommendations and video backgrounds are not part of this beta.

## Development

The production target is Val Town's Deno runtime. `app.ts` is the HTTP entry point; publish this directory's files at a Val's root. [DEPLOYMENT.md](DEPLOYMENT.md) explains required secrets, ownership and source references that must be adapted for a fork.

`text.ts` contains the editable V3 page copy. `addon.ts` serves encrypted configurations and add-on resources. The original rating/verdict/review helpers were ported to `addonCore.ts` and `addonScrape.ts`. V3's people parser remains authoritative for actor/director section selection.

Public tests use synthetic MDL-shaped fixtures in place of full saved browser pages. No fixture is used to fill live results. See [TESTING.md](TESTING.md), [CHANGELOG.md](CHANGELOG.md) and the source snapshot inventory.

For bugs or feature suggestions, open an issue with the V3 version and a minimal reproduction. Remove keys, private URLs and personal data first. This is a solo-maintained hobby project; discuss substantial contributions in an issue before investing in a pull request.
