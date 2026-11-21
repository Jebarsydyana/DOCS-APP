"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";

/** Minimal "New document": creates an empty doc owned by the user and opens it. */
export async function createDocument() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const doc = await prisma.document.create({
    data: { ownerId: session.user.id },
    select: { id: true },
  });
  redirect(`/docs/${doc.id}`);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
