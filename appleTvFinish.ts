/* YourDramaList cinematic skin: visual-only, preserves DOM and interaction contracts.
   Additive and reversible. Mobile portrait first; reduced motion supported. */
export const APPLE_TV_FINISH_CSS = String.raw`
:root{
 --bg:#090b10;--panel:#171b24;--line:#ffffff19;--text:#f8faff;
 --muted:#aab4c4;--input:#1c222e;--link:#92beff;--tab:#1c314e;
}
body.androidSetup{
 --bg:#090b10;--panel:#171b24;--line:#ffffff19;--text:#f8faff;
 --muted:#aab4c4;--input:#1c222e;--link:#92beff;--tab:#1c314e;--accent:#2674ec;
 background:radial-gradient(ellipse 90% 46% at 50% -12%,#243551 0%,#101723 52%,#090b10 100%) fixed;
}
body.androidSetup:not([data-page=connect]) header{
 background:linear-gradient(180deg,rgba(24,29,39,.96),rgba(14,18,26,.97));
 border-bottom:1px solid #ffffff0a;
}
body.androidSetup .androidPageDescription{color:#bac4d3!important;letter-spacing:.005em}
body.androidSetup .androidBottomNav{
 background:rgba(17,21,30,.82);
 border-top:1px solid #ffffff22;
 -webkit-backdrop-filter:blur(22px) saturate(1.2);
 backdrop-filter:blur(22px) saturate(1.2);
 box-shadow:0 -12px 38px #0005;
}
body.androidSetup .androidNavItem{transition:color .2s ease,transform .2s ease}
body.androidSetup .androidNavItem.active .androidNavIcon{
 background:linear-gradient(135deg,#377cec,#1c5fc7);
 box-shadow:0 5px 22px #286fe94a;
}
body.androidSetup .androidNavItem.androidNavAdd .androidNavIcon,
body.androidSetup .androidNavItem.androidNavAdd.active .androidNavIcon{
 background:transparent;box-shadow:none;color:#22c55e;
}
body.androidSetup .androidNavItem:active{transform:scale(.97)}
body.androidSetup .androidHeaderActions button{border-radius:13px}
body.androidSetup .androidHeaderActions button:is(:hover,:focus-visible){background:#ffffff14}
body.androidSetup .primary{
 background:#2674ec;color:white;border-radius:999px;
 box-shadow:0 6px 18px rgba(31,93,198,.16);
 transition:filter .2s ease,transform .2s ease;
}
body.androidSetup .primary:active:not(:disabled){transform:scale(.985)}
body.androidSetup .secondary{
 color:#eef2fa;background:rgba(255,255,255,.075);
 border:1px solid #ffffff2b;border-radius:999px;
}
body.androidSetup .panel,body.androidSetup .prefPanel{
 border-color:#ffffff16;
 border-radius:20px;
 background:linear-gradient(145deg,rgba(32,39,52,.87),rgba(20,25,35,.94));
}
body.androidSetup input:not([type=checkbox]):not([type=radio]),
body.androidSetup select{
 border-color:#ffffff27;border-radius:13px;background:#202633;color:#fafcff;
}
body.androidSetup input:focus-visible,
body.androidSetup select:focus-visible,
body.androidSetup button:focus-visible,
body.androidSetup a:focus-visible,
body.androidSetup summary:focus-visible{
 outline:2px solid #8fb9ff;outline-offset:3px;
}
body.androidSetup .androidDiscoverToolbar h1,
body.androidSetup header.mobilePageHeader>h1{letter-spacing:-.015em}
body.androidSetup #selection .workspace{padding-bottom:20px}
body.androidSetup #profileForm .searchrow{gap:9px}
body.androidSetup #profileForm .searchrow button{min-width:86px}
body.androidSetup .catalogSectionTitle{
 font-size:clamp(21px,5.4vw,27px);
 font-weight:750;line-height:1.2;letter-spacing:-.025em;
 margin:28px 0 12px;
}
body.androidSetup .catalogShelf{margin-bottom:32px}
body.androidSetup .catalogShelfHead{margin-bottom:15px}
body.androidSetup .catalogShelfHead h3{font-size:17px;font-weight:700;letter-spacing:-.012em}
body.androidSetup .catalogShelfTrack{
 gap:13px;padding:4px 4px 17px 1px;
 scroll-padding-inline:14px;scrollbar-width:none;
 -webkit-overflow-scrolling:touch;
}
body.androidSetup .catalogShelfTrack::-webkit-scrollbar{display:none}
body.androidSetup .catalogPoster{
 scroll-snap-align:start;
 transition:transform .22s ease;
}
body.androidSetup .catalogPoster img,
body.androidSetup .catalogPoster .shelfPosterBlank{
 border-radius:13px;
 box-shadow:0 10px 22px #0008;
 transition:transform .24s ease,filter .24s ease,box-shadow .24s ease;
}
body.androidSetup .catalogPoster:is(:focus-visible,:hover) img{
 transform:translateY(-3px) scale(1.012);
 box-shadow:0 16px 28px #000a;filter:brightness(1.07);
}
body.androidSetup .catalogPoster strong{font-weight:650;letter-spacing:-.005em}
body.androidSetup .catalogPoster small{color:#a4adbb}
body.androidSetup .compactCatalogRow{border-bottom:1px solid #ffffff12}
body.androidSetup .compactPreviewButton{font-weight:700}
body.androidSetup .shelfChip{border-radius:999px;background:#ffffff08}
body.androidSetup .shelfChip[aria-pressed=true]{background:#203c62;color:#a9caff;border-color:#4d90ef}
body.androidSetup .discoverTitleRow{background:rgba(28,34,45,.55);border-color:#ffffff13;border-radius:16px}
body.androidSetup .discoverTitleIdentity img{border-radius:11px}
body.androidSetup :is(.catalogDialog,.mobileSelectionDialog,.androidFiltersDialog){
 background:#131822;border-color:#ffffff26;
}
body.androidSetup .catalogDialog{border-radius:22px}
body.androidSetup .catalogDialog::backdrop,
body.androidSetup .mobileSelectionDialog::backdrop,
body.androidSetup .androidFiltersDialog::backdrop{background:rgba(0,0,0,.73);backdrop-filter:blur(5px)}
body.androidSetup .myCollectionCard{
 background:linear-gradient(145deg,rgba(32,39,53,.82),rgba(19,24,33,.95));
 border:1px solid #ffffff1c;
 border-radius:19px;box-shadow:0 12px 32px #0003;
}
body.androidSetup .myCollectionStrip img,
body.androidSetup .myCollectionPoster img{border-radius:10px}
body.androidSetup .myCollectionTop h2{letter-spacing:-.02em}
body.androidSetup .discoverAddPill.is-added{background:#166534!important;color:#fff}
body.androidSetup .discoverAddPill:not(.is-added){background:#2674ec;color:white}
.quickSearch{background:#0f131c}
.quickSearchBar{background:rgba(18,23,32,.98);border-bottom-color:#ffffff14}
.quickSearchBar.withIntro .quickSearchField{border-radius:16px;background:#242b39;border-color:#ffffff23}
.quickSearchBar input{background:transparent!important}
.quickSearchBody{background:radial-gradient(ellipse at top,#182334 0%,#0f131c 54%)}
.quickSearchResults .discoverTitleRow{background:transparent;border-radius:0}
.quickSearchTip{border:1px solid #ffffff1b;background:#1a2230;border-radius:18px;padding:16px;margin-inline:0}
body.androidSetup[data-page=connect] .connect .panel{
 border-radius:22px;background:rgba(15,19,27,.8);
 border:1px solid #ffffff30;-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
 box-shadow:0 18px 60px #0006;
}
body.androidSetup[data-page=connect] #skip{
 border-radius:999px;background:rgba(20,25,34,.68);
 -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
}
body.androidSetup[data-page=connect] #connect>h1{text-shadow:0 5px 28px #000c}
@media(min-width:700px){
 body.androidSetup.wideWeb .catalogPoster img{border-radius:16px}
 body.androidSetup.wideWeb .catalogShelfTrack{gap:20px}
 body.androidSetup.wideWeb .catalogSectionTitle{font-size:28px}
}
@media(prefers-reduced-motion:reduce){
 body.androidSetup .catalogPoster,body.androidSetup .catalogPoster img,
 body.androidSetup .androidNavItem,body.androidSetup .primary{transition:none!important}
 body.androidSetup .catalogPoster:is(:focus-visible,:hover) img{transform:none}
}
`;