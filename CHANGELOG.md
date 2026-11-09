# Changelog

## 1.0.9

### What’s new

- Raised the catalog limit from 40 to 60. You can now add up to 60 catalogs to a single Nuvio install.

### Fixes and improvements

- Fixed an issue where adding more than 40 catalogs from Discover or the weekly picks would fail at the last step with an "Unable to prepare your manifest" error. The site now stops you at 60 and lets you know right away.
- The Confirm page now tells you how many catalogs to remove if your selection goes over the limit.
- Manifest errors now explain what to change when a setup has too many catalogs or makes an install link that is too long.

## 1.0.8

### What’s new

- Swapped trending lists with seasonal lists. Featured lists will now curate based on the current season. Fall will have fall themed watchlists, winter will have winter themed etc.
- Added dynamic themes to website. The site will now automatically change color themes based on what season it is. November will be fall colors, winter will be winter colors, spring will be green etc.

## 1.0.7

### What’s new

- Added RPDB as a poster style. Enter and verify an API key, then preview the RPDB poster.

## 1.0.6

### Fixes and improvements

- Fixed a issue where manifest url for Posters+ was not working for https://postersplus.stremio.ru/

## 1.0.5

- Add a TMDB language preference so catalog rows can match the language selected in Nuvio.
- Apply the selected language to TMDB catalog metadata requests and keep cached results separate by language.
- Localize generated weekly catalog names and country labels with the selected TMDB language.
- Localize generated Explore, country, watchlist, and filmography catalog names too; keep user-authored MyDramaList list names unchanged.

## 1.0.4

- Restore the 1.0.3 metadata choices: MyDramaList, or TMDB with MyDramaList filling in missing details.

## 1.0.3

- Let users import watchlists and organized watchlists and personal lists into their own tabs.
- Added a Select all button to add all catalogs at once.
- Added poster ratings toggle and put BetterPosters into it's own tab.
- Prefer TMDB artwork for standard posters when an IMDb match provides it for to solve blurry and low-res poster issues.
- Added a Metadata sections for users to choose MyDramaList as their metadata provider or TMDB (i.e localization). TMDB will fall back to MyDramaList when metadata is missing.

## 1.0.2

- Fix manifest issue for built-in user watchlists. 
- Add BetterPosters as an optional artwork provider for YDL catalogs. Paste a BetterPosters poster URL pattern in Preferences and generate a new install link.

## 1.0.1

- Show a diagnostic code when the server rejects a manifest request. The matching server log records only the code, time, and failure category.
- Show a separate connection message when the browser cannot reach the server.

## 1.0.0

First stable release of YourDramaList.

- Browse country catalogs and weekly collections, and add actor and director filmographies.
- Cycle through Featured, Recent Activity and Trending lists in the setup banner. The banner refreshes at midnight Pacific, and weekly collections refresh on Mondays at midnight Pacific.

See [beta notes](BETA_NOTES.md) for verification and data limitations. Recommendations and video backgrounds remain deferred.
