import {TEXT as copy} from "./text.ts";
import {betterPostersPattern, posterPlusPattern, rpdbApiKey, loadPreferences, normalizePreferences, preferenceIssue, savePreferences, TMDB_LANGUAGES, MAX_CATALOGS} from "./preferences.ts";
import type {MetadataProvider, RatingSource} from "./preferences.ts";

/** Keys are never saved to browser storage or logs. RPDB keys are included in its poster URLs. */
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
    [copy.reviewsVerdictHeading, copy.reviewsVerdictSample],
    [copy.reviewsOpenHeading, copy.reviewsOpenSample],
    [copy.reviewsHeadlineSample, copy.reviewsHelpfulSample, copy.reviewsBodySample],
  ]) {const card = node("article", "prefReviewCard"); card.append(node("h3", "", title), ...lines.map(s => paragraph(s))); cards.append(card);}
  reviewPreview.append(caption, cards); reviews.card.append(reviewPreview);

  const metadata = node("section", "panel prefPanel prefMetadataCard"); metadata.style.display = "block"; metadata.style.width = "100%";
  const metadataHeading = node("h2", "", copy.metadataProvider); metadataHeading.id = "prefMetadataHeading";
  const metadataNames: Record<MetadataProvider, string> = {mdl: copy.metadataMdl, tmdb: copy.metadataTmdb};
  const metadataChoices = node("div", "prefMetadataChoices"); metadataChoices.style.display = "block"; metadataChoices.style.width = "100%";
  metadataChoices.setAttribute("role", "group"); metadataChoices.setAttribute("aria-labelledby", metadataHeading.id);
  const metadataToggles: HTMLInputElement[] = [];
  function setMetadataProvider(provider: MetadataProvider) {
    prefs.metadataProvider = provider;
    for (const choice of metadataToggles) {
      choice.checked = choice.value === provider;
      choice.setAttribute("aria-checked", String(choice.checked));
    }
    save();
  }
  for (const provider of ["mdl", "tmdb"] as const) {
    const label = node("label", "prefSetting prefMetadataChoice"), text = node("span"), title = node("strong", "", metadataNames[provider]);
    if (provider === "mdl") title.append(node("small", "", copy.metadataDefault));
    text.append(title, paragraph(provider === "mdl" ? copy.metadataMdlDescription : copy.metadataTmdbDescription));
    const toggle = node("input", "prefSwitch"); toggle.type = "checkbox"; toggle.value = provider; toggle.checked = prefs.metadataProvider === provider;
    toggle.setAttribute("role", "switch"); toggle.setAttribute("aria-label", metadataNames[provider]); toggle.setAttribute("aria-checked", String(toggle.checked));
    toggle.onchange = () => {
      if (!toggle.checked) {toggle.checked = true; toggle.setAttribute("aria-checked", "true"); return;}
      setMetadataProvider(provider);
    };
    metadataToggles.push(toggle); label.append(text, toggle); metadataChoices.append(label);
  }
  const languageField = node("div", "prefTmdbLanguage");
  const languageLabel = node("label", "", copy.tmdbLanguageLabel); languageLabel.htmlFor = "prefTmdbLanguage";
  const languageSelect = node("select", "prefSelect"); languageSelect.id = languageLabel.htmlFor;
  for (const [code, label] of TMDB_LANGUAGES) {
    const option = node("option", "", label); option.value = code; languageSelect.append(option);
  }
  languageSelect.value = prefs.tmdbLanguage;
  languageField.append(languageLabel, languageSelect, paragraph(copy.tmdbLanguageDescription, "prefHelp"));
  languageSelect.onchange = () => {prefs.tmdbLanguage = languageSelect.value as typeof prefs.tmdbLanguage; save();};
  metadata.append(metadataHeading, metadataChoices, languageField); stack.append(metadata);

  const posters = {card: node("section", "panel prefPanel")};
  const artworkNames = {standard: copy.posterStandard, ratings: copy.posterRatingsTitle, better: copy.posterBetter, posterplus: copy.posterPlus, rpdb: copy.posterRpdb};
  let posterStyle: "standard" | "ratings" | "better" | "posterplus" | "rpdb" = prefs.posters ? "ratings" : "standard";
  const artworkMode = () => posterStyle;
  const artwork = node("div", "prefPosterChoices");
  artwork.id = "prefPosterStyle";
  artwork.setAttribute("role", "radiogroup");
  artwork.setAttribute("aria-label", copy.posterArtwork);
  for (const value of Object.keys(artworkNames) as (keyof typeof artworkNames)[]) {
    // EasyPosters remains available to users with that style already saved.
    if (value === "ratings" && posterStyle !== "ratings") continue;
    const row = node("label", "prefSetting");
    const choice = node("input", "prefSwitch");
    choice.type = "radio";
    choice.name = "posterStyle";
    choice.value = value;
    choice.checked = value === posterStyle;
    choice.onchange = () => {
      if (!choice.checked) return;
      posterStyle = value;
      prefs.posters = value === "ratings";
      save();
      invalidatePreview();
      schedulePreview();
    };
    row.append(node("span", "", artworkNames[value]), choice);
    artwork.append(row);
  }
  const ratingsPanel = node("div"); ratingsPanel.id = "prefRatingsPanel";
  ratingsPanel.append(paragraph(copy.posterRatingsDescription, "prefHelp"));
  const betterOptions = node("div"); betterOptions.id = "prefBetterPanel";
  const posterPlusOptions = node("div"); posterPlusOptions.id = "prefPosterPlusPanel";
  const rpdbOptions = node("div"); rpdbOptions.id = "prefRpdbPanel";
  function providerUrlField(panel: HTMLElement, id: string, labelText: string, placeholder: string, helpText: string, configUrl: string) {
    // No visible label or help text: the field sits below the poster style controls. labelText stays available to screen readers.
    const field = node("div", "prefKeyField");
    const row = node("div", "prefProviderUrlRow"), input = node("input"); input.id = id; input.type = "url"; input.autocomplete = "off"; input.spellcheck = false; input.maxLength = id === "prefPosterPlus" ? 8000 : 1200; input.placeholder = placeholder; input.setAttribute("aria-label", labelText);
    const config = button("⚙ " + copy.posterProviderConfig, "prefProviderConfig"); config.setAttribute("aria-label", copy.posterProviderConfig + " · " + labelText); config.onclick = () => window.open(configUrl, "_blank", "noopener,noreferrer");
    const verify = button(copy.verifyPosterProvider, "secondary prefVerifyButton");
    const status = paragraph("", "prefVerifyStatus"); status.setAttribute("role", "status");
    field.append(row, status); row.append(input, config, verify); panel.append(field);
    return {input, verify, status};
  }
  const betterField = providerUrlField(betterOptions, "prefBetterPosters", copy.posterBetterUrl, "https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg", copy.posterBetterHelp, "https://btttr.cc/configure");
  const posterPlusField = providerUrlField(posterPlusOptions, "prefPosterPlus", copy.posterPlusUrl, "https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&shape={shape}&pc=stremio_tv_nuvio&tg=medium&bp=top_left&fti=1&mw=lb:.99,tk:.01&tw=tk:.8,rt:.2&fbs=photoreal&slr=1.20&shr=0.135&bdm=7&bms=5", copy.posterPlusHelp, "https://postersplus.elfhosted.com/");
  const rpdbFieldWrap = node("div", "prefKeyField"), rpdbHeading = node("div", "prefKeyHeading"), rpdbLink = node("a", "", copy.getApiKey);
  rpdbLink.href = "https://ratingposterdb.com/"; rpdbLink.target = "_blank"; rpdbLink.rel = "noopener noreferrer"; rpdbHeading.append(rpdbLink);
  const rpdbRow = node("div", "prefProviderUrlRow"), rpdbInput = node("input"); rpdbInput.id = "prefRpdbKey"; rpdbInput.type = "password"; rpdbInput.autocomplete = "off"; rpdbInput.spellcheck = false; rpdbInput.maxLength = 200; rpdbInput.placeholder = copy.posterRpdbPlaceholder; rpdbInput.setAttribute("aria-label", copy.posterRpdbKey); rpdbInput.setAttribute("autocapitalize", "none");
  const rpdbVerify = button(copy.verifyPosterProvider, "secondary prefVerifyButton"), rpdbStatus = paragraph("", "prefVerifyStatus"); rpdbStatus.setAttribute("role", "status");
  rpdbRow.append(rpdbInput, rpdbVerify); rpdbFieldWrap.append(rpdbHeading, rpdbRow, rpdbStatus); rpdbOptions.append(rpdbFieldWrap);
  const posterStylePanels = node("div", "prefPosterStylePanels"); posterStylePanels.append(ratingsPanel, betterOptions, posterPlusOptions, rpdbOptions);
  posters.card.append(node("h2", "", copy.posterArtwork), paragraph(copy.posterArtworkDescription), artwork, posterStylePanels); stack.append(posters.card);
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
  const ratingsVerify = button(copy.verifyPosterProvider, "secondary prefVerifyButton"); ratingsVerify.classList.add("prefRatingsVerify");
  const ratingsStatus = paragraph("", "prefVerifyStatus"); ratingsStatus.setAttribute("role", "status");
  ratingsPanel.append(keyFields, ratingsVerify, ratingsStatus);
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
  posterStylePanels.append(posterContent);
  const filterCard = node("section", "panel prefPanel"); filterCard.append(node("h2", "", copy.titleFiltersTitle), paragraph(copy.titleFiltersDescription)); stack.append(filterCard);
  function filter(text: string, id: string, checked: boolean) {const label = node("label", "prefFilterRow"), input = node("input", "prefSwitch"); input.type = "checkbox"; input.id = id; input.checked = checked; label.append(node("span", "", text), input); filterCard.append(label); return input;}
  const unreleased = filter(copy.hideUnreleased, "prefUnreleased", prefs.hideUnreleased);
  const completed = filter(copy.hideCompleted, "prefCompleted", prefs.hideCompleted);
  const completedHelp = paragraph(copy.completedNeedsAccount, "prefHelp prefCompletedHelp"); filterCard.append(completedHelp);
  const error = node("div", "prefError"); error.setAttribute("role", "alert"); posters.card.append(error);
  const actions = node("div", "prefActions"), next = button("Next", "primary");
  const back = button(copy.back, "secondary prefMobileBack");
  back.onclick = () => api.navigate("selection");
  actions.append(next, back); root.append(actions);
  const keys = () => ({tmdb: tmdb.value.trim(), mdblist: mdblist.value.trim()});
  let request = 0, abort: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined, objectUrl = "";
  function save() {try {savePreferences(localStorage, prefs);} catch {} error.textContent = ""; render();}
  function setStatus(element: HTMLElement, text: string, state: "success" | "error" | "neutral") {
    element.textContent = text; element.classList.remove("is-success", "is-error", "is-neutral"); element.classList.add("is-" + state);
  }
  function statusForFailure(element: HTMLElement, result: any) {
    const code = typeof result?.diagnosticCode === "string" && /^YDL-[A-F0-9]{8}$/.test(result.diagnosticCode) ? result.diagnosticCode : "";
    setStatus(element, copy.posterVerifyFailed + (code ? " " + copy.diagnosticCode + " " + code : ""), "error");
  }
  async function networkDiagnostic(provider: "ratings" | "better" | "posterplus" | "rpdb") {
    try {
      const response = await fetch("/api/preferences/poster-preview", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider,clientFailure:"network"}),cache:"no-store"});
      const result = await response.json().catch(()=>({}));
      if(typeof result?.diagnosticCode === "string" && /^YDL-[A-F0-9]{8}$/.test(result.diagnosticCode)) return result.diagnosticCode;
    } catch {}
    return "YDL-" + crypto.randomUUID().slice(0,8).toUpperCase();
  }
  async function verifyProvider(provider: "ratings" | "better" | "posterplus" | "rpdb") {
    const field = provider === "better" ? betterField : provider === "posterplus" ? posterPlusField : provider === "rpdb" ? {input:rpdbInput,verify:rpdbVerify,status:rpdbStatus} : null;
    const status = field?.status || ratingsStatus, verify = field?.verify || ratingsVerify;
    verify.disabled = true; setStatus(status, copy.posterVerifyChecking, "neutral");
    request++; abort?.abort(); abort = new AbortController(); const current = request;
    try {
      const body = provider === "ratings" ? {provider, ...keys(), ratings:prefs.ratings} : provider === "rpdb" ? {provider, apiKey:rpdbInput.value} : {provider, pattern:field?.input.value || ""};
      const response = await fetch("/api/preferences/poster-preview", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:abort.signal,cache:"no-store"});
      if(current !== request) return;
      if(!response.ok) {statusForFailure(status, await response.json().catch(()=>({}))); return;}
      const blob = await response.blob(); if(current !== request) return;
      if(objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = URL.createObjectURL(blob); image.src = objectUrl; posterCaption.textContent = copy.posterLivePreview;
      setStatus(status, copy.posterVerifySuccess, "success"); render();
    } catch(e) {
      if(current !== request || (e as Error).name === "AbortError") return;
      const diagnosticCode=await networkDiagnostic(provider); if(current !== request) return;
      statusForFailure(status, {diagnosticCode});
    } finally {if(current === request) verify.disabled = false;}
  }
  function invalidatePreview() {
    request++; abort?.abort(); clearTimeout(timer); if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = "";
    image.src = samplePoster; posterCaption.textContent = copy.posterIllustrative;
    for(const status of [ratingsStatus,betterField.status,posterPlusField.status,rpdbStatus]) {status.textContent="";status.classList.remove("is-success","is-error","is-neutral");}
    render();
  }
  function render() {
    languageField.hidden = prefs.metadataProvider !== "tmdb";
    reviewPreview.hidden = !prefs.reviews; reviews.toggle.setAttribute("aria-expanded", String(prefs.reviews)); reviews.toggle.setAttribute("aria-controls", reviewPreview.id);
    ratingsPanel.hidden = posterStyle !== "ratings"; betterOptions.hidden = posterStyle !== "better"; posterPlusOptions.hidden = posterStyle !== "posterplus"; rpdbOptions.hidden = posterStyle !== "rpdb";
    posterContent.hidden = posterStyle === "standard";
    choices.hidden = posterStyle !== "ratings";
    shade.hidden = posterStyle !== "ratings" || !!objectUrl; badges.hidden = posterStyle !== "ratings" || !!objectUrl;
    for(const [source, element] of badgeElements) element.hidden = !prefs.ratings.includes(source);
    frame.setAttribute("aria-label", copy.posterPreviewLabel + ": " + copy.posterPreviewTitle + ". " + (posterStyle === "ratings" && prefs.ratings.length ? prefs.ratings.map(s => ratingNames[s]).join(", ") : posterStyle === "ratings" ? copy.posterPreviewNoBadges : artworkNames[posterStyle]));
    const hasAccount = !!api.user(); completed.disabled = !hasAccount; completedHelp.hidden = hasAccount;
    completed.checked = hasAccount && prefs.hideCompleted;
  }
  function schedulePreview() {
    clearTimeout(timer); if (preferenceIssue(prefs, keys()) || artworkMode() !== "ratings") return;
    timer = setTimeout(async () => {
      const id = ++request; abort?.abort(); abort = new AbortController();
      try {
        const r = await fetch("/api/preferences/poster-preview", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({provider:"ratings",...keys(), ratings: prefs.ratings}), signal: abort.signal, cache: "no-store"});
        if (id !== request) return;
        if (!r.ok) {const data = await r.json().catch(() => ({})); statusForFailure(ratingsStatus,data); return;}
        const blob = await r.blob(); if(id !== request) return;
        if(objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = URL.createObjectURL(blob); image.src = objectUrl; posterCaption.textContent = copy.posterLivePreview; setStatus(ratingsStatus,copy.posterVerifySuccess,"success"); render();
      } catch (e) {
        if(id !== request || (e as Error).name === "AbortError") return;
        const diagnosticCode=await networkDiagnostic("ratings"); if(id !== request) return;
        statusForFailure(ratingsStatus,{diagnosticCode});
      }
    }, 650);
  }
  for(const input of [tmdb, mdblist]) {input.oninput = () => {error.textContent = ""; invalidatePreview();}; input.onchange = () => schedulePreview();}
  reviews.toggle.onchange = () => {prefs.reviews = reviews.toggle.checked; save();};
  for(const input of [betterField.input,posterPlusField.input,rpdbInput]) input.oninput = () => {error.textContent = ""; invalidatePreview();};
  betterField.verify.onclick = () => verifyProvider("better"); posterPlusField.verify.onclick = () => verifyProvider("posterplus"); rpdbVerify.onclick = () => verifyProvider("rpdb"); ratingsVerify.onclick = () => verifyProvider("ratings");
  const pattern = () => artworkMode() === "better" && betterField.input.value.trim() ? betterPostersPattern(betterField.input.value) : "";
  const plusPattern = () => artworkMode() === "posterplus" && posterPlusField.input.value.trim() ? posterPlusPattern(posterPlusField.input.value) : "";
  const rpdbKey = () => artworkMode() === "rpdb" ? rpdbApiKey(rpdbInput.value) : "";
  const invalidPattern = () => artworkMode() === "better" ? !pattern() : artworkMode() === "posterplus" ? !plusPattern() : artworkMode() === "rpdb" ? !rpdbKey() : false;
  unreleased.onchange = () => {prefs.hideUnreleased = unreleased.checked; save();};
  completed.onchange = () => {prefs.hideCompleted = !!api.user() && completed.checked; save();};
  next.onclick = () => {
    if (invalidPattern()) {error.textContent = artworkMode()==="posterplus"?copy.posterPlusInvalid:artworkMode()==="rpdb"?copy.posterRpdbInvalid:copy.posterBetterInvalid; (artworkMode()==="posterplus"?posterPlusField.input:artworkMode()==="rpdb"?rpdbInput:betterField.input).focus(); return;}
    const issue = preferenceIssue({...prefs, posters: artworkMode() === "ratings"}, keys());
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
    for(const [label, value] of [[copy.reviewsTitle, prefs.reviews], [copy.hideUnreleased, prefs.hideUnreleased], [copy.hideCompleted, !!api.user() && prefs.hideCompleted]] as const) {
      const row = node("div", "prefSummaryRow"); row.append(node("span", "", label), node("span", "", value ? copy.enabled : copy.disabled)); pCard.append(row);
    }
    const metadataSummary = node("div", "prefSummaryRow"); metadataSummary.append(node("span", "", copy.metadataProvider), node("span", "", metadataNames[prefs.metadataProvider])); pCard.append(metadataSummary);
    if (prefs.metadataProvider === "tmdb") {const languageSummary = node("div", "prefSummaryRow"); languageSummary.append(node("span", "", copy.tmdbLanguageLabel), node("span", "", TMDB_LANGUAGES.find(([code]) => code === prefs.tmdbLanguage)?.[1] || "English")); pCard.append(languageSummary);}
    const artworkSummary = node("div", "prefSummaryRow"); artworkSummary.append(node("span", "", copy.posterArtwork), node("span", "", artworkNames[artworkMode()])); pCard.append(artworkSummary);
    if(artworkMode()==="ratings") pCard.append(paragraph(prefs.ratings.map(s => ratingNames[s]).join(" · "), "prefHelp"));
    s.append(pCard);
    const manifest=node("section","prefManifest");
    const row=node("div","prefManifestRow"),input=node("input"),copyButton=button(copy.copyManifest,"secondary");input.id="manifestUrl";input.readOnly=true;input.placeholder=copy.manifestUrl;input.setAttribute("aria-label",copy.manifestUrl);copyButton.disabled=true;
    const install=node("a","primary prefInstall",copy.installNuvio);install.setAttribute("aria-disabled","true");
    const status=paragraph("","prefError");status.setAttribute("role","status");
    // Build add-on first creates the link, then shows Install in Nuvio and the link to copy.
    const generate = button(copy.generateAndInstall, "primary prefGenerate");
    manifest.classList.add("panel", "prefPanel");
    row.append(input,copyButton);
    manifest.append(install,row,status);
    row.hidden = install.hidden = true;
    manifest.append(generate);
    if(artworkMode()==="ratings")manifest.append(paragraph(copy.manifestKeyPrivacy,"prefHelp"));
    if(artworkMode()==="better"||artworkMode()==="posterplus")manifest.append(paragraph(copy.manifestBetterPrivacy,"prefHelp"));
    if(artworkMode()==="rpdb")manifest.append(paragraph(copy.posterRpdbPrivacy,"prefHelp"));confirm.append(manifest);
    const data={catalogs:api.selection().map(({name,url,kind,category,country,slot,mode,personUrl,filter,personDisplayName,personName,profileAvatar})=>({name,url,kind,category,country,slot,mode,personUrl,filter,...(kind==="filmography"?{personName:personDisplayName||personName,personPhoto:profileAvatar}:{})})),user:api.user(),preferences:{...normalizePreferences(prefs),posters:artworkMode()==="ratings",hideCompleted:!!api.user()&&prefs.hideCompleted},betterPosters:pattern(),posterPlus:plusPattern(),rpdb:artworkMode()==="rpdb"?{apiKey:rpdbKey()}:undefined,keys:artworkMode()==="ratings"?keys():{tmdb:"",mdblist:""}};
    const signature=JSON.stringify(data),id=++manifestRequest;
    function apply(url:string){input.value=url;copyButton.disabled=false;install.href=url.replace(/^https?:/,"stremio:");install.removeAttribute("aria-disabled");
      generate.hidden = true;
      row.hidden = install.hidden = false;
    }
    async function prepare(){status.textContent="";try{
      if(invalidPattern()){status.textContent=artworkMode()==="posterplus"?copy.posterPlusInvalid:artworkMode()==="rpdb"?copy.posterRpdbInvalid:copy.posterBetterInvalid;return;}
      if(preferenceIssue(data.preferences,keys()))throw Error("keys");
      if(signature===manifestSignature&&manifestValue){apply(manifestValue);return;}
      const response=await fetch("/api/addon/configure",{method:"POST",headers:{"content-type":"application/json"},body:signature,cache:"no-store"}).catch(()=>null);
      if(!response){if(id===manifestRequest){status.textContent=copy.manifestConnectionFailed;}return;}
      const result=await response.json();if(id!==manifestRequest)return;
      if(!response.ok){
        const code=result?.diagnosticCode;
        const message=result?.issue==="catalog-count"?copy.manifestTooManyCatalogs.replace("{max}",String(MAX_CATALOGS)):result?.issue==="token-too-large"?copy.manifestTooLarge:copy.manifestFailed;
        status.textContent=message+(typeof code==="string"&&/^YDL-[0-9A-F]{8}$/.test(code)?" "+copy.manifestDiagnosticCode+" "+code:"");
        
        return;
      }
      const url=new URL(result.url);if(url.origin!==location.origin||!url.pathname.startsWith("/addon/")||!url.pathname.endsWith("/manifest.json"))throw Error("url");
      manifestSignature=signature;manifestValue=url.href;apply(url.href);
    }catch{if(id===manifestRequest){status.textContent=preferenceIssue(data.preferences,keys())?copy.preferencesKeysRequired:copy.manifestFailed;}}}
    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        copyButton.textContent = copy.copiedManifest;
      } catch {
        input.focus();
        input.select();
        status.textContent = copy.manifestSelectToCopy;
      }
    };
    const selected=api.selection().length;
    if(selected>MAX_CATALOGS){generate.disabled=true;status.textContent=copy.confirmOverLimit.replace("{count}",String(selected)).replace("{max}",String(MAX_CATALOGS)).replace("{extra}",String(selected-MAX_CATALOGS));return;}
    generate.onclick = async () => {
      generate.disabled = true;
      generate.textContent = "Generating…";
      try { await prepare(); }
      finally {
        generate.textContent = copy.generateAndInstall;
        generate.disabled = false;
      }
    };
  }
  render();
  return {show(page: string) {render(); if(page === "confirm") renderConfirm();}, values() {return {...normalizePreferences(prefs), hideCompleted: !!api.user() && prefs.hideCompleted};}};
}
