// Stand-in for https://esm.town/v/std/sqlite/main.ts, backed by the D1 database bound as DB.
// Val Town returns libSQL-style rows that work both as arrays (row[0]) and by column name (row.day).
// The app reads rows both ways, so each row here is an array with named properties added.
import { env } from "cloudflare:workers";

type Arg = string | number | boolean | null | undefined | bigint | ArrayBuffer | Uint8Array;
type Statement = string | { sql: string; args?: Arg[] | Record<string, Arg> };

const db = () => (env as any).DB as D1Database;

function normalize(value: Arg): unknown {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint") return Number(value);
  return value;
}

function prepare(statement: Statement): D1PreparedStatement {
  const { sql, args } = typeof statement === "string" ? { sql: statement, args: [] as Arg[] } : statement;
  if (args && !Array.isArray(args)) throw new Error("Named SQL arguments are not supported by the D1 adapter");
  const prepared = db().prepare(sql);
  return args && args.length ? prepared.bind(...args.map(normalize)) : prepared;
}

function toResultSet(result: D1Result<Record<string, unknown>>) {
  const objects = result.results ?? [];
  const columns = objects.length ? Object.keys(objects[0]) : [];
  const rows = objects.map((object) => {
    const row: any = columns.map((column) => object[column]);
    for (const column of columns) row[column] = object[column];
    return row;
  });
  return {
    columns,
    columnTypes: columns.map(() => ""),
    rows,
    rowsAffected: Number(result.meta?.changes ?? 0),
    lastInsertRowid: result.meta?.last_row_id ?? null,
  };
}

export const sqlite = {
  async execute(statement: Statement) {
    return toResultSet(await prepare(statement).all());
  },
  async batch(statements: Statement[], _mode?: string) {
    if (!statements.length) return [];
    const results = await db().batch(statements.map(prepare));
    return results.map((result) => toResultSet(result as D1Result<Record<string, unknown>>));
  },
};
