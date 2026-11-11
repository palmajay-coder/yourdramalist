// File-backed stand-in for https://esm.town/v/std/blob/main.ts.
// Each val keeps its own folder (namespace), as each val had its own blob storage on Val Town.
// Keys keep their original names, encoded only to make them safe file names.
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./env.ts";

const fileName = (key: string) => "k_" + encodeURIComponent(key).replace(/\./g, "%2E");

export function createBlobStore(namespace: string) {
  const dir = path.join(DATA_DIR, "blobs", namespace);
  const file = (key: string) => path.join(dir, fileName(key));

  async function readBytes(key: string): Promise<Buffer | undefined> {
    try {
      return await readFile(file(key));
    } catch (error: any) {
      if (error?.code === "ENOENT") return undefined;
      throw error;
    }
  }

  async function writeBytes(key: string, bytes: Uint8Array): Promise<void> {
    await mkdir(dir, { recursive: true });
    // Write to a temporary file, then rename, so a crash never leaves a half-written value.
    const temp = file(key) + `.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temp, bytes);
    await rename(temp, file(key));
  }

  return {
    async getJSON(key: string): Promise<any> {
      const bytes = await readBytes(key);
      return bytes === undefined ? undefined : JSON.parse(bytes.toString("utf8"));
    },
    async setJSON(key: string, value: unknown): Promise<void> {
      await writeBytes(key, Buffer.from(JSON.stringify(value), "utf8"));
    },
    async get(key: string): Promise<Response> {
      const bytes = await readBytes(key);
      if (bytes === undefined) return new Response("Not found", { status: 404 });
      return new Response(bytes, { headers: { "content-type": "application/octet-stream" } });
    },
    async set(key: string, value: BodyInit): Promise<void> {
      await writeBytes(key, new Uint8Array(await new Response(value).arrayBuffer()));
    },
    async delete(key: string): Promise<void> {
      await rm(file(key), { force: true });
    },
  };
}
