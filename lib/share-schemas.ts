import { z } from "zod";

export const roleSchema = z.enum(["VIEWER", "EDITOR"]);

export const addShareSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
});

export const updateShareSchema = z.object({ role: roleSchema });

export const idSchema = z.string().uuid();
