# Attribution and license scope

The [MIT license](LICENSE) covers the original V3 software and documentation in this directory. It does not grant rights in third-party services, trademarks, title artwork, screenshots, biographies, synopses or reviews. The older app at the repository root is not relicensed by this directory's license.

- **MyDramaList** supplies public title/person/list metadata and original editorial/user text. The app preserves source text rather than AI rewriting it. MyDramaList is not a sponsor or affiliate.
- **TMDB** supplies poster-wall artwork and supports metadata matching. This product uses the TMDB API but is not endorsed or certified by TMDB. Artwork belongs to its respective rights holders. The production UI includes a TMDB credit.
- **MDBList**, **ERDB**, **Kuryana** and **Cinemeta/Stremio** provide rating artwork, public metadata/fallbacks or matching services. Their own terms apply. Review their current documentation before operating your own instance.
- **Val Town std** provides platform utilities, OAuth and Val-scoped blob storage. See its upstream package/source notices.
- **Cheerio**, **Acorn**, **LinkeDOM**, **Hono** (where imported through platform utilities), and other transitive packages retain their upstream licenses. Dependencies are imported rather than vendored here; inspect exact imports for versions.
- **Lato**, loaded through Google Fonts, is a third-party font. Its font distribution retains its own license.
- `reviewPreviewImage.ts` embeds a user-supplied Nuvio screenshot for an illustrative preview. The screenshot includes third-party interface/content/artwork; it is not offered under the code's MIT license. `text.ts` includes the corresponding attributed review excerpt for that example.
- The selected YDL icon in `addonIcon.ts` was created for this project using the built-in image-generation tool. It is distinct from the MDL/Viki/Kocowa marks that inspired the initial design discussion.

The public test fixtures are small, synthetic MDL-shaped documents. Their example names, statistics and URLs are parser test data, not a live data feed. Full saved browser pages, browser tokens and personal install URLs are not part of this release.
