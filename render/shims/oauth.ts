// Stand-in for https://esm.town/v/std/oauth/middleware.ts.
// On Val Town this provides the owner login for the admin area.
// Until Cloudflare Access is set up for /admin, nobody is signed in, so admin edits are refused.
// This fails closed: public pages work, and no admin write can happen.
export function oauthMiddleware<T>(handler: T): T {
  return handler;
}

export async function getOAuthUserData(_req: Request): Promise<null> {
  return null;
}
