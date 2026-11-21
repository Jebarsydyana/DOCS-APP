// Client-safe app config (no server-only code, safe to import anywhere).
// NEXT_PUBLIC_* values are inlined at build time.
export const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Docs";
