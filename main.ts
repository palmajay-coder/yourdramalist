// YourDramaList main code. Paste this into the HTTP file.
// Your wording lives in the separate file text.ts in this same Val.
// Scraping/parsing/caching logic lives in scrape.ts in this same Val.

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
} from "./scrape.ts";
import { blob } from "https://esm.town/v/std/blob/main.ts";

async function Ht(t) {
  const e = we();
  let wpv = "0";
  try {
    wpv = await (await blob.get("19769276.v")).text();
  } catch {}
  const n = {
      ...e,
      sun: ke,
      wm: ve,
      wallpaperIcon: Wi,
      erdb: Le,
      step1HeroImage: "/assets/hero.png?v=" + encodeURIComponent(wpv),
    },
    s = (a) => JSON.stringify(a).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e.pageTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#e9eaee;--card:#fff;--line:#d5d9e0;--text:#2b2f36;--muted:#6b7380;--brand:#24508f;--link:#1675b6;--green:#4cae4c;--red:#e0393e;--field:#f6f7f9;--bad:#d9534f}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Lato,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body.dark{--bg:#16181d}body.dark .foot{color:#8a919c}body.dark .bars i:not(.on){background:#3a3f48}
button,input{font-family:inherit;font-size:inherit}
main{max-width:1100px;margin:0 auto;padding:0 16px 30px}
main:has(.step1),main:has(.discover),main:has(.setupwrap){max-width:none;margin:0;padding:0}
.head{position:relative;margin:20px 0 12px;border-radius:10px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8),0 0 14px rgba(0,0,0,.55);box-shadow:0 2px 8px rgba(0,0,0,.18)}
.head.big{max-width:520px;margin:20px auto 12px;text-align:center;padding:150px 18px 22px;background-color:var(--brand);background-position:center top;background-size:cover}
.logo{font-size:40px;font-weight:900;line-height:1.1}
.wm{display:block;height:1.15em;width:auto;margin:0 auto;overflow:visible;filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))}
.sub{font-weight:700;font-size:19px;margin-top:8px}
.ver{display:inline-block;font-size:12px;font-weight:700;margin-top:6px;padding:1px 7px;border-radius:4px;background:var(--red);color:#fff;text-shadow:none}
.intro{margin:12px 0 0}.intro:empty,.sub:empty{display:none}
.corner{position:absolute;top:12px;right:12px}
.head.slim{display:flex;align-items:center;gap:12px;padding:22px 26px;background:var(--brand)}
.head.slim .brand{display:flex;align-items:center;gap:12px}.head.slim .logo{font-size:24px}.head.slim .ver{margin:0}
.head.slim.ydl{background:linear-gradient(135deg,#015284 0%,#1675b6 100%);margin:0;border-radius:0;box-shadow:none}
.head.slim.ydl .brand{gap:20px}
.logo.ydl{position:relative;font-size:22px}
.verbadge{position:absolute;top:-10px;right:-16px;background:var(--red);color:#fff;font-weight:800;font-size:10px;line-height:1;padding:3px 6px;border-radius:5px}
.htabs{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.htabs span{font-size:13px;font-weight:700;color:rgba(255,255,255,.65)}
.htabs span.on{color:#fff}
body:has(.head.slim.ydl){min-height:100vh;display:flex;align-items:center;justify-content:center}
body:has(.head.slim.ydl) main{width:100%;padding-top:16px;padding-bottom:16px}
.right{margin-left:auto;display:flex;align-items:center;gap:10px}
.who{display:flex;align-items:center;gap:8px;font-size:14px}
.tg{display:inline-flex;width:30px;height:30px;padding:0;align-items:center;justify-content:center;border:0;border-radius:50%;background:rgba(255,255,255,.18);cursor:pointer}
.bars{display:flex;gap:8px;margin:0 0 14px}.bars.narrow{max-width:520px;margin:0 auto 14px}
.bars i{flex:1;height:4px;border-radius:4px;background:#cfd4dc}.bars i.on{background:var(--green)}
.box{background:var(--card);border:1px solid var(--line);border-radius:8px}
.connect{max-width:520px;margin:20px auto;padding:26px}
.connect h2{margin:0 0 4px;font-size:26px;font-weight:900;color:var(--brand);line-height:1.25}
.muted{color:var(--muted);font-size:13px}.small{font-size:12px;width:100%;text-align:right}
.lbl{display:block;font-weight:700;margin:16px 0 6px;font-size:14px}
input{width:100%;padding:11px 12px;border-radius:8px;border:1px solid var(--line);background:var(--field);color:var(--text)}
.btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;padding:12px 14px;font-weight:700;cursor:pointer;text-decoration:none}
.primary{display:flex;width:100%;background:var(--brand);color:#fff;margin-top:14px}
.link{display:block;text-align:center;margin-top:12px;color:var(--link);font-size:14px}
.status{font-size:13px;margin-top:8px;color:var(--muted)}.status:empty{display:none}.status.bad{color:var(--bad)}
.grid{display:grid;grid-template-columns:190px minmax(0,1fr) 270px}
.side{padding:14px;border-right:1px solid var(--line)}
.tab{display:block;width:100%;text-align:left;padding:10px 14px;border-radius:8px;margin-bottom:6px;border:1.5px solid transparent;background:none;color:var(--muted);cursor:pointer}
.tab.on{background:#e8f2fa;color:var(--brand);font-weight:700;border-color:var(--link)}
.mid{padding:20px 24px;min-width:0}.mid h3{margin:0;font-size:18px;color:var(--brand)}
.addrow{display:flex;gap:8px;margin:12px 0 0}.addrow input{flex:1;min-width:0}
.add{padding:0 18px;border-radius:8px;background:var(--field);border:1px solid var(--line);font-weight:700;color:var(--text);cursor:pointer}
.qa{margin:12px 0 0}.qc,.qb{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.qc button{border:1px solid var(--line);background:var(--card);color:var(--muted);border-radius:16px;padding:4px 12px;font-size:13px;cursor:pointer}.qc button.on{background:#e8f2fa;border-color:var(--link);color:var(--brand);font-weight:700}
.qb button{border:1px solid var(--line);background:var(--field);color:var(--text);border-radius:8px;padding:7px 12px;font-size:13px;font-weight:700;cursor:pointer}
.kh{font:700 15px Lato,sans-serif;color:var(--brand);margin:20px 0 0;padding-bottom:6px;border-bottom:2px solid var(--brand)}.kl{margin-top:4px}.kl a{color:var(--link)}
.cath{display:flex;justify-content:space-between;align-items:baseline;margin:22px 0 8px}.cath b{font-size:17px}
.row{display:flex;align-items:center;gap:10px;background:var(--field);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px}
.row.off{opacity:.5}.row.held{border-color:var(--link);box-shadow:0 2px 8px rgba(0,0,0,.15)}
.dragging{user-select:none;-webkit-user-select:none}
.grip{color:#9aa1ad;font-size:18px;letter-spacing:-2px;cursor:grab;touch-action:none;padding:4px 2px}
.rt{flex:1;min-width:0}.rn{font-weight:700;overflow-wrap:anywhere}
.arr{display:flex;flex-direction:column}.arr button,.x{border:0;background:none;color:#9aa1ad;cursor:pointer;padding:0 4px;line-height:1.2;font-size:11px}.x{font-size:20px}
.sw{position:relative;flex:none;width:42px;height:24px}.sw input{opacity:0;width:0;height:0;position:absolute}
.sw span{position:absolute;inset:0;background:#c3c8d1;border-radius:20px;cursor:pointer;transition:.2s}
.sw span::before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.sw input:checked+span{background:var(--link)}.sw input:checked+span::before{transform:translateX(18px)}
.empty{padding:14px;text-align:center}
.opt{display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--field);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-top:10px}
.opt .t{font-weight:700}.opt .d{color:var(--muted);font-size:13px}.opt .d:empty{display:none}
#rp{padding:4px 2px 2px}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 0}
.seg button{min-width:0;background:var(--card);color:var(--text);border:1.5px solid var(--line);border-radius:8px;padding:12px 4px;font-size:13px;line-height:1.3;cursor:pointer}
.seg button small{display:block;font-size:11px;color:var(--muted)}.seg button.on{border-color:var(--link);background:#e8f2fa;color:var(--brand);font-weight:700}
.sum{padding:18px;border-left:1px solid var(--line);display:flex;flex-direction:column}
.sh{margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid var(--brand);color:var(--brand);font-size:15px}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.tile{text-align:center;background:#e8f2fa;border-radius:8px;padding:8px 4px}.tile b{display:block;font-size:18px;color:var(--brand);line-height:1.2}.tile span{font-size:11px;color:var(--muted)}
.tile.dim{background:var(--field)}.tile.dim b{color:var(--muted)}
.pills{display:flex;flex-wrap:wrap;gap:4px;margin:-2px 0 10px}.pills span{font-size:11px;padding:1px 8px;border-radius:10px;background:var(--field);border:1px solid var(--line);color:var(--muted)}
.hso{list-style:none;margin:4px 0 8px;padding:0}.hso li{display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:14px}
.hso i{flex:none;width:20px;height:20px;border-radius:50%;background:var(--brand);color:#fff;font:700 11px/20px Lato,sans-serif;text-align:center;margin-top:1px}
.sum .primary{margin-top:auto}
.inst{margin-top:14px}.inst .lbl{margin:0 0 6px}.irow{display:flex;gap:6px}
.install{flex:1;padding:10px 4px;font-size:13px;background:var(--card);color:var(--link);border:1.5px solid var(--line);white-space:nowrap}
.install.main{background:var(--link);color:#fff;border-color:var(--link)}
.url{word-break:break-all;margin-top:6px;padding:8px;border-radius:8px;background:var(--field);border:1px solid var(--line);font:11px ui-monospace,Menlo,monospace}
.foot{text-align:center;color:var(--muted);font-size:12px;margin-top:20px}.foot:empty{display:none}
@media(max-width:700px){
.logo{font-size:34px}
.head.slim{flex-direction:column;justify-content:flex-end;text-align:center;padding:78px 18px 14px;gap:4px;background:linear-gradient(rgba(10,20,40,0) 40%,rgba(10,20,40,.6)),var(--img) 45% 14%/165% auto,var(--brand)}
.head.slim .brand{flex-direction:column;gap:4px}.head.slim .logo{font-size:22px}
.head.slim .right{position:absolute;top:10px;right:12px;gap:8px}.who{font-size:12px}.tg{width:26px;height:26px}
.grid{grid-template-columns:1fr}.side{display:flex;gap:6px;border-right:0;border-bottom:1px solid var(--line)}.tab{text-align:center;margin:0}
.mid{padding:16px}.sum{border-left:0;border-top:1px solid var(--line)}.sum .primary{margin-top:14px}
}
</style>
</head>
<body>
<main id="app"></main>
<script>(${$e.toString()})(${s(n)},${s(t)},${s(Q)});<\/script>
</body>
</html>`;
}

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

async function Ee(t, e, n, X1) {
  const w = new Promise((r) => setTimeout(() => r(null), 6e3));
  return It(t, 10, async (s) => {
    const a = await Promise.race([
      fe(s, e, n?.tmdbKey, X1).then(async (m) =>
        m && (await Pz(m.id, n && !n.off ? n.tmdbKey : s.image ? null : n?.tmdbKey)) ? m : null,
      ),
      w,
    ]);
    return {
      id: a ? a.id : `mdl:${s.slug}`,
      type: e,
      name: s.title,
      poster: (a && Ae(n, a.id)) || s.image || a?.poster,
      posterShape: "poster",
      releaseInfo: s.year ? String(s.year) : void 0,
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
  const e = await E(`${T}/search?q=${encodeURIComponent(t)}`, { headers: B });
  return e.ok ? Zt(await e.text()) : [];
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
    const e = E(`${T}/${t}/reviews?sort=helpful`, { headers: B })
        .then(async (d) => (d.ok ? Xt(await d.text()) : []))
        .catch(() => []),
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
    r = `${m}
${n}`;
  return {
    name: "Verdict",
    title: r,
    description: r,
    externalUrl: `${T}/${e}/statistics`,
    behaviorHints: { notWebReady: !0, bingeGroup: "mdl-reviews" },
  };
}

function Ze(t) {
  const e = Math.floor(t),
    n = t - e >= 0.5 ? 1 : 0;
  return "\u2605".repeat(e) + (n ? "\xBD" : "") + "\u2606".repeat(Math.max(0, 10 - e - n));
}

function Ge(t, e) {
  const n = [
    `${Ze(t.score)} ${t.score.toFixed(1)}/10${t.users ? ` from ${t.users.toLocaleString("en-US")} users` : ""}`,
    [
      t.rank ? `Ranked #${t.rank}` : null,
      t.pop ? `Popularity #${t.pop}` : null,
      t.watchers ? `${t.watchers} watchers` : null,
    ]
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

async function Je(t, e) {
  const [n, s] = decodeURIComponent(e).split(":");
  if (!/^tt\d+$/.test(n)) return { streams: [] };
  const a = await Ke(t === "movie" ? "movie" : "series", n, Number(s) || 1).catch(() => null);
  if (!a) return { streams: [] };
  const [r, i, S] = await Promise.all([
    Ye(a).catch(() => null),
    Fe(a).catch(() => []),
    Sy(a).catch(() => null),
  ]);
  return {
    streams: [...(r ? [Ge(r, a)] : []), ...(S ? [Sz(S, a, t, r && r.airing)] : []), ...Xe(i, a)],
  };
}

// MDL's own search returns loosely-related people for any query, including
// full drama titles (e.g. searching "Crash Landing on You" surfaces unrelated
// actors whose names share no words with the query). Require every query
// word to appear in the candidate's name, order-independent, so a real person
// search (even name-order-swapped, like "Kiyoshi Kurosawa" vs MDL's own
// "Kurosawa Kiyoshi") still matches while a drama title does not.
function V3nameTokens(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean),
  );
}
function V3nameMatch(query, name) {
  const q = V3nameTokens(query),
    n = V3nameTokens(name);
  if (!q.size || !n.size) return false;
  for (const w of q) if (!n.has(w)) return false;
  return true;
}

async function V3searchDramas(t) {
  try {
    const n = await E(`${q}/v2/search?q=${encodeURIComponent(t)}`, {
        headers: { Accept: "application/json" },
      }),
      s = await n.json().catch(() => ({}));
    if (n.ok && Array.isArray(s?.data?.dramas))
      return s.data.dramas
        .slice(0, 8)
        .map((a) => ({
          slug: a.slug,
          title: a.title,
          type: a.type || "",
          year: a.year ?? null,
          image: a.image ? N(a.image).replace(/(s|t)\.jpg$/, "c.jpg") : "",
        }));
  } catch {}
  const e = await E(`${T}/search?q=${encodeURIComponent(t)}`, { headers: B });
  if (!e.ok) return [];
  const r = await e.text(),
    i = [];
  for (const b of r.split(/<div[^>]*\bid="mdl-\d+"/i).slice(1)) {
    const c = b.split(/<div[^>]*\bid="mdl-\d+"/i)[0],
      d = ((
        (c.match(/<h6[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/h6>/i) || [])[1] || ""
      ).match(/<a\b[^>]*>[\s\S]*?<\/a>/i) || [])[0];
    if (!d) continue;
    const l = $(d, "href");
    if (!l || l.includes("/people/")) continue;
    const u = (c.match(/<img\b[^>]*>/i) || [""])[0],
      o = $(u, "data-src") || $(u, "data-cfsrc") || $(u, "src"),
      [g, x = ""] = h(P(c, "text-muted", "span")).split(" - "),
      R = x.match(/\b(\d{4})\b/);
    i.push({
      slug: V(l),
      title: h(d),
      type: (g || "").trim(),
      year: R ? Number(R[1]) : null,
      image: o ? N(o).replace(/(s|t)\.jpg$/, "c.jpg") : "",
    });
    if (i.length >= 8) break;
  }
  return i;
}

// Primary: resolve a name to an MDL person page through a search engine instead
// of MDL's own search, since there is no documented MDL/Kuryana people-search
// endpoint and MDL's search markup for people is unverified. DuckDuckGo's
// static HTML results page needs no JS and tends to be far less defended
// against scraping than MDL's own site.
async function V3searchPeopleViaWeb(t) {
  try {
    const query = `site:mydramalist.com/people ${t}`,
      e = await E(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { ...B, Accept: "text/html" },
      });
    if (!e.ok) return [];
    const r = await e.text(),
      i = [],
      s = new Set();
    const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(r))) {
      let href = m[1];
      const udm = href.match(/[?&]uddg=([^&]+)/);
      if (udm) {
        try {
          href = decodeURIComponent(udm[1]);
        } catch {}
      }
      const pm = href.match(/mydramalist\.com\/people\/(\d+(?:-[A-Za-z0-9-]+)?)/i);
      if (!pm) continue;
      const p = pm[1];
      if (s.has(p)) continue;
      s.add(p);
      const n = h(m[2]).replace(/\s*[-|]\s*MyDramaList.*$/i, "").trim();
      if (!n || !V3nameMatch(t, n)) continue;
      i.push({ id: `a.${p}`, name: n, image: "" });
      if (i.length >= 5) break;
    }
    return i;
  } catch {
    return [];
  }
}

// Fallback: scrape MDL's own general search page directly, on the chance it
// mixes person cards into the same result markup used by V3searchDramas.
// Unverified against real MDL markup, kept only as a second attempt after
// the web-search resolver above comes up empty.
async function V3searchPeopleOnMDL(t) {
  const e = await E(`${T}/search?q=${encodeURIComponent(t)}`, { headers: B });
  if (!e.ok) return [];
  const r = await e.text(),
    i = [],
    s = new Set();
  // Person results on MDL's search page are not wrapped in the same
  // id="mdl-N" cards used for dramas/movies, so match their title block
  // directly: <h6 class="... title ..."><a href="/people/ID-slug">Name</a></h6>
  // followed by a short bio paragraph that states their role in plain text
  // (e.g. "is a Japanese film director" vs "is a South Korean actress"),
  // which is enough to tell actors and directors apart with no extra fetch.
  const re =
    /<h6[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>\s*<a\b[^>]*href="([^"]*\/people\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h6>([\s\S]{0,400}?)<p>([\s\S]{0,400}?)<\/p>/gi;
  let m;
  while ((m = re.exec(r))) {
    const pm = m[1].match(/\/people\/(\d+(?:-[A-Za-z0-9-]+)?)/i);
    if (!pm) continue;
    const p = pm[1];
    if (s.has(p)) continue;
    s.add(p);
    const n = h(m[2]);
    if (!n || !V3nameMatch(t, n)) continue;
    const bio = h(m[4] || ""),
      dIdx = bio.search(/\bdirector\b/i),
      aIdx = bio.search(/\bact(?:or|ress)\b/i),
      kind = dIdx >= 0 && (aIdx < 0 || dIdx < aIdx) ? "Director" : "Actor";
    // The person's thumbnail sits in a sibling column before this card's
    // title block, not right next to it, so look back from the match for
    // the nearest preceding <img>.
    const before = r.slice(Math.max(0, m.index - 900), m.index),
      imgs = before.match(/<img\b[^>]*>/gi),
      lastImg = imgs && imgs.length ? imgs[imgs.length - 1] : "",
      imgSrc = $(lastImg, "data-src") || $(lastImg, "data-cfsrc") || $(lastImg, "src"),
      image = imgSrc ? N(imgSrc).replace(/(s|t)\.jpg$/, "c.jpg") : "";
    i.push({ id: `a.${p}`, name: n, image, kind });
    if (i.length >= 5) break;
  }
  return i;
}

async function V3searchPeople(t) {
  // MDL's own search page carries person cards directly and needs no
  // third-party lookup, so it goes first; the DuckDuckGo resolver is kept
  // only as a fallback for the rare case MDL's markup or availability shifts.
  const [mdl, web] = await Promise.all([
    V3searchPeopleOnMDL(t).catch(() => []),
    V3searchPeopleViaWeb(t).catch(() => []),
  ]);
  const list = mdl.length ? mdl : web;
  // Decorate each result with their native-script name (e.g. Hangul),
  // cached per person so only the first lookup ever pays for the fetch.
  await Promise.all(
    list.map(async (p) => {
      p.native = await nativeName(String(p.id || "").replace(/^a\./, "")).catch(() => "");
    }),
  );
  return list;
}

async function V3search(t) {
  if (!t || t.length < 2) return { dramas: [], people: [], lists: [] };
  const [p, lists] = await Promise.all([
    V3searchPeople(t).catch(() => []),
    V3listSearch(t, 15).catch(() => []),
  ]);
  // When the query clearly names one person (every query word matches
  // their name), show their real filmography instead of a generic title
  // search: directing credits for a director, acting roles for an actor.
  // he()/X() already parse this straight from the person's own MDL page.
  const match = p.find((person) => V3nameMatch(t, person.name));
  if (match) {
    try {
      const prof = await X(match.id),
        list = match.kind === "Director" ? prof.dir || [] : prof.items || [],
        dramas = list.slice(0, 8).map((it) => ({
          slug: it.slug,
          title: it.title,
          type: it.type || "",
          year: it.year ?? null,
          image: it.image || "",
        }));
      if (dramas.length) {
        return {
          dramas,
          people: p,
          lists,
          personMatch: { id: match.id, name: match.name, kind: match.kind },
        };
      }
    } catch {}
  }
  const d = await V3searchDramas(t).catch(() => []);
  return { dramas: d, people: p, lists };
}

// Diagnostic-only endpoint: /api/peopledebug?q=Name
// Does not affect /api/search at all. Shows exactly what each person-lookup
// attempt got back over the network, so a failure can be read from a browser
// instead of guessed at blind. Safe to leave in; nothing else calls it.
async function V3peopleDebug(t) {
  const out = { query: t, web: {}, mdl: {} };
  try {
    const query = `site:mydramalist.com/people ${t}`,
      url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    out.web.url = url;
    const e = await E(url, { headers: { ...B, Accept: "text/html" } });
    out.web.status = e.status;
    out.web.ok = e.ok;
    const r = await e.text().catch(() => "");
    out.web.length = r.length;
    out.web.snippet = r.slice(0, 1500);
    out.web.resultAnchorCount = (r.match(/result__a/gi) || []).length;
    out.web.anyPeopleLinkFound = /mydramalist\.com\/people\//i.test(r);
    const wi = r.search(/result__a/i);
    out.web.anchorRaw = wi >= 0 ? r.slice(Math.max(0, wi - 200), wi + 400) : null;
    const wp = r.search(/mydramalist\.com\/people\//i);
    out.web.peopleLinkRaw = wp >= 0 ? r.slice(Math.max(0, wp - 300), wp + 200) : null;
  } catch (err) {
    out.web.error = String((err && err.message) || err);
  }
  try {
    const url = `${T}/search?q=${encodeURIComponent(t)}`;
    out.mdl.url = url;
    const e = await E(url, { headers: B });
    out.mdl.status = e.status;
    out.mdl.ok = e.ok;
    const r = await e.text().catch(() => "");
    out.mdl.length = r.length;
    out.mdl.snippet = r.slice(0, 1500);
    out.mdl.cardCount = (r.match(/<div[^>]*\bid="mdl-\d+"/gi) || []).length;
    out.mdl.anyPeopleLinkFound = /\/people\//i.test(r);
    const mp = r.search(/\/people\//i);
    out.mdl.peopleLinkRaw = mp >= 0 ? r.slice(Math.max(0, mp - 300), mp + 200) : null;
    const sh = r.search(/<h6[^>]*class="[^"]*title[^"]*"[\s\S]{0,300}?\/people\//i);
    out.mdl.firstPeopleCard = sh >= 0 ? r.slice(sh, sh + 500) : null;
    out.mdl.beforeCard = sh >= 0 ? r.slice(Math.max(0, sh - 1400), sh) : null;
    out.mdl.splitCount = r.split(/<div[^>]*\bid="mdl-\d+"/i).length - 1;
  } catch (err) {
    out.mdl.error = String((err && err.message) || err);
  }
  return out;
}

async function V3personDebug(t) {
  const out = { slug: t };
  try {
    const html = await _(`people/${t}`);
    out.length = html.length;
    out.h5s = [...html.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>/gi)].map((m) => h(m[1]));
    out.headings = [...html.matchAll(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi)].map((m) => h(m[1]));
    out.tableCount = (html.match(/<table[^>]*>/gi) || []).length;
    const firstTableIdx = html.search(/<table[^>]*>/i);
    out.aroundFirstTable =
      firstTableIdx >= 0 ? html.slice(Math.max(0, firstTableIdx - 400), firstTableIdx + 200) : null;
    const parsed = _t(html);
    out.parsedName = parsed.name;
    out.itemsCount = parsed.items.length;
    out.dirCount = parsed.dir.length;
    out.dirSample = parsed.dir.slice(0, 5);
    out.itemsSample = parsed.items.slice(0, 5);
    const firstTr = html.search(/<table[^>]*>[\s\S]*?<\/thead>[\s\S]*?<tr/i);
    out.rawRow = firstTr >= 0 ? html.slice(firstTr, firstTr + 900) : null;
  } catch (err) {
    out.error = String((err && err.message) || err);
  }
  return out;
}

async function V3dramaLists(t) {
  if (!t) return { lists: [] };
  const p = await _(t).catch(() => "");
  if (!p) return { lists: [] };
  const idx = p.search(/popular\s*lists/i);
  if (idx < 0) return { lists: [] };
  const sec = p.slice(idx, idx + 60000);
  const out = [],
    seen = new Set();
  const re =
    /<a\s+class="collection"\s+href="\/list\/([A-Za-z0-9]+)"\s+title="([^"]*)"[^>]*>([\s\S]{0,2000}?)<\/a>/gi;
  let m;
  while ((m = re.exec(sec))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = h(m[2]);
    const imgMatch = m[3].match(/<img[^>]*(?:data-src|src)="([^"]*)"[^>]*>/i);
    const image = imgMatch ? N(imgMatch[1]) : "";
    const after = sec.slice(re.lastIndex, re.lastIndex + 600);
    const titlesM = after.match(/fa-tv\b[\s\S]{0,40}?<\/i>\s*([\d,]+)\s*titles/i);
    const lovesM = after.match(/fa-heart\b[\s\S]{0,40}?<\/i>\s*([\d,]+)\s*loves/i);
    out.push({
      id,
      title,
      image,
      titles: titlesM ? titlesM[1] : "",
      loves: lovesM ? lovesM[1] : "",
    });
    if (out.length >= 12) break;
  }
  return { lists: out };
}

// Some MDL "vote list" style entries repeat the same teaser text two or
// three times back-to-back (desktop/mobile markup duplication) before
// trailing off with an ellipsis. Collapse that down to a single copy.
function dedupeRepeatedText(s) {
  const m = s.match(/^(.{8,}?)\1+/);
  return (m ? m[1] : s).replace(/[…\s]+$/, "").trim();
}

async function V3listSearch(t, limit = 3) {
  if (!t) return [];
  const html = await E(`${T}/list/search?q=${encodeURIComponent(t)}&list_type=all`, { headers: B })
    .then((x) => (x.ok ? x.text() : ""))
    .catch(() => "");
  if (!html) return [];
  const out = [],
    seen = new Set();
  const re =
    /<a\s+class="text-primary title-primary"\s+href="\/list\/([A-Za-z0-9]+)"[^>]*>([\s\S]{0,200}?)<\/a>([\s\S]{0,900}?)<div class="list-bars[^>]*>([\s\S]{0,400}?)<\/div>/gi;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = h(m[2]),
      middle = m[3],
      stats = m[4],
      titlesM = stats.match(/fa-tv\b[\s\S]{0,40}?<\/i>\s*([\d,]+)\s*titles/i),
      lovesM = stats.match(/fa-heart\b[\s\S]{0,40}?<\/i>\s*([\d,]+)\s*loves?/i),
      lovesRaw = lovesM ? lovesM[1] : "",
      lovesNum = lovesRaw ? parseInt(lovesRaw.replace(/,/g, ""), 10) : 0;
    const descM = middle.match(/<p[^>]*>([\s\S]*?)<\/p>/i),
      desc = descM ? dedupeRepeatedText(h(descM[1])) : "";
    const before = html.slice(Math.max(0, m.index - 1600), m.index),
      imgs = before.match(/<img\b[^>]*>/gi),
      lastImg = imgs && imgs.length ? imgs[imgs.length - 1] : "",
      imgSrc = $(lastImg, "data-src") || $(lastImg, "data-cfsrc") || $(lastImg, "src");
    out.push({
      id,
      title,
      image: imgSrc ? N(imgSrc) : "",
      titles: titlesM ? titlesM[1] : "",
      loves: lovesRaw,
      desc,
      _n: lovesNum,
    });
  }
  out.sort((a, b) => b._n - a._n);
  return out.slice(0, limit).map(({ _n, ...rest }) => rest);
}

// Fetches a list's own page (not the search-results snippet, which has no
// author/date) to pull who created it and when. Cached long-term since this
// almost never changes once a list exists.
async function V3listMeta(id) {
  const key = String(id || "").replace(/[^A-Za-z0-9]/g, "");
  if (!key) return { author: "", date: "" };
  return D(`listmeta:${key}`, 7 * 24 * 3600 * 1e3, async () => {
    const html = await E(`${T}/list/${encodeURIComponent(id)}`, { headers: B })
      .then((x) => (x.ok ? x.text() : ""))
      .catch(() => "");
    if (!html) return { author: "", date: "" };
    const m = html.match(
      /class="list-by"[\s\S]{0,300}?<a[^>]*class="text-primary"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,60}?<small>([\s\S]*?)<\/small>/i,
    );
    return {
      author: m ? h(m[1]) : "",
      date: m ? h(m[2]).replace(/\s+/g, " ").trim() : "",
    };
  });
}

// Scrapes mydramalist.com/contributors for the top-contributor leaderboard
// (handle, display name, avatar, rank, member-since year, total points).
// Cached for a day since this list barely moves.
async function V3contributors(limit = 10) {
  return D(`contributors:${limit}`, 24 * 3600 * 1e3, async () => {
    const html = await E(`${T}/contributors`, { headers: B })
      .then((x) => (x.ok ? x.text() : ""))
      .catch(() => "");
    if (!html) return [];
    const out = [];
    for (const m of html.matchAll(/<li class="contributor">([\s\S]*?)<\/li>/gi)) {
      const block = m[1];
      const rankM = block.match(/<div class="rank">(\d+)<\/div>/i),
        userM = block.match(/href="\/profile\/([^"]+)"/i),
        imgM = block.match(/<img\b[^>]*>/i),
        nameM = block.match(/<p class="name">([\s\S]*?)(?:<span|<\/p>)/i),
        joinedM = block.match(/<p class="joined">Member since:\s*([\s\S]*?)<\/p>/i),
        totalM = block.match(/<span>Total<\/span>\s*<p>([\d,]+)<\/p>/i);
      if (!userM) continue;
      const img = imgM ? imgM[0] : "",
        avatar = $(img, "data-src") || $(img, "data-cfsrc") || $(img, "src");
      out.push({
        rank: rankM ? parseInt(rankM[1], 10) : out.length + 1,
        user: userM[1],
        name: nameM ? h(nameM[1]).trim() : userM[1],
        avatar: avatar ? N(avatar) : "",
        since: joinedM ? h(joinedM[1]).trim() : "",
        points: totalM ? totalM[1] : "",
      });
    }
    return out.slice(0, limit);
  });
}

// Scrapes a contributor's real profile stats: followers, join date,
// location and contribution points. MDL profiles have no bio/"about me"
// field -- confirmed live -- so this is the honest, real substitute for
// what the search-bar hover card shows.
async function V3profileStats(user) {
  const key = String(user || "").trim();
  if (!key) return null;
  return D(`profstats:${key.toLowerCase()}`, H, async () => {
    const html = await E(`${T}/profile/${encodeURIComponent(key)}`, { headers: B })
      .then((x) => (x.ok ? x.text() : ""))
      .catch(() => "");
    if (!html) return null;
    const followersM = html.match(/class="stats-followers"[\s\S]{0,80}?class="stats-num">([\d,]+)</i),
      followingM = html.match(/class="stats-following"[\s\S]{0,80}?class="stats-num">([\d,]+)</i),
      pointsM = html.match(/class="stats-points"[\s\S]{0,80}?class="stats-num">([\d,]+)</i);
    const fields = {};
    for (
      const m of html.matchAll(
        /<li class="list-item p-a-0">\s*<b class="inline">([^<:]+):<\/b>([\s\S]{0,200}?)<\/li>/gi,
      )
    ) {
      const label = h(m[1]).trim(),
        raw = m[2].replace(/<[^>]+>/g, " ");
      fields[label] = h(raw).replace(/\s+/g, " ").trim();
    }
    const pointsFromList = (fields["Contribution Points"] || "").match(/[\d,]+/);
    return {
      user: key,
      followers: followersM ? followersM[1] : "",
      following: followingM ? followingM[1] : "",
      points: pointsFromList ? pointsFromList[0] : (pointsM ? pointsM[1] : ""),
      joined: fields["Join Date"] || "",
      location: fields["Location"] || "",
    };
  });
}

// Fetches a person's own profile page and pulls the plain-text biography
// that sits between their details list (Born/Age/etc.) and the "Edit
// Biography" link. This is the real, full bio, not the truncated snippet
// shown in search results.
async function V3personBio(t) {
  return D(`bio:${t}`, H, async () => {
    try {
      const html = await _(`people/${t}`);
      const editIdx = html.search(/<a[^>]*href="\/edit\/people\/details[^"]*"[^>]*>Edit Biography<\/a>/i);
      if (editIdx < 0) return "";
      const before = html.slice(0, editIdx),
        ulIdx = before.lastIndexOf("</ul>");
      if (ulIdx < 0) return "";
      const afterUl = before.slice(ulIdx + 5),
        divIdx = afterUl.indexOf("</div>"),
        raw = divIdx >= 0 ? afterUl.slice(divIdx + 6) : afterUl;
      return h(raw);
    } catch {
      return "";
    }
  });
}

// Summarizes a person's bio down to 2-3 plain sentences for the hover
// card, using Gemini (gemini-3.5-flash-lite). The key lives only as a
// server-side env var and is never sent to the browser. Cached per person
// for a week so most hovers, across every visitor, never trigger a new
// Gemini call at all. Falls back to a plain first-two-sentences trim if
// the key is missing, the model call fails, or it returns nothing useful.
async function V3bioSummary(t) {
  const slug = t.replace(/^a\./, "");
  return D(`biosum11:${slug}`, 7 * 24 * 3600 * 1e3, async () => {
    const bio = await V3personBio(slug);
    if (!bio) return "";
    const fallback = () => {
      const sentences = bio.match(/[^.!?]+[.!?]+(?:["')\]]+)?/g) || [bio];
      const out = sentences.slice(0, 2).map((s) => s.trim()).join(" ").trim();
      return out.length > 260 ? out.slice(0, 257) + "..." : out;
    };
    const key = U.GEMINI_API_KEY || "";
    if (!key) return fallback();
    try {
      const prompt = "Summarize the following actor biography in 2-3 short sentences, " +
        "no more than 250 characters total. Be factual and concise, no preamble, " +
        "just the summary itself.\n\nBiography:\n" + bio;
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + key,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 120, temperature: 0.3 },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!res.ok) return fallback();
      const data = await res.json().catch(() => ({}));
      const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (!raw) return fallback();
      return raw.length > 260 ? raw.slice(0, 257) + "..." : raw;
    } catch {
      return fallback();
    }
  });
}

// Pulls the rating, watcher count, and review count straight off a
// drama's own page (the same numbers shown in MDL's own Statistics box),
// one fetch per drama, cached.
async function V3dramaStatsRaw(t) {
  const html = await _(t),
    txt = h(html);
  let n = txt.match(/Ratings?:\s*([\d.]+)\s*\/\s*10\s*from\s*([\d,]+)\s*users?/i) ||
    txt.match(/Score:\s*([\d.]+)\s*\(\s*scored by\s*([\d,]+)\s*users?/i);
  const score = n ? Number(n[1]) : null,
    users = n ? Number(n[2].replace(/,/g, "")) : null,
    w = (txt.match(/Watchers:\s*([\d,]+)/i) || [])[1],
    watchers = w ? Number(w.replace(/,/g, "")) : null,
    rv = (txt.match(/Reviews:\s*([\d,]+)\s*users?/i) || [])[1],
    reviews = rv ? Number(rv.replace(/,/g, "")) : null;
  return { score, users, watchers, reviews, reviewsUrl: `${T}/${t}/reviews` };
}
async function V3dramaStats(t) {
  if (!t) return null;
  return D(`stat2:${t}`, H, async () => {
    try {
      return await V3dramaStatsRaw(t);
    } catch {
      return null;
    }
  });
}

async function V3dramaListsDebug(t) {
  const out = { slug: t };
  try {
    const html = await _(t);
    out.length = html.length;
    const idx = html.search(/popular\s*lists/i);
    out.foundHeading = idx >= 0;
    out.around = idx >= 0 ? html.slice(Math.max(0, idx - 200), idx + 1800) : null;
  } catch (err) {
    out.error = String((err && err.message) || err);
  }
  return out;
}

async function V3trending() {
  return D("v3trending", 3600 * 1e3, async () => {
    const r = await E(`${T}/shows/top_airing`, { headers: B }).then((x) => (x.ok ? x.text() : "")),
      i = [];
    for (const b of r
      .split(/<div[^>]*\bid="mdl-\d+"/i)
      .slice(1)
      .slice(0, 10)) {
      const d = ((
        (b.match(/<h6[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/h6>/i) || [])[1] || ""
      ).match(/<a\b[^>]*>[\s\S]*?<\/a>/i) || [])[0];
      if (!d) continue;
      const l = $(d, "href"),
        u = (b.match(/<img\b[^>]*>/i) || [""])[0],
        o = $(u, "data-src") || $(u, "data-cfsrc") || $(u, "src"),
        g = (b.match(/<span[^>]*class="[^"]*\bscore\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || [])[1],
        x = g ? h(g).match(/[\d.]+/) : null;
      i.push({
        slug: V(l),
        title: h(d),
        image: o ? N(o).replace(/(s|t)\.jpg$/, "c.jpg") : "",
        score: x ? x[0] : "",
      });
    }
    return { items: i };
  });
}

async function V3trendingLists() {
  return D("v3trendinglists", 3600 * 1e3, async () => {
    const html = await E(`${T}/list`, { headers: B }).then((x) => (x.ok ? x.text() : "")),
      hIdx = html.search(/<h2[^>]*>\s*Trending Lists\s*<\/h2>/i);
    if (hIdx < 0) return { items: [] };
    const after = html.slice(hIdx),
      nextIdx = after.search(/class="box-header"/i, 1),
      block = nextIdx > 0 ? after.slice(0, nextIdx) : after,
      items = [];
    for (
      const row of block
        .split(/<div[^>]*\bclass="[^"]*\bcustom-list-preview\b/i)
        .slice(1)
    ) {
      const titleA = (row.match(
        /<a[^>]*class="[^"]*\btitle-primary\b[^"]*"[^>]*href="([^"]+)"[^>]*>\s*<b>([\s\S]*?)<\/b>/i,
      ) || []);
      if (!titleA[1]) continue;
      const id = V(titleA[1]),
        title = h(titleA[2]),
        imgs = [...row.matchAll(/<img\b[^>]*\bdata-src="([^"]+)"/gi)]
          .slice(0, 5)
          .map((m) => N(m[1])),
        titlesM = row.match(/fa-tv[^<]*<\/i>\s*([\d,]+)\s*titles?/i),
        lovesM = row.match(/fa-heart[^<]*<\/i>\s*([\d,]+)\s*loves?/i);
      if (!imgs.length) continue;
      items.push({
        id,
        title,
        images: imgs,
        titles: titlesM ? parseInt(titlesM[1].replace(/,/g, ""), 10) : null,
        loves: lovesM ? parseInt(lovesM[1].replace(/,/g, ""), 10) : null,
      });
    }
    return { items };
  });
}

// Scrapes the "Featured Voting List" triptych shown at the top of
// mydramalist.com/list - whatever MDL itself is currently spotlighting -
// so the setup page's hero header can mirror MDL's own pick instead of a
// YDL-ranked ordering. MDL rotates this slot on its own schedule, so the
// id/title/images returned here can change day to day.
async function V3featured() {
  return D("v3featured", 1800 * 1e3, async () => {
    const html = await E(`${T}/list`, { headers: B }).then((x) => (x.ok ? x.text() : "")),
      idx = html.search(/class="featured-list\b/i);
    if (idx < 0) return null;
    const block = html.slice(idx, idx + 4000),
      href = $(block, "href"),
      id = V(href);
    if (!id) return null;
    const images = [...block.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)]
      .slice(0, 3)
      .map((m) => N(m[1]));
    return {
      id,
      label: h(P(block, "list-type")),
      title: h(P(block, "list-title")),
      desc: h(P(block, "list-desc")),
      images,
    };
  });
}

async function Qt(t, e) {
  try {
    if (t.method === "OPTIONS") return v(e, 204, "");
    const n = new URL(t.url, "http://x"),
      s = n.pathname.split("/").filter(Boolean);
    if (s.length === 2 && s[0] === "assets" && s[1] === "hero.png") {
      const r = await blob.get("19769276.png"),
        b = new Uint8Array(await r.arrayBuffer());
      return (
        (e.statusCode = 200),
        e.setHeader("Content-Type", "image/png"),
        e.setHeader("Cache-Control", "public, max-age=300"),
        e.end(b)
      );
    }
    if (s.length === 2 && s[0] === "api" && s[1] === "wallpaper" && t.method === "POST") {
      let b = {};
      try {
        b = await t.raw.json();
      } catch {}
      if (!U.WP_ADMIN_KEY || String(b.key || "") !== U.WP_ADMIN_KEY) {
        return v(e, 403, { error: "Not authorized." });
      }
      const m = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(String(b.dataUrl || ""));
      if (!m) return v(e, 400, { error: "No image provided." });
      const bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
      await blob.set("19769276.png", bytes);
      let wpv = 0;
      try {
        wpv = parseInt(await (await blob.get("19769276.v")).text(), 10) || 0;
      } catch {}
      await blob.set("19769276.v", String(wpv + 1));
      return v(e, 200, { ok: !0 });
    }
    if (s.length === 1 && s[0] === "wpadmin") {
      const key = n.searchParams.get("key") || "";
      if (!U.WP_ADMIN_KEY || key !== U.WP_ADMIN_KEY) {
        return v(e, 403, "Not authorized.", "text/plain");
      }
      return v(
        e,
        200,
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wallpaper</title></head><body style="font:16px sans-serif;max-width:480px;margin:60px auto;padding:0 16px">
<h2>Change landing page wallpaper</h2>
<p style="color:#666">Pick an image. It replaces what everyone sees on the landing page (may take up to 5 minutes to show for visitors who already loaded it).</p>
<input type="file" id="f" accept="image/*">
<p id="msg" style="color:#666"></p>
<script>
document.getElementById('f').onchange = async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const msg = document.getElementById('msg');
  msg.textContent = 'Uploading…';
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  try {
    const resp = await fetch('/api/wallpaper', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: ${JSON.stringify(key)}, dataUrl })
    });
    const r2 = await resp.json().catch(() => ({}));
    msg.textContent = resp.ok ? 'Done. Wallpaper updated.' : (r2.error || 'Failed.');
  } catch {
    msg.textContent = 'Failed. Check your connection and try again.';
  }
};
<\/script>
</body></html>`,
        "text/html",
      );
    }
    if (!$e && (s.length === 0 || s[s.length - 1] === "configure"))
      return v(
        e,
        200,
        `<body style="font:16px sans-serif;max-width:640px;margin:40px auto;padding:0 16px"><h2>The setup page file is missing</h2><p>Add a file named exactly <b>client.ts</b> to this Val and paste the whole client.ts code into it, then tap Save.</p><p style="color:#888">Details: ${String($E || "client.ts did not load").replace(/</g, "&lt;")}</p></body>`,
        "text/html",
      );
    if (s.length === 0 || (s.length === 1 && s[0] === "configure"))
      return v(e, 200, await Ht(null), "text/html");
    if (s.length === 2 && s[1] === "configure")
      return v(e, 200, await Ht(await Pe(await gk(gt(s[0]), s[0]))), "text/html");
    if (s.length === 1 && s[0] === "manifest.json")
      return v(e, 200, Vt(!1), "application/json", 3600);
    if (s[0] === "health") return v(e, 200, { ok: !0, version: Q });
    if (s[0] === "api")
      return s[1] === "keys" && t.method === "POST"
        ? v(e, 200, await Kz(t.raw))
        : s[1] === "info"
          ? v(e, 200, await je(n.searchParams.get("url")))
          : s[1] === "user"
            ? v(e, 200, await Ne(n.searchParams.get("u")))
            : s[1] === "search"
              ? v(e, 200, await V3search(n.searchParams.get("q") || ""))
              : s[1] === "peopledebug"
                ? v(e, 200, await V3peopleDebug(n.searchParams.get("q") || ""))
                : s[1] === "dramalists"
                ? v(e, 200, await V3dramaLists(n.searchParams.get("slug") || ""))
                : s[1] === "trending"
                  ? v(e, 200, await V3trending())
                  : s[1] === "trendinglists"
                  ? v(e, 200, await V3trendingLists())
                  : s[1] === "featured"
                  ? v(e, 200, await V3featured())
                  : s[1] === "persondebug"
                    ? v(e, 200, await V3personDebug(n.searchParams.get("slug") || ""))
                    : s[1] === "dramalistsdebug"
                      ? v(e, 200, await V3dramaListsDebug(n.searchParams.get("slug") || ""))
                      : s[1] === "listsearch"
                        ? v(e, 200, {
                          items: await V3listSearch(
                            n.searchParams.get("q") || "",
                            Math.min(parseInt(n.searchParams.get("limit") || "3", 10) || 3, 20),
                          ),
                        })
                        : s[1] === "listmeta"
                          ? v(e, 200, await V3listMeta(n.searchParams.get("id") || ""))
                        : s[1] === "dramastats"
                          ? v(e, 200, await V3dramaStats(n.searchParams.get("slug") || ""))
                          : s[1] === "biosum"
                            ? v(e, 200, { summary: await V3bioSummary(n.searchParams.get("id") || "") })
                            : s[1] === "userlists"
                              ? v(e, 200, await ye(n.searchParams.get("u") || "").catch((r) => ({ error: r })))
                              : s[1] === "contributors"
                                ? v(e, 200, {
                                  items: await V3contributors(
                                    Math.min(parseInt(n.searchParams.get("limit") || "10", 10) || 10, 25),
                                  ),
                                })
                                : s[1] === "profilestats"
                                  ? v(e, 200, await V3profileStats(n.searchParams.get("u") || ""))
                                  : v(e, 404, { error: "Not found" });
    const a = await gk(gt(s[0]), s[0]),
      r = s.slice(1);
    if (!a.entries.length) return v(e, 404, { error: "No valid catalogs in URL" });
    if (r.length === 1 && r[0] === "manifest.json")
      return v(e, 200, await Re(a), "application/json", 3600);
    if (r[0] === "catalog" && r.length >= 3) {
      const i = Me(r[3] && r[3].replace(/\.json$/, ""));
      return v(e, 200, await Ie(a, r[1], r[2].replace(/\.json$/, ""), i), "application/json", 300);
    }
    return r[0] === "stream" && r.length === 3 && a.flags.includes("r")
      ? v(e, 200, await Je(r[1], r[2].replace(/\.json$/, "")), "application/json", 21600)
      : r[0] === "meta" && r.length === 3
        ? v(
            e,
            200,
            await Ce(a, r[1], decodeURIComponent(r[2].replace(/\.json$/, ""))),
            "application/json",
            3600,
          )
        : v(e, 404, { error: "Not found" });
  } catch (n) {
    return v(
      e,
      500,
      JSON.stringify({ error: n && n.message ? n.message : "Something went wrong." }),
    );
  }
}
function Qe(t) {
  return new Promise((e) => {
    const n = new Headers(),
      s = {
        statusCode: 200,
        setHeader(r, i) {
          n.set(r, i);
        },
        end(r) {
          const i = this.statusCode === 204;
          e(new Response(i ? null : r, { status: this.statusCode, headers: n }));
        },
      },
      a = new URL(t.url);
    Qt({ method: t.method, url: a.pathname + a.search, origin: a.origin, raw: t }, s);
  });
}
export { Qe as default };
