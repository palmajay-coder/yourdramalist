# YourDramaList known limitations

- Live ERDB output with a valid user TMDB/MDBList pair remains unverified. The Preferences page labels its credential-free poster sample **Illustrative preview**; those sample scores are not asserted as current Parasite ratings.
- The inherited mapper omits MDL titles without a reliable IMDb match or usable poster. Some source filmographies/catalogs therefore return fewer titles.
- Hide unreleased currently filters by **year**, not exact date. Future releases within the current year may remain visible. Completed/dropped filtering depends on MDL watchlist availability.
- MDL/Kuryana restrictions, service changes or rate limits may interrupt metadata/reviews. Caches and retryable failures are implemented; missing live data is not replaced by fixture content.
- Profile/avatar lookups currently depend on the original owner's read-only profile service. A fully standalone replacement remains future work.
- Setup selections, username, theme and non-secret preferences are saved in the browser. Provider keys must be re-entered after a full reload.
- Public titles/biographies are sourced from MDL, artwork from the providers credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This software license does not license third-party content.
- Recommendations and video backgrounds are not part of this release.

- Drama search reuses results for five minutes (up to 100 cached searches), coalesces identical requests, allows three simultaneous upstream lookups and 30 uncached lookups per minute per running server instance, and honours short MDL cooldowns. These are per-runtime safeguards, not a distributed or per-person traffic quota.

- Weekly collections use TMDB keywords/genres and country filters, rather than personal recommendations. They rotate as two shared themes on Mondays at 00:00 UTC. Sparse metadata can produce shorter collections; mood classification is approximate. MDL country catalogs retain MDL order and sources.
- Version badges are hidden on the website. Current source/manifest version: `1.1.1`.
