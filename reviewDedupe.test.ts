import {createReviewDedupe} from "./reviewDedupe.ts";
const rows = new Map<string, {owner: string; at: number}>(); let clock = 0;
const db = {async execute(q: any) {
  const [a, b, c] = q.args;
  if(q.sql.startsWith("DELETE")) for(const [k, v] of rows) if(v.at < a) rows.delete(k);
  if(q.sql.startsWith("INSERT") && !rows.has(a)) rows.set(a, {owner: b, at: c});
  if(q.sql.startsWith("SELECT")) return {rows: rows.has(a) ? [[rows.get(a)!.owner]] : []};
  return {rows: [], rowsAffected: 0};
}};
const first = createReviewDedupe({db, now: () => clock});
const ok = (v: boolean, m: string) => { if(!v) throw new Error(m); };
ok(await first("1.2.3.4", "tt1", "A"), "first install answers");
ok(!(await first("1.2.3.4", "tt1", "B")), "second install stays empty");
ok(await first("1.2.3.4", "tt1", "A"), "same install can reopen");
ok(await first("5.6.7.8", "tt1", "B"), "other device answers");
ok(await first("1.2.3.4", "tt2", "B"), "other title answers");
clock = 11_000; ok(await first("1.2.3.4", "tt1", "B"), "window expires");
ok(await first("", "tt1", "B"), "no address answers");
console.log("PASS review dedupe");
