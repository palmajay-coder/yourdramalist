import { isDeepStrictEqual } from "node:util";
import { load } from "npm:cheerio@1.0.0";
import { extractPopularLists } from "./popularLists.ts";
import { goblinHtml } from "./goblinFixture.ts";
const expected = [{"name":"All Time Favorite Dramas","url":"https://mydramalist.com/list/MLOPW2Z3","titleCount":920,"loves":2210,"comments":40,"posters":["https://i.mydramalist.com/XZqYJt.jpg","https://i.mydramalist.com/JkD8Xt.jpg","https://i.mydramalist.com/6wjE0_4t.jpg","https://i.mydramalist.com/ZeVdY_4t.jpg","https://i.mydramalist.com/lBOo4t.jpg"]},{"name":"Arranged/Fake/Forced Marriage","url":"https://mydramalist.com/list/p1R8nrJ3","titleCount":99,"loves":304,"comments":9,"posters":["https://i.mydramalist.com/WPDJRt.jpg","https://i.mydramalist.com/b30NEt.jpg","https://i.mydramalist.com/94ZJMt.jpg","https://i.mydramalist.com/81g0At.jpg","https://i.mydramalist.com/b3blwt.jpg"]},{"name":"Happily Ever After Fantasy Romance","url":"https://mydramalist.com/list/E1VK0WEL","titleCount":113,"loves":285,"comments":6,"posters":["https://i.mydramalist.com/moobPt.jpg","https://i.mydramalist.com/EYm4mt.jpg","https://i.mydramalist.com/YYk3Pt.jpg","https://i.mydramalist.com/GPR38t.jpg","https://i.mydramalist.com/W0vWR_4t.jpg"]}];
function equal(actual: unknown, wanted: unknown, label: string) {
  if (!isDeepStrictEqual(actual, wanted)) throw new Error(label + ": " + JSON.stringify(actual));
}
let passed = 0;
function test(name: string, check: () => void) { check(); passed++; console.log("PASS " + name); }
function mutate(change: (dom: ReturnType<typeof load>) => void) {
  const dom = load(goblinHtml); change(dom); return extractPopularLists(dom.html());
}
test("Goblin: exactly 3 previews, all names, URLs, counts, and 15 original posters", () => {
  const result = extractPopularLists(goblinHtml);
  equal(result.sectionFound, true, "section");
  equal(result.dramaId, "18452", "drama");
  equal(result.sourceUrl, "https://mydramalist.com/18452-goblin", "source");
  equal(result.warnings, [], "warnings");
  equal(result.lists.length, 3, "preview count");
  equal(result.lists.map(({listId, posterUrls, ...rest}) => ({...rest, posters: posterUrls})), expected, "complete previews");
  equal(result.lists.flatMap(l => l.posterUrls).length, 15, "posters");
});
test("counts use icons regardless of order; commas and zero supported", () => {
  const r = mutate($ => {
    $(".list-bars").each((_, el) => { const spans = $(el).children("span").get().reverse(); $(el).append(spans); });
    $(".list-bars i.fa-heart").first().parent().html('<i class="fa-heart"></i> 2,210 loves');
    $(".list-bars i.fa-comment-alt").first().parent().html('<i class="fa-comment-alt"></i> 0');
  });
  equal([r.lists[0].titleCount, r.lists[0].loves, r.lists[0].comments], [920,2210,0], "metrics");
});
test("relative/protocol-relative URLs normalize and list ID case survives", () => {
  const r = mutate($ => {
    const links = $(".title.bottom > a");
    links.eq(0).attr("href", "/list/MLOPW2Z3?x=1#fragment");
    links.eq(1).attr("href", "//www.mydramalist.com/list/p1R8nrJ3/");
    links.eq(2).attr("href", "http://mydramalist.com/list/E1VK0WEL");
    $(".custom-list-preview img").first().attr("data-src","//i.mydramalist.com/XZqYJt.jpg");
  });
  equal(r.lists.map(l => l.url), expected.map(l => l.url), "URLs");
  equal(r.lists[0].posterUrls, expected[0].posters, "poster priority");
});
test("missing and malformed counts are null with diagnostics", () => {
  const r = mutate($ => {
    $(".list-bars i.fa-heart").first().parent().remove();
    $(".list-bars i.fa-tv").first().parent().text("not a count");
  });
  equal([r.lists[0].loves,r.lists[0].titleCount], [null,null], "null counts");
  equal(r.warnings.length, 2, "warnings");
});
test("missing section differs from an empty section", () => {
  equal(extractPopularLists("<html>Access denied</html>").sectionFound, false, "missing");
  const r = mutate($ => { $(".custom-list-preview").remove(); });
  equal([r.sectionFound,r.lists.length], [true,0], "empty");
});
test("deduplication and section scoping", () => {
  const r = mutate($ => {
    const card = $(".custom-list-preview").first();
    $(".box-body").last().append(card.clone());
    card.parent().append(card.clone());
    $("body").append(card.clone());
  });
  equal(r.lists.length, 3, "deduplicated scoped lists");
});
test("foreign, unsafe, and create links are rejected", () => {
  const r = mutate($ => {
    const links = $(".title.bottom > a");
    links.eq(0).attr("href","https://evil.example/list/MLOPW2Z3");
    links.eq(1).attr("href","javascript:alert(1)");
    links.eq(2).attr("href","/list/create");
  });
  equal(r.lists.length, 0, "rejected URLs");
});
test("local rewritten src is never fabricated into a remote poster", () => {
  const r = mutate($ => { $(".custom-list-preview img").removeAttr("data-src"); });
  equal(r.lists.flatMap(l => l.posterUrls), [], "local sources rejected");
});
test("valid remote src fallback and entity/whitespace decoding", () => {
  const r = mutate($ => {
    $(".custom-list-preview img").first().removeAttr("data-src").attr("src","https://i.mydramalist.com/XZqYJt.jpg");
    $(".title.bottom > a").first().html("  A &amp; B\n  List ");
  });
  equal(r.lists[0].name, "A & B List", "name");
  equal(r.lists[0].posterUrls, expected[0].posters, "fallback");
});
console.log(passed + " tests passed; no live requests made.");
