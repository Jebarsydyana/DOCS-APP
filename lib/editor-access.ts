import { z } from "zod";
import { prisma } from "@/lib/db";

export type DocRole = "OWNER" | "EDITOR" | "VIEWER";

export const canEdit = (role: DocRole | null) => role === "OWNER" || role === "EDITOR";

/**
 * Resolves the caller's role on a document, or null if they have no access
 * (or the document / id doesn't exist, so callers can answer 404 for both).
 *
 * If your lib/access.ts getAccess() already does this, delete this file and call getAccess
 * from page.tsx and route.ts instead. The rules must stay identical.
 */
export async function getRole(userId: string, docId: string): Promise<DocRole | null> {
  if (!z.uuid().safeParse(docId).success) return null; // avoids a Prisma error on malformed ids
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { ownerId: true, shares: { where: { userId }, select: { role: true } } },
  });
  if (!doc) return null;
  if (doc.ownerId === userId) return "OWNER";
  return doc.shares[0]?.role ?? null;
}
