// The setup guide at /guide: the owner writes it in guide-text.md (plain Markdown, rules at the top of that file),
// and this page turns it into HTML search engines can read, with HowTo and FAQ data.
// Also robots.txt and sitemap.xml, so search engines find it.
import {APP_VERSION} from "./text.ts";
import {GUIDE_TEXT} from "./guideText.ts";

const SITE = "https://yourdramalist.net";

export type GuideBlock =
  | {kind: "title"; text: string}
  | {kind: "section"; text: string}
  | {kind: "paragraph"; text: string}
  | {kind: "button"; text: string; href: string}
  | {kind: "step"; name: string; text: string}
  | {kind: "question"; text: string; answer: string};

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Only site paths and https links; anything else (javascript: and so on) is dropped. */
const safeHref = (href: string) => /^\/(?!\/)/.test(href) || /^https:\/\/[^\s"<>]+$/.test(href) ? href : "";
/** Words without Markdown marks, for search data and the page title. */
const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1").trim();
/** Escaped text with **bold** and [links](/path) turned into HTML. */
function inline(text: string) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const url = safeHref(href.replace(/&amp;/g, "&"));
      return url ? `<a href="${esc(url)}">${label}</a>` : label;
    });
}

/** Turns guide-text.md into blocks: headings, paragraphs, buttons, numbered steps and questions with answers. */
export function parseGuide(text: string): GuideBlock[] {
  const source = text.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const chunks = source.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(Boolean);
  const blocks: GuideBlock[] = [];
  for (const chunk of chunks) {
    // A heading line can sit right above its text without a blank line in between.
    const lines = chunk.split("\n"), first = lines[0].trim(), rest = lines.slice(1).join(" ").replace(/\s+/g, " ").trim();
    const heading = first.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length, words = heading[2].trim();
      if (level === 1) blocks.push({kind: "title", text: words});
      else if (level === 3 && words.endsWith("?")) blocks.push({kind: "question", text: words, answer: ""});
      else blocks.push({kind: "section", text: words});
      if (rest) blocks.push({kind: "paragraph", text: rest});
      continue;
    }
    const joined = chunk.replace(/\s*\n\s*/g, " ").trim();
    const button = joined.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (button && safeHref(button[2])) { blocks.push({kind: "button", text: button[1], href: button[2]}); continue; }
    if (/^\d+[.)]\s/.test(first)) {
      // Numbered steps, with or without blank lines between them; a step's text can wrap onto the next lines.
      for (const item of chunk.split(/\n(?=\s*\d+[.)]\s)/)) {
        const words = item.replace(/\s*\n\s*/g, " ").trim().replace(/^\d+[.)]\s+/, "");
        const named = words.match(/^\*\*(.+?)\*\*\s*(.*)$/);
        const name = (named ? named[1] : words).replace(/[.:]\s*$/, "").trim();
        blocks.push({kind: "step", name, text: named ? named[2].trim() : ""});
      }
      continue;
    }
    blocks.push({kind: "paragraph", text: joined});
  }
  // A question's answer is the paragraph right after it.
  const out: GuideBlock[] = [];
  for (const block of blocks) {
    const last = out[out.length - 1];
    if (block.kind === "paragraph" && last?.kind === "question" && !last.answer) last.answer = block.text;
    else out.push(block);
  }
  return out;
}

/** GET /guide */
export function guidePage(text: string = GUIDE_TEXT) {
  const blocks = parseGuide(text);
  const title = plain((blocks.find(b => b.kind === "title") as any)?.text || "How to Add MyDramaList Catalogs to Nuvio and Stremio");
  const titleIndex = blocks.findIndex(b => b.kind === "title");
  const intro = blocks.slice(titleIndex + 1).find(b => b.kind === "paragraph") as {text: string} | undefined;
  const description = plain(intro?.text || "");
  const steps = blocks.filter(b => b.kind === "step") as {name: string; text: string}[];
  const questions = blocks.filter(b => b.kind === "question") as {text: string; answer: string}[];
  const data: any[] = [];
  if (steps.length) data.push({"@context": "https://schema.org", "@type": "HowTo", name: title, ...(description ? {description} : {}), totalTime: "PT5M", estimatedCost: {"@type": "MonetaryAmount", currency: "USD", value: "0"}, step: steps.map((s, i) => ({"@type": "HowToStep", position: i + 1, name: plain(s.name), text: plain(s.text || s.name), url: SITE + "/guide#step-" + (i + 1)}))});
  if (questions.length) data.push({"@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map(q => ({"@type": "Question", name: plain(q.text), acceptedAnswer: {"@type": "Answer", text: plain(q.answer)}}))});

  let body = "", stepNumber = 0;
  blocks.forEach((block, i) => {
    const previous = blocks[i - 1], next = blocks[i + 1];
    if (block.kind === "step") {
      if (previous?.kind !== "step") body += "<ol>";
      stepNumber++;
      body += `<li id="step-${stepNumber}"><h3>${inline(block.name)}</h3>${block.text ? `<p>${inline(block.text)}</p>` : ""}</li>`;
      if (next?.kind !== "step") body += "</ol>";
    } else if (block.kind === "title") body += `<h1>${inline(block.text)}</h1>`;
    else if (block.kind === "section") body += `<h2>${inline(block.text)}</h2>`;
    else if (block.kind === "question") body += `<h3>${inline(block.text)}</h3>${block.answer ? `<p>${inline(block.answer)}</p>` : ""}`;
    else if (block.kind === "button") body += `<p><a class="start" href="${esc(block.href)}">${inline(block.text)}</a></p>`;
    else body += `<p${block === intro ? ' class="muted"' : ""}>${inline(block.text)}</p>`;
  });

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | YourDramaList</title>
${description ? `<meta name="description" content="${esc(description)}">` : ""}<link rel="canonical" href="${SITE}/guide">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}">${description ? `<meta property="og:description" content="${esc(description)}">` : ""}<meta property="og:url" content="${SITE}/guide"><meta property="og:site_name" content="YourDramaList">
${data.length ? `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>` : ""}
<style>*{box-sizing:border-box}body{margin:0;background:#181818;color:#ddd;font:16px Lato,Arial,sans-serif;line-height:1.65}main{max-width:820px;margin:0 auto;padding:36px 16px 64px;min-height:calc(100dvh - 110px)}a{color:#35a9eb}h1{line-height:1.2;font-size:30px}h2{font-size:21px;margin:34px 0 8px}h3{font-size:17px;margin:20px 0 4px}ol{padding-left:22px}li{margin:0 0 14px}.muted{color:#aaa}.start{display:inline-block;margin:10px 0 4px;padding:12px 22px;border-radius:999px;background:#35a9eb;color:#08131b;font-weight:700;text-decoration:none}.start:focus-visible{outline:3px solid #fff;outline-offset:2px}footer{padding:18px;text-align:center;color:#aaa;font-size:13px;border-top:1px solid #333}</style></head>
<body><main><a href="/">Back to YourDramaList</a>
${body}
</main><footer><a href="/">YourDramaList</a> · <a href="/privacy">Privacy</a> · v${APP_VERSION}</footer></body></html>`;
}

/** GET /robots.txt */
export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /addon/\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

/** GET /sitemap.xml */
export function sitemapXml() {
  const urls = ["/", "/guide", "/privacy"].map(path => `<url><loc>${SITE}${path}</loc></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}
