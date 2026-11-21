import { z } from "zod";

// Server-only. Used by /api/health to report a misconfigured deployment.
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
});

/** Names of required server env vars that are missing or invalid. Empty = all good. */
export function missingServerEnv(): string[] {
  const result = serverEnvSchema.safeParse(process.env);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
}
