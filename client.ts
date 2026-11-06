// YourDramaList v3.0 setup page script (client.ts)
export function $e(t, e, n) {
  const s = (c) => document.getElementById(c),
    a = (c) =>
      String(c ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;"),
    r = () => {
      try {
        return JSON.parse(localStorage.getItem("ydl") || "null");
      } catch {
        return null;
      }
    },
    i = () => {
      try {
        localStorage.setItem("ydl", JSON.stringify(o));
      } catch {}
    },
    d = ["letterboxd", "tomatoes", "imdb"],
    l = { letterboxd: "Letterboxd", tomatoes: "Rotten Tomatoes", imdb: "IMDb" },
    u = r(),
    o = Object.assign(
      {
        step: 1,
        s1: "landing",
        user: "",
        rows: [],
        tab: "cat",
        o: {
          rev: !1,
          pon: !1,
          ratings: "letterboxd,tomatoes,imdb",
          tk: "",
          mk: "",
          u: !1,
          h: !1,
          dv: !1,
        },
      },
      u || {},
    );
  (o.user === "undefined" || typeof o.user !== "string") && (o.user = "");
  ((o.step = o.step >= 2 ? 2 : 1),
    (o.s1 = "landing"),
    (o.tab = "cat"),
    e &&
    ((o.step = 2),
      (o.user = e.user),
      (o.rows = e.items.map((c) => ({
        id: c.id,
        t: c.t,
        name: c.name,
        both: c.both,
        kind: c.kind,
        on: !0,
        so: c.hr ? "h" : "",
      }))),
      Object.assign(o.o, {
        u: e.flags.includes("u"),
        h: e.flags.includes("h"),
        rev: e.flags.includes("r"),
      }),
      e.posters &&
      Object.assign(o.o, {
        pon: e.posters.on,
        tk: e.posters.t,
        mk: e.posters.m || "",
        kt: e.posters.k || "",
        ratings: e.posters.r,
      })));
  o.rows.forEach((r) => r.so !== "h" && (r.so = ""));
  o.rows = o.rows.reduce((A, r) => {
    const P = A.find((y) => y.id === r.id);
    P ? P.t !== r.t && ((P.t = "all"), (P.both = !1)) : A.push(r);
    return A;
  }, []);
  let g = !1;
  try {
    g = localStorage.getItem("ydl_dark") === "1";
  } catch {}

  // --- helpers ---
  const x = (c) => {
      let b = c.name;
      /^(Community|Your) list$/.test(c.kind) && !/\blist$/i.test(b) &&
        (b += " list");
      if (c.kind === "Actor" || c.kind === "Director") {
        const q = b
          .replace(/ \((Highest Rated|Newest)\)$/, "")
          .replace(/ \((Series|Movies)\)$/, "")
          .replace(/'s (Dramas|Movies|Filmography)$/, "")
          .replace(
            /^MyDramaList (?:Highest Rated )?(?:Dramas|Movies|titles) (?:starring|directed by) /,
            "",
          );
        return c.kind === "Director"
          ? "MyDramaList Movies directed by " + q
          : "MyDramaList " +
            (c.t === "all" ? "titles" : c.t === "movie" ? "Movies" : "Dramas") +
            " starring " +
            q;
      }
      const B = c.t !== "all" && c.both
          ? b + (c.t === "movie" ? " (Movies)" : " (Series)")
          : b,
        W = "";
      if (!W) return B;
      const M = B.match(/^(.*?'s )(.+)$/);
      return M ? M[1] + W + " " + M[2] : W + " " + B;
    },
    CL = (c) => /^(Community|Your) list$/.test(c.kind),
    NO = (c) => {
      if (c.kind === "Actor") return !0;
      try {
        return /so=newest/.test(
          atob(c.id.slice(2).replace(/-/g, "+").replace(/_/g, "/")),
        );
      } catch {
        return !1;
      }
    },
    b = (c) => (c.kind === "rec" ? t.recText : c.kind),
    R = (c, m) =>
      '<label class="sw"><input type="checkbox" id="' +
      c +
      '"' +
      (m ? " checked" : "") +
      "><span></span></label>",
    L = (c, m, p, f) =>
      '<div class="opt"><div><div class="t">' +
      m +
      '</div><div class="d">' +
      p +
      "</div></div>" +
      R(c, f) +
      "</div>";

  // --- v3 search state ---
  let SQ = "",
    SRes = null,
    STm = 0;
  // --- discover step (search lists / browse users, shown once after Get Started) ---
  let disLastQ = "",
    disLastUser = "";
  // --- contributor leaderboard, fetched once and filtered client-side ---
  let CONTRIB_CACHE = null,
    CONTRIB_FETCHING = null;
  async function getContributors() {
    if (CONTRIB_CACHE) return CONTRIB_CACHE;
    if (!CONTRIB_FETCHING) {
      CONTRIB_FETCHING = yt("/api/contributors?limit=25")
        .then((r) => (CONTRIB_CACHE = r.items || []))
        .catch(() => (CONTRIB_CACHE = []));
    }
    return CONTRIB_FETCHING;
  }
  // --- v3 hover-preview state (desktop-only, search rows only) ---
  let HTm = 0,
    HRow = null;
  const HCache = {},
    HOVER_OK = matchMedia("(hover: hover) and (pointer: fine)").matches;
  // --- v3 verdict state ---
  let VSlug = "",
    VData = null,
    VLoading = !1;
  // --- v3 trending lists state ---
  let LData = null;
  // --- v3 featured (MDL's own featured list) state ---
  let FData = null;

  // --- header ---
  function j() {
    const c = t.heading.replace(/\s+/g, "").toLowerCase() === "yourdramalist"
        ? t.wm
        : t.heading,
      m = o.user && o.user !== "undefined"
        ? '<div class="who">' + a(o.user) + "</div>"
        : "",
      p = WB() + '<button class="tg" id="dark" title="Dark mode">' + t.sun +
        "</button>";
    if (o.step === 2) {
      return heroHeader();
    }
    return o.step === 1
      ? '<span class="s1corner">' +
        p +
        '</span><div class="s1brand"><div class="logo">' +
        t.heading +
        '</div><span class="s1ver">v' +
        n +
        '</span></div><div class="s1headline">' +
        t.intro.replace(/\bNuvio\b/g, "<u>Nuvio</u>") +
        "</div>"
      : '<div class="head slim' +
        (o.step === 3 ? " nb" : "") +
        '" style="--img:url(\'' +
        t.headerImage +
        '\')"><div class="brand"><div class="logo">' +
        c +
        '</div><div class="ver">v' +
        n +
        '</div></div><div class="right">' +
        m +
        p +
        "</div></div>";
  }
  // --- hero header (step 2): mirrors MDL's own Featured Voting List block ---
  function heroHeader() {
    const m = o.user && o.user !== "undefined"
        ? '<div class="who">' + a(o.user) + "</div>"
        : "",
      p = WB() + '<button class="tg" id="dark" title="Dark mode">' + t.sun +
        "</button>",
      tabs = ["Connect", "Setup", "Results"]
        .map((lbl) =>
          '<span' + (lbl === "Setup" ? ' class="on"' : "") + ">" + lbl +
          "</span>"
        )
        .join(""),
      imgs = (FData && FData.images && FData.images.length
        ? FData.images
        : ["", "", ""]).slice(0, 3),
      posters = imgs
        .map((im) =>
          '<div class="hposter"' +
          (im
            ? ' style="background-image:url(\'' +
              String(im).replace(/'/g, "") + '\')"'
            : "") +
          "></div>"
        )
        .join(""),
      label = a(
        FData
          ? (FData.label || "Featured List")
          : (t.trendingLoading || "Loading..."),
      ),
      title = FData && FData.title ? a(FData.title) : "",
      desc = FData && FData.desc
        ? '<div class="hdesc">' + a(FData.desc) + "</div>"
        : "",
      clickable = FData && FData.id
        ? ' data-fid="' + a(FData.id) + '" data-ftitle="' +
          a(FData.title || "") + '"'
        : "";
    return '<div class="hero"' + clickable + '><div class="htriptych">' +
      posters +
      '</div><div class="hgrad"></div><div class="hbar"><div class="brand"><div class="logo ydl">YDL<span class="verbadge">v' +
      n +
      '</span></div><nav class="htabs">' +
      tabs +
      '</nav></div><div class="right">' +
      m +
      p +
      '</div></div><div class="hinfo"><div class="heyebrow">' +
      label +
      "</div>" +
      (title ? '<div class="htitle">' + title + "</div>" : "") +
      desc +
      "</div></div>";
  }
  function I() {
    return (
      '<div class="bars' +
      (o.step === 1 ? " narrow" : "") +
      '">' +
      [1, 2, 3].map((c) => "<i" + (c <= o.step ? ' class="on"' : "") + "></i>")
        .join("") +
      "</div>"
    );
  }

  // --- discover step: shown once after Get Started, before the main app.
  // Lets you browse community lists or a contributor's own lists and add
  // any of them as catalogs, the same way the search bar does.
  function discoverView() {
    const name = t.heading || "YourDramaList";
    return (
      '<div class="discover" style="background-image:url(\'' +
      t.step1HeroImage +
      '\')"><div class="dcard"><div class="dischead"><div class="disbrand">' +
      a(name) +
      '</div><button class="tg" id="dark" title="Dark mode">' +
      t.sun +
      '</button></div><div class="disbody" id="disbody"></div>' +
      '<div class="disfoot"><a href="#" id="disskip" class="muted">' +
      a(t.skipText) +
      '</a><button class="btn primary" id="discontinue">' +
      a(t.continueButton) +
      "</button></div></div></div>"
    );
  }
  function disChipsHTML(contribs) {
    if (!contribs || !contribs.length) return "";
    return '<div class="dischips">' +
      contribs
        .slice(0, 8)
        .map(
          (c) =>
            '<div class="dischip" data-user="' + a(c.user) + '">' +
            (c.avatar ? '<img src="' + a(c.avatar) + '" alt="">' : "") +
            a(c.name || c.user) +
            "</div>",
        )
        .join("") +
      "</div>";
  }
  const DSEARCH =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  function disListRowsHTML(items, emptyMsg) {
    if (!items || !items.length) return '<div class="umsg">' + a(emptyMsg || t.discoverNoResults) + "</div>";
    return items
      .map(
        (d) =>
          '<div class="urow" data-id="' +
          a(d.id) +
          '" data-title="' +
          a(d.title) +
          '" data-author="' +
          a(d.author || "") +
          '">' +
          (d.image
            ? '<img src="' + a(d.image) + '" alt="" loading="lazy">'
            : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field)"></div>') +
          '<div class="um"><div class="un">' +
          a(d.title) +
          '</div><div class="ut">' +
          (d.titles ? "<i>" + d.titles + " titles</i>" : "") +
          (d.loves ? " <i>" + d.loves + " loves</i>" : "") +
          "</div></div></div>",
      )
      .join("");
  }
  async function disRenderBody() {
    const body = s("disbody");
    if (!body) return;
    const contribs = await getContributors();
    body.innerHTML =
      '<div class="dishint">' + a(t.discoverListsHint) + "</div>" +
      '<div class="dissearch"><span class="dsicon">' + DSEARCH + '</span><input class="disinput dsinput" id="disq" placeholder="' +
      a(t.discoverListsPlaceholder) +
      '" value="' + a(disLastQ) + '"></div>' +
      (contribs && contribs.length
        ? '<div class="dischiplabel">' + a(t.discoverRecommendedUsers) + "</div>" + disChipsHTML(contribs)
        : "") +
      '<div class="dlist" id="disresults"><div class="umsg">' + a(t.discoverTypeToSearch) + "</div></div>";
    const inp = s("disq");
    inp.focus();
    inp.oninput = () => {
      clearTimeout(STm);
      const q = inp.value.trim();
      disLastQ = q;
      if (q.length < 2) {
        s("disresults").innerHTML = '<div class="umsg">' + a(t.discoverTypeToSearch) + "</div>";
        return;
      }
      STm = setTimeout(async () => {
        s("disresults").innerHTML = '<div class="umsg">' + a(t.discoverSearching) + "</div>";
        let items = [];
        try {
          items = (await yt("/api/listsearch?limit=15&q=" + encodeURIComponent(q))).items || [];
        } catch {}
        s("disresults").innerHTML = disListRowsHTML(items);
        disBindRows();
      }, 350);
    };
    if (disLastQ) inp.oninput();
    const showContributor = async (u) => {
      u = (u || "").trim();
      if (!u) return;
      disLastUser = u;
      s("disresults").innerHTML = '<div class="umsg">' + a(t.discoverLoading) + "</div>";
      let lists = [];
      try {
        const r = await yt("/api/userlists?u=" + encodeURIComponent(u));
        lists = (r && r.lists) || [];
      } catch {}
      const addAllBtn = lists.length
        ? '<div class="usec">' + lists.length + " " + a(t.discoverListsCountSuffix) +
          '<button data-addall="1">' + a(t.discoverAddAllBtn) + "</button></div>"
        : "";
      s("disresults").innerHTML = addAllBtn +
        disListRowsHTML(lists.map((l) => ({ ...l, author: u })), t.discoverNoLists);
      disBindRows();
      const addAll = s("disresults").querySelector("[data-addall]");
      if (addAll) {
        addAll.onclick = () => {
          const items = lists.map((l) => ({
            id: l.id,
            name: nameList(l.title, u),
            kind: "Community list",
            types: ["series", "movie"],
          }));
          const y = et(items);
          for (const row of s("disresults").querySelectorAll(".urow[data-id]")) {
            row.classList.add("added");
          }
          S(
            "ast",
            y ? y + " list" + (y === 1 ? "" : "s") + " added." : "Those are already in your catalogs.",
            !y,
          );
        };
      }
    };
    for (const chip of body.querySelectorAll(".dischip")) {
      chip.onclick = () => showContributor(chip.dataset.user);
    }
  }
  function disBindRows() {
    const box = s("disresults");
    if (!box) return;
    for (const row of box.querySelectorAll(".urow[data-id]")) {
      row.onclick = () => {
        if (row.dataset.busy) return;
        row.dataset.busy = "1";
        const id = row.dataset.id,
          title = row.dataset.title,
          author = row.dataset.author;
        (async () => {
          let nm = title;
          if (!author) {
            try {
              const meta = await yt("/api/listmeta?id=" + encodeURIComponent(id));
              nm = nameList(title, (meta && meta.author) || "");
            } catch {
              nm = nameList(title, "");
            }
          } else {
            nm = nameList(title, author);
          }
          const y = et([{ id, name: nm, kind: "Community list", types: ["series", "movie"] }]);
          delete row.dataset.busy;
          if (y) row.classList.add("added");
          S("ast", y ? "Added." : "That one is already in your catalogs.", !y);
        })();
      };
    }
  }
  function bindDiscover() {
    s("dark").onclick = () => {
      g = !g;
      try {
        localStorage.setItem("ydl_dark", g ? "1" : "");
      } catch {}
      document.body.classList.toggle("dark", g);
    };
    s("disskip").onclick = (e) => {
      e.preventDefault();
      o.o.dv = !0;
      C();
    };
    s("discontinue").onclick = () => {
      o.o.dv = !0;
      C();
    };
    disRenderBody();
  }

  // --- step 1 (design-exact): hero headline block ---
  function step1Head() {
    return (
      '<span style="position:absolute;top:16px;right:20px;z-index:3">' +
      WB() +
      '<button class="tg" id="dark" title="Dark mode">' +
      t.sun +
      "</button></span>" +
      '<div style="position:absolute;left:299px;top:154px;display:flex;align-items:center;gap:10px;z-index:2"><span style="font-size:66px;font-weight:900;line-height:1;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)">' +
      t.heading +
      '</span><span style="display:inline-block;font-size:13px;font-weight:800;padding:3px 8px;border-radius:5px;background:#e0393e;color:#fff">v' +
      n +
      '</span></div><div style="position:absolute;left:299px;top:232px;width:500px;font-size:24px;font-weight:700;line-height:1.3;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5);z-index:2">' +
      t.intro.replace(/\bNuvio\b/g, "<u>Nuvio</u>") +
      "</div>"
    );
  }
  // --- onboarding step 1a: Get Started landing (button only, under the tagline) ---
  function landingCard() {
    return (
      '<button style="position:absolute;left:299px;top:300px;border:0;border-radius:10px;padding:20px 52px;font-weight:700;font-size:19px;cursor:pointer;background:#24508f;color:#fff;font-family:inherit;z-index:2" id="getstarted">' +
      t.getStartedButton +
      "</button>"
    );
  }

  // --- onboarding step 1b: API keys only ---
  function keysCard() {
    const D = (id, lb, v, u) =>
      '<label style="display:block;font-weight:700;margin:13px 0 6px;font-size:13px" for="' +
      id +
      '">' +
      lb +
      '</label><input class="s1in" type="password" id="' +
      id +
      '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' +
      a(v) +
      '"><div style="color:#6b7380;font-size:12px;margin-top:5px">' +
      t.getKeyText +
      ' <a href="' +
      u +
      '" target="_blank" rel="noopener" style="color:#1675b6">' +
      t.linkText +
      "</a></div>";
    return (
      '<div style="position:absolute;left:299px;top:320px;width:345px;background:rgba(255,255,255,.98);border-radius:14px;padding:24px 26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.45);color:#2b2f36;z-index:2"><h2 style="margin:0 0 16px;font-size:19px;font-weight:900;color:#24508f">' +
      t.setupTitle +
      '</h2><div style="font-size:12px;font-weight:700;color:#6b7380;text-transform:uppercase;letter-spacing:.03em">' +
      t.keysTitle +
      ' <span style="text-transform:none;font-weight:400">' +
      t.keysNote +
      "</span></div>" +
      D("k1", t.tmdbLabel, o.o.tk, "https://www.themoviedb.org/settings/api") +
      D("k2", t.mdblistLabel, o.o.mk, "https://mdblist.com/preferences/") +
      (t.privacyNote
        ? '<div style="color:#6b7380;font-size:12px;margin-top:5px">' +
          t.privacyNote +
          "</div>"
        : "") +
      '<button style="display:flex;width:100%;justify-content:center;border:0;border-radius:8px;padding:11px 14px;font-weight:700;font-size:14px;cursor:pointer;background:#24508f;color:#fff;margin-top:16px;font-family:inherit" id="cont">' +
      t.continueButton +
      '</button><div style="font-size:12px;margin-top:8px;color:#6b7380" id="cst"></div><div style="text-align:center;margin-top:9px;color:#6b7380;font-size:12px"><a href="#" id="s1skip" style="color:#1675b6;text-decoration:underline;cursor:pointer">' +
      t.keysSkipText +
      "</a></div></div>"
    );
  }

  // --- onboarding step 1c: Connect your MyDramaList (username only / full access) ---
  function connectCard() {
    return (
      '<div style="position:absolute;left:230px;top:300px;width:500px;background:rgba(255,255,255,.98);border-radius:14px;padding:24px 26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.45);color:#2b2f36;z-index:2"><h2 style="margin:0 0 16px;font-size:19px;font-weight:900;color:#24508f">' +
      t.connectHeading +
      '</h2><div style="display:flex;gap:14px;margin-bottom:16px">' +
      '<div style="flex:1;border:2px solid #24508f;border-radius:10px;padding:14px">' +
      '<div style="font-weight:800;font-size:14px">' +
      t.usernameCardTitle +
      '</div><div style="color:#6b7380;font-size:12px;margin-top:6px">' +
      t.usernameCardDesc +
      "</div></div>" +
      '<div style="flex:1;border:2px solid #d5d9e0;border-radius:10px;padding:14px;opacity:.55;position:relative">' +
      '<div style="font-weight:800;font-size:14px">' +
      t.fullAccessCardTitle +
      '</div><div style="color:#6b7380;font-size:12px;margin-top:6px">' +
      t.fullAccessCardDesc +
      '</div><div style="position:absolute;top:10px;right:10px;font-size:10px;font-weight:700;background:#9aa5b1;color:#fff;padding:2px 6px;border-radius:5px">' +
      t.fullAccessUnavailable +
      "</div></div></div>" +
      '<label style="display:block;font-weight:700;margin:4px 0 6px;font-size:13px" for="un">' +
      t.usernameLabel +
      '</label><input class="s1in" id="un" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' +
      t.usernamePlaceholder +
      '" value="' +
      a(o.user) +
      '"><button style="display:flex;width:100%;justify-content:center;border:0;border-radius:8px;padding:11px 14px;font-weight:700;font-size:14px;cursor:pointer;background:#24508f;color:#fff;margin-top:16px;font-family:inherit" id="cont">' +
      t.continueButton +
      '</button><div style="font-size:12px;margin-top:8px;color:#6b7380" id="cst"></div></div>'
    );
  }
  // --- step 1: api keys + username ---
  function tt() {
    const K = (id, lb, v, u) =>
      '<label class="lbl" for="' +
      id +
      '">' +
      lb +
      '</label><input type="password" id="' +
      id +
      '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' +
      a(v) +
      '"><div class="muted kl">' +
      t.getKeyText +
      ' <a href="' +
      u +
      '" target="_blank" rel="noopener">' +
      t.linkText +
      "</a></div>";
    return (
      '<div class="box connect"><h2>' +
      t.setupTitle +
      '</h2><div class="kh">' +
      t.keysTitle +
      ' <span class="muted">' +
      t.keysNote +
      "</span></div>" +
      K("k1", t.tmdbLabel, o.o.tk, "https://www.themoviedb.org/settings/api") +
      K("k2", t.mdblistLabel, o.o.mk, "https://mdblist.com/preferences/") +
      '<div class="muted kl">' +
      t.privacyNote +
      '</div><div class="kh">' +
      t.accountTitle +
      ' <span class="muted">' +
      t.accountNote +
      '</span></div><div class="muted">' +
      t.connectText +
      '</div><label class="lbl" for="un">' +
      t.usernameLabel +
      '</label><input id="un" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' +
      t.usernamePlaceholder +
      '" value="' +
      a(o.user) +
      '"><button class="btn primary" id="cont">' +
      t.continueButton +
      '</button><div class="status" id="cst"></div><div class="muted kl" style="text-align:center">' +
      t.noAccountText +
      "</div></div>"
    );
  }

  // --- left panel: nav tabs + trending ---
  function leftPanel() {
    const tabs = [
      { id: "cat", label: t.catalogsTab || "Catalogs" },
      { id: "disp", label: t.displayTab || "Display" },
    ];
    const tabsHtml = tabs
      .map(
        (tb) =>
          '<button type="button" class="navbtn' +
          (o.tab === tb.id ? " on" : "") +
          '" data-tab="' +
          tb.id +
          '">' +
          tb.label +
          "</button>",
      )
      .join("");
    const trending = trendingSection();
    return '<div class="lpanel"><div class="navtabs">' + tabsHtml + "</div>" +
      trending + "</div>";
  }

  const LSVG = {
    tv: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>',
    heart: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.5-9C1.1 8.1 2.6 5 5.6 5c1.8 0 3.2 1 4.4 2.6C11.2 6 12.6 5 14.4 5c3 0 4.5 3.1 3.1 6.5-2 4.4-9.5 9-9.5 9z"/></svg>',
  };
  function trendingSection() {
    if (!LData || !LData.items || !LData.items.length) {
      return (
        '<div class="trending"><h4 class="sh">' +
        (t.trendingTitle || "Trending Lists") +
        '</h4><div class="muted tsm">' +
        (t.trendingLoading || "Loading...") +
        "</div></div>"
      );
    }
    const items = LData.items
      .slice(0, 3)
      .map(
        (it) =>
          '<div class="lcard" data-lid="' +
          a(it.id) +
          '" data-ltitle="' +
          a(it.title) +
          '">' +
          '<div class="lfan">' +
          it.images.map((im) => '<img src="' + a(im) + '" alt="" loading="lazy">').join("") +
          "</div>" +
          '<div class="lname">' + a(it.title) + "</div>" +
          '<div class="lmeta">' +
          (it.titles
            ? '<span>' + LSVG.tv + it.titles + " titles</span>"
            : "") +
          (it.loves
            ? '<span>' + LSVG.heart + it.loves + " loves</span>"
            : "") +
          "</div></div>",
      )
      .join("");
    return (
      '<div class="trending"><h4 class="sh">' +
      (t.trendingTitle || "Trending Lists") +
      "</h4>" +
      items +
      "</div>"
    );
  }

  // --- center panel: unified search + catalogs or display ---
  function centerPanel() {
    const searchBar = '<div class="usearch">' +
      '<input id="uq" class="uqi" type="search" placeholder="' +
      a(t.searchPlaceholder || "Paste a link or search dramas, actors...") +
      '" autocomplete="off" spellcheck="false" value="' +
      a(SQ) +
      '">' +
      '<div id="udrop" class="udrop" hidden></div></div><div class="status" id="ast"></div>';
    const content = o.tab === "cat" ? catalogsPanel() : displayPanel();
    return '<div class="cpanel">' + searchBar + content + "</div>";
  }

  // --- quick lists (preset explore pages, no search needed) ---
  const QC = [
      ["", "All"],
      ["3", "South Korea"],
      ["2", "China"],
      ["1", "Japan"],
      ["5", "Taiwan"],
      ["6", "Thailand"],
    ],
    QK = [
      ["Top Airing", "ty=68&st=1&so=top", "series"],
      ["Newest Shows", "ty=68&so=newest&or=desc", "series"],
      ["Most Popular Shows", "ty=68&so=popular", "series"],
      ["Top Shows", "ty=68&so=top", "series"],
      ["Top Movies", "ty=77&so=top", "movie"],
      ["Variety Shows", "ty=86&fm=6&so=popular", "series"],
    ];
  function QA() {
    const q = o.qc || "";
    return (
      '<div class="qa"><div class="muted qal">Quick lists:</div><div class="qc">' +
      QC.map(
        ([v, n]) =>
          '<button type="button" data-qc="' + v + '"' +
          (v === q ? ' class="on"' : "") + ">" + n + "</button>",
      ).join("") +
      '</div><div class="qb">' +
      QK.map((k, i) =>
        '<button type="button" data-qb="' + i + '">+ ' + k[0] + "</button>"
      ).join("") +
      "</div></div>"
    );
  }

  // --- catalogs panel (add row removed, replaced by unified search) ---
  function catalogsPanel() {
    const c = o.rows
      .map(
        (m, p) =>
          '<div class="row' +
          (m.on ? "" : " off") +
          '" data-i="' +
          p +
          '"><span class="grip" title="Drag to reorder">&#8942;&#8942;</span><div class="rt"><div class="rn">' +
          a(x(m)) +
          "</div></div>" +
          '<div class="rc">' +
          (CL(m) ? "" : '<label class="hrs"><input type="checkbox" id="hr' +
            p +
            '"' +
            (m.so === "h" ? " checked" : "") +
            "><span>Sort by highest rated</span></label>") +
          '<div class="rb">' +
          R("on" + p, m.on) +
          '<button class="x" data-x="' +
          p +
          '" aria-label="Remove">&times;</button></div></div></div>',
      )
      .join("");
    return (
      QA() +
      '<div class="cath"><b>' +
      t.catalogsTitle +
      '</b><span class="muted">drag to reorder</span></div>' +
      catRowStyles() +
      '<div id="rows">' +
      (c || '<div class="empty muted">' + t.catalogsEmpty + "</div>") +
      "</div>"
    );
  }
  function catRowStyles() {
    return "<style>#rows .rc{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}.hrs{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted);cursor:pointer;white-space:nowrap;margin:0}.hrs input{width:13px;height:13px;margin:0;padding:0;cursor:pointer}#rows .rb{display:flex;align-items:center;justify-content:space-between}#rows .rb .sw{margin:0}</style>";
  }

  // --- display options panel ---
  function displayPanel() {
    const c = o.o,
      m = d
        .map(
          (p) =>
            '<button type="button" data-r="' +
            p +
            '"' +
            (c.ratings.split(",").includes(p) ? ' class="on"' : "") +
            ">" +
            l[p] +
            "<small>" +
            (p === "imdb" ? "(TMDB)" : "(MDBList)") +
            "</small></button>",
        )
        .join("");
    return (
      "<h3>" +
      t.optionsTitle +
      "</h3>" +
      L("rev", t.reviewsTitle, t.reviewsText, c.rev) +
      L("pon", t.postersTitle, t.postersHint, c.pon) +
      '<div id="rp"' +
      (c.pon ? "" : " hidden") +
      '><div class="seg">' +
      m +
      "</div></div>" +
      L("ou", t.unreleasedTitle, t.unreleasedText, c.u) +
      (o.user ? L("oh", t.hideTitle, t.hideText, c.h) : "")
    );
  }

  // --- right panel: verdict + summary + generate ---
  function rightPanel() {
    const summary = summaryTiles();
    return (
      '<div class="rpanel"><div id="sum">' +
      summary +
      "</div>" +
      '<div class="gobar"><button class="btn primary" id="go">' +
      t.generateButton +
      '</button><div class="status" id="gst"></div></div>' +
      '<a href="#" class="link" id="chu">' +
      (t.editLink || "Edit API keys") +
      "</a></div>"
    );
  }

  function summaryTiles() {
    const c = o.rows.filter((f) => f.on),
      m = o.o.ratings
        .split(",")
        .filter(Boolean)
        .map((f) => l[f]),
      p = (f, y, k) =>
        '<div class="tile' + (k ? "" : " dim") + '"><b>' + f + "</b><span>" +
        y + "</span></div>";
    return (
      '<h4 class="sh">' +
      t.summaryTitle +
      '</h4><div class="tiles">' +
      p(c.length, "Catalogs", c.length) +
      p(o.o.rev ? "On" : "Off", "Reviews", o.o.rev) +
      p(o.o.pon ? "On" : "Off", "Posters", o.o.pon) +
      "</div>" +
      (o.o.pon && m.length
        ? '<div class="pills">' + m.map((f) =>
          "<span>" + f + "</span>"
        ).join("") + "</div>"
        : "") +
      orderSection()
    );
  }
  function orderSection() {
    if (!o.rows.length) return "";
    const items = o.rows
      .map(
        (f, i) =>
          '<li class="' + (f.on ? "" : "dim") + '">' + a(x(f)) + "</li>",
      )
      .join("");
    return '<div class="order"><h4 class="sh">Catalog Order</h4><ol>' +
      items + "</ol></div>";
  }

  // --- wallpaper system (preserved from v2) ---
  const WK = "ydl_wp",
    WPV = () => {
      try {
        return JSON.parse(localStorage.getItem(WK) || "null");
      } catch {
        return null;
      }
    };
  let AW = WPV();
  function WU(url) {
    AW = url ? { u: url } : null;
    try {
      url
        ? localStorage.setItem(WK, JSON.stringify(AW))
        : localStorage.removeItem(WK);
    } catch {}
    document.body.classList.toggle("haswp", !!AW);
    document.body.style.setProperty(
      "--wp",
      AW ? 'url("' + AW.u + '")' : "none",
    );
  }
  function WB() {
    return (
      '<div class="wpw"><button class="tg wm" id="wpb" title="Wallpaper">' +
      t.wallpaperIcon +
      '</button><div class="wpm" id="wpm" hidden>' +
      '<button data-wp="upload">Upload image</button>' +
      '<button data-wp="url">Paste image URL</button>' +
      (AW ? '<button data-wp="clear">Remove wallpaper</button>' : "") +
      "</div></div>"
    );
  }
  function WBind() {
    const btn = s("wpb"),
      menu = s("wpm");
    if (!btn || !menu) return;
    btn.onclick = () => {
      menu.hidden = !menu.hidden;
    };
    menu.onclick = (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      menu.hidden = !0;
      const act = b.dataset.wp;
      if (act === "clear") WU(null);
      else if (act === "url") {
        const u = prompt("Paste an image URL:");
        if (u) WU(u.trim());
      } else if (act === "upload") {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.onchange = () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = () => WU(rd.result);
          rd.readAsDataURL(f);
        };
        inp.click();
      }
    };
  }

  // --- main render ---
  function C() {
    const root = s("app");
    if (o.step === 1) {
      const s1body = o.s1 === "keys"
        ? keysCard()
        : o.s1 === "connect"
        ? connectCard()
        : landingCard();
      root.innerHTML = CSS +
        '<div class="step1" style="background-image:url(\'' +
        t.step1HeroImage +
        '\')">' +
        step1Head() +
        s1body +
        '<div class="s1foot">' +
        t.footer +
        "</div></div>";
      ee();
      return;
    }
    if (o.step === 3) {
      root.innerHTML = CSS + j() + I() + P3();
      ee();
      return;
    }
    if (o.step === 2 && !o.o.dv) {
      root.innerHTML = CSS + discoverView();
      ee();
      return;
    }
    // step 2: three-column layout inside giant card
    root.innerHTML = CSS +
      '<div class="bigcard">' +
      j() +
      '<div class="grid3">' +
      leftPanel() +
      centerPanel() +
      rightPanel() +
      "</div></div>" +
      '<div class="foot">' +
      t.footer +
      "</div>";
    ee();
    // load trending lists on first render
    if (!LData) fetchTrending();
    if (!FData) fetchFeatured();
  }

  // --- step 3: done page ---
  const P3 = () => {
    const R = o.res || {},
      cp = (l, v) =>
        '<div class="dl">' +
        l +
        '</div><div class="dr"><input readonly value="' +
        a(v) +
        '" onfocus="this.select()"><button type="button" class="btn dbtn" data-copy="' +
        a(v) +
        '">Copy</button></div>';
    return (
      '<div class="done"><img class="ck" alt="" src="data:image/png;base64,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"><h2>' +
      (t.doneHeading || "Daebak (대박)") +
      '</h2><div class="cs">' +
      (t.doneTitle || "Your addon is ready.") +
      '</div><div class="dcard"><div class="ib"><a class="btn primary" href="' +
      a(String(R.k || "").replace(/^https?:/, "stremio:")) +
      '">Install in Nuvio</a><a class="btn ghost" target="_blank" rel="noopener" href="https://web.stremio.com/#/addons?addon=' +
      encodeURIComponent(R.k || "") +
      '">Install Web</a></div>' +
      cp("Manifest URL for Nuvio", R.k || "") +
      '</div><div class="dlk"><a href="#" id="rec">Reconfigure</a><a href="#" id="sto">Start over</a></div></div>'
    );
  };

  // --- P3 bindings ---
  const P3B = () => {
    for (const w of document.querySelectorAll("[data-copy]")) {
      w.onclick = async () => {
        try {
          (await navigator.clipboard.writeText(w.dataset.copy),
            (w.textContent = "Copied"));
        } catch {
          w.textContent = "Select and copy";
        }
        setTimeout(() => (w.textContent = "Copy"), 1800);
      };
    }
    (s("rec") &&
      (s("rec").onclick = (e) => {
        (e.preventDefault(), (o.step = 2), C());
      }),
      s("sto") &&
      (s("sto").onclick = (e) => {
        (e.preventDefault(),
          (o.step = 1),
          (o.rows = []),
          (o.user = ""),
          (o.o.h = !1),
          (o.res = null),
          C());
      }));
  };

  // --- CSS ---
  const CSS = `<style>
:root{--bg:#e9eaee;--card:#fff;--line:#d5d9e0;--text:#2b2f36;--muted:#6b7380;--brand:#24508f;--link:#1675b6;--green:#4cae4c;--field:#f6f7f9}
body.dark{--bg:#16181d;--card:#1e2028;--line:#2e3038;--text:#e0e2e8;--muted:#8b92a0;--brand:#5b8fd4;--link:#6bafe8;--green:#5bc05b;--field:#24262e}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 Lato,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
body.haswp{background:var(--bg) var(--wp) center/cover fixed no-repeat}
a{color:var(--link)}
.btn{display:inline-block;padding:10px 20px;border:none;border-radius:10px;font:700 15px Lato,sans-serif;cursor:pointer;text-decoration:none;text-align:center;transition:opacity .15s}
.btn:hover{opacity:.88}
.primary{background:var(--brand);color:#fff}
.ghost{background:var(--field);color:var(--text);border:1px solid var(--line)}

/* header */
.head.big{text-align:center;padding:50px 20px 38px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);background-size:cover;background-position:center;border-radius:18px 18px 0 0;position:relative}
.head.big .corner{position:absolute;top:14px;right:16px;display:flex;gap:8px;align-items:center}
.head.big .logo{font-size:42px;font-weight:900;letter-spacing:-.5px}
.head.big .sub{font-size:14px;opacity:.85;margin-top:2px}
.head.big .ver{font-size:12px;opacity:.65;margin-top:4px}
.head.big .intro{max-width:520px;margin:18px auto 0;font-size:15px;line-height:1.6}
.head.big .intro u{text-decoration:none;font-weight:700}
.head.slim{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);background:var(--img) center/cover;border-radius:0 0 14px 14px}
.head.slim .brand{display:flex;align-items:center;gap:10px}
.head.slim .logo{font-size:22px;font-weight:900}
.head.slim .ver{font-size:12px;opacity:.7}
.head.slim .right{display:flex;align-items:center;gap:10px}
.head.slim .who{font-size:13px;opacity:.9}
.head.nb{background:none!important;box-shadow:none;flex-direction:row;justify-content:space-between;text-align:left;padding:14px 4px 4px!important;margin-top:8px}
.head.nb .brand{flex-direction:row;gap:12px}
.head.nb .right{position:static}
body:not(.haswp):not(.dark) .head.nb{color:var(--text);text-shadow:none}
body:not(.haswp):not(.dark) .head.nb .logo,body:not(.haswp):not(.dark) .head.nb .who{color:var(--text);text-shadow:none}
body:not(.haswp):not(.dark) .head.nb .wm text{fill:var(--text)}
body:not(.haswp):not(.dark) .head.nb .wm{filter:none}
body:not(.haswp):not(.dark) .head.nb .tg{background:rgba(0,0,0,.08);color:var(--text)}
.tg{background:rgba(255,255,255,.18);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s}
.tg:hover{background:rgba(255,255,255,.3)}

/* step 2: full-width hero header, mirrors MDL's own Featured Voting List triptych */
.hero{position:relative;height:230px;overflow:hidden;color:#fff;background:#1c2a4a}
.hero[data-fid]{cursor:pointer}
.htriptych{position:absolute;inset:0;display:flex}
.hposter{flex:1;background:#1c2a4a center top/cover no-repeat}
.hgrad{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,15,25,.75) 0%,rgba(10,15,25,.25) 45%,rgba(10,15,25,0) 65%),linear-gradient(0deg,rgba(10,15,25,.6) 0%,rgba(10,15,25,0) 60%)}
.hbar{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:16px 24px 0;text-shadow:0 1px 4px rgba(0,0,0,.6)}
.hbar .brand{display:flex;align-items:center;gap:24px}
.hbar .logo.ydl{font-size:20px;font-weight:900;letter-spacing:-.3px}
.hbar .verbadge{font-size:10px;font-weight:800;background:#e0393e;padding:2px 6px;border-radius:4px;margin-left:6px;vertical-align:2px}
.hbar .htabs{display:flex;gap:20px}
.hbar .htabs span{font-size:13px;font-weight:700;color:rgba(255,255,255,.6)}
.hbar .htabs span.on{color:#fff;border-bottom:2px solid #fff;padding-bottom:3px}
.hbar .right{display:flex;align-items:center;gap:8px}
.hbar .who{font-size:13px;opacity:.9}
.hinfo{position:absolute;left:0;bottom:0;z-index:2;padding:14px 28px 18px;text-shadow:0 1px 4px rgba(0,0,0,.6)}
.heyebrow{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.85)}
.htitle{font-size:22px;font-weight:900;margin-top:2px}
.hdesc{font-size:12px;color:rgba(255,255,255,.85);margin-top:4px;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:960px){.hero{height:190px}.htitle{font-size:18px}.hbar .htabs{display:none}}

/* progress bars */
.bars{display:flex;gap:6px;max-width:480px;margin:18px auto 0;padding:0 20px}
.bars.narrow{max-width:360px}
.bars i{flex:1;height:4px;border-radius:4px;background:var(--line)}
.bars i.on{background:var(--brand)}

/* step 1: single merged card holding the banner + form flush together */
.card1{max-width:560px;margin:20px auto;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.14);background:var(--card)}
body.dark .card1{box-shadow:0 8px 28px rgba(0,0,0,.35)}
body.haswp .card1{background:rgba(255,255,255,.92);backdrop-filter:blur(16px)}
body.dark.haswp .card1{background:rgba(30,32,40,.92)}
.box.connect{margin:0;background:none;border:none;border-radius:0;padding:28px 24px}
.box.connect h2{font-size:20px;margin:0 0 16px}
.kh{font-size:14px;font-weight:700;margin:18px 0 6px}
.kh .muted{font-weight:400}
.lbl{display:block;font-size:13px;font-weight:700;margin:10px 0 4px}
.box input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--text);font:inherit;font-size:14px}
.box input:focus{outline:2px solid var(--brand);outline-offset:-1px}
.kl{font-size:12px;margin:4px 0 0}
.kl a{color:var(--link)}
.status{font-size:13px;margin:8px 0;min-height:20px;color:var(--green)}.status.bad{color:#d44}

/* step 1: full-bleed hero with wallpaper + floating glass card */
.step1{position:relative;min-height:100vh;overflow:hidden;background-size:cover;background-position:center;display:flex;flex-direction:column}
.step1::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,12,20,.78) 0%,rgba(8,12,20,.5) 30%,rgba(8,12,20,.08) 52%,rgba(8,12,20,.18) 100%),linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 72%,rgba(0,0,0,.22) 100%)}
.step1 .s1corner{position:absolute;top:16px;right:20px;z-index:3}
.step1 .s1brand{position:absolute;left:109px;top:129px;z-index:2;display:flex;align-items:center;gap:10px}
.step1 .s1brand .logo{font-size:52px;font-weight:900;line-height:1;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.step1 .s1ver{display:inline-block;font-size:13px;font-weight:800;padding:3px 8px;border-radius:5px;background:#e0393e;color:#fff}
.step1 .s1headline{position:absolute;left:114px;top:204px;width:400px;z-index:2;font-size:24px;font-weight:700;line-height:1.3;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.step1 .s1headline u{text-decoration:none;font-weight:900}
.step1 .s1card{position:absolute;left:129px;top:285px;z-index:2;width:293px;background:rgba(255,255,255,.98);border-radius:14px;padding:24px 26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.45);color:#2b2f36}
body.dark .step1 .s1card{background:rgba(26,28,36,.96);color:var(--text)}
.step1 .s1card .box.connect{margin:0;padding:0;background:none;border:none;border-radius:0}
.s1in{width:100%;height:31px;padding:9px 11px;border-radius:8px;border:1px solid var(--line);background:var(--field);color:var(--text);font-size:15px;font-family:inherit;box-sizing:border-box}
.step1 .s1foot{position:relative;z-index:2;margin-top:auto;text-align:center;padding:16px;color:rgba(255,255,255,.75);font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.5)}
@media(max-width:720px){.step1 .s1brand,.step1 .s1headline,.step1 .s1card{position:static}.step1 .s1brand,.step1 .s1headline{padding-left:20px;padding-right:20px}.step1 .s1card{width:calc(100% - 40px);margin:28px auto 0}}

/* big card wrapper for step 2 */
.bigcard{max-width:1360px;margin:20px auto;background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 2px 16px rgba(0,0,0,.06);overflow:hidden}
body.dark .bigcard{box-shadow:0 2px 16px rgba(0,0,0,.3)}
body.haswp .bigcard{background:rgba(255,255,255,.92);backdrop-filter:blur(16px)}
body.dark.haswp .bigcard{background:rgba(30,32,40,.92)}

/* three-column grid */
.grid3{display:grid;grid-template-columns:260px 1fr 280px;min-height:520px}
@media(max-width:960px){.grid3{grid-template-columns:1fr;min-height:auto}
.lpanel{border-right:none!important;border-bottom:1px solid var(--line)}
.rpanel{border-left:none!important;border-top:1px solid var(--line)}}
.lpanel{border-right:1px solid var(--line);padding:18px 16px;display:flex;flex-direction:column;gap:16px}
.cpanel{padding:18px 20px;min-width:0;overflow-y:auto;max-height:620px}
@media(max-width:960px){.cpanel{max-height:none}}
.rpanel{border-left:1px solid var(--line);padding:18px 16px;display:flex;flex-direction:column;gap:14px}

/* nav tabs in left panel */
.navtabs{display:flex;flex-direction:column;gap:4px}
.navbtn{display:block;width:100%;text-align:left;padding:10px 12px;border:none;border-radius:10px;background:none;font:700 14px Lato,sans-serif;color:var(--muted);cursor:pointer;transition:background .12s,color .12s}
.navbtn:hover{background:var(--field)}
.navbtn.on{background:var(--brand);color:#fff}

/* trending cards */
.trending{margin-top:8px}
.trending .sh{font-size:13px;margin:0 0 10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
.lcard{display:flex;flex-direction:column;gap:6px;padding:8px 6px;border-radius:10px;cursor:pointer;transition:background .12s}
.lcard:hover{background:var(--field)}
.lfan{display:flex;margin-left:14px}
.lfan img{width:42px;height:60px;border-radius:6px;object-fit:cover;background:var(--field);margin-left:-14px;border:2px solid var(--card);box-shadow:0 1px 4px rgba(0,0,0,.18)}
.lname{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lmeta{display:flex;gap:10px;font-size:11px;color:var(--muted)}
.lmeta span{display:inline-flex;align-items:center;gap:4px}
.tsm{font-size:12px;padding:8px 0}

/* unified search bar */
.usearch{position:relative;margin-bottom:16px}
.uqi{width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:var(--field);color:var(--text);font:inherit;font-size:14px}
.uqi:focus{outline:2px solid var(--brand);outline-offset:-1px}
.udrop{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:60;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.14);max-height:360px;overflow-y:auto;padding:6px}
.udrop .usec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);padding:8px 10px 4px}
.udrop .urow{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .1s}
.udrop .urow:hover{background:var(--field)}
.udrop .urow.added,.udrop .urow.added:hover{background:color-mix(in srgb,var(--green) 18%,transparent)}
.udrop .urow img{width:36px;height:52px;border-radius:6px;object-fit:cover;background:var(--field);flex-shrink:0}
.udrop .urow .um{min-width:0}
.udrop .urow .un{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.udrop .urow .un .pnative{font-weight:400;color:var(--muted)}
.udrop .urow .ut{font-size:11px;color:var(--muted)}
.udrop .urow .ut i{font-style:normal}
.udrop .umsg{font-size:13px;color:var(--muted);padding:10px;text-align:center}
.uhov{position:fixed;z-index:200;width:300px;max-width:88vw;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);padding:14px;display:flex;gap:12px;pointer-events:none}
.uhov img{width:84px;height:120px;border-radius:8px;object-fit:cover;background:var(--field);flex-shrink:0}
.uhov .uhov-body{flex:1;min-width:0;font-size:13px;line-height:1.5;color:var(--text)}
.uhov .uhov-body b{display:block;font-size:14px;margin-bottom:6px}
.uhov .uhov-body .muted{color:var(--muted);font-weight:400}
.uhov .uhov-stat{margin:3px 0}
.uhov .uhov-msg{color:var(--muted);font-style:italic}
.uhov .uhov-body a{color:var(--link);pointer-events:auto}

/* discover step (between Get Started and the main app) */
.discover{position:relative;min-height:100vh;overflow:hidden;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;padding:20px}
.discover::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,12,20,.78) 0%,rgba(8,12,20,.5) 30%,rgba(8,12,20,.08) 52%,rgba(8,12,20,.18) 100%),linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 72%,rgba(0,0,0,.22) 100%)}
.dcard{position:relative;z-index:2;width:100%;max-width:900px;background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden}
.dischead{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--line);flex-wrap:wrap;gap:10px}
.disbrand{font:900 18px Lato,sans-serif;color:var(--brand)}
.distabs{display:flex;gap:8px}
.distabs button{padding:8px 16px;border:none;border-radius:8px;background:none;font:700 13px Lato,sans-serif;color:var(--muted);cursor:pointer}
.distabs button.on{background:var(--brand);color:#fff}
.disbody{padding:20px 24px;min-height:340px}
.dishint{font-size:13px;color:var(--muted);margin:0 0 14px}
.dischiplabel{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin:0 0 8px}
.dischips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.dischip{display:flex;align-items:center;gap:6px;padding:5px 10px 5px 5px;border:1px solid var(--line);border-radius:999px;background:var(--field);cursor:pointer;font-size:12px;font-weight:700;color:var(--text)}
.dischip img{width:22px;height:22px;border-radius:999px;object-fit:cover;background:var(--card)}
.disfoot{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-top:1px solid var(--line)}
.dlist{max-height:380px;overflow-y:auto}
.dlist .usec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);padding:8px 2px 4px;display:flex;justify-content:space-between;align-items:center}
.dlist .usec button{font-size:11px;font-weight:800;text-transform:none;letter-spacing:0;color:var(--link);background:none;border:none;cursor:pointer;padding:0}
.dlist .urow{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:8px;cursor:pointer;transition:background .1s}
.dlist .urow:hover{background:var(--field)}
.dlist .urow.added,.dlist .urow.added:hover{background:color-mix(in srgb,var(--green) 18%,transparent)}
.dlist .urow img{width:36px;height:52px;border-radius:6px;object-fit:cover;background:var(--field);flex-shrink:0}
.dlist .urow .um{min-width:0}
.dlist .urow .un{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dlist .urow .ut{font-size:11px;color:var(--muted)}
.dlist .urow .ut i{font-style:normal}
.dlist .umsg{font-size:13px;color:var(--muted);padding:10px;text-align:center}
.disinput{width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:var(--field);color:var(--text);font:inherit;font-size:14px;margin-bottom:12px}
.dissearch{position:relative;margin-bottom:14px}
.dissearch .dsicon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);display:flex;pointer-events:none}
.dissearch .dsinput{margin-bottom:0;padding-left:36px}

/* catalogs */
.cath{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.cath b{font-size:14px}.cath .muted{font-size:12px}
#rows{max-height:420px;overflow-y:auto}
.row{display:flex;align-items:center;gap:8px;padding:10px 8px;border-bottom:1px solid var(--line);transition:opacity .15s}
.row.off{opacity:.45}
.row .grip{cursor:grab;color:var(--muted);font-size:16px;user-select:none;line-height:1;padding:0 2px}
.row .rt{flex:1;min-width:0}
.row .rn{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .x{background:none;border:none;font-size:18px;color:var(--muted);cursor:pointer;padding:0 4px;line-height:1}
.row .x:hover{color:#d44}
.row.held{background:var(--field);border-radius:8px}
#rows.dragging .row{cursor:grabbing}
.empty{text-align:center;padding:24px 0;font-size:13px}
.sw{position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0}
.sw input{opacity:0;width:0;height:0;position:absolute}
.sw span{position:absolute;inset:0;background:var(--line);border-radius:22px;transition:background .2s;cursor:pointer}
.sw span::before{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .2s}
.sw input:checked+span{background:var(--green)}
.sw input:checked+span::before{transform:translateX(16px)}

/* display options */
.opt{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.opt .t{font-size:14px;font-weight:700}
.opt .d{font-size:12px;color:var(--muted);margin-top:2px}
.seg{display:flex;gap:6px;padding:8px 0 4px}
.seg button{padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);font:600 12px Lato,sans-serif;color:var(--text);cursor:pointer}
.seg button.on{background:var(--brand);color:#fff;border-color:var(--brand)}
.seg button small{display:block;font-size:10px;font-weight:400;color:var(--muted)}
.seg button.on small{color:rgba(255,255,255,.7)}

/* quick lists */
.qa{margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.qal{font-size:12px;margin-bottom:6px}
.qc{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.qc button{padding:4px 10px;border:1px solid var(--line);border-radius:14px;background:var(--field);font:600 11px Lato,sans-serif;color:var(--muted);cursor:pointer}
.qc button.on{background:var(--brand);color:#fff;border-color:var(--brand)}
.qb{display:flex;flex-wrap:wrap;gap:6px}
.qb button{padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);font:700 12px Lato,sans-serif;color:var(--brand);cursor:pointer}
.qb button:hover{background:var(--field)}

/* summary tiles */
.sh{font-size:14px;font-weight:800;margin:0 0 8px}
.tiles{display:flex;gap:8px;margin-bottom:10px}
.tile{flex:1;text-align:center;padding:8px 4px;border-radius:10px;background:var(--field);border:1px solid var(--line)}
.tile.dim{opacity:.5}
.tile b{display:block;font-size:18px}
.tile span{font-size:11px;color:var(--muted)}
.pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.pills span{padding:4px 10px;font-size:12px;font-weight:700;border-radius:20px;background:var(--field);border:1px solid var(--line)}

.uback{color:var(--muted);font-weight:700;font-size:12px}
.order{margin-top:4px}.order ol{margin:0 0 10px;padding-left:20px;font-size:13px}.order li{padding:3px 0;overflow-wrap:anywhere}.order li.dim{color:var(--muted)}

/* generate bar */
.gobar{margin-top:auto;padding-top:10px}
.gobar .primary{width:100%;padding:14px;font-size:16px}
.gobar .status{margin:6px 0 0}
.rpanel .link{display:block;text-align:center;font-size:13px;margin-top:6px;color:var(--muted)}

/* footer */
.foot{text-align:center;font-size:12px;color:var(--muted);padding:16px 20px 24px}
body.haswp .foot{color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.85)}

/* wallpaper menu */
.wpw{position:relative;display:inline-block}
.wpm{position:absolute;right:0;top:calc(100% + 6px);z-index:50;min-width:176px;background:var(--card);color:var(--text);text-shadow:none;border:1px solid var(--line);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);padding:4px}
.wpm button{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:none;color:inherit;font:inherit;font-size:13px;border-radius:6px;cursor:pointer}
.wpm button:hover{background:#d9f2d9;color:#1d5c1d}

/* step 3 done */
.done{max-width:640px;margin:30px auto 10px;text-align:center}
.done .ck{width:92px;height:92px;margin:0 auto 12px;display:block;border-radius:50%;box-shadow:0 0 0 1px var(--line),0 3px 12px rgba(0,0,0,.22)}
.done h2{font-size:34px;line-height:1.15;margin:0;font-weight:900;color:var(--text)}
.done .cs{color:var(--muted);margin:6px 0 20px}
.dcard{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;text-align:left}
.dcard .ib{display:flex;gap:10px;align-items:stretch}
.dcard .ib .btn{flex:1;margin:0;padding:14px;box-sizing:border-box}
.dcard .ghost{background:var(--field);color:var(--text);border:1px solid var(--line)}
.dl{font-size:13px;color:var(--muted);margin:16px 0 6px}
.dr{display:flex;gap:8px}
.dr input{flex:1;min-width:0;padding:11px 12px;border-radius:8px;border:1px solid var(--line);background:var(--field);color:var(--text);font:inherit;font-size:13px}
.dbtn{background:var(--card);color:var(--text);border:1px solid var(--line);padding:10px 16px;border-radius:8px;cursor:pointer}
.dlk{display:flex;gap:22px;justify-content:center;margin-top:16px;font-size:14px}
.dlk a{color:var(--muted)}
body.dark .done h2{color:#fff}
body.dark .done .cs,body.dark .dlk a{color:#b9bfca}
body.haswp .foot,body.haswp .done h2,body.haswp .done .cs,body.haswp .dlk a{color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.85)}
</style>`;

  // --- data helpers ---
  function S(c, m, p) {
    const f = s(c);
    f && ((f.textContent = m), (f.className = "status" + (p ? " bad" : "")));
  }
  async function yt(c) {
    return (await fetch(c)).json();
  }
  function et(c) {
    let m = 0;
    for (const p of c) {
      const f = p.types.length > 1 ? "all" : p.types[0];
      o.rows.some((y) => y.id === p.id) ||
        (o.rows.push({
          id: p.id,
          t: f,
          name: p.name,
          both: !1,
          kind: p.kind,
          on: p.on !== !1,
        }),
          m++);
    }
    return m;
  }
  function nt(c, m) {
    if (m < 0 || m >= o.rows.length || c === m) return;
    const [p] = o.rows.splice(c, 1);
    o.rows.splice(m, 0, p);
  }
  // universal list-naming standard: "{author}'s {title} list", matching
  // the server's full-resolve naming (yl()) so every entry path - trending
  // cards, the drama popular-lists dropdown, and search's own list rows -
  // produces the same name. No author known -> bare title, no suffix.
  function nameList(title, author) {
    const b = author ? author + "'s " + title : title;
    return /\blist$/i.test(b) ? b : b + " list";
  }

  // --- v3 API calls ---
  async function fetchTrending() {
    try {
      LData = await yt("/api/trendinglists");
      const el = s("app").querySelector(".trending");
      if (el) el.outerHTML = trendingSection();
      bindTrending();
    } catch {}
  }
  // fetches MDL's own currently-featured list (whatever MDL is spotlighting
  // on mydramalist.com/list right now) to drive the step-2 hero header.
  async function fetchFeatured() {
    try {
      FData = await yt("/api/featured");
      const el = s("app").querySelector(".hero");
      if (el) el.outerHTML = heroHeader();
      bindHero();
    } catch {}
  }
  async function fetchSearch(q) {
    try {
      return await yt("/api/search?q=" + encodeURIComponent(q));
    } catch {
      return { dramas: [], people: [] };
    }
  }
  async function fetchDramaLists(slug) {
    try {
      return await yt("/api/dramalists?slug=" + encodeURIComponent(slug));
    } catch {
      return { lists: [] };
    }
  }

  // --- v3 hover preview (drama stats / person bio, desktop search rows only) ---
  function hideHoverCard() {
    clearTimeout(HTm);
    HRow = null;
    const el = s("uhov");
    if (el) el.remove();
  }
  function positionHoverCard(el, row) {
    const r = row.getBoundingClientRect(),
      drop = s("udrop"),
      dr = drop && !drop.hidden ? drop.getBoundingClientRect() : r,
      w = el.offsetWidth || 300,
      h = el.offsetHeight || 140,
      gap = 10;
    let left = dr.right + gap;
    if (left + w > innerWidth - 8) left = dr.left - w - gap;
    if (left < 8) left = Math.max(8, Math.min(innerWidth - w - 8, r.left));
    let top = r.top;
    if (top + h > innerHeight - 8) top = innerHeight - h - 8;
    if (top < 8) top = 8;
    el.style.left = left + "px";
    el.style.top = top + "px";
  }
  function openHoverCard(row, html) {
    let el = s("uhov");
    if (!el) {
      el = document.createElement("div");
      el.id = "uhov";
      el.className = "uhov";
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    positionHoverCard(el, row);
  }
  function dramaHoverHTML(row, d) {
    const img = row.querySelector("img"),
      pic = img ? '<img src="' + a(img.src) + '" alt="">' : "",
      head = "<b>" + a(row.dataset.dtitle || "") + "</b>";
    if (!d) return '<div class="uhov-body">' + head + '<div class="uhov-msg">Statistics unavailable</div></div>' + pic;
    const stats = [
      d.score != null
        ? "Rating: " + d.score + "/10 from " + (d.users || 0).toLocaleString() + " users"
        : "",
      d.watchers != null ? "# of Watchers: " + d.watchers.toLocaleString() : "",
      d.reviews != null ? "Reviews: " + d.reviews.toLocaleString() + " users" : "",
    ]
      .filter(Boolean)
      .map((x) => '<div class="uhov-stat">' + x + "</div>")
      .join("");
    return '<div class="uhov-body">' + head +
      (stats || '<div class="uhov-msg">No statistics available</div>') +
      "</div>" + pic;
  }
  function personHoverHTML(row, summary, loading) {
    const img = row.querySelector("img"),
      pic = img ? '<img src="' + a(img.src) + '" alt="">' : "",
      name = a(row.dataset.pname || ""),
      kind = a(row.dataset.kind || ""),
      head = "<b>" + name + (kind ? ' <span class="muted">(' + kind + ")</span>" : "") + "</b>",
      body = loading
        ? '<div class="uhov-msg">Summarizing bio…</div>'
        : summary
          ? '<div class="uhov-stat">' + a(summary) + "</div>"
          : '<div class="uhov-msg">No biography available</div>';
    return '<div class="uhov-body">' + head + body + "</div>" + pic;
  }
  const LTV =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/></svg>';
  const LHT =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  function listHoverHTML(row, meta, loading) {
    const title = a(row.dataset.ltitle || ""),
      titles = row.dataset.ltitles || "",
      loves = row.dataset.lloves || "",
      head = "<b>" + title + "</b>",
      who = loading
        ? '<div class="uhov-msg">Loading list info…</div>'
        : meta && meta.author
          ? '<div class="uhov-stat">Created by: ' + a(meta.author) +
            (meta.date ? " on " + a(meta.date) : "") + "</div>"
          : '<div class="uhov-msg">Creator info unavailable</div>',
      counts = titles || loves
        ? '<div class="uhov-stat">' +
          (titles ? LTV + " " + a(titles) + " Titles" : "") +
          (titles && loves ? "&nbsp;&nbsp;" : "") +
          (loves ? LHT + " " + a(loves) : "") +
          "</div>"
        : "";
    return '<div class="uhov-body">' + head + who + counts + "</div>";
  }
  function contributorHoverHTML(row, stats, loading) {
    const img = row.querySelector("img"),
      pic = img ? '<img src="' + a(img.src) + '" alt="">' : "",
      name = a(row.dataset.cname || row.dataset.contributor || ""),
      head = "<b>" + name + "</b>",
      body = loading
        ? '<div class="uhov-msg">Loading profile…</div>'
        : stats
          ? '<div class="uhov-stat">' + a(stats.points || "0") + " contribution points</div>" +
            '<div class="uhov-stat">' + a(stats.followers || "0") + " followers" +
            (stats.joined ? " &middot; joined " + a(stats.joined) : "") + "</div>" +
            (stats.location ? '<div class="uhov-stat">' + a(stats.location) + "</div>" : "")
          : '<div class="uhov-msg">Profile unavailable</div>';
    return '<div class="uhov-body">' + head + body + "</div>" + pic;
  }
  async function showHoverCard(row) {
    if (!HOVER_OK || HRow !== row) return;
    if (row.dataset.contributor) {
      const key = "c:" + row.dataset.contributor;
      openHoverCard(row, contributorHoverHTML(row, null, !0));
      if (!(key in HCache)) {
        try {
          HCache[key] = await yt("/api/profilestats?u=" + encodeURIComponent(row.dataset.contributor));
        } catch {
          HCache[key] = null;
        }
      }
      if (HRow !== row) return;
      openHoverCard(row, contributorHoverHTML(row, HCache[key], !1));
    } else if (row.dataset.list) {
      const key = "l:" + row.dataset.list;
      openHoverCard(row, listHoverHTML(row, null, !0));
      if (!(key in HCache)) {
        try {
          HCache[key] = await yt("/api/listmeta?id=" + encodeURIComponent(row.dataset.list));
        } catch {
          HCache[key] = null;
        }
      }
      if (HRow !== row) return;
      openHoverCard(row, listHoverHTML(row, HCache[key], !1));
    } else if (row.dataset.slug) {
      const key = "d:" + row.dataset.slug;
      openHoverCard(
        row,
        '<div class="uhov-body"><b>' + a(row.dataset.dtitle || "") +
          '</b><div class="uhov-msg">Loading statistics…</div></div>' +
          (row.querySelector("img") ? '<img src="' + a(row.querySelector("img").src) + '" alt="">' : ""),
      );
      if (!(key in HCache)) {
        try {
          HCache[key] = await yt("/api/dramastats?slug=" + encodeURIComponent(row.dataset.slug));
        } catch {
          HCache[key] = null;
        }
      }
      if (HRow !== row) return;
      openHoverCard(row, dramaHoverHTML(row, HCache[key]));
    } else if (row.dataset.person) {
      const key = "p:" + row.dataset.person;
      openHoverCard(row, personHoverHTML(row, null, !0));
      if (!(key in HCache)) {
        try {
          const r = await yt("/api/biosum?id=" + encodeURIComponent(row.dataset.person));
          HCache[key] = r.summary || "";
        } catch {
          HCache[key] = "";
        }
      }
      if (HRow !== row) return;
      openHoverCard(row, personHoverHTML(row, HCache[key], !1));
    }
  }
  function updateSummary() {
    const el = s("sum");
    if (el) el.innerHTML = summaryTiles();
    i();
  }

  // --- unified search dropdown logic ---
  let searchTimer = 0;
  function bindUnifiedSearch() {
    const inp = s("uq"),
      drop = s("udrop");
    if (!inp || !drop) return;
    inp.oninput = () => {
      clearTimeout(searchTimer);
      const q = inp.value.trim();
      SQ = q;
      if (!q || q.length < 2) {
        drop.hidden = !0;
        hideHoverCard();
        return;
      }
      // check if pasted MDL link
      if (/^https?:\/\/(www\.)?mydramalist\.com\//i.test(q)) {
        drop.hidden = !0;
        addByLink(q);
        return;
      }
      searchTimer = setTimeout(async () => {
        drop.innerHTML = '<div class="umsg">Searching...</div>';
        drop.hidden = !1;
        const [res, contribs] = await Promise.all([fetchSearch(q), getContributors()]);
        const ql = q.toLowerCase();
        res.contributors = (contribs || [])
          .filter((c) => c.user.toLowerCase().includes(ql) || (c.name || "").toLowerCase().includes(ql))
          .slice(0, 5);
        renderDropdown(res, drop);
      }, 350);
    };
    inp.onfocus = () => {
      if (SRes && inp.value.trim().length >= 2) drop.hidden = !1;
    };
  }
  function renderDropdown(res, drop) {
    hideHoverCard();
    SRes = res;
    let html = "";
    // Contributors first: rare matches (a handle search), so when they do
    // show up they should be the first thing seen, above People/Dramas.
    if (res.contributors && res.contributors.length) {
      html += '<div class="usec">Contributors</div>';
      html += res.contributors
        .map(
          (c) =>
            '<div class="urow" data-contributor="' +
            a(c.user) +
            '" data-cname="' +
            a(c.name || c.user) +
            '">' +
            (c.avatar
              ? '<img src="' + a(c.avatar) + '" alt="" loading="lazy">'
              : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field)"></div>') +
            '<div class="um"><div class="un">' +
            a(c.name || c.user) +
            '</div><div class="ut"><i>@' +
            a(c.user) +
            "</i></div></div></div>",
        )
        .join("");
    }
    // People first: it's usually 1-5 rows, so it stays visible without
    // scrolling past a wall of drama results when someone searches a name.
    if (res.people && res.people.length) {
      html += '<div class="usec">People</div>';
      html += res.people
        .map(
          (p) =>
            '<div class="urow person" data-person="' +
            a(p.id) +
            '" data-pname="' +
            a(p.name) +
            '" data-kind="' +
            a(p.kind || "Actor") +
            '">' +
            (p.image
              ? '<img src="' + a(p.image) + '" alt="" loading="lazy">'
              : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field)"></div>') +
            '<div class="um"><div class="un">' +
            a(p.name) +
            (p.native ? ' <span class="pnative">(' + a(p.native) + ')</span>' : "") +
            "</div></div></div>",
        )
        .join("");
    }
    if (res.dramas && res.dramas.length) {
      html += '<div class="usec">Dramas</div>';
      html += res.dramas
        .map(
          (d) =>
            '<div class="urow" data-slug="' +
            a(d.slug) +
            '" data-dtitle="' +
            a(d.title) +
            '" data-type="' +
            a(d.type || "") +
            '" data-year="' +
            (d.year || "") +
            '">' +
            (d.image
              ? '<img src="' + a(d.image) + '" alt="" loading="lazy">'
              : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field)"></div>') +
            '<div class="um"><div class="un">' +
            a(d.title) +
            '</div><div class="ut">' +
            (d.type ? "<i>" + a(d.type) + "</i>" : "") +
            (d.year ? " <i>" + d.year + "</i>" : "") +
            "</div></div></div>",
        )
        .join("");
    }
    if (res.lists && res.lists.length) {
      html += '<div class="usec">Lists</div>';
      html += res.lists
        .map(
          (d) =>
            '<div class="urow" data-list="' +
            a(d.id) +
            '" data-ltitle="' +
            a(d.title) +
            '" data-ltitles="' +
            a(d.titles || "") +
            '" data-lloves="' +
            a(d.loves || "") +
            '">' +
            (d.image
              ? '<img src="' + a(d.image) + '" alt="" loading="lazy">'
              : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field)"></div>') +
            '<div class="um"><div class="un">' +
            a(d.title) +
            '</div><div class="ut">' +
            (d.titles ? "<i>" + d.titles + " titles</i>" : "") +
            (d.loves ? " <i>" + d.loves + " loves</i>" : "") +
            "</div></div></div>",
        )
        .join("");
    }
    if (!html) html = '<div class="umsg">No results found</div>';
    drop.innerHTML = html;
    drop.hidden = !1;
    // bind clicks
    for (const row of drop.querySelectorAll(".urow")) {
      row.onclick = () => {
        hideHoverCard();
        if (row.dataset.slug) {
          addDramaFromSearch(row.dataset);
        } else if (row.dataset.person) {
          addPersonFromSearch(row.dataset);
          drop.hidden = !0;
          s("uq").value = "";
          SQ = "";
        } else if (row.dataset.contributor) {
          addContributorFromSearch(row.dataset);
        } else if (row.dataset.list) {
          (async () => {
            const id = row.dataset.list,
              title = row.dataset.ltitle || "";
            let author = "";
            try {
              const meta = await yt("/api/listmeta?id=" + encodeURIComponent(id));
              author = (meta && meta.author) || "";
            } catch {}
            const y = et([
              { id, name: nameList(title, author), kind: "Community list", types: ["series", "movie"] },
            ]);
            drop.hidden = !0;
            s("uq").value = "";
            SQ = "";
            C();
            S("ast", y ? "" : "That one is already in your catalogs.", !y);
          })();
        }
      };
    }
    // hover preview: desktop-only, and only drama/actor/director search rows,
    // never already-added catalog rows (those live outside this dropdown).
    if (HOVER_OK) {
      for (
        const row of drop.querySelectorAll(
          ".urow[data-slug], .urow[data-person], .urow[data-list], .urow[data-contributor]",
        )
      ) {
        row.onmouseenter = () => {
          HRow = row;
          clearTimeout(HTm);
          HTm = setTimeout(() => showHoverCard(row), 450);
        };
        row.onmouseleave = () => {
          if (HRow === row) HRow = null;
          clearTimeout(HTm);
          hideHoverCard();
        };
      }
    }
  }

  // --- add items from search ---
  async function addByLink(url) {
    S("ast", "Checking that link…");
    try {
      const f = await yt("/api/info?url=" + encodeURIComponent(url));
      if (f.error) {
        S("ast", f.error, !0);
        return;
      }
      const y = et(f.items);
      s("uq").value = "";
      SQ = "";
      C();
      S("ast", y ? "" : "That one is already in your catalogs.", !y);
    } catch {
      S("ast", "Could not read that page right now. Try again.", !0);
    }
  }
  async function addDramaFromSearch(data) {
    // a single title isn't a catalog by itself; show its Popular Lists
    // instead, right in the same dropdown, so one click adds a list.
    const drop = s("udrop");
    if (!drop) return;
    drop.innerHTML = '<div class="umsg">Loading popular lists...</div>';
    drop.hidden = !1;
    const res = await fetchDramaLists(data.slug);
    renderListsMode(data.dtitle || data.title || "", res.lists || [], drop);
  }
  function renderListsMode(title, lists, drop) {
    let html = '<div class="urow uback" data-back="1"><div class="um"><div class="un">&larr; Back to search</div></div></div>';
    html += '<div class="usec">' +
      "Popular Lists" + (title ? " for " + a(title) : "") +
      "</div>";
    if (lists.length) {
      html += lists
        .map(
          (d) =>
            '<div class="urow" data-list="' +
            a(d.id) +
            '" data-ltitle="' +
            a(d.title) +
            '" data-ltitles="' +
            a(d.titles || "") +
            '" data-lloves="' +
            a(d.loves || "") +
            '">' +
            (d.image
              ? '<img src="' + a(d.image) + '" alt="" loading="lazy">'
              : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field)"></div>') +
            '<div class="um"><div class="un">' +
            a(d.title) +
            '</div><div class="ut">' +
            (d.titles ? "<i>" + d.titles + " titles</i>" : "") +
            (d.loves ? " <i>" + d.loves + " loves</i>" : "") +
            "</div></div></div>",
        )
        .join("");
    } else {
      html += '<div class="umsg">No popular lists found for this title.</div>';
    }
    drop.innerHTML = html;
    drop.hidden = !1;
    const back = drop.querySelector("[data-back]");
    if (back) {
      back.onclick = () => {
        if (SRes) renderDropdown(SRes, drop);
        else drop.hidden = !0;
      };
    }
    for (const row of drop.querySelectorAll(".urow[data-list]")) {
      row.onclick = async () => {
        if (row.dataset.busy) return;
        row.dataset.busy = "1";
        const id = row.dataset.list,
          title = row.dataset.ltitle || "";
        let author = "";
        try {
          const meta = await yt("/api/listmeta?id=" + encodeURIComponent(id));
          author = (meta && meta.author) || "";
        } catch {}
        const y = et([
          { id, name: nameList(title, author), kind: "Community list", types: ["series", "movie"] },
        ]);
        drop.hidden = !0;
        s("uq").value = "";
        SQ = "";
        C();
        S("ast", y ? "" : "That one is already in your catalogs.", !y);
      };
    }
    if (HOVER_OK) {
      for (const row of drop.querySelectorAll(".urow[data-list]")) {
        row.onmouseenter = () => {
          HRow = row;
          clearTimeout(HTm);
          HTm = setTimeout(() => showHoverCard(row), 450);
        };
        row.onmouseleave = () => {
          if (HRow === row) HRow = null;
          clearTimeout(HTm);
          hideHoverCard();
        };
      }
    }
  }
  function addPersonFromSearch(data) {
    // data.person is already a server-side actor/director catalog id
    // (e.g. "a.293-son-ye-jin"), not a URL fragment, so add it as a
    // catalog entry directly instead of round-tripping through a
    // fabricated mydramalist.com/people/... link. data.kind comes from
    // the search result's own bio text (director vs actor) and decides
    // whether the generated catalog pulls directing or acting credits.
    const kind = data.kind === "Director" ? "Director" : "Actor";
    const y = et([{ id: data.person, name: data.pname, kind, types: ["series", "movie"] }]);
    s("uq").value = "";
    SQ = "";
    C();
    S("ast", y ? "" : "That one is already in your catalogs.", !y);
  }

  async function addContributorFromSearch(data) {
    const user = data.contributor,
      name = data.cname || user,
      drop = s("udrop");
    if (!drop || !user) return;
    drop.innerHTML = '<div class="umsg">Loading ' + a(name) + "'s lists...</div>";
    drop.hidden = !1;
    let lists = [];
    try {
      const res = await yt("/api/userlists?u=" + encodeURIComponent(user));
      lists = (res && res.lists) || [];
    } catch {}
    renderContributorMode(user, name, lists, drop);
  }
  function renderContributorMode(user, name, lists, drop) {
    let html = '<div class="urow uback" data-back="1"><div class="um"><div class="un">&larr; Back to search</div></div></div>';
    html += '<div class="usec">Lists by ' + a(name) + "</div>";
    if (lists.length) {
      html += '<div class="urow" data-addall="1"><div class="um"><div class="un">Add all ' +
        lists.length + " lists as catalogs</div></div></div>";
      html += lists
        .map(
          (d) =>
            '<div class="urow" data-list="' +
            a(d.id) +
            '" data-ltitle="' +
            a(d.title) +
            '" data-lauthor="' +
            a(user) +
            '" data-ltitles="' +
            a(d.titles || "") +
            '" data-lloves="' +
            a(d.loves || "") +
            '">' +
            (d.image
              ? '<img src="' + a(d.image) + '" style="width:36px;height:52px;border-radius:6px;object-fit:cover;flex-shrink:0" loading="lazy">'
              : '<div style="width:36px;height:52px;border-radius:6px;background:var(--field);flex-shrink:0"></div>') +
            '<div class="um"><div class="un">' +
            a(d.title) +
            '</div><div class="ut">' +
            (d.titles ? "<i>" + d.titles + " titles</i>" : "") +
            (d.loves ? " <i>" + d.loves + " loves</i>" : "") +
            "</div></div></div>",
        )
        .join("");
    } else {
      html += '<div class="umsg">No public lists found for this user.</div>';
    }
    drop.innerHTML = html;
    drop.hidden = !1;
    const back = drop.querySelector("[data-back]");
    if (back) {
      back.onclick = () => {
        if (SRes) renderDropdown(SRes, drop);
        else drop.hidden = !0;
      };
    }
    const addAll = drop.querySelector("[data-addall]");
    if (addAll) {
      addAll.onclick = () => {
        if (addAll.dataset.busy) return;
        addAll.dataset.busy = "1";
        const items = lists.map((d) => ({
          id: d.id,
          name: nameList(d.title, user),
          kind: "Community list",
          types: ["series", "movie"],
        }));
        const y = et(items);
        drop.hidden = !0;
        s("uq").value = "";
        SQ = "";
        C();
        S("ast", y ? "" : "Those are already in your catalogs.", !y);
      };
    }
    for (const row of drop.querySelectorAll(".urow[data-list]")) {
      row.onclick = () => {
        if (row.dataset.busy) return;
        row.dataset.busy = "1";
        const id = row.dataset.list,
          title = row.dataset.ltitle || "",
          author = row.dataset.lauthor || "";
        const y = et([
          { id, name: nameList(title, author), kind: "Community list", types: ["series", "movie"] },
        ]);
        drop.hidden = !0;
        s("uq").value = "";
        SQ = "";
        C();
        S("ast", y ? "" : "That one is already in your catalogs.", !y);
      };
    }
  }

  // --- quick list chips (preset explore pages) ---
  function bindQuickAdd() {
    for (const b of document.querySelectorAll("[data-qc]")) {
      b.onclick = () => {
        o.qc = b.dataset.qc;
        C();
      };
    }
    for (const b of document.querySelectorAll("[data-qb]")) {
      b.onclick = () => {
        const k = QK[+b.dataset.qb],
          qv = o.qc || "",
          nm = (QC.find((z) => z[0] === qv) || ["", ""])[1],
          P = "search?adv=titles&" + k[1] + (qv ? "&co=" + qv : ""),
          I = "p." +
            btoa(unescape(encodeURIComponent(P)))
              .split("+")
              .join("-")
              .split("/")
              .join("_")
              .replace(/=+$/, ""),
          added = et([
            {
              id: I,
              name: "MyDramaList's " + k[0] + (qv ? " (" + nm + ")" : ""),
              kind: "Explore page",
              types: [k[2]],
            },
          ]);
        C();
        S("ast", added ? "" : "That one is already in your catalogs.", !added);
      };
    }
  }

  // --- trending click handler: instant add, no preview screen ---
  function bindTrending() {
    for (const card of document.querySelectorAll(".lcard")) {
      card.onclick = async () => {
        if (card.dataset.busy) return;
        card.dataset.busy = "1";
        const id = card.dataset.lid,
          title = card.dataset.ltitle || "";
        let author = "";
        try {
          const meta = await yt("/api/listmeta?id=" + encodeURIComponent(id));
          author = (meta && meta.author) || "";
        } catch {}
        delete card.dataset.busy;
        const y = et([
          { id, name: nameList(title, author), kind: "Community list", types: ["series", "movie"] },
        ]);
        C();
        S("ast", y ? "" : "That one is already in your catalogs.", !y);
      };
    }
  }

  // --- hero click handler: instant add, same as trending cards ---
  function bindHero() {
    const hero = document.querySelector(".hero[data-fid]");
    if (!hero) return;
    hero.onclick = async (e) => {
      if (e.target.closest(".tg, .wpw, .htabs")) return;
      if (hero.dataset.busy) return;
      hero.dataset.busy = "1";
      const id = hero.dataset.fid,
        title = hero.dataset.ftitle || "";
      let author = "";
      try {
        const meta = await yt("/api/listmeta?id=" + encodeURIComponent(id));
        author = (meta && meta.author) || "";
      } catch {}
      delete hero.dataset.busy;
      const y = et([
        {
          id,
          name: nameList(title, author),
          kind: "Community list",
          types: ["series", "movie"],
        },
      ]);
      C();
      S("ast", y ? "" : "That one is already in your catalogs.", !y);
    };
  }

  // --- event bindings ---
  function ee() {
    WBind();
    if (o.step === 2 && !o.o.dv) {
      bindDiscover();
      return;
    }
    s("dark").onclick = () => {
      g = !g;
      try {
        localStorage.setItem("ydl_dark", g ? "1" : "");
      } catch {}
      document.body.classList.toggle("dark", g);
    };
    if (o.step === 1) {
      if (o.s1 === "landing") {
        s("getstarted").onclick = () => {
          o.s1 = "keys";
          C();
        };
        return;
      }
      const toDiscover = () => {
        ((o.user = ""),
          (o.o.h = !1),
          (o.rows = o.rows.filter((p) => !/^(d\.\d\.|r\.)/.test(p.id))),
          (o.step = 2),
          (o.tab = "cat"),
          C());
      };
      if (o.s1 === "keys") {
        const c = async () => {
          const K1 = s("k1").value.trim(),
            K2 = s("k2").value.trim();
          if ((K1 || K2) && (!K1 || !K2)) {
            return S("cst", "Both API keys are required.", !0);
          }
          if (K1 && K2) {
            S("cst", "Checking your keys…");
            let r;
            try {
              r = await fetch("/api/keys", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ t: K1, m: K2 }),
              }).then((z) => z.json());
            } catch {
              return S(
                "cst",
                "Could not check your keys right now. Try again.",
                !0,
              );
            }
            if (r.error) return S("cst", r.error, !0);
            (o.o.tk !== K1 && ((VData = null), (VSlug = "")),
              (o.o.tk = K1),
              (o.o.mk = K2),
              (o.o.kt = r.k));
          }
          o.s1 = "connect";
          C();
        };
        s("cont").onclick = c;
        for (const q of ["k1", "k2"]) {
          s(q).onkeydown = (z) => {
            z.key === "Enter" && c();
          };
        }
        const s1skip = s("s1skip");
        if (s1skip) {
          s1skip.onclick = (ev) => {
            ev.preventDefault();
            toDiscover();
          };
        }
        return;
      }
      // o.s1 === "connect"
      const c = async () => {
        const m = s("un").value.trim();
        if (!m) {
          toDiscover();
          return;
        }
        S("cst", "Looking up " + m + "…");
        try {
          const p = await yt("/api/user?u=" + encodeURIComponent(m));
          if (p.error) return S("cst", p.error, !0);
          ((o.user = p.user),
            (o.rows = o.rows.filter((A) => !/^(d\.\d\.|r\.)/.test(A.id))));
          const f = p.items.filter((A) => A.kind !== "Your list"),
            y = p.items.filter((A) => A.kind === "Your list"),
            k = o.rows;
          ((o.rows = []),
            et(f),
            (o.rows = o.rows.concat(k)),
            et(y),
            (o.step = 2),
            (o.tab = "cat"),
            C());
        } catch {
          S("cst", "Could not reach MyDramaList. Try again.", !0);
        }
      };
      s("cont").onclick = c;
      s("un").onkeydown = (z) => {
        z.key === "Enter" && c();
      };
      return;
    }
    if (o.step === 3) {
      P3B();
      return;
    }
    // step 2 bindings
    for (const c of document.querySelectorAll("[data-tab]")) {
      c.onclick = () => {
        o.tab = c.dataset.tab;
        C();
      };
    }
    bindUnifiedSearch();
    bindTrending();
    bindHero();
    if (o.tab === "cat") bindCatalogs();
    else bindDisplay();
    bindGenerate();
  }

  function bindCatalogs() {
    bindQuickAdd();
    const m = s("rows");
    if (!m) return;
    m.onclick = (p) => {
      const f = p.target.closest("button");
      if (!f) return;
      if (f.dataset.x) {
        o.rows.splice(+f.dataset.x, 1);
        C();
      }
    };
    m.onchange = (p) => {
      const H = p.target.id.match(/^hr(\d+)$/);
      if (H) {
        o.rows[+H[1]].so = p.target.checked ? "h" : "";
        C();
        return;
      }
      const f = p.target.id.match(/^on(\d+)$/);
      f &&
        ((o.rows[+f[1]].on = p.target.checked),
          p.target.closest(".row").classList.toggle("off", !p.target.checked),
          updateSummary());
    };
    // drag to reorder
    m.onpointerdown = (p) => {
      const f = p.target.closest(".grip");
      if (!f) return;
      p.preventDefault();
      let y = +f.closest(".row").dataset.i;
      m.classList.add("dragging");
      const k = () =>
        m.querySelectorAll(".row").forEach((M) =>
          M.classList.toggle("held", +M.dataset.i === y)
        );
      k();
      const A = (M) => {
        const wt = document.elementFromPoint(M.clientX, M.clientY),
          vt = wt && wt.closest("#rows .row");
        if (!vt) return;
        const st = +vt.dataset.i;
        if (st === y) return;
        nt(y, st);
        y = st;
        // re-render rows inline
        const tmp = catalogsPanel();
        const frag = document.createElement("div");
        frag.innerHTML = tmp;
        const newRows = frag.querySelector("#rows");
        if (newRows) m.innerHTML = newRows.innerHTML;
        k();
      };
      const w = () => {
        window.removeEventListener("pointermove", A);
        window.removeEventListener("pointerup", w);
        m.classList.remove("dragging");
        C();
      };
      window.addEventListener("pointermove", A);
      window.addEventListener("pointerup", w);
    };
  }

  function bindDisplay() {
    const c = o.o,
      m = (p, f, y) => {
        const k = s(p);
        k &&
          (k.onchange = () => {
            c[f] = k.checked;
            y && y();
            updateSummary();
          });
      };
    m("rev", "rev");
    m("pon", "pon", () => {
      s("rp").hidden = !c.pon;
    });
    m("ou", "u");
    m("oh", "h");
    for (const p of document.querySelectorAll(".seg button")) {
      p.onclick = () => {
        const f = c.ratings ? c.ratings.split(",") : [],
          y = f.includes(p.dataset.r)
            ? f.filter((k) => k !== p.dataset.r)
            : f.concat(p.dataset.r);
        c.ratings = d.filter((k) => y.includes(k)).join(",");
        C();
      };
    }
  }

  function bindGenerate() {
    const goBtn = s("go"),
      chuBtn = s("chu");
    if (chuBtn) {
      chuBtn.onclick = (ev) => {
        ev.preventDefault();
        o.step = 1;
        C();
      };
    }
    if (!goBtn) return;
    goBtn.onclick = () => {
      const c = o.o,
        m = o.rows.filter((w) => w.on);
      if (!m.length) return S("gst", "Add at least one catalog first.", !0);
      if (c.pon && !c.kt) {
        return S(
          "gst",
          "Add your API keys first (" + (t.editLink || "Edit API keys") + ").",
          !0,
        );
      }
      if (c.pon && !c.ratings) {
        return S(
          "gst",
          "Pick at least one rating in Display, or turn custom posters off.",
          !0,
        );
      }
      const p = {
        c: m.map((w) => {
          const e = [
            w.id,
            w.t === "all" ? "a" : w.t === "movie" ? "m" : "s",
            x({ ...w, so: "" }),
          ];
          const hr = !CL(w) && w.so === "h";
          (hr || w.kind === "Director") && e.push(hr ? 1 : 0);
          w.kind === "Director" && e.push(1);
          return e;
        }),
      };
      o.user && (p.u = o.user);
      const f = (c.u ? "u" : "") + (c.h && o.user ? "h" : "") +
        (c.rev ? "r" : "");
      f && (p.o = f);
      p.k = c.kt;
      c.pon && (p.p = { r: c.ratings });
      const y = btoa(unescape(encodeURIComponent(JSON.stringify(p))))
          .split("+")
          .join("-")
          .split("/")
          .join("_")
          .replace(/=+$/, ""),
        k = location.origin + "/c." + y + "~v" + n.split(".").join("") +
          "/manifest.json";
      o.res = {
        k: k,
        e: location.origin + "/c." + y + "~v" + n.split(".").join("") +
          "/configure",
      };
      o.step = 3;
      i();
      C();
    };
  }

  // --- hover card shouldn't float stale over a scrolled-away row ---
  addEventListener("scroll", hideHoverCard, !0);

  // --- close dropdowns on outside click ---
  document.addEventListener("click", (z) => {
    if (!z.target.closest(".usearch")) {
      const d = s("udrop");
      if (d) d.hidden = !0;
      hideHoverCard();
    }
    z.target.closest(".wpw") ||
      document.querySelectorAll(".wpm").forEach((y) => (y.hidden = !0));
  });

  // --- kick off ---
  C();
}