# Changelog

## 1.0.1

- Show a diagnostic code when the server rejects a manifest request. The matching server log records only the code, time, and failure category.
- Show a separate connection message when the browser cannot reach the server.

## 1.0.0

First stable release of YourDramaList.

- Browse country catalogs and weekly collections, and add actor and director filmographies.
- Cycle through Featured, Recent Activity and Trending lists in the setup banner. The banner refreshes at midnight Pacific, and weekly collections refresh on Mondays at midnight Pacific.

## 1.0.0-beta.3

- Actor/director filmographies use five-poster shelves, arrow navigation, mobile swiping and title details.
- Filmstrip marks actor title counts; Movie Camera marks director counts.
- Matched TMDB w780 artwork is loaded in five-credit batches, with original MDL artwork retained for uncertain matches and provider failures.
- Shared selection controls add the entire filmography and stay synchronized with sidebar removal and Clear selection.
- Actor/director subtitles live in `text.ts`; director copy is “Explore films directed by {name}.”


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
