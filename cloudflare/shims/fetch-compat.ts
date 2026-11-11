// Makes Cloudflare's fetch accept `redirect: "error"`, which the app uses for every
// MyDramaList and TMDB request. Deno (Val Town) supports it: a redirect makes fetch
// reject with a TypeError. Workers refuses the option outright ("error won't be
// implemented"), so every such request failed before it was sent.
// Here the request runs with `redirect: "manual"`, and a redirect response is turned
// into the same TypeError Deno would throw. All other requests pass through unchanged.

const nativeFetch = globalThis.fetch.bind(globalThis);

function wantsRedirectError(input: RequestInfo | URL, init?: RequestInit): boolean {
  if (init && "redirect" in init) return init.redirect === "error";
  return false;
}

async function compatFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!wantsRedirectError(input, init)) return nativeFetch(input as any, init);
  const response = await nativeFetch(input as any, { ...init, redirect: "manual" });
  if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
    await response.body?.cancel().catch(() => {});
    throw new TypeError("Fetch failed: the server redirected, and redirect mode is \"error\"");
  }
  return response;
}

// Migration diagnostics: one log line per outgoing request that fails or is not 2xx,
// readable in Workers Logs. Host and path only, never query strings or headers.
const where = (input: RequestInfo | URL) => {
  try {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return url.host + url.pathname;
  } catch {
    return "unparsed-url";
  }
};

globalThis.fetch = async function loggedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const started = Date.now();
  try {
    const response = await compatFetch(input, init);
    if (!response.ok) console.log(JSON.stringify({ ydlFetch: where(input), status: response.status, ms: Date.now() - started }));
    return response;
  } catch (error) {
    console.log(JSON.stringify({ ydlFetch: where(input), error: String(error).slice(0, 200), ms: Date.now() - started }));
    throw error;
  }
} as typeof fetch;
