// Gives the unchanged app code the `Deno.env` it expects on Val Town.
// Values come from the Worker's string bindings: secrets and plain variables.
// Imported first by worker.ts, so it runs before any app module reads the environment.
import { env } from "cloudflare:workers";

const bindings = env as unknown as Record<string, unknown>;
const stringVars = () =>
  Object.fromEntries(Object.entries(bindings).filter(([, v]) => typeof v === "string")) as Record<string, string>;

(globalThis as any).Deno ??= {
  env: {
    get: (key: string) => (typeof bindings[key] === "string" ? (bindings[key] as string) : undefined),
    has: (key: string) => typeof bindings[key] === "string",
    toObject: stringVars,
    // Val Town ignores Deno.env.set; keep the same behavior.
    set: () => {},
  },
};
