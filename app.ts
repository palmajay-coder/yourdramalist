import {NOTIFICATION_CSS,installFloatingNotice} from "./notifications.ts";
import {addonIcon} from "./addonIcon.ts";
import {Ee,K} from "./addonCore.ts";
import {profileWatchlistCards} from "./addonScrape.ts";
import {handleAddon} from "./addon.ts";
import {immutableFileUrl,serveImmutableFile} from "https://esm.town/v/std/utils/index.ts";
import {handlePosterPreview} from "./preferencesPreview.ts";
import {reviewPreviewImage} from "./reviewPreviewImage.ts";
import {pageForPath,MAX_CATALOGS} from "./preferences.ts";
import {handlePosterBackground} from "./posterBackgroundApi.ts";
import {POSTER_SEEDS} from "./posterBackground.ts";
import {installPosterWall,POSTER_WALL_CSS} from "./posterWallClient.ts";
import {handleFeatured} from "./featuredApi.ts";
import {oauthMiddleware} from "https://esm.town/v/std/oauth/middleware.ts";
import {handleWallpaper} from "./wallpaperApi.ts";
import {handleExplore} from "./exploreApi.ts";
import {collections,handleCollections} from "./collectionService.ts";
import {COUNTRIES,CATEGORIES,exploreCatalog,userListName} from "./explore.ts";
import {installExploreUI} from "./exploreClient.ts";
import { handlePeople } from './peopleApi.ts';
import { installPeopleUI } from './peopleClient.ts';
import { handleDirectList } from './directListApi.ts';
import { handleListOwner } from './listOwnerApi.ts';
import { synopsisPreview } from './dramaDetails.ts';
import { APP_VERSION, TEXT } from './text.ts';
import { recordCatalogAddition as recordCatalogAdditionRequest } from './analyticsApi.ts';
import { handlePopularLists } from './popularListsApi.ts';
import { handleDramaDetails } from './dramaDetailsApi.ts';
import { handleDramaSearch } from './dramaSearchApi.ts';
import { privacyPage } from './privacyPage.ts';
async function watchlistPreviewArtwork(item) {
 const isTmdbPoster=value=>/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\//.test(value||"");
 const matched=await collections.artwork({url:item.link,name:item.title,details:[item.type,item.year].filter(Boolean).join(" - ")},item.country||"");
 if(isTmdbPoster(matched.poster))return matched.poster;
 const [meta]=await Ee([item],K(item.type),null,true);
 if(!/^tt\d+$/.test(meta?.id||""))return null;
 const [artwork]=await collections.standardArtwork([meta]);
 return isTmdbPoster(artwork?.poster)?artwork.poster:null;
}
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YourDramaList</title>
<link rel="stylesheet" href="${immutableFileUrl("/preferences.css")}">
<link rel="stylesheet" href="${immutableFileUrl("/catalogShelves.css")}">
<style>
:root{color-scheme:dark;--bg:#101318;--panel:#1b2028;--line:#343b45;--text:#f4f5f8;--muted:#a8b1bd;--accent:#338bd4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,-apple-system,sans-serif}button,input{font:inherit}button{cursor:pointer}header,footer{padding:22px clamp(20px,5vw,70px);display:flex;justify-content:space-between;align-items:center}header strong{letter-spacing:.4px}header small{background:#b72e38;padding:4px 7px;border-radius:4px;margin-left:8px}.shell{max-width:1120px;margin:auto;padding:40px 22px 90px;min-height:70vh}.hero{text-align:center;padding:100px 0}.hero h1{font-size:clamp(40px,7vw,76px);margin:0 0 12px}.hero p,.muted{color:var(--muted)}.primary{background:var(--accent);border:0;color:var(--button-text,#fff);border-radius:8px;padding:13px 20px;font-weight:650}.secondary{background:transparent;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:12px 18px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px}.connect{max-width:620px;margin:50px auto}.connect h1{font-size:42px;margin-bottom:8px}label{display:block;font-weight:650;margin-bottom:10px}input{background:#11161c;border:1px solid var(--line);border-radius:8px;color:var(--text);padding:14px;width:100%}.connect form{display:grid;gap:12px}.or{text-align:center;color:var(--muted);margin:22px}.hidden{display:none!important}.steps{display:flex;gap:18px;color:var(--muted);margin-bottom:30px}.steps .active{color:white}.tabs,.filters{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.tabs button,.filters button{background:transparent;color:var(--muted);border:1px solid var(--line);padding:11px 15px;border-radius:8px}.tabs button.active,.filters button.active{background:#263d51;color:white;border-color:var(--accent)}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px}.searchrow{display:flex;gap:10px}.searchrow button{white-space:nowrap}.notice{margin-top:18px;padding:22px;border:1px dashed var(--line);border-radius:12px;color:var(--muted)}.sidebar{align-self:start;position:sticky;top:22px}.listcard{display:flex;align-items:center;gap:18px;border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0;background:var(--panel)}.listcard input[type=checkbox]{width:20px;height:20px;flex:0 0 20px;accent-color:var(--accent)}.posters{display:flex;flex:0 0 235px;min-width:0}.posters img{width:73px;height:102px;object-fit:cover;border-radius:6px;box-shadow:2px 2px 5px #0008;background:#29313b}.posters img+img{margin-left:-33px}.listinfo{min-width:0;flex:1}.listinfo h3{margin:0 0 6px;color:var(--link);font-size:17px}.listinfo p{color:var(--muted);font-size:13px;line-height:1.5}.stats{display:flex;gap:16px;color:var(--muted);font-size:13px}.selectedItem{display:flex;justify-content:space-between;gap:8px;margin:10px 0}.selectedItem button{background:transparent;border:0;color:#ff9a9a;cursor:pointer}footer{color:var(--muted);font-size:13px}@media(max-width:740px){.listcard{flex-wrap:wrap}.posters{flex-basis:100%}.workspace{grid-template-columns:1fr}.sidebar{position:static}.hero{padding:65px 0}.searchrow{flex-wrap:wrap}.searchrow button{width:100%}}
:root{--input:#11161c;--link:#4ba4ed;--tab:#263d51}body.light{color-scheme:light;--bg:#f5f7fa;--panel:#fff;--line:#dce3eb;--text:#222b35;--muted:#667585;--accent:#1976b8;--input:#fff;--link:#1676b8;--tab:#dcecf8}body{transition:background .15s,color .15s}input{background:var(--input)}.tabs button.active,.filters button.active{background:var(--tab);color:var(--text)}.listinfo h3{color:var(--link)}.workspace{align-items:start}.sidebar{margin-top:0}.selectedItem{align-items:center;gap:7px;margin:8px 0}.selectedTitle{font-size:12.5px;line-height:1.35;min-width:0;flex:1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.selectedItem button{flex:0 0 20px;font-size:19px}.profileHeading{display:flex;align-items:center;gap:9px;margin:18px 0 12px}.profileAvatar{width:32px;height:32px;flex:0 0 32px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;background:var(--tab);color:var(--link);font-weight:700}.profileAvatar img{width:100%;height:100%;object-fit:cover}.profileName{color:var(--link);font-weight:700;overflow-wrap:anywhere}.sidebar h3{margin:0 0 12px}.sidebar .primary{margin-top:14px}.selectionClear{display:block;margin-top:12px;padding:6px 0;background:transparent;border:0;color:var(--muted);font-size:13px;text-decoration:underline;text-underline-offset:3px}.selectionClear:hover{color:var(--text)}.selectionClear:focus-visible{outline:2px solid var(--link);outline-offset:4px}#results:empty{display:none}@media(max-width:740px){.sidebar{margin-top:0}}body{font-family:Lato,Arial,sans-serif}button,input{font-family:inherit}header{position:relative;isolation:isolate;background:var(--season-bar,#075989);color:#fff;min-height:86px;gap:20px}.headerBackground{position:absolute;inset:0;z-index:0;pointer-events:none;background-position:center;background-size:cover;background-repeat:no-repeat}header>*:not(.headerBackground){position:relative;z-index:1}header .brand{color:#fff;text-decoration:none;font-weight:900;font-size:clamp(25px,3vw,38px);line-height:1;letter-spacing:-1.4px;display:inline-flex;align-items:center}header .brandList{position:relative;display:inline-block}header .brandVersion{position:absolute;right:0;bottom:calc(100% + 2px);font-size:11px;letter-spacing:0;font-weight:900;line-height:1.1;background:#e3374b;color:#fff;border-radius:4px;padding:3px 5px;white-space:nowrap}header #themeToggle{color:#fff;border-color:#ffffff70;font-size:13px;padding:9px 13px}body.light{--bg:#f4f6f9;--panel:#fff;--line:#d5dce5;--text:#263443;--muted:#657585;--accent:#1976b8;--input:#fff;--link:#1676b8;--tab:#dcecf8}body.light .steps .active{color:#243341;font-weight:700}body.light .steps{color:#67798a}body.light .tabs button.active,body.light .filters button.active{color:#154d76}body.light .listinfo h3{color:var(--link)!important}body.light .listinfo h3,body.light .profileName{font-family:Lato,Arial,sans-serif}body.light .listinfo p{color:#5d6b79}body.light .selectedTitle{color:#384554}body.light .listcard{background:#fff}body.light .secondary{color:var(--text)}.listinfo h3{font-family:Lato,Arial,sans-serif;font-weight:700}header .brand:focus-visible,header button:focus-visible{outline:2px solid #fff;outline-offset:4px}@media(max-width:520px){header{min-height:75px}.brandVersion{font-size:9px!important}}body:not(.light){--bg:#181818;--panel:#242424;--line:#333333;--text:#dddddd;--muted:#999999;--accent:#1976b8;--input:#242424;--link:#2196d2;--tab:#303a42}body:not(.light) .panel,body:not(.light) .listcard{background:#242424}body:not(.light) .steps .active{color:#f1f1f1}body:not(.light) .tabs button.active,body:not(.light) .filters button.active{background:#303a42;color:#f1f1f1}body:not(.light) .notice{background:#202020}body:not(.light) input{background:#242424}body:not(.light) .listinfo h3{color:var(--link)}body:not(.light) .secondary{background:#383838;color:#ddd}footer{justify-content:center;text-align:center}.tmdbAttribution{width:min(640px,calc(100% - 40px));margin:0 auto;padding-top:0;text-align:center;color:var(--muted);font-size:11px;line-height:1.45}.tmdbAttribution strong{display:block;margin-bottom:4px;font-size:11px;letter-spacing:.04em}.tmdbAttributionContent{display:flex;justify-content:center;align-items:center;gap:8px}.tmdbAttributionContent p{margin:0}.tmdbAttribution img{width:56px;height:auto;display:block}@media(max-width:520px){.tmdbAttributionContent{gap:6px}.tmdbAttribution{font-size:10px}}.dramaMatch{display:flex;gap:18px;padding:18px;margin:12px 0;background:var(--panel);border:1px solid var(--line);border-radius:12px}.dramaMatch>img{width:76px;height:108px;object-fit:cover;border-radius:6px;flex:0 0 76px}.dramaMatchInfo{min-width:0}.dramaMatch h3{margin:0 0 6px;color:var(--link);font-size:17px;overflow-wrap:anywhere}.dramaMatch p{margin:0 0 12px;color:var(--muted);font-size:13px}.searchPages{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}#results>button{margin:10px 0}@media(max-width:420px){.dramaMatch{gap:12px;padding:12px}.dramaMatch .secondary{font-size:13px;padding:10px}}.dramaSynopsis{white-space:pre-wrap;line-height:1.6}.synopsisToggle{background:none;border:0;padding:0 0 0 5px;color:var(--link);text-decoration:underline}.dramaMatch .dramaStats{color:var(--text);line-height:1.6}.dramaMatch .detailsStatus{font-size:12px}
.dramaMatchInfo{flex:1}.dramaHeading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.dramaPopularity{white-space:nowrap;color:var(--muted);font-size:12px;padding-top:2px}.dramaHeading h3{flex:1}.dramaMatch .dramaStats{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:3px 0 16px;font-size:14px}.ratingStars{display:inline-flex;gap:2px;color:#b18421}body:not(.light) .ratingStars{color:#d6b35f}.ratingStar{position:relative;display:block;width:13px;height:13px}.ratingStar svg{display:block;width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.25;stroke-linejoin:round}.ratingFill{position:absolute;top:0;left:0;height:100%;overflow:hidden}.ratingFill svg{fill:currentColor}.ratingMax{color:var(--muted);font-size:12px}.dramaMatch .dramaSynopsis{font-size:14px;line-height:1.6}@media(max-width:540px){.dramaHeading{flex-wrap:wrap;gap:3px}.dramaHeading h3{flex-basis:100%}.dramaPopularity{margin-bottom:8px}}
.personSource{display:inline-block;margin:10px 0 0 12px;color:var(--link);font-size:12px}.filmographyPreview{margin:14px 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.filmographyPreview summary{cursor:pointer;color:var(--link)}.filmographyPreview ol{padding-left:24px}.filmographyPreview li{padding:7px 0;overflow-wrap:anywhere;line-height:1.5;font-size:13px}.filmographyPreview a{color:var(--link)}.personMatch .dramaSynopsis{white-space:pre-wrap}.detailsStatus:empty{display:none}body{min-height:100dvh;display:flex;flex-direction:column}.shell{width:100%;flex:1}footer{margin-top:auto;flex-direction:column;gap:7px;padding:14px clamp(20px,5vw,70px) 16px;background:rgba(16,19,24,.96);border-top:1px solid #ffffff18;min-height:112px}body.light footer{background:rgba(245,247,250,.97);border-top-color:#00000012}header{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}header .brand{justify-self:start}header #themeToggle{justify-self:end}header .steps{margin:0;font-size:15px;gap:20px;justify-content:center;color:#c9e0ee}header .steps :is(span,button){position:relative;padding:12px 0;white-space:nowrap}header .steps button{font:inherit;background:none;border:0;border-radius:0;color:inherit}header .steps button:disabled{cursor:default;opacity:1}header .steps button:not(:disabled){color:#fff;cursor:pointer}header .steps button:not(:disabled):hover{color:#fff;background:#ffffff12}header .steps .active:after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent)}header .steps .active,body.light header .steps .active{color:#fff}body.light header .steps{color:#c9e0ee}body[data-page=landing] header{display:none}body[data-page=landing] .shell{display:flex;align-items:center;justify-content:center;padding:50px 22px;min-height:calc(100dvh - 150px)}body[data-page=landing] footer{position:fixed;left:0;right:0;bottom:0;z-index:3}.hero{padding:70px 0;position:relative;z-index:1}.hero h1{font-weight:900;letter-spacing:-2px}.pageBack{margin-bottom:16px}#wallpaper{position:fixed;inset:0;pointer-events:none;z-index:-1;background-position:center;background-size:cover}#wallpaperTint{position:absolute;inset:0}body.hasWallpaper[data-page=landing]{background:transparent}body.hasWallpaper[data-page=landing] .hero{color:#fff;text-shadow:0 1px 12px #0008}body.hasWallpaper[data-page=landing] .hero p,body.hasWallpaper[data-page=landing] footer{color:#eee}#exploreCountry{width:100%;padding:14px;border:1px solid var(--line);border-radius:8px;background:var(--input);color:var(--text);font:inherit}.posters:empty{display:none}.watchlistPosterPlaceholder{display:grid;place-items:center;width:100%;height:102px;padding:8px;text-align:center;border:1px solid var(--line);border-radius:6px;background:var(--input);color:var(--muted);font-size:12px}.listinfo button{margin-top:8px;padding:8px 12px;font-size:13px}#exploreSearch label{margin-bottom:10px}@media(max-width:1050px){header{grid-template-columns:1fr auto;gap:14px}header .steps{grid-column:1/-1;grid-row:2;justify-content:center;gap:15px;white-space:nowrap}}@media(max-width:420px){header .steps{font-size:13px;gap:12px}}
:is(body,body.light,body:not(.light)) .discoverModes.communityViews{margin:8px 0 10px}:is(body,body.light,body:not(.light)) #communitySelectAll{margin-left:auto;color:var(--link);text-decoration:underline;font-size:13px}.discoverModes{gap:24px;border-bottom:1px solid var(--line);margin:0 0 22px;flex-wrap:wrap}:is(body,body.light,body:not(.light)) .discoverModes button{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:var(--muted);padding:4px 0 13px}:is(body,body.light,body:not(.light)) .discoverModes button.active{background:transparent;color:var(--text);border-bottom-color:var(--link)}@media(max-width:420px){:is(body,body.light,body:not(.light)) .discoverModes{gap:20px;font-size:14px}}.featuredHero{position:relative;isolation:isolate;overflow:hidden;border-radius:14px;background:rgb(var(--banner-tint,20,33,47));color:#fff;min-height:170px;padding:34px 36px;display:flex;align-items:flex-start;justify-content:space-between;gap:32px;flex-direction:column}.featuredHero.hasFeatured{min-height:250px}.featuredArt{position:absolute;inset:0 0 0 30%;display:flex;z-index:-2}.featuredArt img{flex:1;min-width:0;width:0;height:100%;object-fit:cover;object-position:center 25%;filter:saturate(.7)}.featuredShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(var(--banner-tint,20,33,47),.98) 12%,rgba(var(--banner-tint,20,33,47),.91) 35%,rgba(var(--banner-tint,20,33,47),.46) 70%,rgba(var(--banner-tint,20,33,47),.19));z-index:-1}.featuredHero h1{margin:0 0 10px}.featuredHero .muted{color:#d1dce5;margin:0;font-size:15px}.featuredLabel{display:block;color:var(--season-highlight,#dce5ec);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:7px}.featuredCopy h2{font-size:20px;line-height:1.3;margin:0 0 10px;max-width:460px;color:#fff}.featuredCopy a{color:#fff;font-size:13px;text-decoration:none;border-bottom:1px solid #ffffff80;padding-bottom:2px}.featuredCopy .featuredBy{margin:0 0 10px;color:#d1dce5;font-size:13px}.featuredCopy a.featuredAdd{display:inline-block;border:1px solid var(--accent);border-radius:7px;padding:8px 12px;background:var(--accent);color:var(--button-text,#fff);font-weight:700;text-decoration:none}.featuredCopy a.featuredAdd.is-added{opacity:.75;pointer-events:none}@media(max-width:600px){.featuredHero{padding:24px}.featuredHero.hasFeatured{min-height:300px}.featuredHero h1{font-size:27px}.featuredArt{left:0;opacity:.6}.featuredShade{background:linear-gradient(90deg,#14212fe8,#14212f65)}}body[data-page=selection] .shell{padding-top:16px}${POSTER_WALL_CSS}${NOTIFICATION_CSS}body[data-page=landing] .motionBackdrop{display:block}body[data-page=landing] .shell,body[data-page=landing] footer{position:relative;z-index:1}body[data-page=landing]{background:#111315}body[data-page=landing] .hero h1{color:#fff}body[data-page=landing] .hero p,body[data-page=landing] footer{color:#cdd3dc}body[data-page=landing] .hero{text-shadow:0 2px 24px #0008}body[data-page=landing] .primary{box-shadow:0 8px 32px #0005}body.hasWallpaper[data-page=landing] .motionBackdrop{display:none}.landingBrandList{position:relative;display:inline-block}.landingBrandVersion{position:absolute;right:0;bottom:calc(100% + 3px);font:900 clamp(10px,1.2vw,13px)/1.1 Lato,Arial,sans-serif;letter-spacing:0;padding:4px 6px;border-radius:4px;background:#e3374b;color:#fff;text-shadow:none;white-space:nowrap}.featuredHero.hasCarousel{padding-inline:56px;touch-action:pan-y}.featuredCopy h2{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.featuredArrow{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border:1px solid #ffffff60;border-radius:7px;color:#fff;background:#101a24b8;font-size:22px;padding:0}.featuredArrow:hover{background:var(--accent);color:var(--button-text,#fff)}#featuredPrevious{left:8px}#featuredNext{right:8px}@media(max-width:740px){.featuredHero.hasCarousel{padding-inline:47px}.featuredArrow{width:32px;height:36px}}</style></head><body><div id="wallpaper" hidden><div id="wallpaperTint"></div></div><header><div class="headerBackground" id="headerBackground" aria-hidden="true"></div><a class="brand" href="/" aria-label="YourDramaList home"><span>YourDramaList</span></a><nav class="steps" aria-label="Setup progress"><button id="step1" type="button" class="active" disabled>${TEXT.stepConnect}</button><button id="step2" type="button" disabled>${TEXT.stepLists}</button><button id="step3" type="button" disabled>${TEXT.stepPreferences}</button><button id="step4" type="button" disabled>${TEXT.stepConfirm}</button></nav><button id="themeToggle" class="secondary" type="button" aria-label="Switch color theme">☀ Light mode</button></header><main class="shell">
<section id="landing" class="hero"><h1>${TEXT.siteName}</h1><p>${TEXT.subtitle}</p><button class="primary" id="start">${TEXT.getStarted}</button></section>
<div id="setup" class="hidden">
<section id="connect" class="connect"><h1>${TEXT.connectTitle}</h1><p class="muted">${TEXT.connectDescription}</p><form class="panel" id="connectForm"><label for="source">${TEXT.usernameLabel}</label><input id="source" required maxlength="200" autocomplete="username" placeholder="${TEXT.usernamePlaceholder}"><button class="primary" type="submit">${TEXT.findLists}</button><span id="error" role="alert" style="color:#ff8e95"></span></form><div class="or">${TEXT.or}</div><button class="secondary" id="skip" style="width:100%">${TEXT.skipAccount}</button></section>
<section id="selection" class="hidden"><div class="featuredHero" id="featuredHero"><div class="featuredArt" id="featuredArt"></div><div class="featuredShade"></div><div class="featuredIntro"><h1 id="featuredHeading">${TEXT.listsTitle}</h1><p class="muted" id="featuredSubtitle">${TEXT.listsDescription}</p></div><div class="featuredCopy hidden" id="featuredCopy" aria-live="polite"><span class="featuredLabel" id="featuredLabel">${TEXT.featuredListLabel}</span><h2 id="featuredTitle"></h2><p class="featuredBy" id="featuredBy" hidden></p><a id="featuredLink" class="featuredAdd" href="#">${TEXT.featuredListAdd}</a></div><button type="button" class="featuredArrow hidden" id="featuredPrevious" aria-label="Previous banner">‹</button><button type="button" class="featuredArrow hidden" id="featuredNext" aria-label="Next banner">›</button></div><div class="tabs"><button data-tab="profiles">${TEXT.profilesTab}</button><button data-tab="discover">${TEXT.discoverTab}</button></div><div class="workspace"><div><div id="profileSearch"><form id="profileForm"><label for="profileInput">${TEXT.profileSearchLabel}</label><div class="searchrow"><input id="profileInput" placeholder="${TEXT.profilePlaceholder}" required><button class="primary">${TEXT.search}</button></div></form><div id="communityViews" class="filters discoverModes communityViews hidden" role="group" aria-label="${TEXT.communityListTypes}"><button type="button" data-community-view="watchlists" aria-pressed="true">${TEXT.communityWatchlists}</button><button type="button" data-community-view="custom" aria-pressed="false">${TEXT.communityCustomLists}</button><button type="button" id="communitySelectAll">${TEXT.communitySelectAll}</button></div></div><div id="discoverSearch" class="hidden"><div class="filters discoverModes" role="group" aria-label="Discover categories"><button data-filter="drama">${TEXT.dramas}</button><button data-filter="actor">${TEXT.actors}</button><button data-filter="director">${TEXT.directors}</button><button data-filter="catalogs">Catalogs</button></div><label id="discoverLabel" for="discoverInput">${TEXT.discoverSearchLabel}</label><form id="discoverForm" class="searchrow"><input id="discoverInput" aria-label="Drama name or MyDramaList URL" maxlength="500" required placeholder="Search dramas..."><button class="primary">Search</button></form><div id="exploreSearch" class="hidden"></div></div><div id="results" role="status"></div><div id="listItems"></div></div><aside class="panel sidebar"><h3>${TEXT.selectionTitle} <span id="count">(0)</span></h3><div class="muted" id="selectionMessage">${TEXT.emptySelection}</div><button class="primary" disabled id="continue">${TEXT.continue}</button><button class="selectionClear hidden" type="button" id="clearSelection">${TEXT.clearSelection}</button></aside></div></section><section id="preferences" class="preferencesPage prefPage hidden" aria-label="${TEXT.stepPreferences}"></section><section id="confirm" class="preferencesPage prefPage hidden" aria-label="${TEXT.stepConfirm}"></section></div>
</main><footer><span id="landingFooter">${TEXT.footer}</span><span id="buildFooter"><a href="https://github.com/palmajay-coder/yourdramalist" target="_blank" rel="noopener noreferrer">Valtown public build</a> · v${APP_VERSION} · <a href="/privacy">Privacy</a></span><section class="tmdbAttribution" id="tmdb-attribution" aria-label="TMDB Attribution Notice"><strong>TMDB Attribution Notice</strong><div class="tmdbAttributionContent"><a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB"></a><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div></section></footer>
<script>
const copy = ${JSON.stringify(TEXT)};
const MAX_CATALOGS = ${MAX_CATALOGS};
const notices=(${installFloatingNotice.toString()})(copy);
const $=id=>document.getElementById(id);const seasonThemes={fall:{bar:'#713b2d',accent:'#d79455',buttonText:'#281b18',linkDark:'#efad6e',linkLight:'#854a21',tabDark:'#3b2a24',tabLight:'#f4e8de',bannerTint:'40,27,24'},winter:{bar:'#31515a',accent:'#b6dde4',buttonText:'#18323a',linkDark:'#b8e6ec',linkLight:'#205d69',tabDark:'#25383d',tabLight:'#e7f2f3',bannerTint:'26,43,49'},spring:{bar:'#49634b',accent:'#a6c879',buttonText:'#24321f',linkDark:'#bddc91',linkLight:'#496b32',tabDark:'#2a3b2c',tabLight:'#e8f0e1',bannerTint:'34,47,34'},summer:{bar:'#145e58',accent:'#f1bc60',buttonText:'#362714',linkDark:'#f3c768',linkLight:'#80520b',tabDark:'#233e3b',tabLight:'#e6f1e8',bannerTint:'18,43,39'}};
function applySeasonalTheme(season){const t=seasonThemes[season]||seasonThemes.fall,light=document.body.classList.contains('light'),style=document.body.style;document.body.dataset.season=season;style.setProperty('--season-bar',t.bar);style.setProperty('--season-highlight',t.accent);style.setProperty('--banner-tint',t.bannerTint);style.setProperty('--button-text',t.buttonText);style.setProperty('--accent',t.accent);style.setProperty('--link',light?t.linkLight:t.linkDark);style.setProperty('--tab',light?t.tabLight:t.tabDark)}
const themeKey='ydl-v3-theme';function applyTheme(t){document.body.classList.toggle('light',t==='light');applySeasonalTheme(seasonForDate());$('themeToggle').textContent=t==='light'?copy.darkMode:copy.lightMode;try{localStorage.setItem(themeKey,t)}catch{}}applyTheme(localStorage.getItem(themeKey)==='light'?'light':'dark');$('themeToggle').onclick=()=>applyTheme(document.body.classList.contains('light')?'dark':'light');
const userListName=${userListName.toString()};
const state={tab:'discover',filter:'drama',source:null,selection:[],profile:''};
let featuredRequest, featuredTimer, featuredExpires=0, bannerSlides=[], bannerIndex=0;
function seasonForDate(){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",month:"numeric",day:"numeric"}).formatToParts(new Date());
 const month=Number(parts.find(part=>part.type==="month")?.value),day=Number(parts.find(part=>part.type==="day")?.value);
 if(month>=9&&month<=11)return "fall";
 if(month===12||month<=2)return "winter";
 if(month>=3&&month<=5)return "spring";
 return "summer";
}
function applySeasonalCopy(season){const seasonal=copy.seasonalBannerCopy[season]||copy.seasonalBannerCopy.fall;applySeasonalTheme(season);$("featuredHeading").textContent=seasonal.title;$("featuredSubtitle").textContent=seasonal.description}
applySeasonalCopy(seasonForDate());
function syncFeaturedAdd(){const slide=bannerSlides[bannerIndex],link=$("featuredLink");if(!slide||!link)return;const added=state.selection.some(list=>list.url===slide.url);link.textContent=added?copy.featuredListAdded:copy.featuredListAdd;link.classList.toggle("is-added",added);link.setAttribute("aria-disabled",String(added))}
function showBanner(index){
 if(!bannerSlides.length)return;
 bannerIndex=(index+bannerSlides.length)%bannerSlides.length;
 const slide=bannerSlides[bannerIndex],url=slide.url||"https://mydramalist.com/list/"+slide.id;
 $("featuredTitle").textContent=slide.title;
 $("featuredLabel").textContent=copy.featuredListLabel;
 const owner=slide.profile||"";
 $("featuredBy").textContent=owner?"by "+owner:"";
 $("featuredBy").hidden=!owner;
 $("featuredArt").replaceChildren();
 for(const raw of (Array.isArray(slide.images)?slide.images:[]).slice(0,5)){
  try{const image=new URL(raw);const mdl=image.origin==="https://i.mydramalist.com";const tmdb=image.origin==="https://image.tmdb.org"&&image.pathname.startsWith("/t/p/w780/");if((!mdl&&!tmdb)||image.username||image.password)continue;const img=document.createElement("img");img.src=image.href;img.alt="";img.referrerPolicy="no-referrer";$("featuredArt").append(img)}catch{}
 }
 $("featuredLink").href="#";
 $("featuredLink").onclick=event=>{event.preventDefault();if(state.selection.some(list=>list.url===url))return;toggleList({url,name:slide.title,originalName:slide.title,profile:slide.profile||"",profileName:slide.profileName||slide.profile||"",description:slide.description||"",posters:slide.images||[],count:slide.count,analyticsSource:"featured-list"})};
 $("featuredCopy").classList.remove("hidden");
 $("featuredHero").classList.add("hasFeatured");
 syncFeaturedAdd();
 requestAnimationFrame(alignSelection);
}
$("featuredPrevious").onclick=()=>showBanner(bannerIndex-1);
$("featuredNext").onclick=()=>showBanner(bannerIndex+1);
$("featuredHero").addEventListener("keydown",event=>{if(bannerSlides.length<2||!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();showBanner(bannerIndex+(event.key==="ArrowLeft"?-1:1))});
let bannerTouch;
$("featuredHero").addEventListener("touchstart",event=>{bannerTouch=event.touches.length===1?event.touches[0]:null},{passive:true});
$("featuredHero").addEventListener("touchend",event=>{if(!bannerTouch||bannerSlides.length<2)return;const end=event.changedTouches[0],dx=end.clientX-bannerTouch.clientX,dy=end.clientY-bannerTouch.clientY;bannerTouch=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))showBanner(bannerIndex+(dx<0?1:-1))},{passive:true});
function loadFeaturedBanner(){
 if(featuredExpires>Date.now()||featuredRequest)return featuredRequest;
 featuredRequest=fetch("/api/mdl/featured",{signal:AbortSignal.timeout(12000)}).then(response=>response.ok?response.json():null).then(data=>{
  if(data?.season)applySeasonalCopy(data.season);
  const valid=slide=>slide&&typeof slide.title==="string"&&/^[A-Za-z0-9_-]{4,20}$/.test(slide.id)&&slide.url==="https://mydramalist.com/list/"+slide.id;
  const slides=(Array.isArray(data?.slides)?data.slides:[]).filter(valid).slice(0,3);
  if(slides.length){const active=bannerSlides[bannerIndex]?.id;bannerSlides=slides;showBanner(Math.max(0,slides.findIndex(slide=>slide.id===active)));}
  for(const id of ["featuredPrevious","featuredNext"])$(id).classList.toggle("hidden",slides.length<2);
  $("featuredHero").classList.toggle("hasCarousel",slides.length>1);
  const next=Date.parse(data?.nextRefresh);if(!Number.isFinite(next))return;
  featuredExpires=Math.max(Date.now()+60000,next);clearTimeout(featuredTimer);featuredTimer=setTimeout(()=>{if(currentPage==="selection")loadFeaturedBanner()},featuredExpires-Date.now()+1000);
 }).catch(()=>{}).finally(()=>{featuredRequest=undefined});
 return featuredRequest;
}

const posterWall = (${installPosterWall.toString()})(${JSON.stringify(POSTER_SEEDS)},['connect','landing']);
let currentPage='landing',preferencesUI,preferencesReady;
let connectedUser='';try{const saved=localStorage.getItem('ydl-v3-user')||'';if(/^[a-zA-Z0-9_-]{1,60}$/.test(saved))connectedUser=saved}catch{}
function setConnectedUser(user){connectedUser=user;try{user?localStorage.setItem('ydl-v3-user',user):localStorage.removeItem('ydl-v3-user')}catch{}}
const pageForPath=${pageForPath.toString()};
function ensurePreferences(){return preferencesReady??=import(${JSON.stringify(immutableFileUrl('/preferencesClient.ts'))}).then(m=>{preferencesUI=m.installPreferencesUI({navigate,selection:()=>state.selection,user:()=>connectedUser});return preferencesUI}).catch(()=>{preferencesReady=undefined;const root=$(currentPage==='confirm'?'confirm':'preferences');root.textContent=copy.preferencesUnavailable;return null})}
function navigate(page,push=true){
if(['preferences','confirm'].includes(page)&&!state.selection.length)page='selection';
currentPage=page;if(page==='selection')loadFeaturedBanner();document.body.dataset.page=page;$('landingFooter').hidden=page==='landing';$('buildFooter').hidden=page==='landing';$('tmdb-attribution').hidden=page!=='landing';posterWall.update(page);requestAnimationFrame(alignSelection);
$('landing').classList.toggle('hidden',page!=='landing');$('setup').classList.toggle('hidden',page==='landing');
for(const id of ['connect','selection','preferences','confirm'])$(id).classList.toggle('hidden',page!==id);
const order=['connect','selection','preferences','confirm'],index=order.indexOf(page);
order.forEach((name,i)=>{const step=$('step'+(i+1)),active=name===page;step.classList.toggle('active',active);step.disabled=i>=index; if(active)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current')});
$('wallpaper').hidden=page!=='landing'||!document.body.classList.contains('hasWallpaper');
const paths={landing:'/',connect:'/setup',selection:'/setup/lists',preferences:'/setup/preferences',confirm:'/setup/confirm'};const path=paths[page]||'/';if(push&&location.pathname!==path)history.pushState({ydlPage:page},'',path);
if(['preferences','confirm'].includes(page))ensurePreferences().then(ui=>{if(ui&&currentPage===page)ui.show(page)});
}
$('step1').onclick=()=>navigate('connect');$('step2').onclick=()=>navigate('selection');$('step3').onclick=()=>navigate('preferences');
$('continue').onclick=()=>navigate('preferences');
document.querySelector('header .brand').onclick=e=>{e.preventDefault();navigate('landing')};
window.addEventListener('popstate',()=>navigate(pageForPath(location.pathname),false));
function applyWallpaper(v){if(!v||typeof v.image!=='string'||!/^#[0-9a-f]{6}$/i.test(v.tint)||typeof v.opacity!=='number'||v.opacity<0||v.opacity>1)return;let image='';if(v.image.startsWith('data:image/png;base64,')||v.image.startsWith('data:image/jpeg;base64,')||v.image.startsWith('data:image/webp;base64,'))image=v.image;else try{const u=new URL(v.image);if(u.protocol==='https:')image=u.href}catch{}$('wallpaper').style.backgroundImage=image?'url('+JSON.stringify(image)+')':'';$('wallpaperTint').style.backgroundColor=v.tint;$('wallpaperTint').style.opacity=v.opacity;const imageMode=v.mode==='image'&&!!image;document.body.classList.toggle('hasWallpaper',imageMode);$('wallpaper').hidden=currentPage!=='landing'||!imageMode}
function applyHeaderBackground(v){const layer=$('headerBackground');if(!layer)return;let image='';if(typeof v?.bannerImage==='string'){if(/^data:image\\/(png|jpeg|webp);base64,/.test(v.bannerImage))image=v.bannerImage;else try{const u=new URL(v.bannerImage);if(u.protocol==='https:')image=u.href}catch{}}const opacity=typeof v?.bannerOverlay==='number'&&Number.isFinite(v.bannerOverlay)?Math.max(0,Math.min(.85,v.bannerOverlay)):.38;layer.style.backgroundImage=image?'linear-gradient(rgba(0,0,0,'+opacity+'),rgba(0,0,0,'+opacity+')),url('+JSON.stringify(image)+')':''}
const isWallpaperPreview=new URL(location.href).searchParams.get('wallpaper-preview')==='1';let previewReceived=false;
if(isWallpaperPreview)window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='ydl-wallpaper-preview'){previewReceived=true;applyWallpaper(e.data.settings);applyHeaderBackground(e.data.settings)}});
fetch('/api/appearance').then(r=>r.json()).then(v=>{if(!previewReceived){applyWallpaper(v);applyHeaderBackground(v)}}).catch(()=>{});
function parseSource(raw){const s=raw.trim();if(/^[a-zA-Z0-9_-]{1,60}$/.test(s))return{type:'profile',value:s};let u;try{u=new URL(s)}catch{return null}if(!['mydramalist.com','www.mydramalist.com'].includes(u.hostname.toLowerCase())||!['https:','http:'].includes(u.protocol))return null;const parts=u.pathname.split('/').filter(Boolean);if(parts.length!==2||!['profile','dramalist','list'].includes(parts[0].toLowerCase())||!/^[a-zA-Z0-9_-]{1,60}$/.test(parts[1]))return null;return{type:parts[0].toLowerCase()==='list'?'list':'profile',value:parts[1]}}
const selectionKey='ydl-v3-selection';try{state.selection=JSON.parse(localStorage.getItem(selectionKey)||'[]');if(!Array.isArray(state.selection))state.selection=[]}catch{state.selection=[]}
let activeLists=[];let listRequest=0;
const avatarRequests=new Map();
function loadProfileAvatar(user){
if(avatarRequests.has(user))return avatarRequests.get(user);
const request=fetch('/api/mdl/avatar?username='+encodeURIComponent(user)).then(r=>r.ok?r.json():null).catch(()=>null).then(data=>{if(!data?.avatar)avatarRequests.delete(user);return data});
avatarRequests.set(user,request);return request;
}
const ownerQueued=new Set();const ownerQueue=[];let ownerActive=0;
function resolveSelectedOwners(){
for(const l of state.selection){if(l.kind==='filmography'||l.kind==='explore'||l.kind==='weekly'||l.profile&&l.profile!=='MyDramaList'||ownerQueued.has(l.url)||!l.url)continue;ownerQueued.add(l.url);ownerQueue.push(l.url)}
while(ownerActive<3&&ownerQueue.length){const url=ownerQueue.shift();ownerActive++;
(async()=>{let owner=null;try{const r=await fetch('/api/mdl/list-owner?url='+encodeURIComponent(url));if(r.ok)owner=await r.json()}catch{}
const valid=owner&&typeof owner.profile==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(owner.profile);
state.selection=state.selection.map(l=>l.url===url&&(!l.profile||l.profile==='MyDramaList')?{...l,...(valid?{profile:owner.profile,profileName:owner.profileName}:{ownerUnavailable:true})}:l);
for(const l of activeLists){if(l.url===url&&valid){l.profile=owner.profile;l.profileName=owner.profileName}}
try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}
ownerActive--;renderSelection();
})();}
}
function alignSelection(){
const workspace=document.querySelector('.workspace'),sidebar=document.querySelector('.sidebar');
const input=$(state.tab==='profiles'?'profileInput':state.filter==='catalogs'?'exploreCountry':'discoverInput');
if(!workspace||!sidebar||!input)return;
sidebar.style.marginTop=matchMedia('(max-width:740px)').matches?'0px':Math.max(0,input.getBoundingClientRect().top-workspace.getBoundingClientRect().top)+'px';
}
window.addEventListener('resize',alignSelection);
const searchResize=new ResizeObserver(()=>requestAnimationFrame(alignSelection));
searchResize.observe($('profileSearch'));searchResize.observe($('discoverSearch'));searchResize.observe($('exploreSearch'));
function renderSelection(){syncFeaturedAdd();state.selection=state.selection.map(l=>({...l,originalName:l.originalName||l.name,name:userListName(l)}));try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}resolveSelectedOwners();const root=$('selectionMessage');root.replaceChildren();$('count').textContent='('+state.selection.length+')';$('continue').disabled=!state.selection.length;$('clearSelection').classList.toggle('hidden',!state.selection.length);if(!state.selection.length){root.textContent=copy.emptySelection;return}const groups=new Map();for(const l of state.selection){const user=l.kind==='weekly'?'YourDramaList':l.kind==='explore'?'MyDramaList':l.kind==='filmography'?l.url:l.profile&&l.profile!=='MyDramaList'?l.profile:l.ownerUnavailable?'Creator unavailable':'Finding creator…';if(!groups.has(user))groups.set(user,[]);groups.get(user).push(l)}for(const [user,lists] of groups){const isFilm=lists[0].kind==='filmography',isExplore=lists[0].kind==='explore';const groupName=isFilm?lists[0].personDisplayName||lists[0].personName:user;const heading=document.createElement('div');heading.className='profileHeading';const avatar=document.createElement('span');avatar.className='profileAvatar';avatar.textContent=groupName.charAt(0).toUpperCase();const name=document.createElement('span');name.className='profileName';name.textContent=groupName;heading.append(avatar,name);root.append(heading);if(isFilm||!['MyDramaList','YourDramaList'].includes(user)&&/^[a-zA-Z0-9_-]{1,60}$/.test(user)){Promise.resolve(lists.find(l=>l.profileAvatar)?.profileAvatar?{avatar:lists.find(l=>l.profileAvatar).profileAvatar}:isFilm?null:loadProfileAvatar(user)).then(d=>{if(d&&d.avatar){const img=document.createElement('img');img.src=d.avatar;img.alt='';img.referrerPolicy='no-referrer';avatar.replaceChildren(img)}}).catch(()=>{})}for(const l of lists){const row=document.createElement('div');row.className='selectedItem';const title=document.createElement('span');title.className='selectedTitle';title.textContent=userListName(l);title.title=userListName(l);const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',copy.remove+l.name);remove.onclick=()=>toggleList(l);row.append(title,remove);root.append(row)}}}
$('clearSelection').onclick=()=>{state.selection=[];renderSelection();document.querySelectorAll('#listItems input[type=checkbox]').forEach(c=>{c.checked=false});exploreUI.sync();peopleUI.sync()};
function catalogAddSource(list){if(["discover-drama-related","discover-actor-filmography","discover-director-filmography","discover-catalog","community-watchlist","community-public-list","community-direct-list","featured-list","weekly-picks"].includes(list.analyticsSource))return list.analyticsSource;if(list.kind==='weekly')return'weekly-picks';if(list.kind==='explore')return'discover-catalog';if(list.kind==='filmography')return list.mode==='director'?'discover-director-filmography':'discover-actor-filmography';if(list.kind==='watchlist')return'community-watchlist';return'community-public-list'}
function recordCatalogAddition(list){fetch('/api/analytics/catalog-add',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:catalogAddSource(list)}),keepalive:true}).catch(()=>{})}
function toggleList(l){const exists=state.selection.some(x=>x.url===l.url);if(!exists&&state.selection.length>=MAX_CATALOGS){notices.show(copy.catalogLimitReached.replace('{max}',MAX_CATALOGS));document.querySelectorAll('#listItems input[type=checkbox]').forEach(c=>{c.checked=state.selection.some(x=>x.url===c.dataset.url)});exploreUI.sync();peopleUI.sync();return}state.selection=exists?state.selection.filter(x=>x.url!==l.url):[...state.selection,l];if(!exists)recordCatalogAddition(l);localStorage.setItem(selectionKey,JSON.stringify(state.selection));renderSelection();document.querySelectorAll('#listItems input[type=checkbox]').forEach(c=>{c.checked=state.selection.some(x=>x.url===c.dataset.url)});exploreUI.sync();peopleUI.sync()}
function addWatchlistPlaceholder(posters,empty){const placeholder=document.createElement('span');placeholder.className='watchlistPosterPlaceholder';placeholder.textContent=empty?copy.emptyWatchlist:copy.watchlistArtworkUnavailable;posters.append(placeholder)}
function renderLists(lists){activeLists=lists;$('listItems').replaceChildren();for(const l of lists){if(l.unavailable||!l.url)continue;const card=document.createElement('article');card.className='listcard';const check=document.createElement('input');check.type='checkbox';check.dataset.url=l.url;check.disabled=l.empty===true;check.checked=state.selection.some(x=>x.url===l.url);check.setAttribute('aria-label','Select '+l.name);check.onchange=()=>toggleList(l);const posters=document.createElement('div');posters.className='posters';for(const src of (l.posters||[]).slice(0,5)){const img=document.createElement('img');img.src=src;img.alt=copy.dramaPoster;img.loading='lazy';if(l.kind==='watchlist')img.addEventListener('error',()=>{img.remove();if(!posters.childElementCount)addWatchlistPlaceholder(posters,l.empty)},{once:true});posters.append(img)}if(l.kind==='watchlist'&&!posters.childElementCount)addWatchlistPlaceholder(posters,l.empty);const info=document.createElement('div');info.className='listinfo';const title=document.createElement('h3');title.textContent=userListName(l)||copy.untitledList;info.append(title);if(l.empty){const p=document.createElement('p');p.textContent=copy.emptyWatchlist;info.append(p)}else if((l.kind!=='watchlist'||l.combined)&&l.description){const p=document.createElement('p');const temp=document.createElement('textarea');temp.innerHTML=l.description;p.textContent=temp.value;info.append(p)}const stats=document.createElement('div');stats.className='stats';if(typeof l.count==='number'){const s=document.createElement('span');s.textContent='▣ '+l.count+' titles';stats.append(s)}if(typeof l.loves==='number'){const s=document.createElement('span');s.textContent='♡ '+l.loves+' loves';stats.append(s)}if(typeof l.comments==='number'){const s=document.createElement('span');s.textContent='▤ '+l.comments+' comments';stats.append(s)}info.append(stats);card.append(check,posters,info);$('listItems').append(card)}}
async function loadDirectList(value){
$('communityViews').classList.add('hidden');profileLists=null;
const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
try{const response=await fetch('/api/mdl/list?url='+encodeURIComponent('https://mydramalist.com/list/'+value),{signal:AbortSignal.timeout(15000)});const data=await response.json();if(requestId!==listRequest)return;if(!response.ok)throw Error(data.error||'Unable to load this list.');
const list={...data.list,analyticsSource:'community-direct-list'};
state.selection=state.selection.map(l=>l.url===list.url?{...l,...list}:l);
try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}
renderSelection();renderLists([list]);$('results').textContent='';
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
 const lists=profileLists.filter(list=>(list.kind==='watchlist')===watchlists);
 $('communitySelectAll').classList.toggle('hidden',!lists.some(list=>!list.empty));
 $('results').textContent=lists.length?'':watchlists?copy.communityNoWatchlists:copy.communityNoCustomLists;
 renderLists(lists);
}
document.querySelectorAll('[data-community-view]').forEach(button=>button.onclick=()=>showCommunityView(button.dataset.communityView));
$('communitySelectAll').onclick=()=>{
 if(!profileLists)return;
 const selected=new Set(state.selection.map(list=>list.url));
 const additions=activeLists.filter(list=>list.url&&!list.empty&&!list.unavailable&&!selected.has(list.url)&&selected.add(list.url));
 if(state.selection.length+additions.length>MAX_CATALOGS){$('results').textContent=copy.communitySelectionLimit.replace('{max}',MAX_CATALOGS);return}
 if(!additions.length)return;
 state.selection.push(...additions);
 additions.forEach(recordCatalogAddition);
 $('results').textContent='';
 renderSelection();
 renderLists(activeLists);
};

async function loadProfile(username){
 switchTab('profiles');const requestId=listRequest;
 try{
  const response=await fetch('/api/mdl/profile?username='+encodeURIComponent(username));
  const data=await response.json();if(requestId!==listRequest)return;
  if(!response.ok)throw Error(data.error||'Profile lookup failed');
  const lists=(data.lists||[]).filter(l=>!l.unavailable&&l.url);
  const watchlists=lists.filter(l=>l.kind==='watchlist'&&!l.combined);
  const combined=lists.filter(l=>l.combined).map(l=>({...l,name:(data.profileName||username)+'’s '+copy.communityAllTitles,description:copy.communityAllTitlesDescription}));
  const custom=lists.filter(l=>l.kind!=='watchlist').sort((a,b)=>(b.loves??-1)-(a.loves??-1));
  state.profile=username;
  profileLists=[...combined,...watchlists,...custom].map(l=>({...l,profile:username,analyticsSource:l.kind==='watchlist'?'community-watchlist':'community-public-list'}));
  $('communityViews').classList.remove('hidden');
  showCommunityView('watchlists');
 }catch(e){if(requestId===listRequest)$('results').textContent=copy.loadFailed+e.message}
}

renderSelection();
function switchTab(tab){profileLists=null;$('communityViews').classList.add('hidden');peopleUI.cleanup();requestAnimationFrame(alignSelection);listRequest++;state.tab=tab;$('listItems').replaceChildren();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('profileSearch').classList.toggle('hidden',tab!=='profiles');$('discoverSearch').classList.toggle('hidden',tab!=='discover');$('results').textContent='';if(tab==='discover'&&state.filter==='catalogs')exploreUI.render()}
function switchFilter(f){peopleUI.cleanup();listRequest++;state.filter=f;$('listItems').replaceChildren();$('results').textContent='';document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===f);b.setAttribute('aria-pressed',String(b.dataset.filter===f))});const catalogs=f==='catalogs';$('discoverLabel').classList.toggle('hidden',catalogs);$('discoverForm').classList.toggle('hidden',catalogs);$('exploreSearch').classList.toggle('hidden',!catalogs);if(catalogs){exploreUI.render();requestAnimationFrame(alignSelection);return}$('discoverInput').placeholder=f==='drama'?copy.searchDramas:f==='actor'?copy.searchActors:copy.searchDirectors;$('discoverInput').setAttribute('aria-label',f==='drama'?'Drama name or MyDramaList URL':'Person name or MyDramaList URL');$('discoverLabel').textContent=copy.discoverSearchLabel;requestAnimationFrame(alignSelection)}
function openSelection(tab){navigate('selection');switchTab(tab)}
$('start').onclick=()=>navigate('connect');
$('skip').onclick=()=>{setConnectedUser('');openSelection('discover')};
$('connectForm').onsubmit=e=>{e.preventDefault();const p=parseSource($('source').value);if(p?.type!=='profile'){$('error').textContent=copy.invalidUsername;return}$('error').textContent='';state.source=p;setConnectedUser(p.value);$('profileInput').value=$('source').value.trim();openSelection('profiles');loadProfile(p.value)};
$('profileForm').onsubmit=e=>{e.preventDefault();const p=parseSource($('profileInput').value);if(!p){$('results').textContent=copy.invalidProfile;return}state.source=p;if(p.type==='profile')loadProfile(p.value);else loadDirectList(p.value)};
let lastDramaSearch=null;
function searchBackButton(){if(!lastDramaSearch)return;const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent='Back';back.onclick=()=>{listRequest++;renderDramaMatches(lastDramaSearch)};$('results').append(document.createTextNode(' '),back)}
async function loadDramaLists(dramaUrl,name){
const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
try{const response=await fetch('/api/mdl/popular-lists?url='+encodeURIComponent(dramaUrl));const data=await response.json();if(requestId!==listRequest)return;if(!response.ok)throw Error(data.error||'Popular Lists lookup failed');
const lists=(data.lists||[]).map(l=>({...l,count:l.titleCount,posters:l.posterUrls,analyticsSource:'discover-drama-related'}));
renderLists(lists);$('results').textContent=lists.length?(data.warnings&&data.warnings.length?'Some details are unavailable.':''):'No related user lists were shown on this drama page.';
}catch(e){if(requestId!==listRequest)return;$('results').textContent=copy.loadFailed+e.message}
searchBackButton();
}
const synopsisPreview = ${synopsisPreview.toString()};
function renderScore(root,score){
root.replaceChildren();if(typeof score!=='number'||!Number.isFinite(score)||score<=0||score>10)return;
root.setAttribute('aria-label','MyDramaList score '+score+' out of 10');
const stars=document.createElement('span');stars.className='ratingStars';stars.setAttribute('aria-hidden','true');
const ns='http://www.w3.org/2000/svg';
for(let i=0;i<10;i++){const star=document.createElement('span');star.className='ratingStar';
const icon=()=>{const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const shape=document.createElementNS(ns,'polygon');shape.setAttribute('points','12,3 14.8,8.7 21,9.6 16.5,14 17.6,20.2 12,17.3 6.4,20.2 7.5,14 3,9.6 9.2,8.7');svg.append(shape);return svg};
star.append(icon());const fraction=Math.max(0,Math.min(1,score-i));if(fraction>0){const fill=document.createElement('span');fill.className='ratingFill';fill.style.width=(fraction*100)+'%';fill.append(icon());star.append(fill)}stars.append(star)}
const label=document.createElement('span');label.className='ratingValue';label.textContent=String(score);const max=document.createElement('span');max.className='ratingMax';max.textContent=' / 10';label.append(max);root.append(stars,label);
}
function renderSynopsis(root,text){root.replaceChildren();if(!text)return;const content=document.createElement('span');content.textContent=synopsisPreview(text);root.append(content)}
async function enrichDramaCards(jobs,requestId){
let cursor=0;async function worker(){while(cursor<jobs.length){if(requestId!==listRequest)return;const job=jobs[cursor++];try{const response=await fetch('/api/mdl/drama-details?url='+encodeURIComponent(job.drama.url));const data=await response.json();if(requestId!==listRequest)return;if(!response.ok)throw Error(data.error||'Details unavailable');job.drama.enrichment=data;job.apply(data)}catch{if(requestId===listRequest)job.status.textContent='Drama details are temporarily unavailable.'}}}
await Promise.all([worker(),worker(),worker()]);
}
function renderDramaMatches(data,options={}){
const requestId=listRequest;const jobs=[];
if(!options.append){$('listItems').replaceChildren();$('results').textContent=data.dramas.length?'':'No matching titles found. Try another name.';}
for(const drama of data.dramas){
const card=document.createElement('article');card.className='dramaMatch';
if(drama.poster){const img=document.createElement('img');img.src=drama.poster;img.alt=drama.name+' poster';img.loading='lazy';img.referrerPolicy='no-referrer';card.append(img)}
const info=document.createElement('div');info.className='dramaMatchInfo';
const title=document.createElement('h3');title.textContent=drama.name;
const details=document.createElement('p');details.textContent=drama.details;
const choose=document.createElement('button');choose.type='button';choose.className='secondary';choose.textContent='View related lists from users';choose.setAttribute('aria-label','View related lists from users for '+drama.name);choose.onclick=()=>loadDramaLists(drama.url,drama.name);
const synopsis=document.createElement('p');synopsis.className='dramaSynopsis';
const stats=document.createElement('div');stats.className='dramaStats';if(drama.score)renderScore(stats,Number(drama.score));
const popularity=document.createElement('span');popularity.className='dramaPopularity';popularity.hidden=true;
const heading=document.createElement('div');heading.className='dramaHeading';heading.append(title,popularity);
const status=document.createElement('p');status.className='detailsStatus';status.textContent='';
const apply=data=>{renderSynopsis(synopsis,data.synopsis);const score=data.score??(drama.score&&Number(drama.score)>0&&Number(drama.score)<=10?Number(drama.score):null);renderScore(stats,score);popularity.hidden=!(typeof data.popularity==='number'&&data.popularity>0);popularity.textContent=popularity.hidden?'':'Popularity #'+data.popularity.toLocaleString();status.textContent=data.status==='unavailable'?(data.warning||'Drama details are temporarily unavailable.'):data.status==='stale'?'Showing saved MyDramaList details. Live refresh is temporarily unavailable.':!data.synopsis?'No synopsis was provided on this drama page.':'';};
if(drama.enrichment)apply(drama.enrichment);else jobs.push({drama,apply,status});
if(options.relatedLists===false)info.append(heading,details,stats,synopsis,status);else info.append(heading,details,stats,synopsis,status,choose);card.append(info);$('listItems').append(card);
}
enrichDramaCards(jobs,requestId);
if(data.page>1||data.hasNextPage){const nav=document.createElement('nav');nav.className='searchPages';nav.setAttribute('aria-label','Search result pages');
if(data.page>1){const prev=document.createElement('button');prev.type='button';prev.className='secondary';prev.textContent='← Previous matches';prev.onclick=()=>searchDramas(data.query,data.page-1);nav.append(prev)}
if(data.hasNextPage){const next=document.createElement('button');next.type='button';next.className='secondary';next.textContent='More matches →';next.onclick=()=>searchDramas(data.query,data.page+1);nav.append(next)}
$('listItems').append(nav)}
}
async function searchDramas(query,page=1){
const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
try{const response=await fetch('/api/mdl/drama-search?q='+encodeURIComponent(query)+'&page='+page);if(requestId!==listRequest){await response.body?.cancel();return}if(response.status===429){await response.body?.cancel();notices.show(copy.searchRetry);return}const data=await response.json();if(requestId!==listRequest)return;if(!response.ok)throw Error(data.error||'Search failed');notices.hide();lastDramaSearch=data;renderDramaMatches(data)}
catch(e){if(requestId===listRequest)$('results').textContent='Unable to search: '+e.message}
}
const CATEGORIES=${JSON.stringify(CATEGORIES)},COUNTRIES=${JSON.stringify(COUNTRIES)};const exploreCategories=CATEGORIES,exploreCountries=COUNTRIES;
const exploreCatalog=${exploreCatalog.toString()};

const exploreUI=(${installExploreUI.toString()})();
const peopleUI = (${installPeopleUI.toString()})();
$('discoverForm').onsubmit=e=>{
e.preventDefault();listRequest++;lastDramaSearch=null;$('listItems').replaceChildren();
const input=$('discoverInput').value.trim();
if(state.filter!=='drama'){if(/^https?:/i.test(input))peopleUI.fromUrl(input);else if(input.length>=2&&input.length<=100)peopleUI.search(input);else $('results').textContent='Enter a person name between 2 and 100 characters, or a MyDramaList person URL.';return}
if(!/^https?:/i.test(input)){if(input.length<2||input.length>100){$('results').textContent='Enter a drama name between 2 and 100 characters.';return}searchDramas(input);return}
let dramaUrl;try{dramaUrl=new URL(input)}catch{$('results').textContent='Enter a valid MyDramaList drama URL.';return}
if(dramaUrl.protocol!=='https:'||!['mydramalist.com','www.mydramalist.com'].includes(dramaUrl.hostname)||dramaUrl.username||dramaUrl.password||dramaUrl.port||!/^\\/[1-9]\\d*-[A-Za-z0-9-]+\\/?$/.test(dramaUrl.pathname)){$('results').textContent='Enter a valid HTTPS MyDramaList drama URL.';return}
loadDramaLists(dramaUrl.href,'');
};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>switchFilter(b.dataset.filter));
switchFilter('drama');switchTab(state.tab);navigate(pageForPath(location.pathname),false);
</script></body></html>`;
async function handler(req: Request): Promise<Response> {const url=new URL(req.url);if(url.pathname==='/privacy')return new Response(privacyPage(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});if(url.pathname==='/credits')return new Response(null,{status:302,headers:{'location':'/#tmdb-attribution'}});if(url.pathname==='/assets/ydl-classic-blue-v1.png')return addonIcon();if(url.pathname==='/api/analytics/catalog-add')return recordCatalogAdditionRequest(req);if(url.pathname==='/api/addon/configure'||url.pathname.startsWith('/addon/'))return handleAddon(req);if(/^\/__immutable\/\d+\/(preferencesClient\.ts|preferences\.ts|text\.ts|preferences\.css|catalogShelves\.css)$/.test(url.pathname))return serveImmutableFile(url.pathname);if(url.pathname==='/assets/preferences-review.jpg')return reviewPreviewImage();if(url.pathname==='/api/preferences/poster-preview')return handlePosterPreview(req);if(url.pathname==='/api/background/posters')return handlePosterBackground(req);if(url.pathname==='/api/mdl/featured')return handleFeatured(req);if(['/admin','/api/appearance','/api/admin/appearance','/api/admin/analytics'].includes(url.pathname))return handleWallpaper(req);if(['/api/catalogs/weekly','/api/catalogs/shelf'].includes(url.pathname))return handleCollections(req);if(url.pathname==='/api/mdl/explore')return handleExplore(req);if(url.pathname==='/source')return new Response(null,{status:302,headers:{Location:'https://www.val.town/x/Niwa710/YourDramaList'}});if(['/api/mdl/people-search','/api/mdl/person','/api/mdl/filmography','/api/mdl/filmography-artwork'].includes(url.pathname))return handlePeople(req);if(url.pathname==='/api/mdl/list')return handleDirectList(req);if(url.pathname==='/api/mdl/list-owner')return handleListOwner(req);if(url.pathname==='/api/mdl/drama-details')return handleDramaDetails(req);if(url.pathname==='/api/mdl/drama-search')return handleDramaSearch(req);if(url.pathname==='/api/mdl/popular-lists')return handlePopularLists(req);if(url.pathname==='/'||url.pathname==='/setup'||url.pathname==='/setup/lists'||url.pathname==='/setup/preferences'||url.pathname==='/setup/confirm')return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});if(url.pathname==='/api/mdl/avatar'){const username=url.searchParams.get('username')||'';if(!/^[a-zA-Z0-9_-]{1,60}$/.test(username))return Response.json({error:'Invalid username'},{status:400});try{const upstream=await fetch('https://Niwa710--d1ead410d92d11f196511607ee4eb77e.web.val.run/api/mdl/avatar?username='+encodeURIComponent(username));return new Response(await upstream.text(),{status:upstream.status,headers:{'content-type':'application/json'}})}catch{return Response.json({error:'Avatar unavailable'},{status:502})}}if(url.pathname==='/api/mdl/profile'){const username=url.searchParams.get('username')||'';if(!/^[a-zA-Z0-9_-]{1,60}$/.test(username))return Response.json({error:'Invalid username'},{status:400});try{const upstream=await fetch('https://Niwa710--d1ead410d92d11f196511607ee4eb77e.web.val.run/api/mdl/profile?username='+encodeURIComponent(username));const data=await upstream.json();if(!upstream.ok)return Response.json(data,{status:upstream.status});const all=data.lists||[];const watchlists=await profileWatchlistCards(username,data.profileName||username,undefined,watchlistPreviewArtwork);const fallbackPosters=[...new Set(watchlists.flatMap(card=>card.posters))].slice(0,5);const combined=all.filter(l=>(!l.unavailable||watchlists.some(card=>!card.empty))&&String(l.url||'').includes('/dramalist/')).map(l=>({...l,posters:l.posters?.length?l.posters:fallbackPosters,unavailable:false,kind:'watchlist',combined:true}));const custom=all.filter(l=>!String(l.url||'').includes('/dramalist/'));return Response.json({...data,lists:[...combined,...watchlists,...custom]},{headers:{'cache-control':'no-store'}})}catch{return Response.json({error:'Profile service unavailable'},{status:502})}}return new Response('Not found',{status:404})}
export default oauthMiddleware(handler);
