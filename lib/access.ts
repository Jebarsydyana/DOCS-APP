import { z } from "zod";
import { prisma } from "@/lib/db";

export type DocRole = "OWNER" | "EDITOR" | "VIEWER";

const idSchema = z.string().uuid();

/**
 * The single source of truth for "who can do what with this document".
 * Every page and API route that touches a document must call this first.
 * Returns null for "no access" AND for "does not exist", so callers can
 * respond with 404 either way and never reveal that a document exists.
 */
export async function getAccess(userId: string, documentId: string): Promise<DocRole | null> {
  if (!idSchema.safeParse(documentId).success) return null;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      shares: { where: { userId }, select: { role: true }, take: 1 },
    },
  });
  if (!doc) return null;
  if (doc.ownerId === userId) return "OWNER";
  return doc.shares[0]?.role ?? null;
}

export const canEdit = (role: DocRole | null) => role === "OWNER" || role === "EDITOR";
export const canManage = (role: DocRole | null) => role === "OWNER";
