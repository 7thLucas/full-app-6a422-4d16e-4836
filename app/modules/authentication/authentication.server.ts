import jwt from "jsonwebtoken";
import { parse as parseCookies } from "cookie";
import type { PublicUser } from "./authentication.types";
import { UserRole } from "./authentication.types";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  username: string;
  email: string;
  email_verified: boolean;
  iat: number;
  exp: number;
}

function resolveCookieDomain(hostname: string): string | undefined {
  const host = hostname.split(":")[0];
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return undefined;
  if (host === "localhost") return undefined;
  const parts = host.split(".");
  if (parts.length < 2) return undefined;
  return "." + parts.slice(-2).join(".");
}

function parseMaxAge(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhdwy])$/);
  if (!match) return 7 * 24 * 3600;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  };
  return n * (units[unit] ?? 86400);
}

export function signJwt(payload: {
  sub: string;
  role: UserRole;
  username: string;
  email: string;
  email_verified: boolean;
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJwt(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, secret) as JwtPayload;
}

export function parseJwtFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  return cookies.auth_token ?? null;
}

export function buildAuthCookie(token: string, hostname: string): string {
  const maxAge = parseMaxAge(process.env.JWT_EXPIRES_IN ?? "7d");
  const domain = resolveCookieDomain(hostname);
  const isProduction = process.env.NODE_ENV === "production";

  const parts = [
    `auth_token=${token}`,
    `Max-Age=${maxAge}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  if (isProduction) parts.push("Secure");
  if (domain !== undefined) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export function buildLogoutCookie(hostname: string): string {
  const domain = resolveCookieDomain(hostname);
  const isProduction = process.env.NODE_ENV === "production";

  const parts = [
    `auth_token=`,
    `Max-Age=0`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  ];
  if (isProduction) parts.push("Secure");
  if (domain !== undefined) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export function getUserFromRequest(request: Request): PublicUser | null {
  try {
    const cookieHeader = request.headers.get("Cookie") ?? undefined;
    const token = parseJwtFromCookieHeader(cookieHeader);
    if (!token) return null;
    const payload = verifyJwt(token);
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      is_active: true,
      email_verified: payload.email_verified,
      profile: {},
      createdAt: "",
    };
  } catch {
    return null;
  }
}
