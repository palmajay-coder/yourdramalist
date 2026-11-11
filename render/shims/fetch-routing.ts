// Outgoing-request helper for the server.
// 1. Requests to an internal host (for example https://ydl-v2.internal) are answered in-process
//    by that val's handler, so YourDramaList and YDL-V2 run in one server as one site.
// 2. Outgoing requests that fail or return a non-2xx status are logged (host and path only,
//    never query strings or headers), so problems show up in Render's logs.
type Handler = (request: Request) => Response | Promise<Response>;
const internal = new Map<string, Handler>();

export function registerInternalHost(host: string, handler: Handler) {
  internal.set(host, handler);
}

const nativeFetch = globalThis.fetch.bind(globalThis);

const where = (url: URL) => url.host + url.pathname;

globalThis.fetch = async function routedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input as any, init);
  const url = new URL(request.url);
  const handler = internal.get(url.host);
  if (handler) return handler(request);

  const started = Date.now();
  try {
    const response = await nativeFetch(request);
    if (!response.ok) console.log(JSON.stringify({ ydlFetch: where(url), status: response.status, ms: Date.now() - started }));
    return response;
  } catch (error) {
    console.log(JSON.stringify({ ydlFetch: where(url), error: String(error).slice(0, 200), ms: Date.now() - started }));
    throw error;
  }
} as typeof fetch;
