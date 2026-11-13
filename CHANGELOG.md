# Changelog

## 1.1.24 Beta

- The Android launcher now displays **YourDramaList**.
- Desktop and landscape browsers now use the available width for poster rows and catalog grids. Connect, Discover, and Community stay in the bottom navigation.
- The selection icon in the top bar opens selected catalogs and **Build add-on**. Rotating a phone in the browser preserves the active tab, filters, and selections.
- The [current web beta](https://yourdramalist.palmajay.workers.dev/) replaces the retired mobile test site. See the [beta release notes](RELEASE_NOTES.md) for Android installation and Nuvio setup.

## 1.1.3

### Bug fixes

- Filters on the setup page now cover every title in a long list or watchlist. Before, genre lookups that ran out of time were treated as having no genres, so a filtered list of 400 or more titles could show only about 90. Unfinished lookups are now asked for again, two batches run at a time, and the shelf shows "Loading genres" with a count until every title is done.
- A filtered shelf shows every match instead of stopping at 60 posters.
- Watchlists load up to 10 pages, the same as custom lists, instead of stopping at 5.
- Filtered catalogs in Nuvio read genres for up to 1,000 titles instead of 600. Genres looked up on the setup page are saved, so Nuvio can use them right away.

## 1.1.2

### What’s new

- Added a Date added sort for watchlists on the Community tab. It puts the shows you added most recently first, so a new Plan to Watch addition shows up at the top of the catalog in Nuvio.
- The sort menu is now labeled "Sort by".

### Improvements

- Catalog names stay clean. Sorting and release years no longer add text to a catalog’s name; only country, genre and Dramas or Movies do, for example "Plan to Watch: Korean Romance Dramas".
- The admin analytics now count people instead of clicks. Every catalog, feature and search row shows how many different people chose it over 7 or 30 days, with a mobile and computer split and how many people came back. Weekly picks show people per row each week.
- Popular this month shows how many people added each entry instead of how many adds.
- The privacy page explains usage statistics in plain language: what is counted, the scrambled monthly code, how long data is kept and who can see it.

## 1.1.1

First stable release.

### What’s new

- Restyled the MyDramaList cards on a show’s page in Nuvio. The rating shows as five stars with the score and rating count, and a line shows which of your lists the show is on. The verdict fits on one line with an icon, and a new Open on MyDramaList card takes you to the show’s page to add it to a list, rate it or mark it watched. Reviews look the same as before.

### Bug fixes

- Fixed duplicate review cards when more than one YourDramaList link is installed in Nuvio. Only one install now shows the cards for each show.

### Improvements

- The admin Errors section is shorter. One line sums up today, this week and the most common error, and the guide lists only errors that actually happened, each with its latest codes.
- The Preferences tab preview matches the new cards, and the extra Nuvio example picture is gone.

## 1.1.0

### What’s new

- This week’s picks now rotate through 25 themes instead of 6, with two fresh themes every Monday. New themes include Sweet Revenge, First Love, Across Time, Found Family, Swords and Fists, Chasing a Killer, Center Stage and A Table for Two. Every theme runs before any repeats, and a returning theme shows different titles than last time.
- Community lists and watchlists now show as shelves, the same rows of posters you see on the Discover tab. Drama-related lists use shelves too. Tap any poster to see its details.
- Added one filter at the top of the Community tab that narrows every shelf at once. Pick Dramas or Movies, then filter by country, release year and genre, and sort by newest, oldest or A–Z. Watchlists and custom lists each keep their own filter, and your full list of every drama and film hides while a filter is on. The shelves update as you pick, so you see exactly what will show up in Nuvio before you add it.
- A filtered shelf adds to Nuvio as its own catalog with the filter in its name, for example "Sample’s Completed: Korean Romance Dramas". You can add the same list more than once with different filters.
- Genres come from TMDB. Romance, Thriller, Horror and Historical are filled in from TMDB's tags for dramas, since TMDB's TV genres leave them out.
- Added a Popular this month card under Your Selection on the Discover tab. It lists the built-in catalogs and the actors and directors people add most, with a one-tap Add button. It appears once there is enough data.

### Bug fixes

- Fixed watchlist shelves showing blank tiles instead of posters. MyDramaList watchlists don't include artwork, so watchlist posters now come from TMDB.
- Fixed missing or wrong posters for titles with common names such as Midnight (2021) and Time. Poster lookups now search by release year and skip same-name titles from other countries.

### Improvements

- The admin page now counts people, not just install links. Each person is counted once a day without storing their address, and the analytics section is simpler: four headline numbers, a 7 or 30 day switch, Discover catalogs with countries combined, features grouped into tabs, a search breakdown and a people-per-day chart.
- Weekly picks rows for smaller countries such as Taiwan and Thailand are always filled. When a theme has few matches there, the row adds closely related titles and then the country’s best-rated dramas.
- The admin page has a Weekly picks section showing this week’s themes, the coming weeks, past weeks with how many people added each row, and every theme with when it last ran.

## 1.0.9

### What’s new

- Raised the catalog limit from 40 to 60. You can now add up to 60 catalogs to a single Nuvio install.
- Added an Errors section to the admin page. Paste a diagnostic code a user sends you to see what went wrong and how to fix it. Setup and poster check errors now live in one place, with a guide to every error type and a "Needs your attention" alert for errors only the site owner can fix.

### Bug fixes

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

See [beta notes](KNOWN_LIMITATIONS.md) for verification and data limitations. Recommendations and video backgrounds remain deferred.
