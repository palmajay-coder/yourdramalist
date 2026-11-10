import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";
import {recordAnalyticsBatch, validAnalytics, dayKey, shiftDay, POPULAR_PERSON, type AnalyticsMetric} from "./analyticsApi.ts";
import {weekWindow} from "./collections.ts";
import {CATEGORIES, COUNTRIES} from "./explore.ts";
import {remoteImage} from "./people.ts";

/** Counts people, not clicks, without knowing who anyone is.
 * Each request becomes a scrambled code made from the visitor's network address, browser and a random secret that is
 * replaced at the start of every month. The address is never stored, and once the month's secret is deleted a code can't
 * be linked to anyone or to the next month. The site keeps which codes chose which category on which day for 35 days,
 * so the admin page can count each person once over 7 or 30 days and see how many come back. */
export type PersonPick = {slug: string; mode: "actor" | "director"; name?: string | null; photo?: string | null};
type Db = {execute: (query: any) => Promise<any>; batch: (queries: any[]) => Promise<any[]>};
const MIN_ADDS = 3, SHOW_COUNT = 10, TOP = 5, CACHE_MS = 60 * 60 * 1000, PEOPLE_KEEP_MS = 60 * 24 * 60 * 60 * 1000, KEEP_DAYS = 35;

export function visitorAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").slice(0, 64);
}
/** Phones and tablets count as mobile; everything else as computer. */
export function deviceType(req: Request): "mobile" | "computer" {
  return /Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|Kindle|Opera Mini|IEMobile/i.test(req.headers.get("user-agent") || "") ? "mobile" : "computer";
}
/** Scopes that may be stored: people, device type, actors and directors, and every analytics category. */
export function validScope(scope: string): boolean {
  if (scope === "people" || scope === "device:mobile" || scope === "device:computer") return true;
  if (scope.startsWith("person:")) return POPULAR_PERSON.test(scope.slice(7));
  const at = scope.indexOf(":"), metric = scope.slice(0, at) as AnalyticsMetric;
  return at > 0 && ["catalog.selected", "feature.selected", "catalog.added"].includes(metric) && validAnalytics(metric, scope.slice(at + 1));
}

const cleanName = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);

export function createPopularity(deps: {db?: Db; record?: typeof recordAnalyticsBatch; now?: () => number} = {}) {
  const db = deps.db ?? (sqlite as unknown as Db), record = deps.record ?? recordAnalyticsBatch, now = deps.now ?? Date.now;
  let schema: Promise<void> | undefined, salt = {month: "", value: ""}, cache: {at: number; data: any} | null = null;
  async function ready() {
    schema ??= db.batch([
      {sql: "CREATE TABLE IF NOT EXISTS ydl_month_salt (month TEXT PRIMARY KEY, salt TEXT NOT NULL)", args: []},
      {sql: "CREATE TABLE IF NOT EXISTS ydl_visits (day TEXT NOT NULL, scope TEXT NOT NULL, visitor TEXT NOT NULL, PRIMARY KEY(day, scope, visitor))", args: []},
      {sql: "CREATE TABLE IF NOT EXISTS ydl_people_meta (slug TEXT PRIMARY KEY, name TEXT NOT NULL, photo TEXT, at INTEGER NOT NULL)", args: []},
      // The daily codes from before monthly counting are no longer needed.
      {sql: "DROP TABLE IF EXISTS ydl_daily_seen", args: []},
      {sql: "DROP TABLE IF EXISTS ydl_daily_salt", args: []},
    ]).then(() => {});
    try { await schema; } catch (error) { schema = undefined; throw error; }
  }
  async function monthSalt(month: string) {
    if (salt.month === month) return salt.value;
    const fresh = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await db.batch([
      {sql: "INSERT OR IGNORE INTO ydl_month_salt(month, salt) VALUES(?, ?)", args: [month, fresh]},
      {sql: "DELETE FROM ydl_month_salt WHERE month < ?", args: [month]},
    ]);
    const row = (await db.execute({sql: "SELECT salt FROM ydl_month_salt WHERE month = ?", args: [month]})).rows?.[0];
    salt = {month, value: String(row?.salt ?? row?.[0] ?? fresh)};
    return salt.value;
  }

  /** Marks that this person chose each scope today. Never throws: counting must not get in the way of a request. */
  async function recordVisit(req: Request, rawScopes: string[], people: PersonPick[] = []) {
    const address = visitorAddress(req);
    if (!address) return;
    try {
      await ready();
      const time = now(), day = dayKey(time), secret = await monthSalt(day.slice(0, 7));
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret + "|" + address + "|" + (req.headers.get("user-agent") || "").slice(0, 300)));
      const visitor = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
      const picks = new Map<string, PersonPick>();
      for (const p of people) if (POPULAR_PERSON.test(p.slug + ":" + p.mode)) picks.set(p.slug + ":" + p.mode, p);
      const scopes = [...new Set([...rawScopes, ...[...picks.keys()].map((k) => "person:" + k)])].filter(validScope);
      if (!scopes.length) return;
      // Weekly picks keep a long-term count of people per row per week for the rotation view.
      const weekly = scopes.filter((s) => s.startsWith("catalog.selected:weekly:")), week = weekWindow(time).week;
      const seenThisWeek = new Set<string>(weekly.length ? ((await db.execute({sql: `SELECT DISTINCT scope FROM ydl_visits WHERE visitor = ? AND day >= ? AND scope IN (${weekly.map(() => "?").join(",")})`, args: [visitor, week, ...weekly]})).rows || []).map((r: any) => String(r.scope ?? r[0])) : []);
      const results = await db.batch([
        ...scopes.map((scope) => ({sql: "INSERT OR IGNORE INTO ydl_visits(day, scope, visitor) VALUES(?, ?, ?)", args: [day, scope, visitor]})),
        {sql: "DELETE FROM ydl_visits WHERE day < ?", args: [shiftDay(day, -KEEP_DAYS)]},
      ]);
      // Popular this month keeps its once-a-day totals for each built-in catalog and actor or director.
      const metrics: Array<[AnalyticsMetric, string, number]> = [];
      scopes.forEach((scope, i) => {
        if (!(Number(results?.[i]?.rowsAffected) > 0)) return;
        if (scope.startsWith("catalog.selected:explore:")) metrics.push(["popular.catalog", scope.slice(17), 1]);
        else if (scope.startsWith("person:")) metrics.push(["popular.person", scope.slice(7), 1]);
      });
      for (const scope of weekly) if (!seenThisWeek.has(scope)) metrics.push(["weekly.people", scope.slice(17), 1]);
      if (metrics.length) await record(metrics);
      const named = [...picks.values()].filter((p) => cleanName(p.name));
      if (named.length) {
        await db.batch([
          ...named.map((p) => ({sql: "INSERT INTO ydl_people_meta(slug, name, photo, at) VALUES(?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, photo = COALESCE(excluded.photo, ydl_people_meta.photo), at = excluded.at", args: [p.slug, cleanName(p.name), remoteImage(p.photo || undefined), now()]})),
          {sql: "DELETE FROM ydl_people_meta WHERE at < ?", args: [now() - PEOPLE_KEEP_MS]},
        ]);
      }
    } catch { /* Counting is best effort. */ }
  }

  /** Called after an install link is created: the person, their device type and every category in the link. */
  function recordManifest(req: Request, scopes: string[], people: PersonPick[]) {
    return recordVisit(req, ["people", "device:" + deviceType(req), ...scopes], people);
  }

  /** People counts for the admin page. Each person counts once per range, however many days they came back. */
  async function summary() {
    await ready();
    const today = dayKey(now()), from = shiftDay(today, -29);
    const rows = ((await db.execute({sql: "SELECT day, scope, visitor FROM ydl_visits WHERE day >= ?", args: [from]})).rows || []).map((r: any) => ({day: String(r.day ?? r[0]), scope: String(r.scope ?? r[1]), visitor: String(r.visitor ?? r[2])}));
    const range = (days: number) => {
      const start = shiftDay(today, -(days - 1)), scopes = new Map<string, Set<string>>(), activeDays = new Map<string, Set<string>>();
      for (const r of rows) {
        if (r.day < start) continue;
        let set = scopes.get(r.scope); if (!set) scopes.set(r.scope, set = new Set());
        set.add(r.visitor);
        if (r.scope === "people") { let d = activeDays.get(r.visitor); if (!d) activeDays.set(r.visitor, d = new Set()); d.add(r.day); }
      }
      // Discover catalogs combine their country versions, so someone who picked two countries still counts once.
      const groups = new Map<string, Set<string>>();
      for (const [scope, set] of scopes) {
        if (!scope.startsWith("catalog.selected:")) continue;
        const parts = scope.split(":"), key = parts[1] === "weekly" ? "weekly" : parts[2];
        let group = groups.get(key); if (!group) groups.set(key, group = new Set());
        for (const v of set) group.add(v);
      }
      return {
        people: scopes.get("people")?.size || 0,
        mobile: scopes.get("device:mobile")?.size || 0,
        computer: scopes.get("device:computer")?.size || 0,
        returning: [...activeDays.values()].filter((d) => d.size > 1).length,
        scopes: Object.fromEntries([...scopes].filter(([scope]) => scope !== "people" && !scope.startsWith("device:") && !scope.startsWith("person:")).map(([scope, set]) => [scope, set.size])),
        groups: Object.fromEntries([...groups].map(([key, set]) => [key, set.size])),
      };
    };
    const daily: {day: string; people: number}[] = [];
    for (let i = 29; i >= 0; i--) { const day = shiftDay(today, -i); daily.push({day, people: rows.filter((r) => r.day === day && r.scope === "people").length}); }
    return {today: range(1), ranges: {7: range(7), 30: range(30)}, daily};
  }

  /** Top built-in catalogs and actors/directors over the last 30 days, worked out at most once an hour. */
  async function rankings() {
    if (cache && now() - cache.at < CACHE_MS) return cache.data;
    let data = {catalogs: [] as any[], people: [] as any[]};
    try {
      await ready();
      const start = shiftDay(dayKey(now()), -29);
      const rows = (await db.execute({sql: "SELECT metric, category, SUM(count) AS total FROM ydl_daily_analytics WHERE day >= ? AND metric IN ('popular.catalog', 'popular.person') GROUP BY metric, category", args: [start]})).rows || [];
      const catalogs = rows.filter((r: any) => r.metric === "popular.catalog").map((r: any) => {
        const [, id, country] = String(r.category).split(":");
        const title = CATEGORIES.find((c) => c[0] === id)?.[1], place = COUNTRIES.find((c) => c[0] === (country === "all" ? "" : country))?.[1];
        return title ? {category: id, country: country === "all" ? "" : country, label: title + (country === "all" ? "" : " · " + place), total: Number(r.total) || 0} : null;
      }).filter((c: any) => c && c.total >= MIN_ADDS).sort((a: any, b: any) => b.total - a.total).slice(0, TOP);
      // Someone who both acts and directs appears once; Add picks the filmography people chose most.
      const merged = new Map<string, {slug: string; total: number; modes: Record<string, number>}>();
      for (const r of rows.filter((r: any) => r.metric === "popular.person")) {
        const [slug, mode] = String(r.category).split(":"), entry = merged.get(slug) ?? {slug, total: 0, modes: {}};
        entry.total += Number(r.total) || 0;
        entry.modes[mode] = (entry.modes[mode] || 0) + (Number(r.total) || 0);
        merged.set(slug, entry);
      }
      const top = [...merged.values()].filter((p) => p.total >= MIN_ADDS).sort((a, b) => b.total - a.total).slice(0, TOP);
      const meta = new Map<string, any>();
      if (top.length) for (const r of (await db.execute({sql: `SELECT slug, name, photo FROM ydl_people_meta WHERE slug IN (${top.map(() => "?").join(",")})`, args: top.map((p) => p.slug)})).rows || []) meta.set(String(r.slug), r);
      const people = top.filter((p) => meta.get(p.slug)?.name).map((p) => ({slug: p.slug, mode: (p.modes.director || 0) > (p.modes.actor || 0) ? "director" : "actor", name: String(meta.get(p.slug).name), photo: remoteImage(meta.get(p.slug).photo || undefined), total: p.total}));
      // A short list looks empty, so each list appears only once at least three entries qualify.
      const shown = (list: any[]) => list.length >= 3 ? list.map(({total, ...rest}) => ({...rest, count: total >= SHOW_COUNT ? total : null})) : [];
      data = {catalogs: shown(catalogs), people: shown(people)};
    } catch { /* No rankings yet. */ }
    cache = {at: now(), data};
    return data;
  }

  async function handle(req: Request) {
    if (req.method !== "GET") return Response.json({error: "Method not allowed"}, {status: 405});
    return Response.json(await rankings(), {headers: {"cache-control": "public, max-age=300", "x-content-type-options": "nosniff"}});
  }
  return {recordVisit, recordManifest, summary, rankings, handle};
}

export const popularity = createPopularity();
export function personPicks(entries: any[], rawCatalogs: unknown): PersonPick[] {
  const raw = Array.isArray(rawCatalogs) ? rawCatalogs : [];
  return entries.filter((e) => e.person && (e.mode === "actor" || e.mode === "director")).map((e) => {
    const slug = String(e.person).split("/").pop() || "";
    const source = raw.find((x: any) => x?.kind === "filmography" && String(x.personUrl || "").replace(/\/$/, "").endsWith("/people/" + slug));
    return {slug, mode: e.mode, name: cleanName(source?.personName) || null, photo: typeof source?.personPhoto === "string" ? source.personPhoto : null};
  });
}
