# Changelog

## 1.0.9

### What’s new

- Raised the catalog limit from 40 to 60. You can now add up to 60 catalogs to a single Nuvio install.
- Community lists and watchlists now show as shelves, the same rows of posters you see on the Discover tab. Drama-related lists use shelves too. Tap any poster to see its details.
- Added filters to watchlist and custom list shelves. Pick Dramas or Movies, then filter by country, release year and genre, and sort by newest, oldest or A–Z. Your full list of every drama and film stays complete, so it has no filters. The shelf updates as you pick, so you see exactly what will show up in Nuvio before you add it.
- A filtered shelf adds to Nuvio as its own catalog with the filter in its name, for example "Sample’s Completed: Korean Romance Dramas". You can add the same list more than once with different filters.
- Genres come from TMDB. Romance, Thriller, Horror and Historical are filled in from TMDB's tags for dramas, since TMDB's TV genres leave them out.
- Added an Errors section to the admin page. Paste a diagnostic code a user sends you to see what went wrong and how to fix it. Setup and poster check errors now live in one place, with a guide to every error type and a "Needs your attention" alert for errors only the site owner can fix.

### Bug fixes

- Fixed watchlist shelves showing blank tiles instead of posters. MyDramaList watchlists don't include artwork, so watchlist posters now come from TMDB.
- Fixed an issue where some older movies opened the wrong title in Nuvio when an upcoming movie shared the same name (for example Pulse (2001), City on Fire (1987) and From Me to You (2010)). Titles now match the release year from MyDramaList, and TMDB is checked when the years disagree.
- Fixed an issue where adding more than 40 catalogs from Discover or the weekly picks would fail at the last step with an "Unable to prepare your manifest" error. The site now stops you at 60 and lets you know right away.
- Catalog rows further down your Nuvio home screen now load on the first pass instead of waiting until you scroll to them.

### Improvements

- The Confirm page now tells you how many catalogs to remove if your selection goes over the limit.
- Manifest errors now explain what to change when a setup has too many catalogs or makes an install link that is too long.
- The catalog limit pop-up now has its own heading ("Catalog limit reached") instead of "Please wait."
- Error records are now kept for 30 days so codes can be looked up later. The privacy page explains what an error record contains.

## 1.0.8

### What’s new

- Swapped trending lists with seasonal lists. Featured lists will now curate based on the current season. Fall will have fall themed watchlists, winter will have winter themed etc.
- Added dynamic themes to website. The site will now automatically change color themes based on what season it is. November will be fall colors, winter will be winter colors, spring will be green etc.

## 1.0.7

### What’s new

- Added RPDB as a poster style. Enter and verify an API key, then preview the RPDB poster.

## 1.0.6

### Bug fixes

- Fixed a issue where manifest url for Posters+ was not working for https://postersplus.stremio.ru/

## 1.0.5

### What’s new

- Add a TMDB language preference so catalog rows can match the language selected in Nuvio.
- Apply the selected language to TMDB catalog metadata requests and keep cached results separate by language.
- Localize generated weekly catalog names and country labels with the selected TMDB language.
- Localize generated Explore, country, watchlist, and filmography catalog names too; keep user-authored MyDramaList list names unchanged.

## 1.0.4

### Bug fixes

- Restore the 1.0.3 metadata choices: MyDramaList, or TMDB with MyDramaList filling in missing details.

## 1.0.3

### What’s new

- Let users import watchlists and organized watchlists and personal lists into their own tabs.
- Added a Select all button to add all catalogs at once.
- Added poster ratings toggle and put BetterPosters into it's own tab.
- Added a Metadata sections for users to choose MyDramaList as their metadata provider or TMDB (i.e localization). TMDB will fall back to MyDramaList when metadata is missing.

### Improvements

- Prefer TMDB artwork for standard posters when an IMDb match provides it for to solve blurry and low-res poster issues.

## 1.0.2

### What’s new

- Add BetterPosters as an optional artwork provider for YDL catalogs. Paste a BetterPosters poster URL pattern in Preferences and generate a new install link.

### Bug fixes

- Fix manifest issue for built-in user watchlists.

## 1.0.1

### Improvements

- Show a diagnostic code when the server rejects a manifest request. The matching server log records only the code, time, and failure category.
- Show a separate connection message when the browser cannot reach the server.

## 1.0.0

First stable release of YourDramaList.

### What’s new

- Browse country catalogs and weekly collections, and add actor and director filmographies.
- Cycle through Featured, Recent Activity and Trending lists in the setup banner. The banner refreshes at midnight Pacific, and weekly collections refresh on Mondays at midnight Pacific.

See [beta notes](BETA_NOTES.md) for verification and data limitations. Recommendations and video backgrounds remain deferred.
