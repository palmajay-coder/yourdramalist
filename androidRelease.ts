// The newest Android app release, read from the version file the "Android app release" GitHub workflow
// publishes with each release. The setup page uses it to offer an update inside the app.
const REPO = "palmajay-coder/yourdramalist";
export const ANDROID_DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/YourDramaList.apk`;
const VERSION_URL = `https://github.com/${REPO}/releases/latest/download/android-latest.json`;
const CACHE_MS = 60 * 60 * 1000, RETRY_MS = 5 * 60 * 1000;

type Latest = {versionCode: number; versionName: string; url: string};

export function createAndroidRelease(fetcher: typeof fetch = fetch, now = Date.now) {
  let cached: {value: Latest | null; expires: number} | undefined;
  let pending: Promise<Latest | null> | undefined;
  async function load(): Promise<Latest | null> {
    try {
      const response = await fetcher(VERSION_URL, {signal: AbortSignal.timeout(8000), headers: {Accept: "application/json"}});
      if (!response.ok) { await response.body?.cancel(); return null; }
      const data = await response.json();
      const versionCode = Number(data?.versionCode), versionName = String(data?.versionName || "");
      if (!Number.isSafeInteger(versionCode) || versionCode < 1 || !/^\d+\.\d+\.\d+$/.test(versionName)) return null;
      return {versionCode, versionName, url: ANDROID_DOWNLOAD_URL};
    } catch {
      return null;
    }
  }
  async function latest(): Promise<Latest | null> {
    if (cached && cached.expires > now()) return cached.value;
    pending ??= load().then((value) => {
      cached = {value, expires: now() + (value ? CACHE_MS : RETRY_MS)};
      return value;
    }).finally(() => { pending = undefined; });
    return pending;
  }
  return async function handle(req: Request): Promise<Response> {
    if (req.method !== "GET") return Response.json({error: "Method not allowed"}, {status: 405});
    const value = await latest();
    return Response.json(value ?? {versionCode: 0, versionName: "", url: ANDROID_DOWNLOAD_URL}, {headers: {"cache-control": "public, max-age=300"}});
  };
}

export const handleAndroidRelease = createAndroidRelease();
