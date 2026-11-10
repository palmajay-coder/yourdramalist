# YourDramaList privacy and credentials

This document describes the YourDramaList source in this directory. It does not describe the older root application. It is an implementation description, not a promise that hosting or third-party providers retain no logs.

## Browser storage

The app saves theme, selected catalogs, non-secret preference switches, badge choices and the optional connected MDL username in localStorage. Provider API keys remain in form/closure memory and are not saved to localStorage or sessionStorage by the YourDramaList application. Reloading requires entering them again when poster ratings are enabled.

Selections may include list titles, public list URLs and creator identifiers. Other code running on the same origin, browser extensions, browser sync/backup facilities and people with access to the browser profile may have access to browser data.

## Install links

Confirm sends selected catalog identities/names, optional MDL username, preferences and (only for enabled poster ratings) provider keys to the same-origin `/api/addon/configure` endpoint over HTTPS. The server returns a URL containing an AES-GCM encrypted configuration. It does not put user configurations or API keys in an application database.

**Keys are retained encrypted inside the install link.** The user, Nuvio, clipboard tools, backups, browser history and hosting/proxy request logs may retain that URL. The running server can decrypt it using its deployment-specific `YDL_MANIFEST_SECRET`, so anyone holding the link can use the configured add-on. Encryption does not make it safe to publish or share the URL. Links do not currently have an expiry or individual revocation control.

To disable compromised provider credentials, revoke/rotate them at TMDB/MDBList. Replacing the deployment encryption secret invalidates all old configuration links, not only one user's link.

## BetterPosters

If selected, the BetterPosters URL pattern is kept in the setup page until Confirm sends it to the same-origin configuration endpoint. It is encrypted in the install link and is not saved to browser storage or diagnostic logs. Catalog responses include the rendered poster URL so Nuvio can request the image from BetterPosters. The provider receives the IMDb title ID and any options included in the pattern.

## Diagnostic codes

When manifest setup or a poster check fails, YourDramaList shows a diagnostic code. The site keeps an error record with the code, timestamp, fixed failure category and, for poster checks, the provider name, both in the Val Town logs and in a site database. Error records contain no username, selected catalogs, provider keys, poster URL patterns, or install URL. Database records are deleted after 30 days (at most 5,000 are kept), and only the site owner can view them on the admin page. You can share the code when reporting a problem.

## Usage statistics

YourDramaList counts how many people use the site and which features they choose, only for research and to decide what to improve.

- **What is counted:** Each day, how many different devices create an install link, which built-in catalogs and features those links include, which kinds of lists people add from search, and whether the device is mobile (phone or tablet) or a computer.
- **What is never stored:** IP addresses, names, MyDramaList usernames, search text, list URLs, API keys, poster URL patterns or install links.
- **How counting works:** The visitor's network address and browser name are combined with a random secret and scrambled with SHA-256. The secret is replaced at the start of each month and the old one deleted, so a code cannot be worked back to an address or linked to the next month. Each code is stored with the day and the category it chose, so each person counts once over a 7 or 30 day range and returning visitors can be counted.
- **Retention:** Scrambled codes are deleted after 35 days. Daily totals (setup and poster check errors, Popular this month and weekly picks people per week) are kept for 180 days. Days follow the America/Los_Angeles calendar.
- **Access:** Only the site owner can view the dashboard. Nothing is sold, shared with advertisers or used to track people across other websites.

The same counts, along with an actor's or director's public MyDramaList name and photo link, power the Popular this month list on the Discover tab.

Val Town may separately process request information to host and secure the service. This analytics dashboard does not include or replace hosting-platform request logs.

## Providers

| Service | What the implementation sends/uses |
| --- | --- |
| MyDramaList | Public searches, title/person/list pages and public username/watchlist lookups |
| Kuryana | Public MDL search/title/review lookups and fallback metadata |
| Original profile/avatar service | Public username used to read profile lists and avatars |
| Cinemeta / inherited matching services | Public title metadata and IMDb matching; inspect `addonScrape.ts` and `addonCore.ts` for exact endpoints |
| ERDB | User-supplied TMDB/MDBList keys and requested IMDb title/rating sources to render rating posters; ERDB in turn uses its provider integrations |
| TMDB | Deployment owner's configured key for poster-wall artwork and inherited IMDb-matching fallback; a visitor's supplied TMDB key can be used for their catalog matching and ERDB rating posters |
| Google Fonts / image hosts | Browser requests for fonts and artwork; providers receive normal network request information |
| Val Town / hosting infrastructure | App requests, encrypted install URLs, server memory, configured secrets and platform-managed OAuth sessions |

The app never requests an MDL password. Only owner wallpaper administration uses Val Town sign-in. YourDramaList does not use AI to rewrite drama synopses, biographies or reviews; fixtures and sample previews are not live data.

## Server persistence and logging

Public metadata, posters/background lists, owner information and wallpaper settings are cached in Val-scoped blob storage. This means the statement **“YDL has no server storage” is not correct for YourDramaList**. Cache lifetimes and per-runtime request limits are defined in the corresponding API modules. User keys are not intentionally written to these persistent caches by the configuration/preview handlers.

Configurations and API responses use `no-store` where appropriate. Poster proxies keep raw keys out of the public poster URLs returned to Nuvio. The application does not intentionally log keys/request bodies, but operators and infrastructure providers may retain request logs. No blanket guarantee is made about provider-side logging, request retention or all future platform behavior.

Report suspected leaks privately through [SECURITY.md](../SECURITY.md). Never submit a real API key or full personal install link in a public issue.
