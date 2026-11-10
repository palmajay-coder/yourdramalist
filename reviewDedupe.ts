import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";

/** When several YourDramaList installs on one device ask for the same title's
 * review cards at once, only the first one answers. A scrambled code of the
 * device address and title, plus which install answered, lives for a few seconds, then gets deleted. */
type Db = {execute: (query: any) => Promise<any>};
const WINDOW_MS = 10_000;
const hash = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2, "0")).join("");

export function createReviewDedupe(deps: {db?: Db; now?: () => number} = {}) {
  const db = deps.db ?? (sqlite as unknown as Db), now = deps.now ?? Date.now;
  let schema: Promise<unknown> | undefined;
  return async function firstAsk(address: string, title: string, install: string): Promise<boolean> {
    if(!address) return true;
    try {
      schema ??= db.execute({sql: "CREATE TABLE IF NOT EXISTS ydl_review_seen2 (key TEXT PRIMARY KEY, owner TEXT NOT NULL, at INTEGER NOT NULL)", args: []});
      await schema;
      const t = now(), key = await hash(`${address}|${title}`), owner = (await hash(install)).slice(0, 16);
      await db.execute({sql: "DELETE FROM ydl_review_seen2 WHERE at < ?", args: [t - WINDOW_MS]});
      await db.execute({sql: "INSERT OR IGNORE INTO ydl_review_seen2 (key, owner, at) VALUES (?, ?, ?)", args: [key, owner, t]});
      const r = await db.execute({sql: "SELECT owner FROM ydl_review_seen2 WHERE key = ?", args: [key]});
      const row = r.rows?.[0];
      return !row || (Array.isArray(row) ? row[0] : row.owner) === owner;
    } catch { return true; }
  };
}
export const firstReviewAsk = createReviewDedupe();
