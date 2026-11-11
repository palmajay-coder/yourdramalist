import {normalizeTitle} from "./collections.ts";

import {
  MDL_TEXT,
  $e,
  $E,
  yl,
  U,
  O,
  D,
  T,
  q,
  kt,
  H,
  B,
  re,
  at,
  N,
  V,
  h,
  P,
  $,
  oe,
  $t,
  St,
  rt,
  ie,
  Lt,
  le,
  ot,
  ce,
  At,
  Mt,
  de,
  Dt,
  K,
  Rt,
  it,
  pe,
  lt,
  Tt,
  Et,
  ue,
  me,
  fe,
  It,
  Ct,
  ct,
  F,
  Y,
  jt,
  dt,
  W,
  ge,
  Nt,
  _,
  pt,
  Z,
  Pt,
  RT,
  _t,
  he,
  zt,
  G,
  be,
  ye,
  Ut,
  xe,
  X,
  ut,
  Ot,
  mt,
  J,
  we,
  ve,
  ke,
  Wi,
  E,
  nativeName,
} from "./addonScrape.ts";
const Se = 30,
  Q = "3.7.0";

function v(t, e, n, s = "application/json", a = 0) {
  ((t.statusCode = e),
    t.setHeader("Access-Control-Allow-Origin", "*"),
    t.setHeader("Access-Control-Allow-Headers", "*"),
    t.setHeader("Content-Type", `${s}; charset=utf-8`),
    a && t.setHeader("Cache-Control", `public, max-age=${a}`),
    t.end(typeof n == "string" ? n : JSON.stringify(n)));
}

const Le = (U.ERDB_URL || "https://dmaxg-dynrat.hf.space").replace(/\/+$/, ""),
  Bt = "letterboxd,tomatoes,imdb";

function Wt(t) {
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (e) => e.charCodeAt(0)),
    ),
  );
}

function qt(t) {
  if (!t || !t.t) return null;
  const e =
    String(t.r || Bt)
      .split(",")
      .filter((n) => /^[a-z]+$/.test(n))
      .join(",") || Bt;
  return { tmdbKey: String(t.t), mdblistKey: t.m ? String(t.m) : "", ratings: e };
}

function Ae(t, e) {
  if (!t || t.off || !/^tt\d+$/.test(e || "")) return null;
  const n = new URLSearchParams({
    ratings: t.ratings,
    posterRatingsLayout: "bottom",
    posterStreamBadges: "off",
    lang: "en",
    tmdbKey: t.tmdbKey,
  });
  return (t.mdblistKey && n.set("mdblistKey", t.mdblistKey), `${Le}/poster/${e}.jpg?${n}`);
}

const YS = U.YDL_SECRET || "";

let YK;

const b6 = (u) =>
    btoa(String.fromCharCode(...u))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  u6 = (x) =>
    Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function yk() {
  return (
    YK ||
    (YK = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(YS))
      .then((d) => crypto.subtle.importKey("raw", d, "AES-GCM", !1, ["encrypt", "decrypt"])))
  );
}

async function Ys(o) {
  const j = new TextEncoder().encode(JSON.stringify(o));
  if (!YS) return "p" + b6(j);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return (
    "e" +
    b6(iv) +
    "." +
    b6(new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await yk(), j)))
  );
}

async function Yu(x) {
  try {
    if (x[0] === "p") return JSON.parse(new TextDecoder().decode(u6(x.slice(1))));
    const [i, c] = x.slice(1).split(".");
    return JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv: u6(i) }, await yk(), u6(c)),
      ),
    );
  } catch {
    return null;
  }
}

async function gk(t, e) {
  try {
    const n = decodeURIComponent(e || "");
    if (!n.startsWith("c.")) return t;
    const o = Wt(n.slice(2).split("~")[0]);
    if (!o.k) return t;
    const k = await Yu(String(o.k));
    k &&
      k.t &&
      (t.erdb = {
        tmdbKey: String(k.t),
        mdblistKey: k.m ? String(k.m) : "",
        ratings:
          o.p && o.p.r
            ? String(o.p.r)
                .split(",")
                .filter((r) => /^[a-z]+$/.test(r))
                .join(",") || Bt
            : Bt,
        off: !o.p,
      });
  } catch {}
  return t;
}

async function Kz(r) {
  let b = {};
  try {
    b = await r.json();
  } catch {}
  const T1 = String(b.t || "").trim(),
    M1 = String(b.m || "").trim();
  if (!T1 || !M1) return { error: "Both API keys are required." };
  const [a, c] = await Promise.all([
    E(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(T1)}`)
      .then((x) => x.status)
      .catch(() => 0),
    E(`https://api.mdblist.com/user?apikey=${encodeURIComponent(M1)}`)
      .then(async (x) => ({ s: x.status, j: await x.json().catch(() => ({})) }))
      .catch(() => null),
  ]);
  if (a === 401) return { error: "That TMDB key didn't work. Check it and try again." };
  if (c && (c.s === 401 || c.s === 403 || (c.j && /key/i.test(String(c.j.error || "")))))
    return { error: "That MDBList key didn't work. Check it and try again." };
  return { k: await Ys({ t: T1, m: M1 }) };
}

function gt(t) {
  const e = decodeURIComponent(t || ""),
    n = { entries: [], user: "", erdb: null, flags: "" };
  if (e.startsWith("c."))
    try {
      const s = Wt(e.slice(2).split("~")[0]);
      ((n.entries = (s.c || [])
        .filter((a) => Array.isArray(a) && dt(String(a[0])))
        .map(([a, r, i, z, dr]) => ({
          id: String(a),
          t: r === "m" ? "movie" : r === "s" ? "series" : r === "a" ? "all" : "both",
          n: typeof i == "string" ? i.slice(0, 150) : "",
          hr: z === 1,
          lo: z === 3,
          dr: dr === 1,
        }))),
        (n.user = jt.test(s.u || "") ? s.u : ""),
        (n.flags = String(s.o || "").replace(/[^uhr]/g, "")),
        (n.erdb = qt(s.p)));
    } catch {}
  else {
    const [s, ...a] = e.split("~");
    n.entries = s
      .split(",")
      .map((i) => i.trim())
      .filter(dt)
      .map((i) => ({ id: i, t: "both" }));
    const r = a.find((i) => i.startsWith("e."));
    if (r)
      try {
        n.erdb = qt(Wt(r.slice(2)));
      } catch {}
  }
  return ((n.entries = n.entries.slice(0, 40)), n);
}

function Me(t) {
  const e = {};
  if (!t) return e;
  for (const n of decodeURIComponent(t).split("&")) {
    const [s, a = ""] = n.split("=");
    e[s] = a;
  }
  return e;
}

function Vt(t) {
  return {
    id: "community.yourdramalist",
    version: Q,
    name: "YourDramaList",
    description: J("addonDescription"),
    logo: J("addonLogo"),
    resources: ["catalog", { name: "meta", types: ["series", "movie"], idPrefixes: ["mdl:"] }],
    types: ["series", "movie"],
    idPrefixes: ["mdl:"],
    catalogs: [],
    behaviorHints: { configurable: !0, configurationRequired: !t },
  };
}

const De = { series: "Series", movie: "Movies" };

const SL = (x, w) => {
    if (!w) return x;
    const m = x.match(/^(.*?'s )(.+)$/);
    return m ? m[1] + w + " " + m[2] : w + " " + x;
  },
  AQ = (x) =>
    x
      .replace(/ \((Highest Rated|Newest)\)$/, "")
      .replace(/ \((Series|Movies)\)$/, "")
      .replace(/'s (Dramas|Movies|Filmography)$/, "")
      .replace(
        /^MyDramaList (?:Highest Rated )?(?:Dramas|Movies|titles) (?:starring|directed by) /,
        "",
      ),
  AN = (q, t, d) =>
    "MyDramaList " +
    (d
      ? "Movies directed by "
      : (t === "all" ? "titles" : t === "movie" ? "Movies" : "Dramas") + " starring ") +
    q;

async function Kt(t) {
  const e = await Promise.all(
      t.entries.map((s) => (s.n && s.t !== "both" ? null : X(s.id).catch(() => null))),
    ),
    n = [];
  return (
    t.entries.forEach((s, a) => {
      if (s.n && s.t !== "both" && ct.test(s.id)) {
        const q = AQ(s.n);
        n.push({
          id: s.id,
          type: s.t === "all" ? "series" : s.t,
          all: s.t === "all",
          base: q,
          both: !1,
          hr: s.hr,
          lo: s.lo,
          dr: s.dr,
          name: AN(q, s.t, s.dr),
        });
        return;
      }
      if (s.n && s.t !== "both") {
        const N0 = s.n.replace(/ \((Highest Rated|Newest)\)$/, ""),
          l = N0.match(/^(.*) \((Series|Movies)\)$/);
        let q = l ? l[1] : N0;
        /^[A-Za-z0-9]{4,20}$/.test(s.id) && (q = yl(q));
        n.push({
          id: s.id,
          type: s.t === "all" ? "series" : s.t,
          all: s.t === "all",
          base: q,
          both: !!l && s.t !== "all",
          hr: s.hr,
          lo: s.lo,
          name: l && s.t !== "all" ? q + " (" + l[2] + ")" : q,
        });
        return;
      }
      const r = e[a],
        i = r ? ut(r) : [],
        d = s.t === "both" ? (i.length ? i : ["series"]) : [s.t];
      for (const l of d) {
        const u = r?.name || "MyDramaList";
        n.push({
          id: s.id,
          type: l,
          base: u,
          both: i.length > 1,
          hr: s.hr,
          name: ct.test(s.id) ? AN(u, l) : SL(i.length > 1 ? `${u} (${De[l]})` : u, ""),
        });
      }
    }),
    n
  );
}

async function Re(t) {
  const e = Vt(t.entries.length > 0);
  t.flags.includes("r") &&
    (e.resources.push({ name: "stream", types: ["series", "movie"], idPrefixes: ["tt"] }),
    (e.idPrefixes = ["mdl:", "tt"]));
  for (const n of await Kt(t))
    e.catalogs.push({
      type: n.type,
      id: `mdl_${n.id}_${n.all ? "all" : n.type}`,
      name: n.name,
      extra: [{ name: "skip", isRequired: !1 }],
    });
  return e;
}

function Ft(t) {
  const e = [t.type, t.year, t.episodes ? `${t.episodes} episodes` : null]
    .filter(Boolean)
    .join(" \xB7 ");
  return [t.note, e].filter(Boolean).join(`

`);
}

async function Te(t) {
  if (!t.flags.includes("h") || !t.user) return new Set();
  const e = await G(t.user).catch(() => ({}));
  return new Set([...(e[2] || []), ...(e[5] || [])].map((n) => n.slug));
}

async function Pz(t, k) {
  if (!k || !/^tt\d+$/.test(t)) return !0;
  const c = O.get("pp:" + t);
  if (c && c.expires > Date.now()) return c.value;
  const r = await fetch(
    `https://api.themoviedb.org/3/find/${t}?external_source=imdb_id&api_key=${k}`,
  )
    .then((x) => (x.ok ? x.json() : null))
    .catch(() => null);
  if (!r) return !0;
  const v = [...(r.tv_results || []), ...(r.movie_results || [])].some((x) => x.poster_path);
  return (O.set("pp:" + t, { value: v, expires: Date.now() + (v ? 864e5 : 216e5) }), v);
}

export async function catalogReleaseYear(item, match, fetchPage = _) {
  if (item.year) return item.year;
  if (match?.year && match.name && normalizeTitle(match.name) === normalizeTitle(item.title)) return match.year;
  if (!match || !/^\d+-[a-z0-9-]+$/i.test(item.slug)) return null;
  return D(`catalog-year:${item.slug}`, pe, async () => {
    const html = await fetchPage(item.slug);
    const title = h(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    return Number(title.match(/\(((?:19|20)\d{2})\)\s*[-–—]\s*MyDramaList\s*$/i)?.[1]) || null;
  }).catch(() => null);
}

async function Ee(t, e, n, X1) {
  const w = new Promise((r) => setTimeout(() => r(null), 6e3));
  return It(t, 10, async (s) => {
    const a = await Promise.race([
      fe(s, e, n?.tmdbKey, X1).then(async (m) =>
        m && (await Pz(m.id, n && !n.off ? n.tmdbKey : s.image ? null : n?.tmdbKey)) ? m : null,
      ),
      w,
    ]);
    const year = await Promise.race([catalogReleaseYear(s, a), w]);
    return {
      id: a ? a.id : `mdl:${s.slug}`,
      type: e,
      name: s.title,
      poster: (a && Ae(n, a.id)) || s.image || a?.poster,
      posterShape: "poster",
      releaseInfo: year ? String(year) : void 0,
      description: Ft(s),
    };
  });
}

async function Ta(id, ty, er, fl, sk, HR, DIR) {
  const K1 = er.tmdbKey,
    TB = "https://api.themoviedb.org/3",
    J1 = (u) =>
      E(`${TB}${u}${u.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(K1)}`).then((x) => {
        if (!x.ok) throw 0;
        return x.json();
      }),
    r = await X(id);
  if (!r.name || r.name === "Actor") return null;
  const nz = (x) =>
      String(x || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    tk = (x) =>
      String(x || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .sort()
        .join(" "),
    p = await D("tp:" + id + (DIR ? "d" : ""), 864e5, async () => {
      const j = await J1(`/search/person?query=${encodeURIComponent(r.name)}`),
        m = (j.results || [])
          .filter((x) => nz(x.name) === nz(r.name) || tk(x.name) === tk(r.name))
          .sort(
            (a, b) =>
              (b.known_for_department === (DIR ? "Directing" : "Acting")) -
                (a.known_for_department === (DIR ? "Directing" : "Acting")) ||
              (b.popularity || 0) - (a.popularity || 0),
          )[0];
      if (!m) throw 0;
      return m.id;
    }).catch(() => null);
  if (!p) return null;
  const cc = await D("tg2:" + p, 432e5, async () => {
    const j = await J1(`/person/${p}/combined_credits`),
      mk = (arr, f) => {
        const S = new Set();
        return arr
          .filter(
            (x) =>
              x.poster_path &&
              (x.media_type === "tv" || x.media_type === "movie") &&
              f(x) &&
              !S.has(x.media_type + x.id) &&
              S.add(x.media_type + x.id),
          )
          .map((x) => ({
            tid: x.id,
            mt: x.media_type,
            title: x.name || x.title,
            date: x.first_air_date || x.release_date || "",
            ch: x.character || "",
            po: x.poster_path,
            ot: x.original_name || x.original_title || "",
          }))
          .sort((a, b) => (b.date || "9999").localeCompare(a.date || "9999"));
      };
    return {
      c: mk(
        j.cast || [],
        (x) =>
          !/^(self|herself|himself)\b/i.test(x.character || "") &&
          !(x.genre_ids || []).some((g) => g === 10767 || g === 10763 || g === 10764),
      ),
      d: mk(j.crew || [], (x) => x.job === "Director" && x.media_type === "movie"),
      w: mk(
        j.crew || [],
        (x) =>
          x.media_type === "movie" &&
          x.job !== "Director" &&
          /writ|screenplay|story/i.test(x.job || ""),
      ),
    };
  }).catch(() => null);
  if (!cc) return null;
  const c = DIR
    ? cc.d
        .concat(
          (cc.w || []).filter(
            (x) =>
              !cc.d.some((z) => z.mt === x.mt && z.tid === x.tid) &&
              r.dir.some((o) => {
                const y = +x.date.slice(0, 4);
                return (
                  (nz(o.title) === nz(x.title) || (x.ot && nz(o.title) === nz(x.ot))) &&
                  (!y || !o.year || Math.abs(o.year - y) <= 1)
                );
              }),
          ),
        )
        .sort((a, b) => (b.date || "9999").localeCompare(a.date || "9999"))
    : cc.c;
  const td = new Date().toISOString().slice(0, 10),
    w = new Promise((q) => setTimeout(() => q(null), 6e3));
  let L = c
    .filter((x) => ty === "all" || x.mt === (ty === "series" ? "tv" : "movie"))
    .filter((x) => !fl.includes("u") || (x.date && x.date <= td));
  if (HR) {
    const W2 = new Promise((q) => setTimeout(() => q(null), 3500)),
      sc = await It(L, 10, async (x) => {
        const y = +x.date.slice(0, 4),
          g = (DIR ? r.dir : r.items).find(
            (o) =>
              (nz(o.title) === nz(x.title) || (x.ot && nz(o.title) === nz(x.ot))) &&
              (!y || !o.year || Math.abs(o.year - y) <= 1),
          );
        if (!g) return -1;
        if (g.rating != null) return g.rating > 0 ? g.rating : -1;
        const v = await Promise.race([Ye(g.slug).catch(() => null), W2]);
        return (v && v.score) || -1;
      });
    L = L.map((x, i) => [x, sc[i]])
      .sort((a, b) => b[1] - a[1])
      .map((z) => z[0]);
  }
  L = L.slice(sk, sk + Se);
  const M = await It(L, 10, async (x) => {
    const tt = await Promise.race([
      D("ti:" + x.mt + x.tid, 30 * 864e5, () =>
        J1(`/${x.mt}/${x.tid}/external_ids`).then((j) => j.imdb_id || null),
      ).catch(() => null),
      w,
    ]);
    if (!tt || !/^tt\d+$/.test(tt)) return null;
    const y = x.date.slice(0, 4);
    return {
      id: tt,
      type: x.mt === "tv" ? "series" : "movie",
      name: x.title,
      poster: Ae(er, tt) || `https://image.tmdb.org/t/p/w342${x.po}`,
      posterShape: "poster",
      releaseInfo: y || void 0,
      description: [
        x.ch ? `as ${x.ch}` : null,
        [x.mt === "tv" ? "Drama" : "Movie", y].filter(Boolean).join(" \xB7 "),
      ]
        .filter(Boolean)
        .join("\n"),
    };
  });
  return { metas: M.filter((m, i, a) => m && a.findIndex((z) => z && z.id === m.id) === i) };
}

async function Sr(L, on, lo) {
  if (lo) return L;
  if (!on)
    return L.map((x, i) => [x, x.year || 9999, i])
      .sort((a, b) => b[1] - a[1] || a[2] - b[2])
      .map((z) => z[0]);
  const W2 = new Promise((q) => setTimeout(() => q(null), 3e3)),
    sc = await It(L, 10, async (o) => {
      if (o.rating > 0) return o.rating;
      const v = await Promise.race([Ye(o.slug).catch(() => null), W2]);
      return (v && v.score) || -1;
    });
  return L.map((x, i) => [x, sc[i]])
    .sort((a, b) => b[1] - a[1])
    .map((z) => z[0]);
}

async function Ie(t, e, n, s) {
  const a = String(n).match(/^mdl_(.+)_(series|movie|all)$/);
  if (!a || !t.entries.some((o) => o.id === a[1])) return { metas: [] };
  const AL = a[2] === "all",
    TY = AL ? "all" : e,
    EN = t.entries.find((o) => o.id === a[1] && (o.t === TY || o.t === "both")) || {},
    l = Math.max(0, parseInt(s.skip || "0", 10) || 0);
  if (ct.test(a[1]) && t.erdb?.tmdbKey) {
    const z = await Ta(a[1], TY, t.erdb, t.flags, l, !!EN.hr, !!EN.dr).catch(() => null);
    if (z) return z;
  }
  const r = await X(a[1]),
    i = F.test(a[1]) || Y.test(a[1]) ? new Set() : await Te(t),
    d = new Date().getFullYear(),
    // Without TMDB/MDBList keys, or if the TMDB lookup above failed, fall
    // back to the director table MDL's own person page already gives us
    // instead of giving up with an empty catalog.
    pool = EN.dr ? r.dir || [] : r.items,
    u = (
      await Sr(
        pool
          .filter((o) => AL || K(o.type) === e)
          .filter((o) => !i.has(o.slug))
          .filter((o) => !t.flags.includes("u") || !o.year || o.year <= d),
        !!EN.hr,
        !EN.hr,
      )
    ).slice(l, l + Se),
    R = new Array(u.length);
  await Promise.all(
    ["series", "movie"].map(async (q) => {
      const g = u.map((o, j) => [o, j]).filter(([o]) => (AL ? K(o.type) === q : q === e));
      if (!g.length) return;
      const M = await Ee(
        g.map((z) => z[0]),
        q,
        t.erdb,
        ct.test(a[1]),
      );
      g.forEach(([, j], k) => (R[j] = M[k]));
    }),
  );
  return {
    metas: R.filter(
      (m, i, a) =>
        m && /^tt/.test(m.id) && m.poster && a.findIndex((z) => z && z.id === m.id) === i,
    ),
  };
}

async function Ce(t, e, n) {
  const s = String(n).replace(/^mdl:/, "");
  for (const a of t.entries) {
    const i = (await X(a.id).catch(() => null))?.items.find((d) => d.slug === s);
    if (i)
      return {
        meta: {
          id: n,
          type: e,
          name: i.title,
          poster: i.image,
          background: i.image,
          releaseInfo: i.year ? String(i.year) : void 0,
          description: Ft(i),
          links: [{ name: "Open on MyDramaList", category: "MyDramaList", url: i.link }],
          website: i.link,
        },
      };
  }
  return { meta: null };
}

async function je(t) {
  const e = Nt(t);
  if (!e.length) return { error: "That does not look like a MyDramaList link." };
  const n = [];
  for (const s of e) {
    const a = await X(s).catch((r) => ({ error: r }));
    if (a.error) {
      if (e.length === 1)
        return {
          error:
            a.error.code === "PRIVATE"
              ? "Not found, or it is private."
              : "Could not read that page right now. Try again.",
        };
      continue;
    }
    (!a.items.length && e.length > 1) ||
      n.push(
        a.isDir
          ? { id: s, name: a.name, kind: "Director", types: ["movie"] }
          : { id: s, name: a.name, kind: Ot(s), types: ut(a).length ? ut(a) : ["series"] },
      );
  }
  return { items: n };
}

async function Ne(t) {
  if (!jt.test(t || "")) return { error: "Enter a MyDramaList username." };
  const e = await ye(t).catch((r) => ({ error: r }));
  if (e.error)
    return {
      error:
        e.error.code === "PRIVATE"
          ? "No MyDramaList user with that name."
          : "Could not reach MyDramaList. Try again.",
    };
  const n = [
      {
        id: `r.${t}`,
        name: "Recommended for you",
        kind: "rec",
        types: ["series", "movie"],
        on: !0,
      },
    ],
    s = await G(t).catch(() => ({}));
  for (const r of [1, 3, 2, 4, 5]) {
    const i = s[r] || [];
    if (!i.length) continue;
    const d = new Set(i.map((l) => K(l.type)));
    n.push({
      id: `d.${r}.${t}`,
      name: `${t}'s ${W[r]}`,
      kind: "Watchlist",
      types: ["series", "movie"].filter((l) => d.has(l)),
      on: !0,
    });
  }
  const a = await Promise.all(
    e.lists.map((r) =>
      Dt(r.id).then(
        (i) => ({ l: r, s: i }),
        () => null,
      ),
    ),
  );
  for (const r of a) {
    if (!r || !r.s.items.length) continue;
    const i = new Set(r.s.items.map((d) => K(d.type)));
    n.push({
      id: r.l.id,
      name: `${t}'s ${r.s.title || r.l.title}`,
      kind: "Your list",
      types: ["series", "movie"].filter((d) => i.has(d)),
      on: !1,
    });
  }
  return { user: t, items: n };
}

async function Pe(t) {
  return {
    items: (await Kt(t)).map((s) => ({
      id: s.id,
      t: s.all ? "all" : s.type,
      name: s.base,
      both: s.both,
      kind: s.dr ? "Director" : Ot(s.id),
      on: !0,
      hr: !!s.hr,
      lo: !!s.lo,
    })),
    user: t.user || "",
    flags: t.flags,
    posters: t.erdb
      ? {
          t: t.erdb.tmdbKey,
          m: t.erdb.mdblistKey,
          r: t.erdb.ratings,
          on: !t.erdb.off,
          k: await Ys({ t: t.erdb.tmdbKey, m: t.erdb.mdblistKey }),
        }
      : null,
  };
}

const Yt = 360 * 60 * 1e3,
  _e = 5,
  ze = 5,
  Ue =
    /korea|japan|china|chinese|taiwan|hong kong|thailand|philippines|singapore|malaysia|indonesia|vietnam|mongolia|myanmar|cambodia|macao|macau/i,
  Oe = "mdl-reviews";

function Be(t) {
  const e = String(t || "").match(/\d{4}/g) || [];
  if (!e.length) return null;
  const n = Number(e[0]),
    s = e[1] ? Number(e[1]) : /[-\u2013]\s*$/.test(String(t)) ? new Date().getFullYear() : n;
  return { start: n, end: s };
}

function We(t, e) {
  return D(`cm:${t}:${e}`, 24 * 3600 * 1e3, async () => {
    const n = await E(`${Rt}/meta/${t}/${e}.json`);
    if (!n.ok) return null;
    const s = (await n.json().catch(() => ({}))).meta;
    return !s || !s.name
      ? null
      : { name: s.name, years: Be(s.releaseInfo || s.year), country: s.country || "" };
  });
}

function Zt(t) {
  const e = [];
  for (const n of t.split(/<div[^>]*\bid="mdl-\d+"/i).slice(1)) {
    const s = n.split(/<div[^>]*\bid="mdl-\d+"/i)[0],
      r = ((
        (s.match(/<h6[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/h6>/i) || [])[1] || ""
      ).match(/<a\b[^>]*>[\s\S]*?<\/a>/i) || [])[0];
    if (!r) continue;
    const i = $(r, "href");
    if (!i || i.includes("/people/")) continue;
    const d = h(
        (s.match(/<span[^>]*class="[^"]*\btext-muted\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || [])[1],
      ),
      [l, u = ""] = d.split(" - "),
      o = u.match(/\b(\d{4})\b/);
    e.push({
      slug: i.split("?")[0].replace(/\/$/, "").split("/").pop(),
      title: h(r),
      type: (l || "").trim(),
      year: o ? Number(o[1]) : null,
    });
  }
  return e;
}

async function qe(t) {
  try {
    const n = await E(`${q}/v2/search?q=${encodeURIComponent(t)}`, {
        headers: { Accept: "application/json" },
      }),
      s = await n.json().catch(() => ({}));
    if (n.ok && Array.isArray(s?.data?.dramas))
      return s.data.dramas.map((a) => ({
        slug: a.slug,
        title: a.title,
        type: a.type || "",
        year: a.year ?? null,
      }));
  } catch {}
  return [];
}

function Gt(t) {
  return String(t || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(\d{4}\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function Ve(t, e, n, s) {
  const a = Gt(e.name),
    r = e.years;
  let i = null,
    d = -1;
  return (
    t.forEach((l, u) => {
      if (!l.slug) return;
      const o = /movie/i.test(l.type);
      if ((n === "movie" && !o) || (n === "series" && o)) return;
      let g = 0;
      if (r && l.year)
        if (s > 1) {
          if (l.year < r.start || l.year > r.end + 1) return;
        } else if (l.year === r.start) g += 3;
        else if (Math.abs(l.year - r.start) === 1) g += 1.5;
        else return;
      const x = Gt(l.title),
        b = x.replace(/\s+(season\s*)?\d+$/, "");
      (x === a || b === a ? (g += 3) : (x.startsWith(a) || a.startsWith(b)) && (g += 1.5),
        s > 1
          ? (g += new RegExp(`(season\\s*)?${s}$`).test(x) ? 3 : -2)
          : /\b(season\s*)?[2-9]$/.test(x) && !/[2-9]$/.test(a) && (g -= 2),
        (g -= u * 0.1),
        g > d && ((d = g), (i = l)));
    }),
    d >= 2.5 ? i : null
  );
}

function Ke(t, e, n) {
  return D(`slug:${t}:${e}:${n}`, 168 * 3600 * 1e3, async () => {
    const s = await We(t, e).catch(() => null);
    if (!s || (s.country && !Ue.test(s.country))) return null;
    const a = Ve(await qe(s.name).catch(() => []), s, t, n);
    return a ? a.slug : null;
  });
}

function Xt(t) {
  const e = [];
  for (const n of t.split(/<div[^>]*\bclass="review(?:\s[^"]*)?"[^>]*>/i).slice(1)) {
    const s = Number(
        (n.match(/class="[^"]*\buser-stats\b[\s\S]{0,400}?<b>\s*(\d+)/i) || [])[1] || 0,
      ),
      a =
        Number(
          (n.match(/rating-overall[\s\S]{0,300}?class="[^"]*\bscore\b[^"]*"[^>]*>\s*([\d.]+)/i) ||
            [])[1],
        ) || null,
      r = h((n.match(/<a[^>]*href="\/profile\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || [])[1]) || null,
      i = /review-spoiler/i.test(n),
      k =
        (n.match(/href="((?:https:\/\/mydramalist\.com)?\/reviews?\/\d+[^"#]*)"/i) || [])[1] || "",
      d = n.search(/class="[^"]*\breview-body\b/i);
    if (d < 0) continue;
    let l = n.slice(d);
    const u = l.search(/review-helpful|Was this review helpful/i);
    (u > 0 && (l = l.slice(0, l.lastIndexOf("<", u) > 0 ? l.lastIndexOf("<", u) : u)),
      (l = l
        .replace(/^[^>]*>/, "")
        .replace(/<div[^>]*class="[^"]*\bbox\b[\s\S]*?Rewatch Value[\s\S]*?<\/div>\s*<\/div>/i, "")
        .replace(/<div[^>]*class="[^"]*\bbox\b[\s\S]*?Rewatch Value[\s\S]*?<\/span>/i, "")
        .replace(/^(\s*<\/(?:div|span)>)+/i, "")));
    const m =
      l.match(/<(strong|b|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/i) ||
      l.match(/<(div|span|p)[^>]*class="[^"]*(?:headline|title)[^"]*"[^>]*>([\s\S]*?)<\/\1>/i);
    let o = m ? h(m[2]) : "",
      g = h(m && o && o.length <= 150 ? l.replace(m[0], "") : l);
    if ((o.length > 150 && (o = ""), !o)) {
      const f = l.match(/^\s*([^<]{3,120}?)\s*<br\s*\/?>/i);
      f && ((o = h(f[1])), (g = h(l.slice(f[0].length))));
    }
    ((g = g
      .replace(/\bRead More\b/g, "")
      .replace(/This review may contain spoilers/i, "")
      .trim()),
      e.push({
        helpful: s,
        spoiler: i,
        headline: o || null,
        body: g,
        link: k ? N(k) : "",
        ratings: { overall: a },
        reviewer: { name: r },
      }));
  }
  return e;
}

function Fe(t) {
  return D(`rev:${t}`, Yt, async () => {
    // MyDramaList refuses cloud hosts, so reviews come only from Kuryana.
    const e = Promise.resolve([]),
      n = (d) =>
        E(`${q}/v2/dramas/${encodeURIComponent(t)}/reviews?page=${d}`, {
          headers: { Accept: "application/json" },
        })
          .then((l) => (l.ok ? l.json() : {}))
          .then((l) => ({
            reviews: Array.isArray(l?.data?.reviews) ? l.data.reviews : [],
            pages: Number(l?.data?.pagination?.total_pages) || 1,
          }))
          .catch(() => ({ reviews: [], pages: 1 })),
      s = await n(1),
      a = await Promise.all(Array.from({ length: Math.min(s.pages, ze) - 1 }, (d, l) => n(l + 2))),
      r = [...(await e), s, ...a].flatMap((d) => (d && d.reviews ? d.reviews : [d])),
      i = new Map();
    for (const d of r) {
      const l =
          d.reviewer?.name ||
          String(d.body || "")
            .replace(/\s+/g, " ")
            .slice(0, 60),
        p = i.get(l);
      p
        ? (!p.headline && d.headline && (p.headline = d.headline),
          !p.link && d.link && (p.link = d.link))
        : i.set(l, { ...d });
    }
    return [...i.values()]
      .map((d) => ({
        link: d.link || "",
        helpful: Number(d.helpful) || 0,
        spoiler: !!d.spoiler,
        headline: d.headline || null,
        user: d.reviewer?.name || null,
        body: String(d.body || "")
          .replace(/\s+/g, " ")
          .trim(),
        overall: Number(d.ratings?.overall) || null,
      }))
      .filter((d) => d.body || d.headline)
      .sort((d, l) => l.helpful - d.helpful)
      .slice(0, _e);
  });
}

function Jt(t) {
  const e = h(t);
  let n =
    e.match(/Ratings?:\s*([\d.]+)\s*\/\s*10\s*from\s*([\d,]+)\s*users?/i) ||
    e.match(/Score:\s*([\d.]+)\s*\(\s*scored by\s*([\d,]+)\s*users?/i);
  const R = (e.match(/Ranked:\s*#\s*([\d,]+)/i) || [])[1],
    P = (e.match(/Popularity:\s*#\s*([\d,]+)/i) || [])[1],
    W = (e.match(/Watchers:\s*([\d,]+)/i) || [])[1],
    x = {
      rank: R || null,
      pop: P || null,
      watchers: W || null,
      airing: /Aired:\s*[^:]{0,40}?-\s*\?/i.test(e),
    };
  return n
    ? { score: Number(n[1]), users: Number(n[2].replace(/,/g, "")), ...x }
    : ((n = e.match(/Score:\s*([\d.]+)/i)), n ? { score: Number(n[1]), users: null, ...x } : null);
}

function Ye(t) {
  return D(`rate:${t}`, Yt, async () => {
    const e = await _(t)
      .then(Jt)
      .catch(() => null);
    if (e && e.score) return e;
    const n = await pt(`dramas/${encodeURIComponent(t)}`).catch(() => null);
    return n && Number(n.rating) ? { score: Number(n.rating), users: null } : null;
  });
}

function Sx(t) {
  const e = t.search(/name:\s*['"]Overall statistic/i);
  if (e < 0) return null;
  let n = t.slice(e);
  const a = n.search(/\]\s*\}\s*\]/);
  a > 0 && (n = n.slice(0, a));
  const r = {};
  for (const d of n.matchAll(/name:\s*['"]([^'"]+)['"]\s*,\s*y:\s*([\d.]+)/gi))
    r[d[1].toLowerCase()] = Number(d[2]);
  for (const d of n.matchAll(/\[\s*['"]([^'"]+)['"]\s*,\s*([\d.]+)\s*\]/g))
    r[d[1].toLowerCase()] = Number(d[2]);
  const i = Object.values(r).reduce((d, l) => d + l, 0),
    c = r.completed,
    p = r.dropped;
  if (!i || c == null || p == null) return null;
  const f = (d) => (Math.round((d / i) * 1e3) / 10).toFixed(1);
  return { completed: f(c), dropped: f(p) };
}

function Sy(t) {
  return D(`stats:${t}`, Yt, async () => {
    const e = await _(`${t}/statistics`).catch(() => "");
    return e ? Sx(e) : null;
  });
}

function Sz(t, e, k, g) {
  const a = k === "movie" ? "movie" : "drama",
    c = Number(t.completed),
    d = Number(t.dropped),
    m = g
      ? "Still airing, too early to tell. \u25F7"
      : d > c
        ? `Most viewers drop this ${a}.`
        : `Viewers usually finish this ${a}.`,
    n =
      d > c
        ? `${t.dropped}% dropped it  \xB7  ${t.completed}% completed it`
        : `${t.completed}% completed it  \xB7  ${t.dropped}% dropped it`,
    // One line, like the Stremboxd cards: the verdict, then the share that matters.
    r = [g ? "Still airing, too early to tell" : m.replace(/\.$/, ""), g ? null : d > c ? `${t.dropped}% dropped` : `${t.completed}% completed`].filter(Boolean).join("  ·  ");
  return {
    name: (g ? "◷" : d > c ? "✕" : "✓") + " Verdict",
    title: r,
    description: r,
    externalUrl: `${T}/${e}/statistics`,
    behaviorHints: { notWebReady: !0, bingeGroup: "mdl-reviews" },
  };
}

function Ze(t) {
  // Five stars for a score out of ten.
  const e = Math.floor(t / 2),
    n = t / 2 - e >= 0.5 ? 1 : 0;
  return "\u2605".repeat(e) + (n ? "\xBD" : "") + "\u2606".repeat(Math.max(0, 5 - e - n));
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function Ge(t, e, status) {
  const n = [
    `${Ze(t.score)} ${t.score.toFixed(1)}/10${t.users ? ` (${compact.format(t.users)} ratings)` : ""}`,
    (status ? ["In your watchlist", status] : [])
      .filter(Boolean)
      .join("  \xB7  "),
  ].filter(Boolean).join(`
`);
  return {
    name: "MyDramaList",
    title: n,
    description: n,
    externalUrl: `${T}/${e}`,
    behaviorHints: { notWebReady: !0, bingeGroup: "mdl-reviews" },
  };
}

function Xe(t, e) {
  const n = `${T}/${e}/reviews?sort=helpful`;
  return t.map((s) => {
    const L = s.link || n,
      a = [
        s.overall ? `\u2605 ${s.overall.toFixed(1)}/10` : null,
        `${s.helpful} found this helpful`,
      ]
        .filter(Boolean)
        .join("  \xB7  "),
      r = s.spoiler
        ? "Contains spoilers. Tap to read on MyDramaList."
        : s.body.length > 600
          ? s.body.slice(0, 597).replace(/\s+\S*$/, "") + "\u2026"
          : s.body,
      i = s.headline
        ? `\u201C${s.headline.length > 90 ? s.headline.slice(0, 87).replace(/\s+\S*$/, "") + "\u2026" : s.headline}\u201D`
        : "MDL Review",
      d = [a, r].filter(Boolean).join(`
`);
    return {
      name: i,
      title: d,
      description: d,
      externalUrl: L,
      behaviorHints: { notWebReady: !0, bingeGroup: "mdl-reviews" },
    };
  });
}

// One card that opens the title on MyDramaList, where people add it to a list, rate it or mark it watched.
function Go(e) {
  return {
    name: "Open on MyDramaList",
    title: "Add to a list, rate or mark as watched",
    description: "Add to a list, rate or mark as watched",
    externalUrl: `${T}/${e}`,
    behaviorHints: { notWebReady: !0, bingeGroup: "mdl-reviews" },
  };
}

async function Je(t, e, statusOf) {
  const [n, s] = decodeURIComponent(e).split(":");
  if (!/^tt\d+$/.test(n)) return { streams: [] };
  const a = await Ke(t === "movie" ? "movie" : "series", n, Number(s) || 1).catch(() => null);
  if (!a) return { streams: [] };
  const [r, i, S] = await Promise.all([
    Ye(a).catch(() => null),
    Fe(a).catch(() => []),
    Sy(a).catch(() => null),
  ]);
  const st = statusOf ? await statusOf(a).catch(() => null) : null;
  return {
    streams: [...(r ? [Ge(r, a, st)] : []), ...(S ? [Sz(S, a, t, r && r.airing)] : []), Go(a), ...Xe(i, a)],
  };
}


export {Ee,X,G,K,Je,Ge,Sz,Go,Xe,Te};
