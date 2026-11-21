"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { idSchema } from "@/lib/share-schemas";

/** Creates an empty document owned by the logged-in user and opens it. */
export async function createBlankDocument() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const doc = await prisma.document.create({
    data: { ownerId: session.user.id }, // title and content use the database defaults
    select: { id: true },
  });
  revalidatePath("/docs");
  redirect(`/docs/${doc.id}`);
}

/** Owner only. The ownership test is inside the delete query itself. */
export async function deleteDocument(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Please log in again." };
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Document not found." };

  const { count } = await prisma.document.deleteMany({
    where: { id, ownerId: session.user.id },
  });
  if (count === 0) return { ok: false, error: "Document not found." };

  revalidatePath("/docs");
  revalidatePath("/docs/shared");
  return { ok: true };
}
