// "How to add MyDramaList catalogs to Nuvio and Stremio": a plain HTML page search engines can read,
// plus robots.txt and sitemap.xml so they find it.
import {APP_VERSION} from "./text.ts";

const SITE = "https://yourdramalist.net";
const TITLE = "How to Add MyDramaList Catalogs to Nuvio and Stremio";
const DESCRIPTION = "Turn your MyDramaList watchlist, K-drama Top 10, weekly picks and actor filmographies into Nuvio and Stremio catalogs. Free, no password, set up in a few minutes.";

const STEPS: [string, string][] = [
  ["Connect your MyDramaList username", "Open YourDramaList and type your MyDramaList username. We only read your public watchlist, so we never ask for your password. You can also continue without an account."],
  ["Pick your catalogs", "Choose from Spotlight, This Week's Picks, Top 10 Dramas and Movies Today, Because you watched, Browse All, your watchlists, public MyDramaList lists and actor or director filmographies. Pick a country to see Korean, Chinese, Japanese, Taiwanese or Thai titles."],
  ["Choose posters and details", "Pick TMDB or MyDramaList details, a poster style, MyDramaList reviews, and whether to hide unreleased or completed titles."],
  ["Install in Nuvio or Stremio", "Copy your install link. In Nuvio, add it as an add-on. In Stremio, paste it into the add-on search box and press Install. Your catalogs then show on the home screen."],
];
const FAQ: [string, string][] = [
  ["Is YourDramaList free?", "Yes. YourDramaList costs nothing to use."],
  ["Do I need my MyDramaList password?", "No. YourDramaList reads only public MyDramaList pages, so it never asks for a password."],
  ["Can I change my catalogs later?", "Yes. Tap Configure on the YourDramaList add-on in Nuvio or Stremio to reopen your setup with everything already selected, change it, and install the new link."],
  ["Why does my watchlist show nothing?", "Your MyDramaList watchlist needs to be public. Private lists stay private, so YourDramaList cannot read them."],
  ["Does it work on TV?", "Your catalogs show wherever you use Nuvio or Stremio with the same add-on installed, including Android TV."],
];
const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** GET /guide */
export function guidePage() {
  const structured = JSON.stringify([
    {"@context": "https://schema.org", "@type": "HowTo", name: TITLE, description: DESCRIPTION, totalTime: "PT5M", estimatedCost: {"@type": "MonetaryAmount", currency: "USD", value: "0"}, step: STEPS.map(([name, text], i) => ({"@type": "HowToStep", position: i + 1, name, text, url: SITE + "/guide#step-" + (i + 1)}))},
    {"@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({"@type": "Question", name: q, acceptedAnswer: {"@type": "Answer", text: a}}))},
  ]).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(TITLE)} | YourDramaList</title>
<meta name="description" content="${esc(DESCRIPTION)}"><link rel="canonical" href="${SITE}/guide">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(TITLE)}"><meta property="og:description" content="${esc(DESCRIPTION)}"><meta property="og:url" content="${SITE}/guide"><meta property="og:site_name" content="YourDramaList">
<script type="application/ld+json">${structured}</script>
<style>*{box-sizing:border-box}body{margin:0;background:#181818;color:#ddd;font:16px Lato,Arial,sans-serif;line-height:1.65}main{max-width:820px;margin:0 auto;padding:36px 16px 64px;min-height:calc(100dvh - 110px)}a{color:#35a9eb}h1{line-height:1.2;font-size:30px}h2{font-size:21px;margin:34px 0 8px}h3{font-size:17px;margin:20px 0 4px}ol{padding-left:22px}li{margin:0 0 14px}.muted{color:#aaa}.start{display:inline-block;margin:10px 0 4px;padding:12px 22px;border-radius:999px;background:#35a9eb;color:#08131b;font-weight:700;text-decoration:none}.start:focus-visible{outline:3px solid #fff;outline-offset:2px}footer{padding:18px;text-align:center;color:#aaa;font-size:13px;border-top:1px solid #333}</style></head>
<body><main><a href="/">Back to YourDramaList</a>
<h1>${esc(TITLE)}</h1>
<p class="muted">${esc(DESCRIPTION)}</p>
<a class="start" href="/">Start setup</a>
<h2>What YourDramaList does</h2>
<p>YourDramaList turns MyDramaList into catalogs for Nuvio and Stremio. Your watchlist, a daily Top 10 for each country, hand-picked monthly Spotlight lists, weekly themed picks and the filmography of any actor or director show up as rows on your home screen, with posters, ratings and details.</p>
<h2>Set it up in four steps</h2>
<ol>${STEPS.map(([name, text], i) => `<li id="step-${i + 1}"><h3>${esc(name)}</h3><p>${esc(text)}</p></li>`).join("")}</ol>
<a class="start" href="/">Start setup</a>
<h2>Change your catalogs later</h2>
<p>New lists arrive every week, month and day. To add them, tap Configure on the YourDramaList add-on in Nuvio or Stremio. Your setup opens with everything already selected. Add or remove catalogs, install the new link, then remove the old YourDramaList add-on.</p>
<h2>Questions</h2>
${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
</main><footer><a href="/">YourDramaList</a> · <a href="/privacy">Privacy</a> · v${APP_VERSION}</footer></body></html>`;
}

/** GET /robots.txt */
export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /addon/\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

/** GET /sitemap.xml */
export function sitemapXml() {
  const urls = ["/", "/guide", "/privacy"].map(path => `<url><loc>${SITE}${path === "/" ? "/" : path}</loc></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}
