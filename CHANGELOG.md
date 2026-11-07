# Changelog

## 1.0.0-beta.2

- Five-poster country shelves under “More from MyDramaList,” with title previews and Add/Remove controls.
- Two weekly TMDB collections per country; stable install slots rotate themes Mondays at 00:00 UTC.
- Server-side API key, bounded persistent cache, recent-repeat reduction and provider cooldowns.
- Strict title/year artwork matching with MDL fallback; MDL catalog order is preserved.
- Removed visible website version badges; version information remains here and in manifest metadata.
- Weekly completed-title filtering uses exact normalized title/year matches; alternate names may not match.


## 1.0.0-beta.1 — 2026-11-06

First public beta of the main YourDramaList app. The site displays **V.1.0.0 BETA**; the add-on manifest uses `1.0.0-beta.1`. Earlier development builds used the internal 3.0.0 numbering.

- Promoted the current application to the repository root; preserved the original app in `legacy/`.
- Drama discovery, public lists, direct list links, actor/director filmographies and country catalogs.
- Original MDL ratings, viewer verdicts and helpful reviews.
- Optional poster-rating keys, badge previews and title filters.
- Generated encrypted manifest URLs, Copy and Install in Nuvio.
- Featured banner, light/dark themes, moving TMDB poster background and owner wallpaper settings.
- Clear selection, persistent selections and consistent selection wording.
- Bounded drama search, five-minute result caching and a floating retry notification matching the original site.
- Classic Blue 256×256 icon, public documentation and offline tests.

Existing storage keys, encryption context and add-on identifiers are retained for compatibility. GitHub publication does not automatically deploy the live app.

See [beta notes](BETA_NOTES.md) for verification and data limitations. Recommendations and video backgrounds remain deferred.
