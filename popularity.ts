import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";
import {recordAnalyticsBatch, validAnalytics, dayKey, shiftDay, type AnalyticsMetric} from "./analyticsApi.ts";
import {weekWindow} from "./collections.ts";

/** Counts people, not clicks, without knowing who anyone is.
 * Each request becomes a scrambled code made from the visitor's network address, browser and a random secret that is
 * replaced at the start of every month. The address is never stored, and once the month's secret is deleted a code can't
 * be linked to anyone or to the next month. The site keeps which codes chose which category on which day for 35 days,
 * so the admin page can count each person once over 7 or 30 days and see how many come back. */
type Db = {execute: (query: any) => Promise<any>; batch: (queries: any[]) => Promise<any[]>};
const KEEP_DAYS = 35;

export function visitorAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").slice(0, 64);
}
/** Phones and tablets count as mobile; everything else as computer. */
export function deviceType(req: Request): "mobile" | "computer" {
  return /Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|Kindle|Opera Mini|IEMobile/i.test(req.headers.get("user-agent") || "") ? "mobile" : "computer";
}
/** Scopes that may be stored: people, device type, and every analytics category. */
export function validScope(scope: string): boolean {
  if (scope === "people" || scope === "device:mobile" || scope === "device:computer") return true;
  const at = scope.indexOf(":"), metric = scope.slice(0, at) as AnalyticsMetric;
  return at > 0 && ["catalog.selected", "feature.selected", "catalog.added"].includes(metric) && validAnalytics(metric, scope.slice(at + 1));
}

export function createPopularity(deps: {db?: Db; record?: typeof recordAnalyticsBatch; now?: () => number} = {}) {
  const db = deps.db ?? (sqlite as unknown as Db), record = deps.record ?? recordAnalyticsBatch, now = deps.now ?? Date.now;
  let schema: Promise<void> | undefined, salt = {month: "", value: ""};
  async function ready() {
    schema ??= db.batch([
      {sql: "CREATE TABLE IF NOT EXISTS ydl_month_salt (month TEXT PRIMARY KEY, salt TEXT NOT NULL)", args: []},
      {sql: "CREATE TABLE IF NOT EXISTS ydl_visits (day TEXT NOT NULL, scope TEXT NOT NULL, visitor TEXT NOT NULL, PRIMARY KEY(day, scope, visitor))", args: []},
      // Popular this month was removed; its actor and director names are no longer kept.
      {sql: "DROP TABLE IF EXISTS ydl_people_meta", args: []},
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
  async function recordVisit(req: Request, rawScopes: string[]) {
    const address = visitorAddress(req);
    if (!address) return;
    try {
      await ready();
      const time = now(), day = dayKey(time), secret = await monthSalt(day.slice(0, 7));
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret + "|" + address + "|" + (req.headers.get("user-agent") || "").slice(0, 300)));
      const visitor = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
      const scopes = [...new Set(rawScopes)].filter(validScope);
      if (!scopes.length) return;
      // Weekly picks keep a long-term count of people per row per week for the rotation view.
      const weekly = scopes.filter((s) => s.startsWith("catalog.selected:weekly:")), week = weekWindow(time).week;
      const seenThisWeek = new Set<string>(weekly.length ? ((await db.execute({sql: `SELECT DISTINCT scope FROM ydl_visits WHERE visitor = ? AND day >= ? AND scope IN (${weekly.map(() => "?").join(",")})`, args: [visitor, week, ...weekly]})).rows || []).map((r: any) => String(r.scope ?? r[0])) : []);
      await db.batch([
        ...scopes.map((scope) => ({sql: "INSERT OR IGNORE INTO ydl_visits(day, scope, visitor) VALUES(?, ?, ?)", args: [day, scope, visitor]})),
        {sql: "DELETE FROM ydl_visits WHERE day < ?", args: [shiftDay(day, -KEEP_DAYS)]},
      ]);
      const metrics: Array<[AnalyticsMetric, string, number]> = [];
      for (const scope of weekly) if (!seenThisWeek.has(scope)) metrics.push(["weekly.people", scope.slice(17), 1]);
      if (metrics.length) await record(metrics);
    } catch { /* Counting is best effort. */ }
  }

  /** Called after an install link is created: the person, their device type and every category in the link. */
  function recordManifest(req: Request, scopes: string[]) {
    return recordVisit(req, ["people", "device:" + deviceType(req), ...scopes]);
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

  return {recordVisit, recordManifest, summary};
}

export const popularity = createPopularity();
