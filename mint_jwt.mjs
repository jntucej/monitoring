import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";

// Read the secret from the compose .env
const envText = readFileSync("/opt/monitoring/compose/.env", "utf8");
const m = envText.match(/^AUTH_JWT_SECRET=(.*)$/m);
if (!m) { console.error("AUTH_JWT_SECRET not found"); process.exit(1); }
const secret = m[1].trim();
const key = new TextEncoder().encode(secret);

const sub = process.argv[2];
const role = process.argv[3];
const issuedAt = Math.floor(Date.now() / 1000);

const token = await new SignJWT({ id: sub, token_type: "access", role })
  .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "auth-v1" })
  .setSubject(sub)
  .setJti(randomUUID())
  .setIssuedAt(issuedAt)
  .setExpirationTime(issuedAt + 3600)
  .sign(key);

process.stdout.write(token);
