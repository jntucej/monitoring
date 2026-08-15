/**
 * Authentication & session helpers for the Gate Monitoring System.
 */
import { jwtVerify, SignJWT } from "jose";
import { randomUUID } from "crypto";
import type { User } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "gate-monitor-secret-key-change-in-production-2026"
);

export async function signToken(user: User): Promise<string> {
  return new SignJWT({ uid: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ uid: string; role: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { uid: payload.uid as string, role: payload.role as string, name: payload.name as string };
  } catch {
    return null;
  }
}

export async function getSessionUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const decoded = await verifyToken(token);
  if (!decoded) return null;
  const { findUserById } = await import("./db");
  return findUserById(decoded.uid);
}

export function generateTokens(): { accessToken: string; refreshToken: string } {
  return {
    accessToken: randomUUID().replace(/-/g, ""),
    refreshToken: randomUUID().replace(/-/g, ""),
  };
}