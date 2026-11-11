// Gives the unchanged app code the `Deno.env` it expects on Val Town, backed by process.env.
// build.mjs rewrites every `Deno.env` in app code to `globalThis.__ydlDenoEnv`, so no global
// `Deno` object exists and libraries cannot mistake this server for the Deno runtime.
(globalThis as any).__ydlDenoEnv = {
  get: (key: string) => process.env[key],
  has: (key: string) => process.env[key] !== undefined,
  toObject: () => ({ ...process.env }),
  // Val Town ignores Deno.env.set; keep the same behavior.
  set: () => {},
};

// Where saved data lives. On Render this is the persistent disk.
export const DATA_DIR = process.env.DATA_DIR || new URL("../data", import.meta.url).pathname;
