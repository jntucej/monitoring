import { Person } from "@/lib/types";
import { findPersonByUniqueId } from "@/lib/db";

export interface MobileSession {
  token: string;
  person: Person;
  expiresAt: string;
}

// Generate JWT or Mobile token
export function generateMobileToken(personId: string, uniqueId: string): string {
  const payload = {
    sub: personId,
    uniqueId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  // In production, sign with JWT secret
  return `mbt_${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

// Validate mobile token
export async function validateMobileToken(token: string): Promise<Person | null> {
  try {
    if (!token.startsWith("mbt_")) return null;

    const payloadStr = Buffer.from(token.slice(4), "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    const person = await findPersonByUniqueId(payload.uniqueId);
    return person;
  } catch (error) {
    console.error("Mobile token validation error:", error);
    return null;
  }
}
