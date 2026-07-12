import { createRemoteJWKSet, jwtVerify } from "jose";
import { DEFAULT_ADMIN_EMAIL, isAdminEmail } from "./admin-auth";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function verifyAdminToken(token: string) {
  const authUrl = process.env.VITE_NEON_AUTH_URL;
  if (!authUrl) throw new Error("VITE_NEON_AUTH_URL is not configured");
  const origin = new URL(authUrl).origin;
  jwks ??= createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: origin,
      audience: origin,
      algorithms: ["EdDSA"],
    });
    return {
      allowed: isAdminEmail(payload.email, DEFAULT_ADMIN_EMAIL),
    };
  } catch {
    return { allowed: false };
  }
}
