// The setup guide that search engines read, robots.txt, the sitemap and the links to the guide.
import {guidePage, parseGuide, robotsTxt, sitemapXml} from "./guidePage.ts";
import {GUIDE_TEXT} from "./guideText.ts";
import handler from "./app.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

await test("guideText.ts is up to date with the owner's guide-text.md", async () => {
  ok(GUIDE_TEXT === await Deno.readTextFile(new URL("./guide-text.md", import.meta.url)), "guide-text.md changed: run node cloudflare/build.mjs to update guideText.ts");
});

await test("the guide file rules: title, description, sections, steps, questions, buttons, bold and links", () => {
  const blocks = parseGuide("<!-- notes -->\n# My Title\n\nShort **intro** text.\n\n[Start setup](/)\n\n## Steps\n\n1. **First thing.** Do it.\n2. **Second thing:** Then\nthis.\n\n## Questions\n\n### Is it free?\n\nYes, see [privacy](/privacy).\n\n### Not a question\n\nPlain.");
  ok(JSON.stringify(blocks.map(b => b.kind)) === JSON.stringify(["title", "paragraph", "button", "section", "step", "step", "section", "question", "section", "paragraph"]), "blocks: " + blocks.map(b => b.kind));
  ok((blocks[4] as any).name === "First thing" && (blocks[5] as any).name === "Second thing" && (blocks[5] as any).text === "Then this.", "steps");
  ok((blocks[7] as any).answer === "Yes, see [privacy](/privacy).", "a question takes the paragraph under it");
  const html = guidePage("# T\n\nAbout <script>alert(1)</script> [bad](javascript:alert(1)) [ok](https://example.com) **b**\n\n### Q?\n\nA.");
  ok(!html.includes("<script>alert") && html.includes("&lt;script&gt;") && !html.includes("javascript:") && html.includes('<a href="https://example.com">ok</a>') && html.includes("<strong>b</strong>"), "text is escaped and only safe links work");
  ok(html.includes("<title>T | YourDramaList</title>") && html.includes('"@type":"FAQPage"') && !html.includes('"@type":"HowTo"'), "search data follows what the file has");
});

await test("the guide is plain HTML with a title, description, canonical link, steps, questions and structured data", () => {
  const html = guidePage();
  const title = GUIDE_TEXT.match(/^# (.+)$/m)![1];
  ok(html.includes("<title>" + title + " | YourDramaList</title>"), "the title comes from the file");
  ok(/<meta name="description" content="[^"]{20,}">/.test(html), "a description");
  ok(html.includes('<link rel="canonical" href="https://yourdramalist.net/guide">'), "canonical link");
  ok(html.includes('<li id="step-1">') && html.includes('class="start" href="/"'), "steps and a way to start");
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  ok(data.some((d: any) => d["@type"] === "HowTo" && d.step.length) && data.some((d: any) => d["@type"] === "FAQPage" && d.mainEntity.length), "HowTo and FAQ data");
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
