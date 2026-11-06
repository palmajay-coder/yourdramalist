# V3 beta notes

- Manifest/catalog endpoints and a live Goblin review stream were verified. Actual installation and playback inside Nuvio have not been verified in this release review.
- Live ERDB output with a valid user TMDB/MDBList pair remains unverified. The Preferences page labels its credential-free poster sample **Illustrative preview**; those sample scores are not asserted as current Parasite ratings.
- The inherited mapper omits MDL titles without a reliable IMDb match or usable poster. Some source filmographies/catalogs therefore return fewer titles.
- Hide unreleased currently filters by **year**, not exact date. Future releases within the current year may remain visible. Completed/dropped filtering depends on MDL watchlist availability.
- MDL/Kuryana restrictions, service changes or rate limits may interrupt metadata/reviews. Caches and retryable failures are implemented; missing live data is not replaced by fixture content.
- Profile/avatar lookups currently depend on the original owner's read-only profile service. A fully standalone replacement remains future work.
- Setup selections, username, theme and non-secret preferences are saved in the browser. Provider keys must be re-entered after a full reload.
- Public titles/biographies are sourced from MDL, artwork from the providers credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This software license does not license third-party content.
- Recommendations and video backgrounds are not part of this beta.
