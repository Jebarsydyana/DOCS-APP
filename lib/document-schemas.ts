import { z } from "zod";

type DocJson = { type: "doc"; content?: unknown[] };

const docContent = z.custom<DocJson>((v) => {
  if (!v || typeof v !== "object") return false;
  const o = v as { type?: unknown; content?: unknown };
  return o.type === "doc" && (o.content === undefined || Array.isArray(o.content));
}, "Content is not a valid document");

export const documentPatchSchema = z
  .object({
    version: z.number().int().min(1),
    title: z.string().trim().min(1, "Title can't be empty").max(200, "Title is too long").optional(),
    content: docContent.optional(),
  })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: "Nothing to update",
  });

export const MAX_CONTENT_BYTES = 2 * 1024 * 1024; // Vercel Hobby request bodies are capped near 4.5 MB
