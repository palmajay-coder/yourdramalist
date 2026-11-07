# Changelog

## 1.0.5

- Add a TMDB language preference so catalog rows can match the language selected in Nuvio.
- Apply the selected language to TMDB catalog metadata requests and keep cached results separate by language.
- Localize generated Explore, country, watchlist, and filmography catalog names; keep user-authored MyDramaList list titles unchanged.

## 1.0.4

- Revamped the Poster settings in Preferences to include drop downs list of different providers (i.e TMDB Posters (Default), Easy Posters, Better Posters. more providers to come.) 

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
