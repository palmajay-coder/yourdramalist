// YourDramaList v3 data layer: MyDramaList + Kuryana scraping, parsing, and caching.
// Imported by main.ts. You should not need to edit this file directly.

export let MDL_TEXT, $e;

try {
  ({ MDL_TEXT } = await import("./text.ts"));
} catch {}

export let $E = "";

try {
  ({ $e } = await import("./client.ts"));
} catch (x) {
  $E = String((x && x.message) || x).slice(0, 300);
}

export function yl(n) {
  return /\blist$/i.test(n) ? n : n + " list";
}

export const U = (() => {
    try {
      if (typeof Deno < "u") return Deno.env.toObject();
    } catch {}
    return (typeof process < "u" && process.env) || {};
  })(),
  O = new Map();

export async function D(t, e, n) {
  const s = O.get(t),
    a = Date.now();
  if (s && s.expires > a) return s.value;
  if (s && s.ok && !s.refreshing && a - s.expires < 24 * 3600 * 1e3) {
    return (
      (s.refreshing = !0),
        Promise.resolve()
          .then(n)
          .then(
            (d) =>
              O.set(t, {
                value: Promise.resolve(d),
                ok: !0,
                expires: Date.now() + e,
              }),
            () => {
              s.refreshing = !1;
            },
          ),
        s.value
    );
  }
  const r = n(),
    i = { value: r, expires: a + e };
  O.set(t, i);
  try {
    const d = await r;
    return ((i.ok = !0), d);
  } catch (d) {
    if (s && s.ok) return (O.set(t, s), s.value);
    throw (O.delete(t), d);
  }
}

export const T = "https://mydramalist.com",
  q = U.KURYANA_URL || "https://kuryana.tbdh.app",
  kt = Number(U.MAX_PAGES || 10),
  H = Number(U.LIST_TTL_MIN || 5) * 60 * 1e3,
  B = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: T + "/",
  };

export function re(t) {
  const e = String(t || "").trim(),
    n = e.match(/mydramalist\.com\/list\/([A-Za-z0-9]+)/i);
  return n ? n[1] : /^[A-Za-z0-9]{4,20}$/.test(e) ? e : null;
}

export function at(t) {
  const [e, n = ""] = String(t || "").split(" - "),
    s = n.match(/\b(\d{4})\b/),
    a = n.match(/(\d+)\s+episodes?/);
  return {
    type: (e || "").trim() || null,
    year: s ? Number(s[1]) : null,
    episodes: a ? Number(a[1]) : null,
  };
}

export function N(t) {
  if (!t) return "";
  try {
    return new URL(t, T).toString();
  } catch {
    return "";
  }
}

export function V(t) {
  return String(t || "")
    .split("?")[0]
    .replace(/\/$/, "")
    .split("/")
    .pop();
}

export function h(t) {
  return String(t || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (e, n) => String.fromCharCode(Number(n)))
    .replace(
      /&#x([0-9a-f]+);/gi,
      (e, n) => String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function P(t, e, n = "div|span|p|small|h2|h3") {
  const s = new RegExp(
      `<(${n})[^>]*class="[^"]*\\b${e}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`,
      "i",
    ),
    a = t.match(s);
  return a ? a[2] : "";
}

export function $(t, e) {
  const n = String(t || "").match(new RegExp(`\\s${e}="([^"]*)"`, "i"));
  return n ? n[1] : "";
}

export function oe(t) {
  const e = t.search(/class="[^"]*\b(group-item-rating|score)\b/);
  if (e < 0) return null;
  const n = h(t.slice(e, e + 600).replace(/^[^>]*>/, "")).match(
      /\b(\d{1,2}(?:\.\d)?)\b/,
    ),
    s = n ? Number(n[1]) : NaN;
  return s > 0 && s <= 10 ? s : null;
}

export function $t(t) {
  const e = [],
    n = t.search(/class="[^"]*\bcollection-list\b/),
    s = n >= 0 ? t.slice(n) : "",
    a = s.search(/class="[^"]*\bpagination\b/),
    r = a > 0 ? s.slice(0, a) : s;
  for (const b of r.split(/<li[\s>]/i).slice(1)) {
    const R = P(b, "title"),
      L = (R.match(/<a\b[^>]*>[\s\S]*?<\/a>/i) ||
        P(b, "content", "div").match(/<a\b[^>]*>[\s\S]*?<\/a>/i) ||
        [])[0];
    if (!L) continue;
    const j = $(L, "href");
    if (!j || j.includes("/people/")) continue;
    const I = (b.match(/<img\b[^>]*>/i) || [""])[0],
      tt = $(I, "data-src") || $(I, "data-cfsrc") || $(I, "src"),
      z = parseInt(h(R).split(".")[0], 10);
    e.push({
      slug: V(j),
      link: N(j),
      title: h(L),
      image: N(tt).replace("t.jpg", "c.jpg"),
      note: h(P(b, "desc", "div")) || null,
      rank: Number.isFinite(z) ? z : null,
      rating: oe(b),
      ...at(h(P(b, "text-muted"))),
    });
  }
  const i = t.match(
      /class="[^"]*\bbox-header\b[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i,
    ),
    d = t.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i),
    l = h(i ? i[1] : d ? d[1] : ""),
    u = t.search(/class="[^"]*\bbox-header\b/),
    o = u >= 0
      ? t
        .slice(u)
        .match(
          /href="(?:https:\/\/mydramalist\.com)?\/profile\/([^"\/?#]+)"[^>]*>([\s\S]*?)<\/a>/i,
        )
      : null,
    g = o ? h(o[2]) || decodeURIComponent(o[1]) : "";
  let x = 1;
  for (
    const b of t.matchAll(
      /class="page-link"[^>]*href="[^"]*[?&]page=(\d+)|href="[^"]*[?&]page=(\d+)"[^>]*class="page-link"/g,
    )
  ) {
    x = Math.max(x, Number(b[1] || b[2]));
  }
  return { title: l, author: g, items: e, totalPages: x };
}

export async function St(t, e) {
  const n = `${T}/list/${encodeURIComponent(t)}${e > 1 ? `?page=${e}` : ""}`,
    s = await E(n, { headers: B }),
    a = await s.text();
  if (s.status === 404 || /This list is private/i.test(a)) {
    const i = new Error("List not found or private");
    throw ((i.code = "PRIVATE"), i);
  }
  if (!s.ok) throw new Error(`MDL responded ${s.status}`);
  const r = $t(a);
  if (!r.items.length && e === 1 && /cf-|challenge|Just a moment/i.test(a)) {
    throw new Error("Blocked by Cloudflare");
  }
  return r;
}

export async function rt(t, e) {
  const n = await E(`${q}/v2/lists/${encodeURIComponent(t)}?page=${e}`, {
      headers: { Accept: "application/json" },
    }),
    s = await n.json().catch(() => ({}));
  if (!n.ok || !s.data) {
    const r = new Error(
      s?.description?.title || s?.error || `Fallback API ${n.status}`,
    );
    throw ((n.status === 404 || n.status === 400) && (r.code = "PRIVATE"), r);
  }
  const a = s.data;
  return {
    title: a.title || "",
    author: a.author?.name || a.user?.name || a.author || "",
    totalPages: a.pagination?.total_pages || 1,
    items: (a.items || [])
      .filter((r) => r.kind !== "person")
      .map((r) => ({
        slug: r.slug,
        link: r.link,
        title: r.title,
        image: r.image,
        note: r.note || null,
        rank: r.rank ?? null,
        type: r.type ?? null,
        year: r.year ?? null,
        episodes: r.episodes ?? null,
        rating: r.rating ?? null,
      })),
  };
}

export async function ie(t, e, n) {
  if (n === "fallback") return rt(t, e);
  try {
    return await St(t, e);
  } catch (s) {
    if (s.code === "PRIVATE") throw s;
    return rt(t, e);
  }
}

export const Lt = /^s\.[A-Za-z0-9_-]{2,60}$/,
  le = /^p\.[A-Za-z0-9_-]{2,400}$/,
  ot = (t) => Lt.test(t) || le.test(t);

export function ce(t) {
  if (Lt.test(t)) return `shows/${t.slice(2)}`;
  try {
    const e = t.slice(2).replace(/-/g, "+").replace(/_/g, "/"),
      n = new TextDecoder().decode(
        Uint8Array.from(atob(e), (s) => s.charCodeAt(0)),
      );
    return /^[a-z][\w\-\/]*(\?[^#\s]*)?$/i.test(n) && !n.includes("//")
      ? n
      : "";
  } catch {
    return "";
  }
}

export function At(t, e = "") {
  const n = [],
    s = t.split(/<div[^>]*\bid="mdl-\d+"/i).slice(1);
  for (const o of s) {
    const g = o.split(/<div[^>]*\bid="mdl-\d+"/i)[0],
      b = ((
        (g.match(
          /<h6[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/h6>/i,
        ) || [])[1] || ""
      ).match(/<a\b[^>]*>[\s\S]*?<\/a>/i) || [])[0];
    if (!b) continue;
    const R = $(b, "href");
    if (!R || R.includes("/people/")) continue;
    const L = (g.match(/<img\b[^>]*>/i) || [""])[0],
      j = $(L, "data-src") || $(L, "data-cfsrc") || $(L, "src"),
      I = Number(h(P(g, "score", "span")));
    n.push({
      slug: V(R),
      link: N(R),
      title: h(b),
      image: N(j).replace(/(s|t)\.jpg$/, "c.jpg"),
      note: null,
      rank: n.length + 1,
      rating: I > 0 && I <= 10 ? I : null,
      ...at(h(P(g, "text-muted", "span"))),
    });
  }
  const a = t.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
    r = t.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i),
    i = h(a ? a[1] : r ? r[1] : "").replace(/\s*-\s*MyDramaList\s*$/i, "");
  let d = 1;
  const l = (e || "shows/").split("?")[0].replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    ),
    u = new RegExp(
      `class="page-link"[^>]*href="[^"]*[?&]page=(\\d+)|href="[^"]*[?&]page=(\\d+)"[^>]*class="page-link"|href="(?:https://mydramalist\\.com)?/${l}[^"]*[?&]page=(\\d+)`,
      "g",
    );
  for (const o of t.matchAll(u)) d = Math.max(d, Number(o[1] || o[2] || o[3]));
  return { title: i, items: n, totalPages: d };
}

export async function Mt(t, e) {
  const n = t.replace(/([?&])page=\d+&?/, "$1").replace(/[?&]$/, ""),
    s = `${T}/${n}${e > 1 ? `${n.includes("?") ? "&" : "?"}page=${e}` : ""}`,
    a = await E(s, { headers: B }),
    r = await a.text();
  if (a.status === 404) {
    const i = new Error("Page not found");
    throw ((i.code = "PRIVATE"), i);
  }
  if (!a.ok) throw new Error(`MDL responded ${a.status}`);
  return At(r, t);
}

export function de(t) {
  const e = ce(t);
  return D(`shows:${e}`, H, async () => {
    if (!e) {
      throw Object.assign(new Error("Page not found"), { code: "PRIVATE" });
    }
    const n = await Mt(e, 1),
      s = [...n.items],
      a = Math.min(n.totalPages || 1, 5),
      r = await Promise.all(
        Array.from(
          { length: Math.max(0, a - 1) },
          (u, o) => Mt(e, o + 2).catch(() => ({ items: [] })),
        ),
      );
    for (const u of r) {
      u.items.forEach((o) => ((o.rank = s.length + 1), s.push(o)));
    }
    const i = new Set(),
      d = s.filter((u) => u.slug && !i.has(u.slug) && i.add(u.slug)),
      l = e
        .split("?")[0]
        .replace(/[_\-\/]+/g, " ")
        .replace(/\b\w/g, (u) => u.toUpperCase())
        .trim();
    return { id: t, title: n.title || l, items: d };
  });
}

export function Dt(t) {
  return D(`list:${t}`, H, async () => {
    let e = "direct",
      n;
    try {
      n = await St(t, 1);
    } catch (l) {
      if (l.code === "PRIVATE") throw l;
      ((e = "fallback"), (n = await rt(t, 1)));
    }
    const s = [...n.items],
      a = Math.min(n.totalPages || 1, kt),
      r = await Promise.all(
        Array.from(
          { length: Math.max(0, a - 1) },
          (l, u) => ie(t, u + 2, e).catch(() => ({ items: [] })),
        ),
      );
    for (const l of r) s.push(...l.items);
    const i = new Set(),
      d = s.filter((l) => l.slug && !i.has(l.slug) && i.add(l.slug));
    return {
      id: t,
      title: n.title || `MDL list ${t}`,
      author: typeof n.author == "string" ? n.author : "",
      items: d,
    };
  });
}

export function K(t) {
  return /movie/i.test(t || "") ? "movie" : "series";
}

export const Rt = "https://v3-cinemeta.strem.io",
  it = U.TMDB_API_KEY || "",
  pe = 10080 * 60 * 1e3;

export function lt(t) {
  return String(t || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(\d{4}\)/g, "")
    .replace(/season\s*\d+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function Tt(t) {
  const e = String(t || "").match(/\d{4}/);
  return e ? Number(e[0]) : null;
}

export function Et(t, e, n) {
  const s = lt(e);
  let a = null,
    r = -1;
  for (const i of t) {
    const d = lt(i.name),
      l = i.year;
    let u = 0;
    if (d === s) u += 3;
    else if (d.startsWith(s) || s.startsWith(d)) u += 1.5;
    else if (d.includes(s) || s.includes(d)) u += 1;
    else continue;
    if (n && l) {
      const o = Math.abs(n - l);
      o === 0 ? (u += 3) : o === 1 ? (u += 1.5) : (u -= 2);
    }
    u > r && ((r = u), (a = i));
  }
  return r >= 3 ? a : null;
}

export async function ue(t, e) {
  const n = encodeURIComponent(lt(e) || e),
    s = await fetch(`${Rt}/catalog/${t}/top/search=${n}.json`);
  return s.ok
    ? ((await s.json().catch(() => ({}))).metas || [])
      .filter((r) => /^tt\d+/.test(r.id || r.imdb_id || ""))
      .map((r) => ({
        id: r.imdb_id || r.id,
        name: r.name,
        year: Tt(r.releaseInfo || r.year),
        poster: r.poster,
      }))
    : [];
}

export async function me(t, e, n, k) {
  const K = k || it;
  if (!K) return [];
  const s = t === "movie" ? "movie" : "tv",
    a = new URLSearchParams({ api_key: K, query: e }),
    r = await fetch(`https://api.themoviedb.org/3/search/${s}?${a}`);
  if (!r.ok) return [];
  const d = ((await r.json().catch(() => ({}))).results || [])
      .slice(0, 5)
      .map((o) => ({
        tmdbId: o.id,
        name: o.name || o.title,
        altName: o.original_name || o.original_title,
        year: Tt(o.first_air_date || o.release_date),
      })),
    l = Et(d, e, n);
  if (!l) return [];
  const u = await fetch(
    `https://api.themoviedb.org/3/${s}/${l.tmdbId}/external_ids?api_key=${K}`,
  ).then((o) => (o.ok ? o.json() : {}));
  return u.imdb_id ? [{ id: u.imdb_id, name: l.name, year: l.year }] : [];
}

export function fe(t, e, k, X1) {
  const n = `${X1 ? "x" : ""}${e}:${t.slug}`,
    x = O.get("nm:" + n);
  return x && x.expires > Date.now()
    ? Promise.resolve(null)
    : D("match:" + n, pe, async () => {
      const M = t.title.match(
          /^(.+?)[\s:,-]+(?:season\s*\d+|part\s*\d+|\d+(?:st|nd|rd|th)\s+season|[2-9])$/i,
        ),
        Q = M ? M[1].trim() : t.title,
        Y = M ? null : t.year,
        F = (c) => (M && t.year
          ? c.filter((z) => !z.year || z.year <= t.year)
          : c),
        s = Et(F(await ue(e, Q).catch(() => [])), Q, Y) ||
          (await me(e, Q, Y, k).catch(() => []))[0];
      if (
        !s ||
        (X1 &&
          (lt(s.name) !== lt(Q) ||
            (t.year && s.year && Math.abs(s.year - t.year) > 1 && !M)))
      ) {
        throw 0;
      }
      return s;
    }).catch(
      () => (
        O.set("nm:" + n, {
          value: Promise.resolve(null),
          expires: Date.now() + 216e5,
        }), null
      ),
    );
}

export async function It(t, e, n) {
  const s = new Array(t.length);
  let a = 0;
  const r = Array.from({ length: Math.min(e, t.length) }, async () => {
    for (; a < t.length;) {
      const i = a++;
      s[i] = await n(t[i], i);
    }
  });
  return (await Promise.all(r), s);
}

export const Ct = /^[A-Za-z0-9]{4,20}$/,
  ct = /^a\.\d+(-[A-Za-z0-9-]{1,80})?$/,
  F = /^d\.[1-5]\.[A-Za-z0-9_.-]{1,40}$/,
  Y = /^r\.[A-Za-z0-9_.-]{1,40}$/,
  jt = /^[A-Za-z0-9_.-]{1,40}$/,
  dt = (t) => Ct.test(t) || ot(t) || ct.test(t) || F.test(t) || Y.test(t),
  W = {
    1: "Watching",
    2: "Completed",
    3: "Plan to Watch",
    4: "On Hold",
    5: "Dropped",
  },
  ge = (t) =>
    btoa(unescape(encodeURIComponent(t)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

export function Nt(t) {
  const e = String(t || "").trim();
  let n;
  if ((n = e.match(/mydramalist\.com\/list\/([A-Za-z0-9]+)/i))) return [n[1]];
  if ((n = e.match(/mydramalist\.com\/people\/(\d+(?:-[A-Za-z0-9-]+)?)/i))) {
    return [`a.${n[1]}`];
  }
  if ((n = e.match(/mydramalist\.com\/dramalist\/([A-Za-z0-9_.-]+)/i))) {
    return [1, 2, 3, 4, 5].map((s) => `d.${s}.${n[1]}`);
  }
  if ((n = e.match(/mydramalist\.com\/shows\/([A-Za-z0-9_-]+)\/?$/i))) {
    return [`s.${n[1]}`];
  }
  if (
    (n = e.match(
      /mydramalist\.com\/((?!list\/|people\/|profile\/|dramalist\/)[a-z][^#\s]*)/i,
    ))
  ) {
    const s = n[1].replace(/([?&])page=\d+&?/, "$1").replace(/[?&\/]+$/, "");
    return [`p.${ge(s)}`];
  }
  return dt(e) && (!Ct.test(e) || /\d/.test(e)) ? [e] : [];
}

export async function _(t) {
  const e = await E(`${T}/${t}`, { headers: B }),
    n = await e.text();
  if (e.status === 404) {
    throw Object.assign(new Error("Not found on MyDramaList"), {
      code: "PRIVATE",
    });
  }
  if (!e.ok) throw new Error(`MDL responded ${e.status}`);
  return n;
}

export async function pt(t) {
  const e = await E(`${q}/v2/${t}`, {
      headers: { Accept: "application/json" },
    }),
    n = await e.json().catch(() => ({}));
  if (!e.ok || !n.data) {
    throw Object.assign(new Error("Fallback API failed"), {
      code: e.status === 404 ? "PRIVATE" : void 0,
    });
  }
  return n.data;
}

export const Z = (t, e) =>
    h(
      (t.match(
        new RegExp(
          `<td[^>]*class="[^"]*\\b${e}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/td>`,
          "i",
        ),
      ) ||
        [])[1],
    ),
  Pt = (t) => {
    const e = String(t || "").match(/\b(19|20)\d{2}\b/);
    return e ? Number(e[0]) : null;
  };

export function RT(i) {
  const r = [...i.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    .map((z) => h(z[1]).trim())
    .filter((z) => /^(10|\d)\.\d$/.test(z));
  return r.length ? parseFloat(r[r.length - 1]) : null;
}

// Each filmography row has a thumbnail-image anchor (no visible text) right
// before the real title anchor (class="text-primary"), so grabbing "the
// first <a> in the row" always picks the image link and yields an empty
// title. This finds the actual title link, falling back to its image
// anchor's title="" attribute if the text-primary link isn't found.
function TL(html) {
  const p = html.match(
    /<a\b[^>]*class="[^"]*\btext-primary\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
  );
  if (p) return { href: p[1], title: h(p[2]) };
  const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const z of anchors) {
    const href = $(z, "href");
    if (!href || href.includes("/people/")) continue;
    return { href, title: h(z) || $(z, "title") || "" };
  }
  return null;
}

export function _t(t) {
  const e =
      h(
        (t.match(
          /<h1[^>]*class="[^"]*\bfilm-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
        ) || [])[1],
      ) ||
      h(
        (t.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) || [])[
          1
        ],
      ).replace(
        /\s*-\s*MyDramaList.*$/i,
        "",
      ),
    n = [],
    H5 = [...t.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>/gi)],
    HA = [...t.matchAll(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi)],
    DR = [];
  for (const a of t.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const P = H5.filter((z) => z.index < a.index).pop(),
      r = P ? h(P[1]) : "";
    a[2] = a[1];
    if (/drama|movie|special/i.test(r)) {
      for (const i of a[2].split(/<tr[\s>]/i).slice(1)) {
        const cell = (i.match(
          /<td[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i,
        ) || [])[1] || "";
        const tl = TL(cell);
        if (!tl) continue;
        const u = tl.href;
        const o = (i.match(/<img\b[^>]*>/i) || [""])[0],
          g = $(o, "data-src") || $(o, "data-cfsrc") || $(o, "src");
        n.push({
          slug: V(u),
          link: N(u),
          title: tl.title,
          image: g ? N(g).replace(/(s|t)\.jpg$/, "c.jpg") : "",
          type: /movie/i.test(r) ? "Movie" : "Drama",
          year: Pt(Z(i, "year")),
          note: h(Z(i, "role")).replace(/\s+/g, " ") || null,
          rating: RT(i),
          episodes: null,
        });
      }
    } else if (
      /director/i.test(
        h((HA.filter((z) => z.index < a.index).pop() || [0, ""])[1]) || r,
      )
    ) {
      for (const i of a[2].split(/<tr[\s>]/i).slice(1)) {
        const tl = TL(i);
        if (!tl) continue;
        DR.push({
          slug: V(tl.href),
          link: N(tl.href),
          title: tl.title,
          type: "Movie",
          year: Pt(Z(i, "year")),
          rating: RT(i),
        });
      }
    }
  }
  return { name: e, items: n, dir: DR };
}

export function he(t) {
  const e = t.slice(2);
  return D(`actor:${e}`, H, async () => {
    let n = null;
    try {
      n = _t(await _(`people/${e}`));
    } catch (a) {
      if (a.code === "PRIVATE") throw a;
    }
    n = n || { name: "", items: [], dir: [] };
    const s = new Set(),
      s2 = new Set(),
      it = n.items.filter((a) => a.slug && !s.has(a.slug) && s.add(a.slug)),
      dd = (n.dir || []).filter((a) =>
        a.slug && !s2.has(a.slug) && s2.add(a.slug)
      );
    return {
      id: t,
      title: n.name || "Actor",
      name: n.name || "Actor",
      items: it,
      dir: dd,
      isDir: dd.length > 0 && dd.length > it.length,
    };
  });
}

export function zt(t) {
  const e = {},
    n = [...t.matchAll(/<div[^>]*class="[^"]*\bmdl-style-list-(\d)\b/gi)];
  return (
    n.forEach((s, a) => {
      const r = Number(s[1]),
        i = t.slice(s.index, a + 1 < n.length ? n[a + 1].index : void 0);
      if (!W[r]) return;
      const d = [];
      for (const l of i.split(/<tr[\s>]/i).slice(1)) {
        const u =
          (l.match(
            /<a\b[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>[\s\S]*?<\/a>/i,
          ) || [])[0];
        if (!u) continue;
        const o = $(u, "href"),
          g =
            Number(
              (l.match(/<span[^>]*class="score"[^>]*>\s*([\d.]+)/i) || [])[1],
            ) || 0;
        d.push({
          slug: V(o),
          link: N(o),
          title: h(u),
          image: "",
          type: Z(l, "mdl-style-col-type") || null,
          year: Pt(Z(l, "mdl-style-col-year")),
          score: g,
          note: null,
          rating: null,
          episodes: null,
        });
      }
      e[r] = (e[r] || []).concat(d);
    }), e
  );
}

export function G(t) {
  return D(`dl:${t.toLowerCase()}`, H, async () => {
    let e = null;
    try {
      const n = await _(`dramalist/${encodeURIComponent(t)}`);
      if (/This list is private|is private/i.test(n)) {
        throw Object.assign(new Error("This dramalist is private"), {
          code: "PRIVATE",
        });
      }
      e = zt(n);
    } catch (n) {
      if (n.code === "PRIVATE") throw n;
    }
    return e || {};
  });
}

export async function be(t) {
  const [, e, n] = t.match(/^d\.(\d)\.(.+)$/),
    s = await G(n),
    a = W[e];
  return { id: t, title: a, name: `${n}'s ${a}`, items: s[e] || [] };
}

// Looks up a person's native-script name (e.g. Hangul for a Korean actor)
// from their own MDL profile page's "Native name:" detail row, so search
// results can show "English Name (Native Name)" the way MDL itself does.
// Cached for a month since this almost never changes.
export function nativeName(slug) {
  return D(`native:${slug}`, 30 * 24 * 3600 * 1e3, async () => {
    try {
      const html = await _(`people/${slug}`),
        m = html.match(/<b[^>]*>\s*Native name:\s*<\/b>\s*([^<]+)/i);
      return m ? h(m[1]).trim() : "";
    } catch {
      return "";
    }
  }).catch(() => "");
}

export function ye(t) {
  return D(`prof:${t.toLowerCase()}`, H, async () => {
    const e = await _(`profile/${encodeURIComponent(t)}`);
    let n = [];
    try {
      const s = await _(`profile/${encodeURIComponent(t)}/lists`),
        a = new Set();
      let prevEnd = 0;
      for (
        const r of s.matchAll(
          /<a[^>]*href="(?:https:\/\/mydramalist\.com)?\/list\/([A-Za-z0-9]{4,20})"[^>]*>([\s\S]*?)<\/a>/gi,
        )
      ) {
        const i = h(r[2]);
        if (!i || a.has(r[1])) continue;
        a.add(r[1]);
        // the poster carousel for this list sits right before its own
        // title-primary link, so the images between the previous list's
        // match and this one are this list's own, in order -- take the
        // first for the "first poster" thumbnail.
        const imgSlice = s.slice(prevEnd, r.index);
        prevEnd = r.index + r[0].length;
        const imgs = imgSlice.match(/<img\b[^>]*>/gi),
          img = imgs && imgs.length ? imgs[0] : "",
          imgSrc = img ? ($(img, "data-src") || $(img, "data-cfsrc") || $(img, "src")) : "";
        const after = s.slice(r.index + r[0].length, r.index + r[0].length + 600),
          titlesM = after.match(/fa-tv\b[\s\S]{0,40}?<\/i>\s*([\d,]+)\s*titles/i),
          lovesM = after.match(/fa-heart\b[\s\S]{0,40}?<\/i>\s*([\d,]+)\s*loves?/i);
        n.push({
          id: r[1],
          title: i,
          image: imgSrc ? N(imgSrc) : "",
          titles: titlesM ? titlesM[1] : "",
          loves: lovesM ? lovesM[1] : "",
        });
      }
    } catch {}
    return { user: t, lists: n.slice(0, 30) };
  });
}

export function Ut(t, e) {
  const n = [],
    s = new Set([e]),
    a = Math.max(0, t.search(/class="[^"]*\b(app-body|col-lg-8)\b/)),
    r = t.slice(a);
  for (
    const i of r.matchAll(
      /<a\b[^>]*href="(?:https:\/\/mydramalist\.com)?\/(\d+-[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    )
  ) {
    const d = i[1],
      l = h(i[2]);
    if (!l || s.has(d)) continue;
    s.add(d);
    const u = [
        ...r.slice(Math.max(0, i.index - 700), i.index).matchAll(
          /<img\b[^>]*>/gi,
        ),
      ],
      o = u.length ? u[u.length - 1][0] : "",
      g = $(o, "data-src") || $(o, "src"),
      x =
        r.slice(i.index + i[0].length, i.index + i[0].length + 400).split(
          /<a\s|<img/i,
        )[0],
      b = h(x).match(/\b(Drama|Movie|Special|TV Show)\b/i);
    n.push({
      slug: d,
      link: `${T}/${d}`,
      title: l,
      image: g ? N(g).replace(/(s|t)\.jpg$/, "c.jpg") : "",
      type: b ? b[1] : null,
      year: null,
      note: null,
      rating: null,
      episodes: null,
    });
  }
  return n;
}

export function xe(t) {
  const e = t.slice(2);
  return D(`recs:${e.toLowerCase()}`, 3600 * 1e3, async () => {
    const n = await G(e),
      s = new Set(
        Object.values(n)
          .flat()
          .map((l) => l.slug),
      ),
      a = [...(n[2] || []), ...(n[1] || [])]
        .filter((l) => l.score > 0)
        .sort((l, u) => u.score - l.score)
        .slice(0, 8),
      r = a.length ? a : (n[2] || []).slice(0, 8),
      i = new Map();
    await It(r, 4, async (l, u) => {
      (
        await _(`${l.slug}/recs`)
          .then((g) => Ut(g, l.slug))
          .catch(() => [])
      )
        .slice(0, 15)
        .forEach((g, x) => {
          if (s.has(g.slug)) return;
          const b = i.get(g.slug) || { item: g, pts: 0 };
          ((b.pts += (15 - x) / 15 + (8 - u) / 16),
            !b.item.type && g.type && (b.item.type = g.type),
            i.set(g.slug, b));
        });
    });
    const d = [...i.values()]
      .sort((l, u) => u.pts - l.pts)
      .map((l) => l.item)
      .slice(0, 60);
    return {
      id: t,
      title: "Recommended for you",
      name: "Recommended for you",
      items: d,
    };
  });
}

export async function X(t) {
  if (ct.test(t)) return he(t);
  if (F.test(t)) return be(t);
  if (Y.test(t)) return xe(t);
  if (ot(t)) {
    const n = await de(t);
    return { ...n, name: `MyDramaList's ${n.title}` };
  }
  const e = await Dt(t);
  return { ...e, name: yl(e.author ? `${e.author}'s ${e.title}` : e.title) };
}

export const ut = (t) => {
    const e = new Set(t.items.map((n) => K(n.type)));
    return ["series", "movie"].filter((n) => e.has(n));
  },
  Ot = (t) =>
    ct.test(t)
      ? "Actor"
      : F.test(t)
      ? "Watchlist"
      : Y.test(t)
      ? "rec"
      : ot(t)
      ? "Explore page"
      : "Community list",
  mt = {
    setupTitle: "Let's get you set up.",
    keysTitle: "1. Your API keys",
    keysNote: "(required, both free)",
    getKeyText: "Get it from",
    linkText: "this page",
    privacyNote:
      "Your keys are only saved in your install link and this browser. YourDramaList has no database and never stores or shares them, except with ERDB to draw rating posters if you turn those on. You can reset your keys anytime on TMDB and MDBList.",
    accountTitle: "2. Connect your MyDramaList",
    accountNote: "(optional)",
    noAccountText: "No MyDramaList account? Just leave the username empty.",
    editLink: "Connect MDL account",
    pageTitle: "",
    heading: "",
    headerImage: "",
    step1HeroImage: "",
    addonLogo: "",
    addonDescription:
      "All of your lists, watchlists plus ratings and reviews for every drama or movie. Powered by MyDramaList.",
    reviewsLogo: "",
    reviewsDescription: "",
    subtitle: "",
    intro: "",
    connectText: "",
    usernameLabel: "",
    usernamePlaceholder: "",
    continueButton: "",
    skipSetupText: "",
    skipText: "",
    getStartedButton: "Get Started",
    keysSkipText: "Skip, browse without an account",
    connectHeading: "",
    usernameCardTitle: "",
    usernameCardDesc: "",
    fullAccessCardTitle: "",
    fullAccessCardDesc: "",
    fullAccessUnavailable: "",
    noAccountButton: "",
    errNoUsernameMsg: "",
    connectKeysHeading: "",
    connectKeysSubtitle: "",
    discoverListsTab: "",
    discoverUsersTab: "",
    discoverListsHint: "",
    discoverListsPlaceholder: "",
    discoverUsersHint: "",
    discoverUsernamePlaceholder: "",
    discoverRecommendedUsers: "",
    discoverTypeToSearch: "",
    discoverSkipButton: "",
    discoverSearching: "",
    discoverLoading: "",
    discoverEnterUser: "",
    discoverNoResults: "",
    discoverStagedHint: "",
    discoverNoLists: "",
    discoverListsCountSuffix: "",
    discoverAddAllBtn: "",
    addTitle: "",
    addText: "",
    addPlaceholder: "",
    addButton: "",
    catalogsTitle: "",
    catalogsEmpty: "",
    recText: "",
    optionsTitle: "",
    reviewsTitle: "",
    reviewsText: "",
    postersTitle: "",
    postersHint: "",
    tmdbLabel: "",
    mdblistLabel: "",
    unreleasedTitle: "",
    unreleasedText: "",
    hideTitle: "",
    hideText: "",
    summaryTitle: "",
    orderTitle: "",
    generateButton: "",
    footer: "",
  };

export function J(t) {
  const e = typeof MDL_TEXT < "u" && MDL_TEXT ? MDL_TEXT : {},
    n = String(e[t] ?? mt[t] ?? "").trim();
  return /Logo$/.test(t) && !/^https?:\/\//.test(n)
    ? "https://mydramalist.com/favicon.ico"
    : n;
}

export function we() {
  const t = typeof MDL_TEXT < "u" && MDL_TEXT ? MDL_TEXT : {},
    e = {};
  for (const n of Object.keys(mt)) {
    e[n] = String(t[n] ?? mt[n])
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  return e;
}

export const ve =
    '<svg class="wm" viewBox="14 36 648 84" role="img" aria-label="YourDramaList"><defs><mask id="wmcut"><rect x="0" y="0" width="680" height="170" fill="#fff"/><path d="M253 118 L279 38" stroke="#000" stroke-width="6" stroke-linecap="square"/></mask></defs><g mask="url(#wmcut)"><text x="20" y="112" font-family="Lato,sans-serif" font-weight="900" font-size="96" letter-spacing="-2" fill="#fff">YourDramaList</text></g></svg>',
  ke =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  Wi =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

export function E(t, e = {}) {
  return fetch(t, { ...e, signal: AbortSignal.timeout(8e3) });
}
