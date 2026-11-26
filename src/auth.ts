/**
 * One shared password for the whole site, from APP_PASSWORD.
 * Without it (local dev) every page is open.
 */
const PASSWORD = process.env.APP_PASSWORD ?? "";
const COOKIE = "trivia_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

const token = PASSWORD ? new Bun.CryptoHasher("sha256").update(`triviabot:${PASSWORD}`).digest("hex") : "";

export const authEnabled = PASSWORD !== "";

export function isSignedIn(req: Request): boolean {
  if (!authEnabled) return true;
  return new Bun.CookieMap(req.headers.get("cookie") ?? "").get(COOKIE) === token;
}

export function checkPassword(attempt: string): boolean {
  return authEnabled && attempt === PASSWORD;
}

export function sessionCookie(req: Request): string {
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return `${COOKIE}=${token}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
