// Stand-in for https://esm.town/v/std/blob/main.ts, backed by the R2 bucket bound as BLOBS.
// Keys are stored unchanged, so data copied from Val Town keeps its original names.
import { env } from "cloudflare:workers";

const bucket = () => (env as any).BLOBS as R2Bucket;

export const blob = {
  async getJSON(key: string): Promise<any> {
    const object = await bucket().get(key);
    if (!object) return undefined;
    return JSON.parse(await object.text());
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    await bucket().put(key, JSON.stringify(value), { httpMetadata: { contentType: "application/json" } });
  },
  async get(key: string): Promise<Response> {
    const object = await bucket().get(key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream" } });
  },
  async set(key: string, value: BodyInit): Promise<void> {
    await bucket().put(key, value as any);
  },
  async delete(key: string): Promise<void> {
    await bucket().delete(key);
  },
};
