import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

export interface SessionPayload {
  userId: string;
  email: string;
  roleCode: "ADMIN" | "STAFF";
  staffRole: string | null;
  name: string;
}

const SESSION_COOKIE = "session";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecretKey(): Uint8Array {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (
      !payload.userId ||
      typeof payload.userId !== "string" ||
      (payload.roleCode !== "ADMIN" && payload.roleCode !== "STAFF")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: (payload.email as string) ?? "",
      roleCode: payload.roleCode,
      staffRole: (payload.staffRole as string) ?? null,
      name: (payload.name as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function createSession(
  payload: SessionPayload,
  options: { secure?: boolean } = {},
) {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:
      options.secure ??
      process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  };
}