import { installCatalogTitlePreview } from "./catalogTitlePreview.ts";
import { installAndroidDiscover } from "./androidDiscoverClient.ts";
import {NOTIFICATION_CSS,installFloatingNotice} from "./notifications.ts";
import {addonIcon} from "./addonIcon.ts";
import {profileWatchlistCards,loadWatchlist} from "./addonScrape.ts";
import {handleAddon} from "./addon.ts";
import {immutableFileUrl,serveImmutableFile} from "https://esm.town/v/std/utils/index.ts";
import {handlePosterPreview} from "./preferencesPreview.ts";
import {pageForPath,MAX_CATALOGS} from "./preferences.ts";
import {handlePosterBackground} from "./posterBackgroundApi.ts";
import {POSTER_SEEDS} from "./posterBackground.ts";
import {installPosterWall,POSTER_WALL_CSS} from "./posterWallClient.ts";
import {oauthMiddleware} from "https://esm.town/v/std/oauth/middleware.ts";
import {handleWallpaper} from "./wallpaperApi.ts";
import {handleExplore} from "./exploreApi.ts";
import {handleCollections} from "./collectionService.ts";
import {COUNTRIES,CATEGORIES,exploreCatalog,userListName} from "./explore.ts";
import {installExploreUI} from "./exploreClient.ts";
import { handlePeople } from './peopleApi.ts';
import { installPeopleUI } from './peopleClient.ts';
import { installCommunityShelves } from './communityShelves.ts';
import { FILTER_COUNTRIES, FILTER_GENRES, shelfCountry, normalizeShelfFilter, applyShelfFilter, shelfFilterLabel, shelfFilterKey, shelfNeedsFacts } from './shelfFilters.ts';
import { handleShelf } from './shelfApi.ts';
import { handleDirectList } from './directListApi.ts';
import { handleListOwner } from './listOwnerApi.ts';
import { synopsisPreview } from './dramaDetails.ts';
import { APP_VERSION, TEXT } from './text.ts';
import { recordCatalogAddition as recordCatalogAdditionRequest } from './analyticsApi.ts';
import { popularity } from './popularity.ts';
import { handleDramaDetails } from './dramaDetailsApi.ts';
import { privacyPage } from './privacyPage.ts';
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>YourDramaList</title><link rel="manifest" href="/site.webmanifest"><link rel="apple-touch-icon" href="/assets/ydl-classic-blue-v1.png"><meta name="theme-color" content="#181818">
<link rel="stylesheet" href="${immutableFileUrl("/preferences.css")}">
<link rel="stylesheet" href="${immutableFileUrl("/catalogShelves.css")}">
<style>
:root{color-scheme:dark;--bg:#101318;--panel:#1b2028;--line:#343b45;--text:#f4f5f8;--muted:#a8b1bd;--accent:#338bd4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,-apple-system,sans-serif}button,input{font:inherit}button{cursor:pointer}header,footer{padding:22px clamp(20px,5vw,70px);display:flex;justify-content:space-between;align-items:center}header strong{letter-spacing:.4px}header small{background:#b72e38;padding:4px 7px;border-radius:4px;margin-left:8px}.shell{max-width:1120px;margin:auto;padding:40px 22px 90px;min-height:70vh}.hero{text-align:center;padding:100px 0}.hero h1{font-size:clamp(40px,7vw,76px);margin:0 0 12px}.hero p,.muted{color:var(--muted)}.primary{background:var(--accent);border:0;color:var(--button-text,#fff);border-radius:8px;padding:13px 20px;font-weight:650}.secondary{background:transparent;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:12px 18px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px}.connect{max-width:620px;margin:50px auto}.connect h1{font-size:42px;margin-bottom:8px}label{display:block;font-weight:650;margin-bottom:10px}input{background:#11161c;border:1px solid var(--line);border-radius:8px;color:var(--text);padding:14px;width:100%}.connect form{display:grid;gap:12px}.or{text-align:center;color:var(--muted);margin:22px}.hidden{display:none!important}.steps{display:flex;gap:18px;color:var(--muted);margin-bottom:30px}.steps .active{color:white}.tabs,.filters{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.tabs button,.filters button{background:transparent;color:var(--muted);border:1px solid var(--line);padding:11px 15px;border-radius:8px}.tabs button.active,.filters button.active{background:#263d51;color:white;border-color:var(--accent)}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px}.searchrow{display:flex;gap:10px}.searchrow button{white-space:nowrap}.notice{margin-top:18px;padding:22px;border:1px dashed var(--line);border-radius:12px;color:var(--muted)}.sidebar{align-self:start;position:sticky;top:22px}.listcard{display:flex;align-items:center;gap:18px;border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0;background:var(--panel)}.listcard input[type=checkbox]{width:20px;height:20px;flex:0 0 20px;accent-color:var(--accent)}.posters{display:flex;flex:0 0 235px;min-width:0}.posters img{width:73px;height:102px;object-fit:cover;border-radius:6px;box-shadow:2px 2px 5px #0008;background:#29313b}.posters img+img{margin-left:-33px}.listinfo{min-width:0;flex:1}.listinfo h3{margin:0 0 6px;color:var(--link);font-size:17px}.listinfo p{color:var(--muted);font-size:13px;line-height:1.5}.stats{display:flex;gap:16px;color:var(--muted);font-size:13px}.selectedItem{display:flex;justify-content:space-between;gap:8px;margin:10px 0}.selectedItem button{background:transparent;border:0;color:#ff9a9a;cursor:pointer}footer{color:var(--muted);font-size:13px}@media(min-width:0){.listcard{flex-wrap:wrap}.posters{flex-basis:100%}.workspace{grid-template-columns:1fr}.sidebar{position:static}.hero{padding:65px 0}.searchrow{flex-wrap:wrap}.searchrow button{width:100%}}
:root{--input:#11161c;--link:#4ba4ed;--tab:#263d51}body{transition:background .15s,color .15s}input{background:var(--input)}.tabs button.active,.filters button.active{background:var(--tab);color:var(--text)}.listinfo h3{color:var(--link)}.workspace{align-items:start}.sidebar{margin-top:0}.selectedItem{align-items:center;gap:7px;margin:8px 0}.selectedTitle{font-size:12.5px;line-height:1.35;min-width:0;flex:1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.selectedItem button{flex:0 0 20px;font-size:19px}.profileHeading{display:flex;align-items:center;gap:9px;margin:18px 0 12px}.profileAvatar{width:32px;height:32px;flex:0 0 32px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;background:var(--tab);color:var(--link);font-weight:700}.profileAvatar img{width:100%;height:100%;object-fit:cover}.profileName{color:var(--link);font-weight:700;overflow-wrap:anywhere}.sidebar h3{margin:0 0 12px}.sidebar .primary{margin-top:14px}.selectionClear{display:block;margin-top:12px;padding:6px 0;background:transparent;border:0;color:var(--muted);font-size:13px;text-decoration:underline;text-underline-offset:3px}.selectionClear:hover{color:var(--text)}.selectionClear:focus-visible{outline:2px solid var(--link);outline-offset:4px}#results:empty{display:none}@media(min-width:0){.sidebar{margin-top:0}}body{font-family:Lato,Arial,sans-serif}button,input{font-family:inherit}header{position:relative;isolation:isolate;background:var(--season-bar,#075989);color:#fff;min-height:86px;gap:20px}header .brand{color:#fff;text-decoration:none;font-weight:900;font-size:clamp(25px,3vw,38px);line-height:1;letter-spacing:-1.4px;display:inline-flex;align-items:center}header .brandList{position:relative;display:inline-block}header .brandVersion{position:absolute;right:0;bottom:calc(100% + 2px);font-size:11px;letter-spacing:0;font-weight:900;line-height:1.1;background:#e3374b;color:#fff;border-radius:4px;padding:3px 5px;white-space:nowrap}.listinfo h3{font-family:Lato,Arial,sans-serif;font-weight:700}header .brand:focus-visible,header button:focus-visible{outline:2px solid #fff;outline-offset:4px}@media(min-width:0){header{min-height:75px}.brandVersion{font-size:9px!important}}body{--bg:#181818;--panel:#242424;--line:#333333;--text:#dddddd;--muted:#999999;--accent:#1976b8;--input:#242424;--link:#2196d2;--tab:#303a42}body .panel,body .listcard{background:#242424}body .steps .active{color:#f1f1f1}body .tabs button.active,body .filters button.active{background:#303a42;color:#f1f1f1}body .notice{background:#202020}body input{background:#242424}body .listinfo h3{color:var(--link)}body .secondary{background:#383838;color:#ddd}footer{justify-content:center;text-align:center}.tmdbAttribution{width:min(640px,calc(100% - 40px));margin:0 auto;padding-top:0;text-align:center;color:var(--muted);font-size:11px;line-height:1.45}.tmdbAttribution strong{display:block;margin-bottom:4px;font-size:11px;letter-spacing:.04em}.tmdbAttributionContent{display:flex;justify-content:center;align-items:center;gap:8px}.tmdbAttributionContent p{margin:0}.tmdbAttribution img{width:56px;height:auto;display:block}@media(min-width:0){.tmdbAttributionContent{gap:6px}.tmdbAttribution{font-size:10px}}.dramaMatch{display:flex;gap:18px;padding:18px;margin:12px 0;background:var(--panel);border:1px solid var(--line);border-radius:12px}.dramaMatch>img{width:76px;height:108px;object-fit:cover;border-radius:6px;flex:0 0 76px}.dramaMatchInfo{min-width:0}.dramaMatch h3{margin:0 0 6px;color:var(--link);font-size:17px;overflow-wrap:anywhere}.dramaMatch p{margin:0 0 12px;color:var(--muted);font-size:13px}.searchPages{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}#results>button{margin:10px 0}@media(max-width:420px){.dramaMatch{gap:12px;padding:12px}.dramaMatch .secondary{font-size:13px;padding:10px}}.dramaSynopsis{white-space:pre-wrap;line-height:1.6}.synopsisToggle{background:none;border:0;padding:0 0 0 5px;color:var(--link);text-decoration:underline}.dramaMatch .dramaStats{color:var(--text);line-height:1.6}.dramaMatch .detailsStatus{font-size:12px}
.dramaMatchInfo{flex:1}.dramaHeading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.dramaPopularity{white-space:nowrap;color:var(--muted);font-size:12px;padding-top:2px}.dramaHeading h3{flex:1}.dramaMatch .dramaStats{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:3px 0 16px;font-size:14px}.ratingStars{display:inline-flex;gap:2px;color:#b18421}body .ratingStars{color:#d6b35f}.ratingStar{position:relative;display:block;width:13px;height:13px}.ratingStar svg{display:block;width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.25;stroke-linejoin:round}.ratingFill{position:absolute;top:0;left:0;height:100%;overflow:hidden}.ratingFill svg{fill:currentColor}.ratingMax{color:var(--muted);font-size:12px}.dramaMatch .dramaSynopsis{font-size:14px;line-height:1.6}@media(min-width:0){.dramaHeading{flex-wrap:wrap;gap:3px}.dramaHeading h3{flex-basis:100%}.dramaPopularity{margin-bottom:8px}}
.personSource{display:inline-block;margin:10px 0 0 12px;color:var(--link);font-size:12px}.filmographyPreview{margin:14px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.filmographyPreview summary{cursor:pointer;color:var(--link)}.filmographyPreview ol{padding-left:24px}.filmographyPreview li{padding:7px 0;overflow-wrap:anywhere;line-height:1.5;font-size:13px}.filmographyPreview a{color:var(--link)}.personMatch .dramaSynopsis{white-space:pre-wrap}.detailsStatus:empty{display:none}body{min-height:100dvh;display:flex;flex-direction:column}.shell{width:100%;flex:1}footer{margin-top:auto;flex-direction:column;gap:7px;padding:14px clamp(20px,5vw,70px) 16px;background:rgba(16,19,24,.96);border-top:1px solid #ffffff18;min-height:112px}header{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}header .brand{justify-self:start}header .steps{margin:0;font-size:15px;gap:20px;justify-content:center;color:#c9e0ee}header .steps :is(span,button){position:relative;padding:12px 0;white-space:nowrap}header .steps button{font:inherit;background:none;border:0;border-radius:0;color:inherit}header .steps button:disabled{cursor:default;opacity:1}header .steps button:not(:disabled){color:#fff;cursor:pointer}header .steps button:not(:disabled):hover{color:#fff;background:#ffffff12}header .steps .active:after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent)}header .steps .active{color:#fff}.hero{padding:70px 0;position:relative;z-index:1}.hero h1{font-weight:900;letter-spacing:-2px}.pageBack{margin-bottom:16px}#exploreCountry{width:100%;padding:14px;border:1px solid var(--line);border-radius:8px;background:var(--input);color:var(--text);font:inherit}.posters:empty{display:none}.watchlistPosterPlaceholder{display:grid;place-items:center;width:100%;height:102px;padding:8px;text-align:center;border:1px solid var(--line);border-radius:6px;background:var(--input);color:var(--muted);font-size:12px}.listinfo button{margin-top:8px;padding:8px 12px;font-size:13px}#exploreSearch label{margin-bottom:10px}#exploreSort{padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--input);color:var(--text);font:inherit;font-size:13px}.catalogSortLabel{margin:0 0 0 auto!important}@media(min-width:0){header{grid-template-columns:1fr auto;gap:14px}header .steps{grid-column:1/-1;grid-row:2;justify-content:center;gap:15px;white-space:nowrap}}@media(max-width:420px){header .steps{font-size:13px;gap:12px}}
body .discoverModes.communityViews{margin:8px 0 10px}body #communitySelectAll{margin-left:auto;color:var(--link);text-decoration:underline;font-size:13px}.discoverModes{gap:24px;border-bottom:1px solid var(--line);margin:0 0 22px;flex-wrap:wrap}body .discoverModes button{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:var(--muted);padding:4px 0 13px}body .discoverModes button.active{background:transparent;color:var(--text);border-bottom-color:var(--link)}@media(max-width:420px){body .discoverModes{gap:20px;font-size:14px}}body[data-page=selection] .shell{padding-top:16px}${POSTER_WALL_CSS}${NOTIFICATION_CSS}.landingBrandList{position:relative;display:inline-block}.landingBrandVersion{position:absolute;right:0;bottom:calc(100% + 3px);font:900 clamp(10px,1.2vw,13px)/1.1 Lato,Arial,sans-serif;letter-spacing:0;padding:4px 6px;border-radius:4px;background:#e3374b;color:#fff;text-shadow:none;white-space:nowrap}
.mobileSelectionBar{display:none}
header .mobileBrandMark{display:none}
.mobileBrandMark{position:relative;width:max-content;padding:10px 15px 0 0;font-size:24px;font-weight:800;letter-spacing:.01em;line-height:1}
.mobileBrandVersion{position:absolute;top:0;right:0;padding:2px 5px;border-radius:5px;background:#c42d43;color:#fff;font-size:10px;font-weight:700;letter-spacing:0;line-height:1.1;font-variant-numeric:tabular-nums}
body.androidSetup header .desktopBrandName{display:none}
body.androidSetup header .mobileBrandMark{display:inline-block}
body.androidSetup :is(header .steps,footer,#selection .tabs){display:none!important}
body.androidSetup[data-page=selection]{padding-bottom:calc(86px + env(safe-area-inset-bottom,0px))}
body.androidSetup #selection .workspace{margin-top:0;grid-template-columns:minmax(0,1fr)}
body.androidSetup #selection .sidebar{display:none}
body.androidSetup .androidDiscoverToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
body.androidSetup .androidDiscoverToolbar h1{margin:0;font-size:30px}
body.androidSetup .androidDiscoverToolbar button{min-height:44px}
body.androidSetup .androidScreenReader{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
body.androidSetup #profileForm .searchrow{display:flex;align-items:stretch;gap:6px}
body.androidSetup #profileInput{width:100%;min-width:0;flex:1;font-size:16px}
body.androidSetup #profileForm .searchrow button{width:auto;min-height:44px;padding:8px 12px;flex:none}
body.androidSetup .androidFilterButton{position:relative}
body.androidSetup .androidFilterButton svg{width:22px;height:22px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:1.7}
body.androidSetup #androidFilterCount:not([hidden]){position:absolute;top:1px;right:2px;min-width:16px;border-radius:12px;background:var(--accent);color:var(--button-text);font-size:10px;line-height:16px;text-align:center}
body.androidSetup .androidSearchModes{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 14px}
body.androidSetup .androidSearchModes button{min-height:44px;padding-inline:11px}
body.androidSetup .androidBackToBrowse{min-height:44px;margin:0 0 12px}
body.androidSetup .mobileSelectionBar{display:none!important}
body.androidSetup[data-page=selection] .mobileSelectionBar:not([hidden]){position:fixed;inset:auto 0 0;z-index:12;display:flex!important;gap:10px;background:var(--panel);border-top:1px solid var(--line);padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
body.androidSetup .mobileSelectionBar button{flex:1;min-height:48px}
body.androidSetup[data-keyboard-open] .mobileSelectionBar{visibility:hidden}
body.androidSetup .androidFiltersDialog::backdrop{background:#000a}
body.androidSetup .androidAbout{clear:both;margin-top:20px;padding:12px 0;border-top:1px solid var(--line);color:var(--muted)}
body.androidSetup .androidAbout summary{min-height:44px;cursor:pointer;color:var(--text)}
body.androidSetup .androidAbout #footerText,body.androidSetup .androidAbout #buildFooter{display:block;margin:10px 0}
body.androidSetup:has(dialog[open]){overflow:hidden}
body.androidSetup .androidFiltersDialog{width:100%;height:100dvh;max-width:none;max-height:none;inset:0;margin:0;padding:0;border:0;background:var(--bg);color:var(--text)}
body.androidSetup .androidFiltersDialog[open]{display:flex;flex-direction:column}
body.androidSetup .androidFilterHeader{display:flex;align-items:center;gap:8px;padding:14px 16px 0}
body.androidSetup .androidFilterHeader h2{margin:0 auto 0 0}
body.androidSetup .androidFilterHeader button{min-height:44px}
body.androidSetup .androidFilterScope{margin:10px 16px;color:var(--muted);font-size:13px}
body.androidSetup .androidFiltersDialog .shelfFilters{flex:1;overflow:auto;border:0;border-radius:0;background:transparent;margin:0;padding:8px 16px 18px}
body.androidSetup .androidFiltersDialog .shelfChip{min-height:44px}
body.androidSetup .androidMediaFilter{display:grid;grid-template-columns:repeat(3,1fr)}
body.androidSetup .androidFiltersDialog .shelfGroupLabel{font-size:16px;margin-top:20px}
body.androidSetup .androidFiltersDialog .shelfField{margin-top:8px}
body.androidSetup .androidYearInput{width:100%;min-height:44px;background:var(--input);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px;font-size:16px}
body.androidSetup .androidFilterActions{padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:var(--panel)}
body.androidSetup .androidFilterActions button{width:100%;min-height:48px}
body.androidSetup{--bg:#101216;--panel:#20232b;--line:#353a45;--text:#f1f3f6;--muted:#aab1bd;--accent:#2674ec;--input:#20232b;--link:#75aaff;--tab:#273141;padding-bottom:calc(78px + env(safe-area-inset-bottom,0px))}
body.androidSetup header{background:#17191e;min-height:72px;padding:15px 20px}
body.androidSetup .androidDiscoverToolbar{margin-bottom:16px}
body.androidSetup .androidHeaderActions{position:relative;display:flex;align-items:center;gap:8px;margin-inline-start:auto}
body.androidSetup .androidHeaderActions.hidden,body.androidSetup .androidHeaderActions[data-section=discover] #androidFilterCount{display:none}
body.androidSetup .androidDiscoverFilters{position:fixed;inset:auto 12px auto auto;margin:0;width:min(320px,calc(100vw - 24px));max-height:70dvh;overflow:auto;padding:0;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--text);box-shadow:0 12px 32px #0008}
body.androidSetup .androidDiscoverFilters::backdrop{background:#0004}
body.androidSetup .androidDiscoverFilters fieldset{border:0;padding:4px 0;margin:0;min-width:0}
body.androidSetup .androidDiscoverFilters fieldset label{position:relative;display:block;margin:0;padding:0}
body.androidSetup .androidDiscoverFilters fieldset input{position:absolute;opacity:0;width:1px;height:1px}
body.androidSetup .androidDiscoverFilters fieldset span{display:flex;justify-content:space-between;align-items:center;min-height:48px;padding:0 16px;color:var(--text);font-size:16px}
body.androidSetup .androidDiscoverFilters fieldset input:checked + span::after{content:'✓';color:var(--link)}
body.androidSetup .androidDiscoverFilters fieldset input:focus-visible + span{outline:2px solid var(--link);outline-offset:-3px}
body.androidSetup .androidDiscoverFilters .androidCatalogFilters{border-top:1px solid var(--line);padding:12px 16px}
body.androidSetup .androidDiscoverFilters .androidCatalogFilters label{font-size:13px}
body.androidSetup .androidHeaderActions button{position:relative;display:grid;place-items:center;width:44px;min-height:44px;padding:8px;border:0;background:transparent;color:var(--text)}
body.androidSetup .androidHeaderActions button:hover{background:#ffffff10}
body.androidSetup .androidHeaderActions svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
body.androidSetup #androidSelectionCount:not([hidden]){position:absolute;top:1px;right:0;min-width:18px;height:18px;padding:0 4px;border-radius:10px;background:#e3374b;color:#fff;font-size:10px;font-weight:700;line-height:18px;text-align:center}
body.androidSetup .androidBottomNav{position:fixed;z-index:20;inset:auto 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;padding:8px max(10px,env(safe-area-inset-right,0px)) calc(8px + env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left,0px));background:rgba(29,32,40,.97);border-top:1px solid #ffffff12;backdrop-filter:blur(18px)}
body.androidSetup .androidNavItem{display:flex;min-width:0;min-height:56px;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:2px 4px;border:0;border-radius:16px;background:transparent;color:#b8bec9;font-size:11px;font-weight:600}
body.androidSetup .androidNavItem.active{color:#fff}
body.androidSetup .androidNavItem.active .androidNavIcon{display:grid;place-items:center;width:64px;height:32px;border-radius:18px;background:#2674ec;color:#fff}
body.androidSetup .androidNavIcon{font-size:21px;line-height:1}
body.androidSetup .androidNavItem:focus-visible{outline:2px solid #75aaff;outline-offset:1px}
body[data-page=connect] header{display:none}
body[data-page=connect] #connect h1{text-align:center}
body.androidSetup .androidFiltersDialog,body.androidSetup .mobileSelectionDialog{background:var(--panel);color:var(--text)}
body.androidSetup .primary{background:#2674ec;color:#fff}
body.androidSetup .secondary{background:#252a33;border-color:#414956;color:#f1f3f6}
body.androidSetup .panel,body.androidSetup .listcard{background:#20232b;border-color:#353a45}
body.androidSetup .tabs button.active,body.androidSetup .filters button.active{background:#273141;border-color:#2674ec;color:#fff}
body.androidSetup .notice{background:#1b1e25}
.mobileSelectionDialog:not([open]){display:none}
@media(min-width:0){
  #desktopSelection{display:none}
  body[data-page=selection]:has(.mobileSelectionBar:not([hidden])){padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))}
  .mobileSelectionBar:not([hidden]){position:fixed;z-index:10;inset:auto 0 0;display:flex;gap:10px;padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:var(--panel);border-top:1px solid var(--line)}
  .mobileSelectionBar button{flex:1;min-height:48px}
  .mobileSelectionDialog{inset:auto 0 0;margin:0;width:100%;max-width:none;max-height:85dvh;overflow:auto;border:1px solid var(--line);border-radius:18px 18px 0 0;background:var(--panel);color:var(--text);padding:16px max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
  .mobileSelectionDialog::backdrop{background:#0009}
  .mobileSelectionDialog .selectionSheetHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  .mobileSelectionDialog h2{margin:0}
  .mobileSelectionDialog button{min-height:44px;min-width:44px}
  .mobileSelectionDialog #selectionMessage{max-height:48dvh;overflow:auto}
  .mobileSelectionDialog .selectedTitle{font-size:15px}
  .mobileSelectionDialog #continue{width:100%;margin-top:14px}
  body:has(.mobileSelectionDialog[open]){overflow:hidden}
  body[data-keyboard-open] .mobileSelectionBar{visibility:hidden}
  header .desktopBrandName{display:none}
  header .mobileBrandMark{display:inline-block}
  #connect .mobilePasteList{display:block;width:100%;margin-top:10px;min-height:44px}
  #connect .or{display:none}
  #connect #skip{margin-top:10px;min-height:44px}
  #connect #source,#selection .searchrow input{font-size:16px}
  #selection .tabs{margin:0 0 10px}
  #selection .tabs button{flex:1;min-height:44px}
  #selection .workspace{margin-top:0}
}
/* Wide screens show the app layout in a centered phone-width column. */
@media(min-width:560px){body.androidSetup>header,body.androidSetup .shell,body.androidSetup>footer{width:100%;max-width:480px;margin-inline:auto}body.androidSetup .androidBottomNav,body.androidSetup[data-page=selection] .mobileSelectionBar:not([hidden]){left:calc(50% - 240px);right:calc(50% - 240px)}body.androidSetup .androidDiscoverFilters{right:calc(50% - 228px)}}
html.finePointer .rowScrollButtons{display:flex;justify-content:flex-end;gap:6px;margin:-4px 0 6px}html.finePointer .rowScrollButtons[hidden]{display:none}html.finePointer .rowScrollButton{min-width:34px;height:30px;padding:0 10px;border-radius:15px;font-size:17px;line-height:1}html.finePointer .rowScrollButton:disabled{opacity:.35;cursor:default}html.finePointer .androidSetup :is(#androidCatalogs,#listItems) .catalogShelfTrack{scrollbar-width:thin}
</style></head><body><header><a class="brand" href="/" aria-label="YourDramaList home"><span class="desktopBrandName">YourDramaList</span><span class="mobileBrandMark" aria-hidden="true">YDL<span class="mobileBrandVersion">v${APP_VERSION}</span></span></a><nav class="steps" aria-label="Setup progress"><button id="step1" type="button" class="active" disabled>${TEXT.stepConnect}</button><button id="step2" type="button" disabled>${TEXT.stepLists}</button><button id="step3" type="button" disabled>${TEXT.stepPreferences}</button><button id="step4" type="button" disabled>${TEXT.stepConfirm}</button></nav></header><main class="shell">

<div id="setup" class="hidden">
<section id="connect" class="connect"><h1>${TEXT.connectTitle}</h1><form class="panel" id="connectForm"><input id="source" aria-label="${TEXT.usernameLabel}" required maxlength="200" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="${TEXT.usernamePlaceholder}"><button class="primary" type="submit">${TEXT.findLists}</button><span id="error" role="alert" style="color:#ff8e95"></span></form><div class="or">${TEXT.or}</div><button class="secondary" id="skip" style="width:100%">${TEXT.skipAccount}</button></section>
<section id="selection" class="hidden"><div class="tabs"><button data-tab="profiles">${TEXT.profilesTab}</button><button data-tab="discover">${TEXT.discoverTab}</button></div><div class="workspace"><div><div id="profileSearch"><form id="profileForm"><label for="profileInput">${TEXT.profileSearchLabel}</label><div class="searchrow"><input id="profileInput" autocapitalize="none" spellcheck="false" placeholder="${TEXT.profilePlaceholder}" required><button class="primary">${TEXT.search}</button></div></form><div id="communityViews" class="filters discoverModes communityViews hidden" role="group" aria-label="${TEXT.communityListTypes}"><button type="button" data-community-view="watchlists" aria-pressed="true">${TEXT.communityWatchlists}</button><button type="button" id="communitySelectAll">${TEXT.communitySelectAll}</button></div></div><div id="discoverSearch" class="hidden"><div class="filters discoverModes" role="group" aria-label="Discover categories"><button data-filter="actor">${TEXT.actors}</button><button data-filter="director">${TEXT.directors}</button><button data-filter="catalogs">Catalogs</button></div><label id="discoverLabel" for="discoverInput">${TEXT.discoverSearchLabel}</label><form id="discoverForm" class="searchrow"><input id="discoverInput" aria-label="Drama name or MyDramaList URL" maxlength="500" required placeholder="Search dramas..."><button class="primary">Search</button></form><div id="exploreSearch" class="hidden"></div></div><div id="results" role="status"></div><div id="listItems"></div></div><aside class="panel sidebar"><div id="desktopSelection"><h3>${TEXT.selectionTitle} <span id="count">(0)</span></h3><div id="selectionControls"><div class="muted" id="selectionMessage">${TEXT.emptySelection}</div><button class="primary" disabled id="continue">${TEXT.continue}</button><button class="selectionClear hidden" type="button" id="clearSelection">${TEXT.clearSelection}</button></div></div></aside></div>
<div class="mobileSelectionBar" id="mobileSelectionBar" hidden><button class="secondary" id="reviewSelection" type="button" aria-haspopup="dialog" aria-controls="selectionDialog"></button><button class="primary" id="mobileContinue" type="button">${TEXT.continue}</button></div>
<dialog class="mobileSelectionDialog" id="selectionDialog" aria-labelledby="selectionDialogTitle"><div class="selectionSheetHeader"><h2 id="selectionDialogTitle">${TEXT.selectionTitle}</h2><button class="secondary" type="button" id="closeSelectionDialog" aria-label="${TEXT.closeSelection}">×</button></div></dialog></section><section id="preferences" class="preferencesPage prefPage hidden" aria-label="${TEXT.stepPreferences}"></section><section id="confirm" class="preferencesPage prefPage hidden" aria-label="${TEXT.stepConfirm}"></section></div>
</main><footer><span id="footerText">${TEXT.footer}</span><span id="buildFooter"><a href="https://github.com/palmajay-coder/yourdramalist" target="_blank" rel="noopener noreferrer">Valtown public build</a> · v${APP_VERSION} · <a href="/privacy">Privacy</a></span><section class="tmdbAttribution" id="tmdb-attribution" aria-label="TMDB Attribution Notice"><strong>TMDB Attribution Notice</strong><div class="tmdbAttributionContent"><a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB"></a><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div></section></footer>
<script>
const copy = ${JSON.stringify({ ...TEXT, androidVersion: APP_VERSION })};
// The Android APK and phone browsers share the mobile beta setup.
// Every visitor gets the app layout: the Android app, phone browsers in any orientation, and computers
// (in a centered phone-width column).
const androidApp=navigator.userAgent.includes('Android')&&navigator.userAgent.includes('; wv');
const mobileWeb=!androidApp;
const compactAndroid=true;
// A mouse or trackpad with no touch screen: rows get ‹ › buttons and a scrollbar, since they cannot be swiped.
const finePointer=matchMedia('(hover:hover) and (pointer:fine)').matches;
if(finePointer)document.documentElement.classList.add('finePointer');
function compactPosterStack(){
 const stack=document.createElement('span');
 stack.className='compactPosterStack';
 stack.setAttribute('aria-hidden','true');
 let previous='';
 return {element:stack,show(posters){
  const urls=[...new Set(posters.filter(Boolean))].slice(0,3);
  const signature=JSON.stringify(urls);
  if(previous===signature)return;
  previous=signature;
  stack.replaceChildren(...urls.map(url=>{
   const image=document.createElement('img');
   image.src=url.replace(/^https:\\/\\/image\\.tmdb\\.org\\/t\\/p\\/(?:w\\d+|original)\\//,'https://image.tmdb.org/t/p/w92/');
   image.alt='';
   image.addEventListener('error',()=>image.remove(),{once:true});
   image.loading='lazy';
   image.decoding='async';
   image.referrerPolicy='no-referrer';
   return image;
  }));
 }};
}
function compactPreviewButton(name,posters){
 const button=document.createElement('button');
 button.type='button';
 button.className='compactPreviewButton';
 button.setAttribute('aria-expanded','false');
 const stack=compactPosterStack();
 const label=document.createElement('span');
 label.textContent=name;
 button.append(stack.element,label);
 stack.show(posters||[]);
 return {button,showPosters:stack.show};
}
const MAX_CATALOGS = ${MAX_CATALOGS};
const notices=(${installFloatingNotice.toString()})(copy);
const $=id=>document.getElementById(id);
// The app's fixed dark colors.
function applyAppTheme(){const style=document.body.style;for(const [k,v] of [['--season-bar','#17191e'],['--season-highlight','#2674ec'],['--banner-tint','18,20,25'],['--button-text','#fff'],['--accent','#2674ec'],['--link','#75aaff'],['--tab','#273141']])style.setProperty(k,v)}
const userListName=${userListName.toString()};
const state={tab:'discover',filter:'actor',source:null,selection:[],profile:''};
document.body.classList.add('androidSetup');
applyAppTheme();

const posterWall = (${installPosterWall.toString()})(${JSON.stringify(POSTER_SEEDS)},['connect']);
let currentPage='',preferencesUI,preferencesReady,discoverScroll=0;
const androidFlow=['selection','preferences','confirm'];
let connectedUser='';try{const saved=localStorage.getItem('ydl-v3-user')||'';if(/^[a-zA-Z0-9_-]{1,60}$/.test(saved))connectedUser=saved}catch{}
function setConnectedUser(user){connectedUser=user;try{user?localStorage.setItem('ydl-v3-user',user):localStorage.removeItem('ydl-v3-user')}catch{}}
const pageForPath=${pageForPath.toString()};
function ensurePreferences(){return preferencesReady??=import(${JSON.stringify(immutableFileUrl('/preferencesClient.ts'))}).then(m=>{preferencesUI=m.installPreferencesUI({navigate,selection:()=>state.selection,user:()=>connectedUser,androidFlow:true,copyOnly:false});if(androidAbout)$('preferences').append(androidAbout);return preferencesUI}).catch(()=>{preferencesReady=undefined;const root=$(currentPage==='confirm'?'confirm':'preferences');root.textContent=copy.preferencesUnavailable;return null})}
function navigate(page,push=true){
if(['preferences','confirm'].includes(page)&&!state.selection.length&&page!=='preferences')page='selection';
if(page!=='selection'&&$('selectionDialog').open)$('selectionDialog').close();
if(page!==currentPage){
 if(currentPage==='selection')discoverScroll=window.scrollY;
 requestAnimationFrame(()=>window.scrollTo(0,page==='selection'?discoverScroll:0));
}
currentPage=page;document.body.dataset.page=page;posterWall.update(page);window.syncAndroidNav?.(page);
$('setup').classList.remove('hidden');
for(const id of ['connect','selection','preferences','confirm'])$(id).classList.toggle('hidden',page!==id);
const order=['connect','selection','preferences','confirm'],index=order.indexOf(page);
order.forEach((name,i)=>{const step=$('step'+(i+1)),active=name===page;step.classList.toggle('active',active);step.disabled=i>=index; if(active)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current')});
const paths={connect:'/setup',selection:'/setup/lists',preferences:'/setup/preferences',confirm:'/setup/confirm'};const path=paths[page]||'/setup';if(push&&location.pathname!==path){
 const entry={ydlPage:page,ydlFlowStep:androidFlow.indexOf(page)};
 if(history.state?.ydlDialog||(!mobileWeb&&page==='selection'))history.replaceState(entry,'',path);
 else history.pushState(entry,'',path);
}
if(['preferences','confirm'].includes(page))ensurePreferences().then(ui=>{if(ui&&currentPage===page)ui.show(page)});
}
$('step1').onclick=()=>navigate('connect');$('step2').onclick=()=>{if(currentPage==='connect'){if($('source').value.trim())$('connectForm').requestSubmit();else if(connectedUser)navigate('selection');else $('skip').click()}else navigate('selection')};$('step3').onclick=()=>navigate('preferences');
$('continue').onclick=()=>navigate('preferences');
$('mobileContinue').onclick=$('continue').onclick;
$('continue').textContent='Build add-on';
const selectionDialog=$('selectionDialog');
let androidAbout=null;
const androidDialogs=new Map();
let dialogSerial=0;
function showAndroidDialog(dialog){
 if(dialog.open)return;
 const token=++dialogSerial;
 dialog.showModal();
 androidDialogs.set(token,dialog);
 history.pushState({ydlDialog:token},'');
 dialog.addEventListener('close',()=>{
  androidDialogs.delete(token);
  if(history.state?.ydlDialog===token)history.back();
 },{once:true});
}
{
 const about=document.createElement('details');
 about.className='androidAbout';
 const heading=document.createElement('summary');
 heading.textContent='About YourDramaList';
 const build=$('buildFooter');
 about.append(heading,$('footerText'),build,$('tmdb-attribution'));
 const privacy=build.querySelector('a[href="/privacy"]');
 build.replaceChildren(document.createTextNode('Version '+copy.androidVersion+' \xB7 '),privacy);
 androidAbout=about;
}
// The app layout is narrow at every width, since wide screens show it in a phone-width column.
$('reviewSelection').onclick=()=>{
  selectionDialog.append($('selectionControls'));
  showAndroidDialog(selectionDialog);
  $('closeSelectionDialog').focus();
};
$('closeSelectionDialog').onclick=()=>selectionDialog.close();
selectionDialog.addEventListener('close',()=>{
  if(selectionDialog.open)return;
  $('desktopSelection').append($('selectionControls'));
  if(currentPage==='selection'&&!state.selection.length){
    const activeTab=document.querySelector('#selection .tabs button.active');
    activeTab?.focus({preventScroll:true});
  }
});
window.visualViewport?.addEventListener('resize',()=>{
  const editing=document.activeElement instanceof HTMLInputElement;
  document.body.toggleAttribute('data-keyboard-open',editing&&window.innerHeight-window.visualViewport.height>120);
});
document.addEventListener('focusout',()=>document.body.removeAttribute('data-keyboard-open'));
document.querySelector('header .brand').onclick=e=>{e.preventDefault();navigate('connect')};
window.addEventListener('popstate',()=>{
  const active=history.state?.ydlDialog||0;
  for(const [token,dialog] of [...androidDialogs].reverse())if(token>active)dialog.close();
  const page=history.state?.ydlPage||pageForPath(location.pathname);
  if(currentPage===page)return;
  navigate(page,false);
});
function parseSource(raw){const s=raw.trim();const username=s.replace(/^@/,'');if(/^[a-zA-Z0-9_-]{1,60}$/.test(username))return{type:'profile',value:username};let u;try{u=new URL(s)}catch{return null}if(!['mydramalist.com','www.mydramalist.com'].includes(u.hostname.toLowerCase())||!['https:','http:'].includes(u.protocol))return null;const parts=u.pathname.split('/').filter(Boolean);if(parts.length!==2||!['profile','dramalist','list'].includes(parts[0].toLowerCase())||!/^[a-zA-Z0-9_-]{1,60}$/.test(parts[1]))return null;return{type:parts[0].toLowerCase()==='list'?'list':'profile',value:parts[1]}}
const selectionKey='ydl-v3-selection';try{state.selection=JSON.parse(localStorage.getItem(selectionKey)||'[]');if(!Array.isArray(state.selection))state.selection=[]}catch{state.selection=[]}
let activeLists=[];let listRequest=0;
const avatarRequests=new Map();
function loadProfileAvatar(user){
if(avatarRequests.has(user))return avatarRequests.get(user);
const request=fetch('/api/mdl/avatar?username='+encodeURIComponent(user)).then(r=>r.ok?r.json():null).catch(()=>null).then(data=>{if(!data?.avatar)avatarRequests.delete(user);return data});
avatarRequests.set(user,request);return request;
}
function renderSelection(){state.selection=state.selection.map(l=>({...l,originalName:l.originalName||l.name,name:userListName(l)}));try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}window.syncAndroidSelectionCount?.(state.selection.length);const root=$('selectionMessage');root.replaceChildren();$('count').textContent='('+state.selection.length+')';
$('mobileSelectionBar').hidden=true;
$('reviewSelection').textContent=copy.mobileSelectedCount.replace('{count}',state.selection.length);
$('continue').disabled=!state.selection.length;$('mobileContinue').disabled=!state.selection.length;$('clearSelection').classList.toggle('hidden',!state.selection.length);if(!state.selection.length){root.textContent=copy.emptySelection;return}const groups=new Map();for(const l of state.selection){const user='list:all';if(!groups.has(user))groups.set(user,[]);groups.get(user).push(l)}for(const [user,lists] of groups){const isFilm=lists[0].kind==='filmography',isExplore=lists[0].kind==='explore',ownerless=true;const groupName=isFilm?lists[0].personDisplayName||lists[0].personName:user;const heading=document.createElement('div');heading.className='profileHeading';const avatar=document.createElement('span');avatar.className='profileAvatar';avatar.textContent=groupName.charAt(0).toUpperCase();const name=document.createElement('span');name.className='profileName';name.textContent=groupName;heading.append(avatar,name);if(!ownerless)root.append(heading);if(!ownerless&&(isFilm||!['MyDramaList','YourDramaList'].includes(user)&&/^[a-zA-Z0-9_-]{1,60}$/.test(user))){Promise.resolve(lists.find(l=>l.profileAvatar)?.profileAvatar?{avatar:lists.find(l=>l.profileAvatar).profileAvatar}:isFilm?null:loadProfileAvatar(user)).then(d=>{if(d&&d.avatar){const img=document.createElement('img');img.src=d.avatar;img.alt='';img.referrerPolicy='no-referrer';avatar.replaceChildren(img)}}).catch(()=>{})}for(const l of lists){const row=document.createElement('div');row.className='selectedItem';const title=document.createElement('span');title.className='selectedTitle';title.textContent=userListName(l);title.title=userListName(l);const remove=document.createElement('button');remove.type='button';remove.textContent='\xD7';remove.setAttribute('aria-label',copy.remove+l.name);remove.onclick=()=>{
  const nextIndex=state.selection.indexOf(l);
  toggleList(l);
  if(selectionDialog.open){
    const buttons=root.querySelectorAll('button');
    (buttons[Math.min(nextIndex,buttons.length-1)]||$('closeSelectionDialog')).focus();
  }
};row.append(title,remove);root.append(row)}}}
$('clearSelection').onclick=()=>{state.selection=[];renderSelection();document.querySelectorAll('#listItems input[type=checkbox]').forEach(c=>{c.checked=false});exploreUI.sync();peopleUI.sync();communityUI.sync()};
function catalogAddSource(list){if(["discover-actor-filmography","discover-director-filmography","discover-catalog","community-watchlist","community-public-list","community-direct-list","weekly-picks"].includes(list.analyticsSource))return list.analyticsSource;if(list.kind==='weekly')return'weekly-picks';if(list.kind==='explore')return'discover-catalog';if(list.kind==='filmography')return list.mode==='director'?'discover-director-filmography':'discover-actor-filmography';if(list.kind==='watchlist')return'community-watchlist';return'community-public-list'}
function recordCatalogAddition(list){fetch('/api/analytics/catalog-add',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:catalogAddSource(list)}),keepalive:true}).catch(()=>{})}
function toggleList(l){const exists=state.selection.some(x=>x.url===l.url);if(!exists&&state.selection.length>=MAX_CATALOGS){notices.show(copy.catalogLimitReached.replace('{max}',MAX_CATALOGS),copy.catalogLimitTitle);document.querySelectorAll('#listItems input[type=checkbox]').forEach(c=>{c.checked=state.selection.some(x=>x.url===c.dataset.url)});exploreUI.sync();peopleUI.sync();communityUI.sync();return}state.selection=exists?state.selection.filter(x=>x.url!==l.url):[...state.selection,l];if(!exists)recordCatalogAddition(l);localStorage.setItem(selectionKey,JSON.stringify(state.selection));renderSelection();document.querySelectorAll('#listItems input[type=checkbox]').forEach(c=>{c.checked=state.selection.some(x=>x.url===c.dataset.url)});exploreUI.sync();peopleUI.sync();communityUI.sync()}
function addWatchlistPlaceholder(posters,empty){const placeholder=document.createElement('span');placeholder.className='watchlistPosterPlaceholder';placeholder.textContent=empty?copy.emptyWatchlist:copy.watchlistArtworkUnavailable;posters.append(placeholder)}
function renderLists(lists){communityUI.render(lists)}
async function loadDirectList(value){
$('communityViews').classList.add('hidden');profileLists=null;
const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent=copy.loadingLists;
try{const response=await fetch('/api/mdl/list?url='+encodeURIComponent('https://mydramalist.com/list/'+value),{signal:AbortSignal.timeout(15000)});const data=await response.json();if(requestId!==listRequest)return;if(!response.ok)throw Error(data.error||'Unable to load this list.');
const list={...data.list,analyticsSource:'community-direct-list'};
state.selection=state.selection.map(l=>l.url===list.url?{...l,...list}:l);
try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}
renderSelection();renderLists([list]);$('results').textContent='';
{
 if(state.selection.some(item=>item.url===list.url))$('results').textContent='List already added.';
 else if(state.selection.length<MAX_CATALOGS){toggleList(list);$('results').textContent='List added.'}
 else $('results').textContent=copy.catalogLimitReached.replace('{max}',MAX_CATALOGS);
}
}catch(e){if(requestId===listRequest)$('results').textContent='Unable to load list: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message)}
}
let profileLists=null;
function showCommunityView(view){
 if(!profileLists)return;
 const watchlists=view==='watchlists';
 document.querySelectorAll('[data-community-view]').forEach(button=>{
  const active=button.dataset.communityView===view;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 });
 const lists=profileLists;
 $('communitySelectAll').classList.toggle('hidden',!lists.some(list=>!list.empty));
 $('results').textContent=lists.length?'':watchlists?copy.communityNoWatchlists:copy.communityNoCustomLists;
 communityUI.render(lists,view);
}
document.querySelectorAll('[data-community-view]').forEach(button=>button.onclick=()=>showCommunityView(button.dataset.communityView));
$('communitySelectAll').onclick=()=>{
 if(!profileLists)return;
 const selected=new Set(state.selection.map(list=>list.url));
 const additions=communityUI.items().filter(list=>list.url&&!list.empty&&!list.unavailable&&!selected.has(list.url)&&selected.add(list.url));
 if(state.selection.length+additions.length>MAX_CATALOGS){$('results').textContent=copy.communitySelectionLimit.replace('{max}',MAX_CATALOGS);return}
 if(!additions.length)return;
 state.selection.push(...additions);
 additions.forEach(recordCatalogAddition);
 $('results').textContent='';
 renderSelection();
 communityUI.sync();
};

async function loadProfile(username){
 switchTab('profiles');const requestId=listRequest;
 $('results').textContent=copy.loadingLists;
 try{
  const response=await fetch('/api/mdl/profile?username='+encodeURIComponent(username),{signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(requestId!==listRequest)return;
  if(!response.ok)throw Error(data.error||'Profile lookup failed');
  const lists=(data.lists||[]).filter(l=>!l.unavailable&&l.url);
  const watchlists=lists.filter(l=>l.kind==='watchlist'&&!l.combined);
  const combined=lists.filter(l=>l.combined).map(l=>({...l,name:(data.profileName||username)+'’s '+copy.communityAllTitles,description:copy.communityAllTitlesDescription}));
  const custom=lists.filter(l=>l.kind!=='watchlist').sort((a,b)=>(b.loves??-1)-(a.loves??-1));
  state.profile=username;
  setConnectedUser(username);
  profileLists=[...combined,...watchlists,...custom].map(l=>({...l,profile:username,analyticsSource:l.kind==='watchlist'?'community-watchlist':'community-public-list'}));
  $('communityViews').classList.remove('hidden');
  showCommunityView('watchlists');
 }catch(e){if(requestId===listRequest)$('results').textContent=copy.loadFailed+(['TimeoutError','AbortError'].includes(e.name)?copy.searchRetry:e.message)}
}

renderSelection();
function switchTab(tab){profileLists=null;$('communityViews').classList.add('hidden');peopleUI.cleanup();listRequest++;communityUI.reset();state.tab=tab;$('listItems').replaceChildren();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('profileSearch').classList.toggle('hidden',tab!=='profiles');$('discoverSearch').classList.toggle('hidden',tab!=='discover');$('results').textContent='';window.syncAndroidNav?.(currentPage)}
function switchFilter(f){peopleUI.cleanup();listRequest++;state.filter=f;$('listItems').replaceChildren();$('results').textContent='';document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===f);b.setAttribute('aria-pressed',String(b.dataset.filter===f))});const catalogs=f==='catalogs';$('discoverLabel').classList.toggle('hidden',catalogs);$('discoverForm').classList.toggle('hidden',catalogs);$('exploreSearch').classList.toggle('hidden',!catalogs);if(catalogs){exploreUI.render();return}$('discoverInput').placeholder=f==='actor'?copy.searchActors:copy.searchDirectors;$('discoverInput').setAttribute('aria-label','Person name or MyDramaList URL');$('discoverLabel').textContent=copy.discoverSearchLabel;}
function openSelection(tab){navigate('selection');switchTab(tab)}
;
$('skip').onclick=()=>{setConnectedUser('');openSelection('discover')};
$('connectForm').onsubmit=e=>{e.preventDefault();const p=parseSource($('source').value);if(p?.type!=='profile'){$('error').textContent=copy.invalidUsername;return}$('error').textContent='';state.source=p;setConnectedUser(p.value);$('profileInput').value=$('source').value.trim();openSelection('profiles');document.querySelector('.androidDiscoverToolbar h1').textContent='Community';loadProfile(p.value)};
$('profileForm').onsubmit=e=>{e.preventDefault();const p=parseSource($('profileInput').value);if(!p){$('results').textContent=copy.invalidProfile;return}state.source=p;if(p.type==='profile')loadProfile(p.value);else loadDirectList(p.value)};
const synopsisPreview = ${synopsisPreview.toString()};
function renderScore(root,score){
root.replaceChildren();if(typeof score!=='number'||!Number.isFinite(score)||score<=0||score>10)return;
root.setAttribute('aria-label','MyDramaList score '+score+' out of 10');
const stars=document.createElement('span');stars.className='ratingStars';stars.setAttribute('aria-hidden','true');
const ns='http://www.w3.org/2000/svg';
for(let i=0;i<10;i++){const star=document.createElement('span');star.className='ratingStar';
const icon=()=>{const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const shape=document.createElementNS(ns,'polygon');shape.setAttribute('points','12,3 14.8,8.7 21,9.6 16.5,14 17.6,20.2 12,17.3 6.4,20.2 7.5,14 3,9.6 9.2,8.7');svg.append(shape);return svg};
star.append(icon());const fraction=Math.max(0,Math.min(1,score-i));if(fraction>0){const fill=document.createElement('span');fill.className='ratingFill';fill.style.width=(fraction*100)+'%';fill.append(icon());star.append(fill)}stars.append(star)}
const label=document.createElement('span');label.className='ratingValue';label.textContent=score.toFixed(1);const max=document.createElement('span');max.className='ratingMax';max.textContent=' / 10';label.append(max);root.append(stars,label);
}
function renderSynopsis(root,text){root.replaceChildren();if(!text)return;const content=document.createElement('span');content.textContent=synopsisPreview(text);root.append(content)}
const CATEGORIES=${JSON.stringify(CATEGORIES)},COUNTRIES=${JSON.stringify(COUNTRIES)};const exploreCategories=CATEGORIES,exploreCountries=COUNTRIES;
const exploreCatalog=${exploreCatalog.toString()};

const showCatalogTitle=(${installCatalogTitlePreview.toString()})();
const exploreUI=(${installExploreUI.toString()})();
const peopleUI = (${installPeopleUI.toString()})();
const FILTER_COUNTRIES=${JSON.stringify(FILTER_COUNTRIES)},FILTER_GENRES=${JSON.stringify(FILTER_GENRES)};
const shelfCountry=${shelfCountry.toString()},normalizeShelfFilter=${normalizeShelfFilter.toString()},applyShelfFilter=${applyShelfFilter.toString()},shelfFilterLabel=${shelfFilterLabel.toString()},shelfFilterKey=${shelfFilterKey.toString()},shelfNeedsFacts=${shelfNeedsFacts.toString()};
const communityUI=(${installCommunityShelves.toString()})();
$('discoverForm').onsubmit=e=>{
e.preventDefault();listRequest++;$('listItems').replaceChildren();
const input=$('discoverInput').value.trim();
if(/^https?:/i.test(input))peopleUI.fromUrl(input);else if(input.length>=2&&input.length<=100)peopleUI.search(input);else $('results').textContent='Enter a person name between 2 and 100 characters, or a MyDramaList person URL.';
};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>switchFilter(b.dataset.filter));
(${installAndroidDiscover.toString()})();
// Mouse users cannot swipe, so every sideways row gets ‹ › buttons that appear only when the row overflows.
if(finePointer){
 const addRowButtons=track=>{
  if(track.dataset.rowButtons)return;track.dataset.rowButtons='1';
  const bar=document.createElement('div');bar.className='rowScrollButtons';bar.hidden=true;
  for(const [label,amount,name]of [['‹',-1,copy.catalogPrevious],['›',1,copy.catalogNext]]){const b=document.createElement('button');b.type='button';b.className='secondary rowScrollButton';b.textContent=label;b.setAttribute('aria-label',name);b.onclick=()=>track.scrollBy({left:amount*track.clientWidth*.9,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});bar.append(b)}
  track.before(bar);
  const update=()=>{const over=track.scrollWidth>track.clientWidth+4;bar.hidden=!over;if(over){bar.firstChild.disabled=track.scrollLeft<4;bar.lastChild.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-4}};
  track.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(track);new MutationObserver(update).observe(track,{childList:true});update();
 };
 const scan=()=>document.querySelectorAll('.catalogShelfTrack').forEach(addRowButtons);
 new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();
}
else{switchFilter('actor');switchTab(state.tab);navigate(pageForPath(location.pathname),false)}
</script></body></html>`;
const webAppManifest = {
  id: "/",
  name: "YourDramaList",
  short_name: "YDL",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#181818",
  theme_color: "#181818",
  icons: [{src:"/assets/ydl-classic-blue-v1.png",sizes:"256x256",type:"image/png"}],
};
async function handleProfile(url: URL): Promise<Response> {
  const username = url.searchParams.get("username") || "";
  const headers = {"cache-control": "no-store"};
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(username)) {
    return Response.json({error: "Invalid username"}, {status: 400, headers});
  }
  try {
    const sections = await loadWatchlist(username);
    // The shelves load title artwork separately. Profile search only needs the watchlist categories.
    const watchlists = await profileWatchlistCards(username, username);
    const combined = {
      name: username + "’s Watchlist",
      url: "https://mydramalist.com/dramalist/" + username.toLowerCase(),
      kind: "watchlist",
      combined: true,
      empty: watchlists.every(card => card.empty),
      count: new Set(Object.values(sections).flat().map(item => item?.slug).filter(Boolean)).size,
      posters: [...new Set(watchlists.flatMap(card => card.posters))].slice(0, 5),
    };
    return Response.json({username, lists: [combined, ...watchlists], message: "Public watchlist found for " + username + "."}, {headers});
  } catch (error) {
    const missing = (error as {code?: string})?.code === "PRIVATE";
    return Response.json({
      error: missing
        ? "Profile not found, or the watchlist is private. Check the username and try again."
        : "MyDramaList data is temporarily unavailable. Please try again later.",
    }, {status: missing ? 404 : 502, headers});
  }
}

async function handler(req: Request): Promise<Response> {
const url=new URL(req.url);
if(url.pathname==='/site.webmanifest')return Response.json(webAppManifest,{headers:{'content-type':'application/manifest+json'}});
if(url.pathname==='/privacy')return new Response(privacyPage(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});if(url.pathname==='/credits')return new Response(null,{status:302,headers:{'location':'/#tmdb-attribution'}});if(url.pathname==='/assets/ydl-classic-blue-v1.png')return addonIcon();if(url.pathname==='/api/analytics/catalog-add')return recordCatalogAdditionRequest(req,source=>popularity.recordVisit(req,['catalog.added:'+source]));if(url.pathname==='/api/addon/configure'||url.pathname.startsWith('/addon/'))return handleAddon(req);if(/^\/__immutable\/\d+\/(preferencesClient\.ts|preferences\.ts|text\.ts|preferences\.css|catalogShelves\.css)$/.test(url.pathname))return serveImmutableFile(url.pathname);if(url.pathname==='/api/preferences/poster-preview')return handlePosterPreview(req);if(url.pathname==='/api/background/posters')return handlePosterBackground(req);if(['/admin','/api/admin/analytics','/api/admin/errors','/api/admin/weekly'].includes(url.pathname))return handleWallpaper(req);if(['/api/catalogs/weekly','/api/catalogs/shelf'].includes(url.pathname))return handleCollections(req);if(url.pathname==='/api/mdl/explore')return handleExplore(req);if(url.pathname==='/source')return new Response(null,{status:302,headers:{Location:'https://www.val.town/x/Niwa710/YourDramaList'}});if(['/api/mdl/people-search','/api/mdl/person','/api/mdl/filmography'].includes(url.pathname))return handlePeople(req);if(url.pathname==='/api/mdl/list')return handleDirectList(req);if(url.pathname==='/api/mdl/list-owner')return handleListOwner(req);if(url.pathname==='/api/mdl/drama-details')return handleDramaDetails(req);if(url.pathname==='/api/mdl/shelf'||url.pathname==='/api/mdl/title-facts')return handleShelf(req);if(url.pathname==='/'||url.pathname==='/setup'||url.pathname==='/setup/lists'||url.pathname==='/setup/preferences'||url.pathname==='/setup/confirm')return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});if(url.pathname==='/api/mdl/avatar'){const username=url.searchParams.get('username')||'';if(!/^[a-zA-Z0-9_-]{1,60}$/.test(username))return Response.json({error:'Invalid username'},{status:400});return Response.json({avatar:null},{headers:{'cache-control':'public, max-age=3600'}})}if(url.pathname==='/api/mdl/profile')return handleProfile(url);return new Response('Not found',{status:404})}
export default oauthMiddleware(handler);
