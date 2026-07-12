function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export function requireConfiguredAdminEmail(email: string | undefined) {
  if (!email) throw new Error("ADMIN_EMAIL is not configured");
  return normalizeEmail(email);
}

export function isAdminEmail(email: string | undefined, configuredEmail: string | undefined) {
  return Boolean(
    email && configuredEmail && normalizeEmail(email) === normalizeEmail(configuredEmail),
  );
}
