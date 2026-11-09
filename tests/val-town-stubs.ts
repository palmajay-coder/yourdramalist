// Offline test adapters only. Never deploy or use this import map in production.
// They provide no real OAuth, hosting or persistent-storage security guarantees.
export const blob = {
  async getJSON(_key: string) { return undefined; },
  async setJSON(_key: string, _value: unknown) {},
  async get(_key: string): Promise<Response> { throw Error("No stored blob in offline tests"); },
  async set(_key: string, _value: unknown) {},
};
export function immutableFileUrl(path: string) { return "/__immutable/0" + path; }
export async function serveImmutableFile(_path: string): Promise<Response> { throw Error("Offline tests do not serve hosted assets"); }
export function oauthMiddleware<T>(handler: T): T { return handler; }
export async function getOAuthUserData(_req: Request) { return null; }
// Analytics writes are best effort; offline tests accept and discard them.
export const sqlite = {
  async execute(_query: unknown) { return {rows: [], columns: [], rowsAffected: 0}; },
  async batch(queries: unknown[]) { return queries.map(() => ({rows: [], columns: [], rowsAffected: 0})); },
};
