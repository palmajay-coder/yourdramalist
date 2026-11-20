// The setup guide that search engines read, robots.txt, the sitemap and the links to the guide.
import {guidePage, robotsTxt, sitemapXml} from "./guidePage.ts";
import handler from "./app.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

await test("the guide is plain HTML with a title, description, canonical link, steps, questions and structured data", () => {
  const html = guidePage();
  ok(html.includes("<title>How to Add MyDramaList Catalogs to Nuvio and Stremio | YourDramaList</title>"), "title");
  ok(/<meta name="description" content="[^"]{80,170}">/.test(html), "a description of search-result length");
  ok(html.includes('<link rel="canonical" href="https://yourdramalist.net/guide">'), "canonical link");
  ok((html.match(/<li id="step-\d">/g) || []).length === 4 && html.includes('href="/">Start setup</a>'), "four steps and a way to start");
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  ok(data[0]["@type"] === "HowTo" && data[0].step.length === 4 && data[1]["@type"] === "FAQPage" && data[1].mainEntity.length >= 4, "HowTo and FAQ data");
  ok(!html.includes("—") && !/<h[1-3][^>]*>[^<]*:[^<]*<\/h/.test(html), "no em dashes, no colons in headings");
  ok(!/<script(?! type="application\/ld\+json")/.test(html), "no page scripts");
});

await test("robots.txt and the sitemap point search engines at the public pages only", () => {
  const robots = robotsTxt();
  ok(robots.includes("Disallow: /api/") && robots.includes("Disallow: /addon/") && robots.includes("Sitemap: https://yourdramalist.net/sitemap.xml"), robots);
  const map = sitemapXml();
  ok(map.startsWith('<?xml') && ["https://yourdramalist.net/", "https://yourdramalist.net/guide", "https://yourdramalist.net/privacy"].every(u => map.includes("<loc>" + u + "</loc>")), map);
});

await test("the site serves the guide, robots.txt and sitemap, and links to the guide from Connect and the footer", async () => {
  const guide = await handler(new Request("https://test/guide"));
  ok(guide.status === 200 && guide.headers.get("content-type")?.includes("text/html") && (await guide.text()).includes("Start setup"), "guide route");
  const slash = await handler(new Request("https://test/guide/"));
  ok(slash.status === 301 && slash.headers.get("location") === "/guide", "trailing slash redirects");
  ok((await (await handler(new Request("https://test/robots.txt"))).text()).includes("Sitemap:"), "robots route");
  ok((await handler(new Request("https://test/sitemap.xml"))).headers.get("content-type")?.includes("xml"), "sitemap route");
  const page = await (await handler(new Request("https://test/setup"))).text();
  ok(page.includes('<p class="connectGuide"><a href="/guide">New to Nuvio or Stremio? Read the setup guide</a></p>') && page.includes('<a href="/guide">Setup guide</a>'), "Connect and footer links");
});
console.log(JSON.stringify({passed}));
