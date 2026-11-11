// Stand-in for https://esm.town/v/std/oauth/middleware.ts, for the admin pages.
// Val Town signed the owner in through their Val Town account. Here the owner signs in with a
// password kept as the Worker secret ADMIN_PASSWORD (set in the Cloudflare dashboard, never in code).
//   /auth/login   shows the sign-in page, or checks the password and starts a session
//   /auth/logout  ends the session
// A session is a signed cookie. The code's existing owner check then passes only for that session.
// With no ADMIN_PASSWORD set, nobody can sign in (fails closed), and public pages are unaffected.
import { OWNER_ID } from "../../wallpaper.ts";

const COOKIE = "ydl_admin";
const SESSION_SECONDS = 12 * 3600;
const encoder = new TextEncoder();

const password = (): string => (typeof Deno < "u" && Deno.env.get("ADMIN_PASSWORD")) || "";
const b64url = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(expiry: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, encoder.encode("ydl-admin-v1:" + expiry)));
}

// Compare without stopping at the first difference.
function same(a: string, b: string): boolean {
  const x = encoder.encode(a), y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function sessionValid(req: Request): Promise<boolean> {
  const secret = password();
  if (!secret) return false;
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1) || "";
  const [expiryText, signature] = raw.split(".");
  const expiry = Number(expiryText);
  if (!Number.isInteger(expiry) || !signature || expiry < Date.now() / 1000 || expiry > Date.now() / 1000 + SESSION_SECONDS + 60) return false;
  return same(signature, await sign(expiry, secret));
}

export async function getOAuthUserData(req: Request): Promise<{ user: { id: string; username: string } } | null> {
  return (await sessionValid(req)) ? { user: { id: OWNER_ID, username: "owner" } } : null;
}

// At most a handful of password tries per address (per server instance, so this slows guessing down
// rather than forbidding it outright; the password itself must be long).
const attempts = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string): boolean {
  const now = Date.now(), entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) { attempts.set(ip, { count: 1, resetAt: now + 600_000 }); return false; }
  entry.count++;
  while (attempts.size > 500) attempts.delete(attempts.keys().next().value!);
  return entry.count > 8;
}

const page = (message = "", status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin sign in · YourDramaList</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#181818;color:#ddd;font:16px Lato,Arial,sans-serif}main{width:min(380px,calc(100% - 40px));background:#242424;border:1px solid #333;border-radius:14px;padding:28px}h1{margin:0 0 6px;font-size:22px}p{margin:0 0 18px;color:#999;font-size:14px}label{display:block;font-weight:700;margin-bottom:8px}input{width:100%;padding:13px;border-radius:8px;border:1px solid #333;background:#181818;color:#ddd;font:inherit}button{margin-top:14px;width:100%;padding:13px;border:0;border-radius:8px;background:#1976b8;color:#fff;font:inherit;font-weight:700;cursor:pointer}.error{color:#ff9a9a;margin:12px 0 0;font-size:14px}</style></head>
<body><main><h1>Admin sign in</h1><p>For the site owner only.</p><form method="post" action="/auth/login"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" autofocus required><button type="submit">Sign in</button>${message ? `<p class="error" role="alert">${message}</p>` : ""}</form></main></body></html>`,
  { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" } });

// After signing in, tell the admin page that opened this popup, or go to the admin page directly.
const done = (cookie: string) => new Response(`<!doctype html><meta charset="utf-8"><title>Signed in</title><p>Signed in. You can close this window.</p><script>if(window.opener){window.opener.postMessage({type:"std_oauth_success"},location.origin);window.close()}else location.replace("/admin")</script>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "set-cookie": cookie } });

const cookieFor = (value: string, maxAge: number) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export function oauthMiddleware<T>(handler: T): T {
  const next = handler as unknown as (req: Request) => Promise<Response>;
  const wrapped = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (url.pathname === "/auth/logout") {
      return new Response(null, { status: 302, headers: { location: "/", "set-cookie": cookieFor("", 0), "cache-control": "no-store" } });
    }
    if (url.pathname !== "/auth/login") return next(req);
    if (req.method === "GET") return page();
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
    const secret = password();
    if (!secret) return page("Admin sign in is not set up yet.", 503);
    if (limited(req.headers.get("cf-connecting-ip") || "unknown")) return page("Too many tries. Please wait ten minutes.", 429);
    let given = "";
    try { given = String((await req.formData()).get("password") || ""); } catch { /* Treated as a wrong password. */ }
    if (!given || !same(given, secret)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return page("That password is not right.", 401);
    }
    const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    return done(cookieFor(`${expiry}.${await sign(expiry, secret)}`, SESSION_SECONDS));
  };
  return wrapped as unknown as T;
}
