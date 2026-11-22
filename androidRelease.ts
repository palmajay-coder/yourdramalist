// The newest Android app release, read from the version file the "Android app release" GitHub workflow
// publishes with each release. The setup page uses it to offer an update inside the app.
const REPO = "palmajay-coder/yourdramalist";
// The APK is named like the earlier releases: YourDramaList-1.1.27-android.apk. The version comes from the
// latest release's android-latest.json, so the file is read from that same latest release.
export const androidApkUrl = (version: string) =>
  `https://github.com/${REPO}/releases/latest/download/YourDramaList-${version}-android.apk`;
/** The releases page, used when the newest version is unknown. */
export const ANDROID_RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const VERSION_URL = `https://github.com/${REPO}/releases/latest/download/android-latest.json`;
const CACHE_MS = 60 * 60 * 1000, RETRY_MS = 5 * 60 * 1000;
// The in-app update notice only reminds apps older than this version code. A quiet release (a small,
// cosmetic change) leaves this alone, so people on the previous version are not asked to update.
// For an update everyone should get, raise it to that release's version code.
export const ANDROID_REMIND_BELOW = 100000; // 1.1.31 is not a quiet release: every older app is reminded (the endpoint caps this at the newest version code)

type Latest = {versionCode: number; versionName: string; url: string};

export function createAndroidRelease(fetcher: typeof fetch = fetch, now = Date.now, remindBelow = ANDROID_REMIND_BELOW) {
  let cached: {value: Latest | null; expires: number} | undefined;
  let pending: Promise<Latest | null> | undefined;
  async function load(): Promise<Latest | null> {
    try {
      const response = await fetcher(VERSION_URL, {signal: AbortSignal.timeout(8000), headers: {Accept: "application/json"}});
      if (!response.ok) { await response.body?.cancel(); return null; }
      const data = await response.json();
      const versionCode = Number(data?.versionCode), versionName = String(data?.versionName || "");
      if (!Number.isSafeInteger(versionCode) || versionCode < 1 || !/^\d+\.\d+\.\d+$/.test(versionName)) return null;
      return {versionCode, versionName, url: androidApkUrl(versionName)};
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
    // /download/android is the permanent link for posts and notices: it always opens the newest APK.
    if (new URL(req.url).pathname === "/download/android") {
      return new Response(null, {status: 302, headers: {location: value?.url ?? ANDROID_RELEASES_URL, "cache-control": "public, max-age=300"}});
    }
    const body = value ? {...value, remindBelow: Math.min(value.versionCode, remindBelow)} : {versionCode: 0, versionName: "", url: ANDROID_RELEASES_URL, remindBelow: 0};
    return Response.json(body, {headers: {"cache-control": "public, max-age=300"}});
  };
}

export const handleAndroidRelease = createAndroidRelease();
