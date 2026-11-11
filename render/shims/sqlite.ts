// Stand-in for https://esm.town/v/std/sqlite/main.ts, backed by Node's built-in SQLite
// and a database file on the persistent disk.
// Val Town returns libSQL-style rows that work both as arrays (row[0]) and by column name
// (row.day). The app reads rows both ways, so each row here is an array with named properties.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DATA_DIR } from "./env.ts";

type Arg = string | number | boolean | null | undefined | bigint | Uint8Array;
type Statement = string | { sql: string; args?: Arg[] | Record<string, Arg> };

let database: DatabaseSync | undefined;
function db(): DatabaseSync {
  if (!database) {
    mkdirSync(DATA_DIR, { recursive: true });
    database = new DatabaseSync(path.join(DATA_DIR, "ydl.sqlite"));
    database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  }
  return database;
}

function normalize(value: Arg): any {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function run(statement: Statement) {
  const { sql, args } = typeof statement === "string" ? { sql: statement, args: [] as Arg[] } : statement;
  if (args && !Array.isArray(args)) throw new Error("Named SQL arguments are not supported by the SQLite adapter");
  const prepared = db().prepare(sql);
  const values = (args || []).map(normalize);
  const columns = prepared.columns().map((c) => c.name);
  if (columns.length) {
    const objects = prepared.all(...values) as Record<string, unknown>[];
    const rows = objects.map((object) => {
      const row: any = columns.map((column) => object[column]);
      for (const column of columns) row[column] = object[column];
      return row;
    });
    return { columns, columnTypes: columns.map(() => ""), rows, rowsAffected: 0, lastInsertRowid: null };
  }
  const result = prepared.run(...values);
  return {
    columns: [] as string[],
    columnTypes: [] as string[],
    rows: [] as any[],
    rowsAffected: Number(result.changes),
    lastInsertRowid: result.lastInsertRowid ?? null,
  };
}

export const sqlite = {
  async execute(statement: Statement) {
    return run(statement);
  },
  // Val Town runs a batch as one transaction: all statements succeed, or none do.
  async batch(statements: Statement[], _mode?: string) {
    const connection = db();
    connection.exec("BEGIN");
    try {
      const results = statements.map(run);
      connection.exec("COMMIT");
      return results;
    } catch (error) {
      connection.exec("ROLLBACK");
      throw error;
    }
  },
};
