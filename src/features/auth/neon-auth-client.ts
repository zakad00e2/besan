import { createInternalNeonAuth } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react";

export const neonAuth = createInternalNeonAuth(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = neonAuth.adapter;
