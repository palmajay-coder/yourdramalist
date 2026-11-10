import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";
import {recordAnalyticsBatch, dayKey, shiftDay, POPULAR_PERSON, type AnalyticsMetric} from "./analyticsApi.ts";
import {CATEGORIES, COUNTRIES} from "./explore.ts";
import {remoteImage} from "./people.ts";

/** Counts people, not install links, without knowing who anyone is.
 * Each manifest request becomes a scrambled code made from the visitor's network address, browser and a random
 * secret that is replaced every day. Only today's codes are kept, so yesterday's visitors can never be matched
 * to today's. The codes are used to count each person once a day overall, once per built-in catalog and once per
 * actor or director; only those daily totals are stored. */
export type PersonPick = {slug: string; mode: "actor" | "director"; name?: string | null; photo?: string | null};
type Db = {execute: (query: any) => Promise<any>; batch: (queries: any[]) => Promise<any[]>};
const MIN_ADDS = 3, SHOW_COUNT = 10, TOP = 5, CACHE_MS = 60 * 60 * 1000, PEOPLE_KEEP_MS = 60 * 24 * 60 * 60 * 1000;

export function visitorAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").slice(0, 64);
}

const cleanName = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);

export function createPopularity(deps: {db?: Db; record?: typeof recordAnalyticsBatch; now?: () => number} = {}) {
  const db = deps.db ?? (sqlite as unknown as Db), record = deps.record ?? recordAnalyticsBatch, now = deps.now ?? Date.now;
  let schema: Promise<void> | undefined, salt = {day: "", value: ""}, cache: {at: number; data: any} | null = null;
  async function ready() {
    schema ??= db.batch([
      {sql: "CREATE TABLE IF NOT EXISTS ydl_daily_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL)", args: []},
      {sql: "CREATE TABLE IF NOT EXISTS ydl_daily_seen (day TEXT NOT NULL, scope TEXT NOT NULL, visitor TEXT NOT NULL, PRIMARY KEY(day, scope, visitor))", args: []},
      {sql: "CREATE TABLE IF NOT EXISTS ydl_people_meta (slug TEXT PRIMARY KEY, name TEXT NOT NULL, photo TEXT, at INTEGER NOT NULL)", args: []},
    ]).then(() => {});
    try { await schema; } catch (error) { schema = undefined; throw error; }
  }
  async function daySalt(day: string) {
    if (salt.day === day) return salt.value;
    const fresh = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await db.batch([
      {sql: "INSERT OR IGNORE INTO ydl_daily_salt(day, salt) VALUES(?, ?)", args: [day, fresh]},
      {sql: "DELETE FROM ydl_daily_salt WHERE day < ?", args: [day]},
    ]);
    const row = (await db.execute({sql: "SELECT salt FROM ydl_daily_salt WHERE day = ?", args: [day]})).rows?.[0];
    salt = {day, value: String(row?.salt ?? row?.[0] ?? fresh)};
    return salt.value;
  }

  /** Called after a manifest is generated. Never throws: counting must not get in the way of an install link. */
  async function recordManifest(req: Request, catalogs: string[], people: PersonPick[]) {
    const address = visitorAddress(req);
    if (!address) return;
    try {
      await ready();
      const day = dayKey(now()), secret = await daySalt(day);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret + "|" + address + "|" + (req.headers.get("user-agent") || "").slice(0, 300)));
      const visitor = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
      const picks = new Map<string, PersonPick>();
      for (const p of people) if (POPULAR_PERSON.test(p.slug + ":" + p.mode)) picks.set(p.slug + ":" + p.mode, p);
      const scopes = ["people", ...new Set(catalogs.filter((c) => c.startsWith("explore:")).map((c) => "catalog:" + c)), ...[...picks.keys()].map((k) => "person:" + k)];
      const results = await db.batch([
        ...scopes.map((scope) => ({sql: "INSERT OR IGNORE INTO ydl_daily_seen(day, scope, visitor) VALUES(?, ?, ?)", args: [day, scope, visitor]})),
        {sql: "DELETE FROM ydl_daily_seen WHERE day < ?", args: [day]},
      ]);
      const metrics: Array<[AnalyticsMetric, string, number]> = [];
      scopes.forEach((scope, i) => {
        if (!(Number(results?.[i]?.rowsAffected) > 0)) return;
        if (scope === "people") metrics.push(["people.generated", "all", 1]);
        else if (scope.startsWith("catalog:")) metrics.push(["popular.catalog", scope.slice(8), 1]);
        else metrics.push(["popular.person", scope.slice(7), 1]);
      });
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
  return {recordManifest, rankings, handle};
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
