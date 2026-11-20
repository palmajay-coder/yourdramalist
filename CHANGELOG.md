# Changelog

## Website updates since 1.1.30

- (Test site) Netflix-style "Top 10 K-Dramas Today" and "Top 10 K-Movies Today" at the very bottom of Discover, with big rank numbers beside the posters. Ranked by TMDB popularity (dramas airing now, films from the last six months), refreshed daily, and available as Nuvio catalogs.
- "Because you watched" rows sit under a "Recommended for you" heading, and now appear as soon as a username is connected (on Connect or by a lookup in Lists), without restarting the app.
- Usage count for Add to Collection: people who tap it (one scrambled code per person per day, like the other counts), shown on the admin page under Search. The privacy page says so.
- "Watch this while they play GTA 6": a limited-time, hand-picked catalog of 20 easy, funny dramas and movies. It is the first list on Discover, under a "Spotlight" heading with a countdown, can be added to Nuvio, and disappears at midnight Pacific on January 1, 2027.
- "Because you watched" rows now hold 30 titles each, topped up from similar titles, shared themes and the same genres and country.
- "Because you watched …": up to three personal rows under Weekly Picks for a connected MyDramaList username, also available as Nuvio catalogs. Built from the watchlist (watching, then completed titles scored 8+) and TMDB recommendations, leaving out anything already on the watchlist. The rows change every Monday.
- Weekly Picks posters rotate every 12 hours (midnight and noon Pacific): each title cycles through up to six of its English and textless TMDB posters, the same for everyone in that window. Opening a title keeps the poster it showed on the shelf. Nuvio catalogs keep one poster.
- Search shows the YourDramaList bear while results load: "Searching for" your search, with three blue dots. It fades in only if a search takes a moment, gives way to results, "No matches" or an error, and stays still for people who prefer reduced motion. It is reusable for other loading states (`loadingBear.ts`).

## 1.1.30

### What's new

- Made built in background color match animation background color.

### Also

- A quiet release: the app shows no update notice for it to people on 1.1.29. Apps older than 1.1.29 are still offered the newest version. `ANDROID_REMIND_BELOW` in `androidRelease.ts` controls this.
- Since 1.1.29 (website only): the tint slider scales all the Connect darkening, the app uses the landscape layout, actor and director titles open full details, Reddit and other in-app browsers no longer see the update popup, and Nuvio filmography catalogs keep TMDB ids distinct and hide finished dramas.

## 1.1.29

### What's new

- A cleaner start: connect your MyDramaList account or continue without one, and the app remembers your choice next time.
- New dramas on the welcome screen: the latest and trending K-dramas glide by in the background.
- A new opening: YDL unfolds into YourDramaList when the app starts.
- A fresh look for titles: a new rounded font for the logo and page titles.

### Also

- Connect has no bottom navigation, so new visitors finish it before the other pages open. Visitors who already have saved collections or a selection go straight in.
- The welcome background uses TMDB backdrops (with title art when available) from this week's trending and newly aired Korean dramas, refreshed daily. The admin tint still applies.
- The opening plays once per fresh app open, only in the Android app; tap to skip. Phones set to reduce motion get a short fade.

## 1.1.28

### What's new

- Search from anywhere: tap the green + to find dramas, movies, actors, and directors, closest match first. Recent searches are saved. Discover is now curated picks only.
- Full details everywhere: tap any drama or movie for its story, cast, reviews, and Add to Collection. Tap an actor or director to see their titles.
- Cleaner buttons: blue Add and green Added everywhere, a simpler Add to Collection sheet, and a red × to delete a collection.
- Smoother app: screens slide, sheets rise, posters fade in, and the tab highlight glides. Reduced motion on your phone turns these off.
- Compact page headers, and a clean title screen on Connect.

### Also

- The admin page's Connect background section sets the tint color and strength over the moving posters, with a live preview (released early as a website update).
- Weekly Picks and country-shelf titles are matched to MyDramaList for the full preview. Without a match, the preview shows TMDB info and no Add to Collection.

## 1.1.27

### Improvements

- Discover title results use a compact blue **Add** button. Titles already saved in one of your collections show a green **Added** button. Both open the collection picker with your saved collections checked.
- A button turns green only after the save succeeds and turns blue again once the title leaves its last collection. Canceling, or a save that fails, leaves the button as it was.
- The title preview keeps the blue **Add to Collection** button next to **Open in MyDramaList** and shows a green **Added** once the title is saved.
- **Weekly Picks** and the country shelves keep **Add** and **Added** and still add or remove the whole shelf in **Your Selection**.
- The buttons show a plus or check icon, a visible keyboard focus ring, and a touch target at least 44 px tall.

### Website update (no app download)

- Community, Discover, and My Collections show their page name in a compact header with the icons on the right. Connect has no header bar and shows a large, centered **YourDramaList** title over the posters. The app picks this up from the website, so no new APK is needed.

## 1.1.26

- The Android app with the 1.1.25 features, signed with the permanent YourDramaList key. It installs over 1.1.25 as an update.
- The website version badge matches the app, and the GitHub release notes list the same features as the app's **What’s new** dialog.

## 1.1.25

### What’s new

- Discover now searches drama and movie titles, actors, and directors in one bar. Title results show a compact poster and name, with **+ Add to Collection** beside them. Tap a title for its details.
- Title previews show a TMDB backdrop, logo, and poster when available, plus the story, cast, release details, MyDramaList rating, and reviews with the current review count. The blue **Add to Collection** action sits next to **Open in MyDramaList**.
- **My Collections** lets you build custom catalogs from individual titles. Review your collections as poster cards with title counts, add a whole collection to **Your Selection**, or delete it from its card menu.
- From search results or a title preview, use the collection picker to add to several collections, remove existing memberships, or create a new collection starting with that title. The picker shows pending changes before you save.
- Install personal collections in Nuvio, alone or alongside other catalogs. Later title edits sync through the same install link. Removing a catalog on the **Confirmation** page keeps the original collection intact.

### Improvements

- Navigation now goes **Connect → Community → Discover → My Collections**. Connecting with a MyDramaList username opens Community and loads that user’s lists. Continuing without an account opens Discover.
- The collection picker uses a bottom sheet on mobile, with a title preview, scrollable rows, and a dedicated Save bar. The delete confirmation uses a compact dark dialog with a solid red action.
- Android shows a brief **What’s new** dialog on the first launch after an in-place update to 1.1.25.
- A notice in the app offers the newest APK when an update is available. The Android release workflow signs new releases with the permanent YourDramaList key.

### Android upgrade

- Moving from 1.1.24 or earlier requires a one-time reinstall because those APKs used a different key. Releases signed with the permanent key can update in place and preserve app data.

## 1.1.24

- The Android launcher now displays **YourDramaList**.
- Desktop and landscape browsers now use the available width for poster rows and catalog grids. Connect, Discover, and Community stay in the bottom navigation.
- The selection icon in the top bar opens selected catalogs and **Build add-on**. Rotating a phone in the browser preserves the active tab, filters, and selections.
- The [website](https://yourdramalist.net/) replaces the retired mobile test site. See the [release notes](RELEASE_NOTES.md) for Android installation and Nuvio setup.

### Bug fixes

- Nuvio catalogs from a longer watchlist could show only some of the titles, and some with blank posters. Title lookups that failed (for example when the site ran out of outside requests) were remembered for six hours as "no match". Failed lookups are now tried again on the next load, and each title's match is saved for 30 days, so a title is looked up once instead of on every load.
- Titles with an IMDb listing but no usable poster there, mostly new and upcoming dramas, showed as blank cards in Nuvio. The site now looks the title up on TMDB by name and year and uses that poster.
- Titles with no IMDb listing yet (mostly announced 2027 dramas) are now included in Nuvio catalogs, using a MyDramaList based id, with a poster from TMDB or MyDramaList and details from MyDramaList. This is an experiment: Nuvio is built around IMDb ids, so tapping one of these titles may behave differently. Reinstall the add-on to get the details support. The MyDramaList poster fallback also never worked before and does now.

### Known bugs

- Watchlists on MyDramaList's V2 beta layout do not load by username. If a list page on MyDramaList shows a **Switch to V1** link, choose it and load the username again. The site now says this when it happens. Lists added by pasted link, and Discover, are not affected. A fix depends on the data service (Kuryana) learning to read V2 pages.

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
