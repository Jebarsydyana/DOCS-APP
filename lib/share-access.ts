import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { idSchema } from "@/lib/share-schemas";

type OwnerCheck =
  | { ok: true; userId: string; docId: string }
  | { ok: false; res: NextResponse };

/**
 * The ONE gate for every sharing route: the caller must be logged in AND own the document.
 * The ownership test is part of the database query, so a non-owner never even learns
 * whether the document exists (404, not 403).
 */
export async function requireOwner(docId: string): Promise<OwnerCheck> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Please log in again." }, { status: 401 }) };
  }
  const notFound = {
    ok: false as const,
    res: NextResponse.json({ error: "Document not found." }, { status: 404 }),
  };
  if (!idSchema.safeParse(docId).success) return notFound;

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: session.user.id },
    select: { id: true },
  });
  if (!doc) return notFound;
  return { ok: true, userId: session.user.id, docId: doc.id };
}
