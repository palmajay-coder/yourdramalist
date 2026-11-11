// Render web server for YourDramaList.
// Runs the unchanged Val Town code as one Node.js server:
//   - YourDramaList (repository root, app.ts) answers every public request.
//   - YDL-V2 (vals/YDL-V2/main.ts) answers YourDramaList's profile and avatar lookups in-process.
//   - weeklyRefresh.ts runs on Val Town's schedule (07:00 and 08:00 UTC).
import "./shims/env.ts"; // Must stay first: app modules read Deno.env while loading.
import { registerInternalHost } from "./shims/fetch-routing.ts";
import { serve } from "@hono/node-server";
import app from "../app.ts";
import ydlV2 from "../vals/YDL-V2/main.ts";
import weeklyRefresh from "../weeklyRefresh.ts";

type Handler = (request: Request) => Promise<Response>;
const handleApp = app as unknown as Handler;
registerInternalHost("ydl-v2.internal", ydlV2 as unknown as Handler);

// Render ends HTTPS before the server, so requests arrive as http://. Val Town handed the app
// https:// URLs, and the app builds install links from them, so restore the public protocol.
function publicRequest(request: Request): Request {
  const url = new URL(request.url);
  if (request.headers.get("x-forwarded-proto") !== "https" || url.protocol === "https:") return request;
  url.protocol = "https:";
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
    signal: request.signal,
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);
}

const port = Number(process.env.PORT || 10000);
serve({ fetch: (request: Request) => handleApp(publicRequest(request)), port, hostname: "0.0.0.0" }, () => {
  console.log(`YourDramaList listening on port ${port}`);
});

// Temporary migration check: does the Kuryana API (the app's existing MyDramaList fallback)
// answer this server? Logs one line at startup. Remove once the data source is decided.
(async () => {
  const base = process.env.KURYANA_URL || "https://kuryana.tbdh.app";
  // Director filmography check: how does Kuryana group Park Chan Wook's credits?
  try {
    const search = await (await fetch(base + "/v2/search?q=park%20chan%20wook&page=1", { headers: { Accept: "application/json" } })).json();
    const person = (search?.data?.people || [])[0];
    console.log(JSON.stringify({ kuryanaCheck: "search", first: person?.slug, name: person?.name }));
    if (person?.slug) {
      const data = (await (await fetch(base + "/v2/people/" + person.slug, { headers: { Accept: "application/json" } })).json())?.data;
      for (const [group, list] of Object.entries<any>(data?.works || {})) {
        console.log(JSON.stringify({ kuryanaCheck: "works", group, count: list.length, items: list.map((w: any) => `${w.year}|${w.title}|${w.role}`).join(" ; ").slice(0, 900) }));
      }
    }
  } catch (error) {
    console.log(JSON.stringify({ kuryanaCheck: "people", error: String(error).slice(0, 200) }));
  }
})();

// Same schedule as the Val Town interval: 0 7,8 * * * (UTC). weeklyRefresh.ts itself skips
// runs that are not midnight Pacific, exactly as before.
let lastScheduledRun = "";
setInterval(async () => {
  const now = new Date();
  const slot = now.toISOString().slice(0, 13); // e.g. 2026-11-16T08
  const due = now.getUTCMinutes() === 0 && (now.getUTCHours() === 7 || now.getUTCHours() === 8);
  if (!due || slot === lastScheduledRun) return;
  lastScheduledRun = slot;
  try {
    const result = await (weeklyRefresh as unknown as () => Promise<unknown>)();
    console.log(JSON.stringify({ weeklyRefresh: slot, result }));
  } catch (error) {
    console.log(JSON.stringify({ weeklyRefresh: slot, error: String(error).slice(0, 300) }));
  }
}, 20_000);
