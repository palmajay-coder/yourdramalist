import {TEXT as copy} from "./text.ts";
import {loadPreferences, normalizePreferences, preferenceIssue, savePreferences} from "./preferences.ts";
import type {RatingSource} from "./preferences.ts";

/** Keys live only in these inputs/closures, never storage, URLs, summaries or logs. */
export function installPreferencesUI(api: {
  navigate: (page: string) => void;
  selection: () => {name: string; [key: string]: unknown}[];
  user: () => string;
}) {
  const root = document.getElementById("preferences")!;
  const confirm = document.getElementById("confirm")!;
  let prefs = normalizePreferences(null);
  try { prefs = loadPreferences(localStorage); } catch {}
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") => {
    const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
  };
  const paragraph = (text: string, cls = "") => node("p", cls, text);
  const button = (text: string, cls = "prefTextButton") => {const e = node("button", cls, text); e.type = "button"; return e;};
  const stack = node("div", "preferencesStack");
  root.replaceChildren(node("h1", "", copy.preferencesTitle), paragraph(copy.preferencesDescription), stack);
  function panel(title: string, description: string, checked: boolean, id: string) {
    const card = node("section", "panel prefPanel");
    const label = node("label", "prefSetting");
    const text = node("span"); text.append(node("h2", "", title), paragraph(description));
    const toggle = node("input", "prefSwitch"); toggle.type = "checkbox"; toggle.checked = checked; toggle.id = id;
    label.htmlFor = id; label.append(text, toggle); card.append(label); stack.append(card);
    return {card, toggle};
  }
  const reviews = panel(copy.reviewsTitle, copy.reviewsDescription, prefs.reviews, "prefReviews");
  const reviewPreview = node("div", "prefPreview"); reviewPreview.id = "prefReviewPreview";
  const caption = node("div", "prefCaption"); caption.append(node("span", "", copy.reviewsPreviewLabel), node("span", "", copy.reviewsPreviewTitle));
  const cards = node("div", "prefReviewCards");
  for (const [title, ...lines] of [
    [copy.reviewsScoreHeading, copy.reviewsScoreSample, copy.reviewsStatsSample],
    [copy.reviewsVerdictHeading, copy.reviewsVerdictSample, copy.reviewsPercentSample],
    [copy.reviewsHeadlineSample, copy.reviewsHelpfulSample, copy.reviewsBodySample],
  ]) {const card = node("article", "prefReviewCard"); card.append(node("h3", "", title), ...lines.map(s => paragraph(s))); cards.append(card);}
  const example = button(copy.reviewsFullExample, "prefTextButton prefExampleLink");
  reviewPreview.append(caption, cards, example); reviews.card.append(reviewPreview);
  const dialog = node("dialog", "prefDialog"); dialog.setAttribute("aria-labelledby", "prefExampleHeading");
  const dialogHeader = node("header"); const heading = node("h2", "", copy.reviewsSampleLabel); heading.id = "prefExampleHeading";
  const close = button(copy.closePreview, "secondary"); dialogHeader.append(heading, close);
  const screenshot = node("img"); screenshot.alt = copy.reviewsScreenshotAlt; screenshot.loading = "lazy";
  dialog.append(dialogHeader, screenshot); root.append(dialog);
  example.onclick = () => {screenshot.src = "/assets/preferences-review.jpg"; dialog.showModal();};
  close.onclick = () => dialog.close();
  dialog.addEventListener("click", e => {if(e.target === dialog) {const r = dialog.getBoundingClientRect(); const m = e as MouseEvent; if(m.clientX < r.left || m.clientX > r.right || m.clientY < r.top || m.clientY > r.bottom) dialog.close();}});

  const posters = panel(copy.posterRatingsTitle, copy.posterRatingsDescription, prefs.posters, "prefPosters");
  const posterOptions = node("div", "prefPosterOptions"); posterOptions.id = "prefPosterOptions";
  const keyFields = node("div", "prefKeys");
  const note = paragraph("", "prefKeysNote"); note.append(node("strong", "", copy.optionalLabel), document.createTextNode(" " + copy.posterKeysNote)); keyFields.append(note);
  function keyField(id: string, labelText: string, placeholder: string, href: string) {
    const field = node("div", "prefKeyField"), title = node("div", "prefKeyHeading");
    const label = node("label", "", labelText); label.htmlFor = id;
    const link = node("a", "", copy.getApiKey); link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer";
    title.append(label, link);
    const row = node("div", "prefKeyRow"), input = node("input"); input.id = id; input.type = "password"; input.placeholder = placeholder;
    input.maxLength = 200; input.autocomplete = "off"; input.spellcheck = false; input.setAttribute("autocapitalize", "none");
    const show = button(copy.showKey, ""); show.setAttribute("aria-controls", id); show.setAttribute("aria-label", copy.showKey + " " + labelText); show.setAttribute("aria-pressed", "false");
    show.onclick = () => {const visible = input.type === "password"; input.type = visible ? "text" : "password"; show.textContent = visible ? copy.hideKey : copy.showKey; show.setAttribute("aria-pressed", String(visible)); show.setAttribute("aria-label", (visible ? copy.hideKey : copy.showKey) + " " + labelText);};
    row.append(input, show); field.append(title, row); keyFields.append(field); return input;
  }
  const tmdb = keyField("prefTmdb", copy.tmdbKeyLabel, copy.tmdbKeyPlaceholder, "https://www.themoviedb.org/settings/api");
  const mdblist = keyField("prefMdblist", copy.mdblistKeyLabel, copy.mdblistKeyPlaceholder, "https://mdblist.com/preferences/");
  const posterContent = node("div", "prefPosterContent"), posterColumn = node("div"), frame = node("div", "prefPosterFrame");
  const image = node("img");
  const samplePoster = "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg";
  image.src = samplePoster; image.alt = copy.posterPreviewTitle; image.width = 151; image.height = 227;
  const shade = node("div", "prefPosterShade"), badges = node("div", "prefBadges"); badges.setAttribute("aria-hidden", "true");
  const badgeElements = new Map<RatingSource, HTMLElement>();
  for (const [source, icon, score, cls] of [["letterboxd", "●", "4.2", "prefLetterboxd"], ["tomatoes", "RT", "92%", "prefTomatoes"], ["imdb", "IMDb", "8.1", ""]] as const) {
    const badge = node("span", "prefBadge"); badge.dataset.badge = source;
    badge.append(node("span", "prefBadgeIcon " + cls, icon), document.createTextNode(score)); badges.append(badge); badgeElements.set(source, badge);
  }
  frame.append(image, shade, badges);
  const posterCaption = paragraph(copy.posterIllustrative, "prefPosterCaption");
  posterColumn.append(frame, posterCaption);
  const choices = node("fieldset", "prefBadgeChoices"); choices.setAttribute("aria-label", copy.posterRatingsTitle);
  const ratingNames = {letterboxd: copy.ratingLetterboxd, tomatoes: copy.ratingTomatoes, imdb: copy.ratingImdb};
  for (const source of ["letterboxd", "tomatoes", "imdb"] as RatingSource[]) {
    const label = node("label"), input = node("input"); input.type = "checkbox"; input.dataset.rating = source; input.checked = prefs.ratings.includes(source);
    input.onchange = () => {prefs.ratings = ([...choices.querySelectorAll<HTMLInputElement>("input")].filter(e => e.checked).map(e => e.dataset.rating)) as RatingSource[]; save(); invalidatePreview(); schedulePreview();};
    label.append(input, document.createTextNode(ratingNames[source])); choices.append(label);
  }
  posterContent.append(posterColumn, choices);
  const previewStatus = paragraph("", "prefHelp"); previewStatus.setAttribute("role", "status");
  posterOptions.append(keyFields, posterContent, previewStatus); posters.card.append(posterOptions);
  const filterCard = node("section", "panel prefPanel"); filterCard.append(node("h2", "", copy.titleFiltersTitle), paragraph(copy.titleFiltersDescription)); stack.append(filterCard);
  function filter(text: string, id: string, checked: boolean) {const label = node("label", "prefFilterRow"), input = node("input", "prefSwitch"); input.type = "checkbox"; input.id = id; input.checked = checked; label.append(node("span", "", text), input); filterCard.append(label); return input;}
  const unreleased = filter(copy.hideUnreleased, "prefUnreleased", prefs.hideUnreleased);
  const completed = filter(copy.hideCompleted, "prefCompleted", prefs.hideCompleted);
  const completedHelp = paragraph(copy.completedNeedsAccount, "prefHelp prefCompletedHelp"); filterCard.append(completedHelp);
  const error = node("div", "prefError"); error.setAttribute("role", "alert"); root.append(error);
  const actions = node("div", "prefActions"), next = button(copy.continue, "primary"); actions.append(next); root.append(actions);
  const keys = () => ({tmdb: tmdb.value.trim(), mdblist: mdblist.value.trim()});
  let request = 0, abort: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined, objectUrl = "";
  function save() {try {savePreferences(localStorage, prefs);} catch {} error.textContent = ""; render();}
  function invalidatePreview() {
    request++; abort?.abort(); clearTimeout(timer); if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = "";
    image.src = samplePoster; posterCaption.textContent = copy.posterIllustrative; previewStatus.textContent = ""; render();
  }
  function render() {
    reviewPreview.hidden = !prefs.reviews; reviews.toggle.setAttribute("aria-expanded", String(prefs.reviews)); reviews.toggle.setAttribute("aria-controls", reviewPreview.id);
    posterOptions.hidden = !prefs.posters; posters.toggle.setAttribute("aria-expanded", String(prefs.posters)); posters.toggle.setAttribute("aria-controls", posterOptions.id);
    shade.hidden = !!objectUrl; badges.hidden = !!objectUrl;
    for(const [source, element] of badgeElements) element.hidden = !prefs.ratings.includes(source);
    frame.setAttribute("aria-label", copy.posterPreviewLabel + ": " + copy.posterPreviewTitle + ". " + (prefs.ratings.length ? prefs.ratings.map(s => ratingNames[s]).join(", ") : copy.posterPreviewNoBadges));
    const hasAccount = !!api.user(); completed.disabled = !hasAccount; completedHelp.hidden = hasAccount;
    completed.checked = hasAccount && prefs.hideCompleted;
  }
  function schedulePreview() {
    clearTimeout(timer); if (preferenceIssue(prefs, keys()) || !prefs.posters) return;
    timer = setTimeout(async () => {
      const id = ++request; abort?.abort(); abort = new AbortController();
      try {
        const r = await fetch("/api/preferences/poster-preview", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({...keys(), ratings: prefs.ratings}), signal: abort.signal, cache: "no-store"});
        if (id !== request) return;
        if (!r.ok) {const data = await r.json().catch(() => ({})); throw Object.assign(Error("preview"), {code: data.code});}
        const blob = await r.blob(); if(id !== request) return;
        objectUrl = URL.createObjectURL(blob); image.src = objectUrl; posterCaption.textContent = copy.posterLivePreview; render();
      } catch (e) {
        if(id !== request || (e as Error).name === "AbortError") return;
        const code = (e as {code?: string}).code;
        previewStatus.textContent = code === "keys" ? copy.posterPreviewKeysInvalid : code === "limit" ? copy.posterPreviewRateLimit : copy.posterPreviewUnavailable;
      }
    }, 650);
  }
  for(const input of [tmdb, mdblist]) {input.oninput = () => {error.textContent = ""; invalidatePreview();}; input.onchange = () => schedulePreview();}
  reviews.toggle.onchange = () => {prefs.reviews = reviews.toggle.checked; save();};
  posters.toggle.onchange = () => {prefs.posters = posters.toggle.checked; save(); invalidatePreview(); schedulePreview();};
  unreleased.onchange = () => {prefs.hideUnreleased = unreleased.checked; save();};
  completed.onchange = () => {prefs.hideCompleted = !!api.user() && completed.checked; save();};
  next.onclick = () => {
    const issue = preferenceIssue(prefs, keys());
    if(issue) {error.textContent = issue === "keys" ? copy.preferencesKeysRequired : copy.preferencesBadgesRequired; (issue === "keys" ? tmdb : choices.querySelector("input")!).focus(); return;}
    save(); api.navigate("confirm");
  };
  let manifestRequest=0,manifestSignature="",manifestValue="";
  function renderConfirm() {
    confirm.replaceChildren(node("h1", "", copy.confirmTitle), paragraph(copy.confirmDescription));
    const s = node("div", "preferencesStack"); confirm.append(s);
    const listCard = node("section", "panel prefPanel"), listHeading = node("div", "prefConfirmHeading"), editLists = button(copy.editLists);
    listHeading.append(node("h2", "", copy.confirmCatalogs + " (" + api.selection().length + ")"), editLists); editLists.onclick = () => api.navigate("selection");
    const list = node("ol", "prefConfirmList"); for(const item of api.selection()) list.append(node("li", "", item.name)); listCard.append(listHeading, list); s.append(listCard);
    const pCard = node("section", "panel prefPanel"), pHeading = node("div", "prefConfirmHeading"), editPrefs = button(copy.editPreferences);
    pHeading.append(node("h2", "", copy.confirmPreferences), editPrefs); editPrefs.onclick = () => api.navigate("preferences"); pCard.append(pHeading);
    for(const [label, value] of [[copy.reviewsTitle, prefs.reviews], [copy.posterRatingsTitle, prefs.posters], [copy.hideUnreleased, prefs.hideUnreleased], [copy.hideCompleted, !!api.user() && prefs.hideCompleted]] as const) {
      const row = node("div", "prefSummaryRow"); row.append(node("span", "", label), node("span", "", value ? copy.enabled : copy.disabled)); pCard.append(row);
    }
    if(prefs.posters) pCard.append(paragraph(prefs.ratings.map(s => ratingNames[s]).join(" · "), "prefHelp"));
    s.append(pCard);
    const manifest=node("section","prefManifest"),label=node("label","",copy.manifestUrl);label.htmlFor="manifestUrl";
    const row=node("div","prefManifestRow"),input=node("input"),copyButton=button(copy.copyManifest,"secondary");input.id="manifestUrl";input.readOnly=true;input.placeholder=copy.manifestUrl;input.setAttribute("aria-label",copy.manifestUrl);copyButton.disabled=true;
    const install=node("a","primary prefInstall",copy.installNuvio);install.setAttribute("aria-disabled","true");
    const status=paragraph("","prefError");status.setAttribute("role","status");const retry=button(copy.retryManifest,"prefTextButton");retry.hidden=true;
    row.append(input,copyButton);manifest.append(label,row,install,status,retry);
    if(prefs.posters)manifest.append(paragraph(copy.manifestKeyPrivacy,"prefHelp"));confirm.append(manifest);
    const data={catalogs:api.selection().map(({name,url,kind,category,country,mode,personUrl})=>({name,url,kind,category,country,mode,personUrl})),user:api.user(),preferences:{...normalizePreferences(prefs),hideCompleted:!!api.user()&&prefs.hideCompleted},keys:prefs.posters?keys():{tmdb:"",mdblist:""}};
    const signature=JSON.stringify(data),id=++manifestRequest;
    function apply(url:string){input.value=url;copyButton.disabled=false;install.href=url.replace(/^https?:/,"stremio:");install.removeAttribute("aria-disabled");}
    async function prepare(){retry.hidden=true;status.textContent="";try{
      if(preferenceIssue(prefs,keys()))throw Error("keys");
      if(signature===manifestSignature&&manifestValue){apply(manifestValue);return;}
      const response=await fetch("/api/addon/configure",{method:"POST",headers:{"content-type":"application/json"},body:signature,cache:"no-store"});
      if(!response.ok)throw Error("manifest");const result=await response.json();if(id!==manifestRequest)return;
      const url=new URL(result.url);if(url.origin!==location.origin||!url.pathname.startsWith("/addon/")||!url.pathname.endsWith("/manifest.json"))throw Error("url");
      manifestSignature=signature;manifestValue=url.href;apply(url.href);
    }catch{if(id===manifestRequest){status.textContent=preferenceIssue(prefs,keys())?copy.preferencesKeysRequired:copy.manifestFailed;retry.hidden=false;}}}
    copyButton.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);copyButton.textContent=copy.copiedManifest;}catch{input.focus();input.select();status.textContent=copy.manifestSelectToCopy;}};
    retry.onclick=()=>{prepare();};prepare();
  }
  render();
  return {show(page: string) {render(); if(page === "confirm") renderConfirm();}, values() {return {...normalizePreferences(prefs), hideCompleted: !!api.user() && prefs.hideCompleted};}};
}
