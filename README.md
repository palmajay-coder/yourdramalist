> **YourDramaList V3 public beta:** [Source, setup and limitations](./v3/README.md) · [Privacy](./v3/PRIVACY.md) · [Security reporting](./SECURITY.md) · [V3 MIT license](./v3/LICENSE)
>
> The files at the repository root below belong to the original app. V3 is published separately in `v3/`; the privacy and feature descriptions below apply to the original version, not the V3 beta.

# YourDramaList (YDL)

An unofficial [MyDramaList](https://mydramalist.com) addon for [Nuvio](https://nuvio.app) and Stremio. YDL brings your MyDramaList lists, watchlists, ratings, and reviews straight into your streaming app, with optional custom posters and rating overlays for anyone who wants them.

**Live site:** https://yourdramalist.val.run

> This is a hobby project, maintained solo. It is not affiliated with, endorsed by, or associated with MyDramaList, Nuvio, or Stremio in any way.

---

## What it does

YDL turns your MyDramaList account, or any public list/contributor on the site, into a set of catalogs you can browse inside Nuvio or Stremio: your watchlists, a contributor's curated lists, an actor's full filmography, MDL's own trending lists, and more. Everything is configured through a simple setup page, no coding or manual JSON editing required, and the whole thing works whether or not you ever connect your actual MDL account.

## Install

1. Open [yourdramalist.val.run](https://yourdramalist.val.run).
2. Add a TMDB/MDBList key and your MyDramaList username, or skip both and go straight to Discover.
3. Add whatever catalogs you want (trending lists, a contributor's lists, your watchlists, quick lists) and set your display options.
4. Hit **Generate & Install** to get your personal manifest link.
5. Paste that link into Nuvio or Stremio's Add-ons tab.

## Features

### Get Started page
- **Optional API keys.** TMDB and MDBList keys are only needed if you want custom posters with rating overlays; the addon works fully without either one.
- **One-click key verification.** Paste a key and hit Continue; YDL checks it against the provider before saving it into your install link.
- **Connect your MyDramaList account** by username only, no password required, used to pull your personal watchlists/ratings if you want them.
- **Skip for now** link for anyone who just wants to browse community lists without any setup at all, taking you straight to Discover.
- **Custom wallpaper.** Upload your own image or paste an image URL for the hero background behind the setup card, or remove it to go back to the default.
- **Dark mode toggle**, available from the very first screen.
- **Privacy note** explaining that API keys are never stored anywhere except your own personal install link and browser.

### Discover page
- A single unified screen (no tabs to dig through) for finding lists worth adding before you even reach the main app.
- **Search lists** by keyword across MyDramaList's entire community list catalog.
- **Top Contributors** chips underneath the search bar; click one to browse that contributor's full collection of public lists.
- **Add all** button per contributor, adding every one of their lists as catalogs in one click, with a visible green highlight on every row that was added and a status message confirming how many.
- Individual list rows can also be clicked one at a time, same visual confirmation.

### Main app header
- **Featured Voting List banner**, mirroring whatever MyDramaList itself is currently spotlighting on its own homepage, with poster art and a short description.
- Version badge, dark mode toggle, and the same wallpaper customization control as the Get Started page.

### Catalogs tab
- **Trending Lists**, three community lists pulled live from MyDramaList's own trending section, each showing a poster fan, the list's title, and its title/loves counts.
- **Unified search bar** that accepts a pasted MyDramaList link or a typed query, searching dramas, movies, actors, directors, community lists, and contributors all at once, with results grouped into sections in a live dropdown.
- **Person results show native-script names** alongside the English name (for example, "Son Ye Jin (손예진)"), pulled from each actor's own MDL profile.
- **Hover preview cards** (desktop only): hovering a drama result shows its rating, watcher count, and review count; hovering a person shows a short AI-summarized bio; hovering a list shows its metadata, all without leaving the search dropdown.
- **Quick lists** shortcuts: filter by country (All, South Korea, China, Japan, Taiwan, Thailand) and one-click add buttons for Top Airing, Newest Shows, Most Popular Shows, Top Shows, Top Movies, and Variety Shows.
- **Catalog management**: drag to reorder, an on/off toggle per catalog, a remove button, and a "sort by highest rated" option on anything that isn't already a manually-curated list (watchlists, filmographies, recommendations, and explore-page categories all support it).
- Catalog list stays inside a fixed-height, scrollable card no matter how many catalogs you add, so the page layout never stretches.

### Display tab
- **Show MyDramaList reviews**, adding a reviews tab in the player with the most helpful community reviews surfaced first.
- **Custom posters with ratings**, powered by ERDB, overlaying IMDb, Rotten Tomatoes, and Letterboxd scores onto poster art (requires both API keys).
- **Hide unreleased dramas**, filtering out anything that hasn't aired yet.
- **Hide shows I've completed**, leaving titles already in your Completed and Dropped lists out of your catalogs (only shown once an MDL account is connected).

### Summary & install
- Live tile summary showing your catalog count and whether reviews/posters are currently on or off.
- **Generate & Install** button that builds your personal manifest link reflecting every catalog and setting you've configured.
- **Edit API keys** link to jump straight back to the setup page.

## Privacy

YDL has no database. Your API keys and settings live only in your generated install link and your own browser's local storage; nothing is stored on the server side, except that keys are passed through to ERDB when custom posters are turned on, purely to generate the poster artwork itself. Separately, when you hover a person in search results, their public MDL biography text (not any of your personal data) is sent to Google's Gemini API to generate the short summary shown in that preview card, using the site's own server-side key rather than anything tied to you.

## Tech

Built and hosted on [Val Town](https://val.town), scraping MyDramaList (with a Kuryana API fallback) and calling the TMDB and MDBList APIs for poster/rating enrichment when enabled. The actor bio shown in the search dropdown's hover preview is summarized down to two or three sentences by Google's Gemini API (`gemini-3.5-flash-lite`), using a server-side key that's never exposed to visitors; summaries are cached per person for a week, so most hovers across every visitor never trigger a new Gemini call at all, and the feature falls back to a plain excerpt of the bio if the key is missing or the call fails.

## Issues & feedback

Found a bug, or have a feature you'd like to see? Open an [issue](../../issues) describing what happened and, if you can, the catalog or search query that triggered it.

This repository exists mainly for transparency (so anyone handing over API keys can see exactly what the code does with them) and as a backup of the project's history. It's maintained solo, so please don't open pull requests; use Issues for bug reports and feature requests instead.

## Credits

Created and maintained by [Jay (palmajay-coder)](https://github.com/palmajay-coder).

Development assistance from **OpenAI Codex**.
