// Notice page for the first 1.1.23 Android app, which opens this retired test address.
// It holds no copy of the site: it only explains the one-time reinstall and links to the current app.
// The site redirects this permanent link to the newest APK (YourDramaList-<version>-android.apk).
const DOWNLOAD = "https://yourdramalist.net/download/android";
const SITE = "https://yourdramalist.net/";
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YourDramaList: please update the app</title>
<style>
:root{color-scheme:dark}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#101216;color:#f1f3f6;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:420px;background:#20232b;border:1px solid #353a45;border-radius:16px;padding:24px}
h1{font-size:22px;margin:0 0 12px}p{margin:0 0 14px;color:#cdd2da}ol{margin:0 0 18px;padding-left:22px;color:#cdd2da}li{margin:4px 0}
a.button{display:block;text-align:center;background:#2674ec;color:#fff;text-decoration:none;font-weight:600;border-radius:12px;padding:14px;margin-bottom:10px}
a.link{display:block;text-align:center;color:#75aaff}
</style></head><body><main>
<h1>Please install the new app</h1>
<p>This version of the YourDramaList app has stopped working. The new version has all the latest features, and future updates install over it without reinstalling.</p>
<ol><li>Uninstall this app.</li><li>Tap <strong>Download the new app</strong> below, then open the file and tap Install.</li><li>Open YourDramaList and add your catalogs again. Catalogs already in Nuvio from this app need a new install link too.</li></ol>
<a class="button" href="${DOWNLOAD}">Download the new app</a>
<a class="link" href="${SITE}">Open the website instead</a>
</main></body></html>`;
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Old Nuvio add-on links from this address cannot be served any more.
    if (url.pathname.startsWith("/addon/") || url.pathname.startsWith("/api/")) {
      return Response.json({error: "This YourDramaList address was retired. Install the add-on again from https://yourdramalist.net/."}, {status: 410, headers: {"access-control-allow-origin": "*"}});
    }
    return new Response(page, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"}});
  },
};
