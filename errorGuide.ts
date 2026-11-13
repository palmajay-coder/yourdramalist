/** Plain-language guide for every diagnostic error the site can record. Shown on the admin Errors section. */
export type ErrorKind = "setup" | "poster";
/** user: the visitor can fix it. you: the site owner needs to act. outside: a provider or automated traffic; act only if it keeps happening. */
export type ErrorOwner = "user" | "you" | "outside";
export type GuideEntry = {title: string; meaning: string; fix: string; owner: ErrorOwner};

export const SETUP_ERRORS: Record<string, GuideEntry> = {
  "catalog-count": {title: "Too many catalogs", meaning: "The setup had no catalogs or more than the 60-catalog limit.", fix: "Remove catalogs until the selection is 60 or fewer.", owner: "user"},
  "token-too-large": {title: "Install link too long", meaning: "The setup was too large to fit in one install link.", fix: "Remove a few catalogs or shorten long custom list names.", owner: "user"},
  "duplicate-catalog": {title: "Duplicate catalog", meaning: "The same list was added more than once.", fix: "Remove the duplicate and try again.", owner: "user"},
  "catalog-entry": {title: "Unsupported list", meaning: "A catalog link was not a valid MyDramaList list, watchlist or person page.", fix: "Remove that catalog and add it again from the site.", owner: "user"},
  "preferences": {title: "Poster settings incomplete", meaning: "Poster options were missing a key, had an invalid URL, or more than one poster style was chosen.", fix: "Open Preferences, fix the poster settings, then try again.", owner: "user"},
  "request-too-large": {title: "Setup too large to send", meaning: "The setup request was bigger than the server accepts.", fix: "Remove some catalogs and try again.", owner: "user"},
  "rate-limit": {title: "Too many setups at once", meaning: "More than 30 install links were requested site-wide in one minute.", fix: "Wait a minute and press Try again.", owner: "user"},
  "manifest-generation": {title: "Install link failed to build", meaning: "The server could not encrypt the setup. Usually the YDL_MANIFEST_SECRET setting is missing or invalid.", fix: "Check YDL_MANIFEST_SECRET in Val Town (64 hex characters).", owner: "you"},
  "invalid-request-body": {title: "Unreadable setup request", meaning: "The setup page sent data the server could not read.", fix: "If several users report it, the setup page may be broken. Test a fresh setup.", owner: "you"},
  "origin": {title: "Request from another site", meaning: "A setup request came from outside the YourDramaList site.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "format": {title: "Wrong request format", meaning: "A setup request was not sent as JSON.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "method": {title: "Wrong request type", meaning: "Something tried to open the setup endpoint directly instead of submitting a setup.", fix: "Usually bots or a browser visiting the address. Nothing to do.", owner: "outside"},
};

export const POSTER_ERRORS: Record<string, GuideEntry> = {
  "invalid-credentials": {title: "Poster key missing or malformed", meaning: "The API key was empty or not in the right format.", fix: "Paste the full key from the provider's site.", owner: "user"},
  "credentials-rejected": {title: "Poster key rejected", meaning: "The provider said the API key is wrong or not allowed.", fix: "Check the key on the provider's site and paste it again.", owner: "user"},
  "invalid-settings": {title: "Poster URL invalid", meaning: "The BetterPosters or Poster+ URL pattern is not one the site accepts.", fix: "Copy the URL pattern again from the provider's configure page.", owner: "user"},
  "client-network": {title: "Browser lost connection", meaning: "The visitor's browser could not reach the site while checking posters.", fix: "Check the internet connection and press Verify again.", owner: "user"},
  "request-limit": {title: "Too many poster checks", meaning: "Too many poster previews were requested at the same time.", fix: "Wait a moment and press Verify again.", owner: "user"},
  "provider-unavailable": {title: "Poster provider unreachable", meaning: "The poster provider did not respond.", fix: "Try again later. If it lasts for days, the provider may be down.", owner: "outside"},
  "provider-response": {title: "Poster provider error", meaning: "The poster provider answered with an error.", fix: "Try again later.", owner: "outside"},
  "provider-rate-limit": {title: "Poster provider busy", meaning: "The poster provider asked the site to slow down.", fix: "Wait a few minutes and try again.", owner: "outside"},
  "not-an-image": {title: "Provider sent no image", meaning: "The poster provider answered, but not with an image.", fix: "Check the provider's settings page, then try again.", owner: "outside"},
  "sample-poster-missing": {title: "Preview poster missing", meaning: "The provider has no poster for the sample title used in the preview.", fix: "If this keeps happening, the preview's sample title needs changing.", owner: "you"},
  "invalid-configuration": {title: "Unknown poster style", meaning: "The poster check named a provider the site does not support.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "invalid-input": {title: "Unreadable poster check", meaning: "The poster check sent data the server could not read.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "request-size": {title: "Poster check too large", meaning: "The poster check request was bigger than the server accepts.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "request-origin": {title: "Poster check from another site", meaning: "A poster check came from outside the YourDramaList site.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "request-format": {title: "Wrong poster check format", meaning: "A poster check was not sent as JSON.", fix: "Usually automated traffic. Nothing to do unless it keeps happening.", owner: "outside"},
  "request-method": {title: "Wrong poster check type", meaning: "Something opened the poster check address directly.", fix: "Usually bots or a browser visiting the address. Nothing to do.", owner: "outside"},
};

export const POSTER_PROVIDERS: Record<string, string> = {ratings: "EasyPosters", better: "BetterPosters", posterplus: "Poster+", rpdb: "RPDB", unknown: "Unknown"};

export function guideFor(kind: ErrorKind, category: string): GuideEntry | null {
  return (kind === "setup" ? SETUP_ERRORS : POSTER_ERRORS)[category] ?? null;
}
