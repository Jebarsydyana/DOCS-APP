import { prisma } from "@/lib/db";
import type { DocRole } from "@/lib/access";

export type DocumentListItem = {
  id: string;
  title: string;
  updatedAt: Date;
  role: DocRole;
  ownerName: string | null;
  ownerEmail: string;
};

const listSelect = {
  id: true,
  title: true,
  updatedAt: true,
  owner: { select: { name: true, email: true } },
} as const;

export async function listOwnedDocuments(userId: string): Promise<DocumentListItem[]> {
  const docs = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: listSelect,
  });

  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt,
    role: "OWNER" as const,
    ownerName: d.owner.name,
    ownerEmail: d.owner.email,
  }));
}

export async function listSharedDocuments(userId: string): Promise<DocumentListItem[]> {
  const shares = await prisma.documentShare.findMany({
    where: { userId },
    orderBy: { document: { updatedAt: "desc" } },
    select: { role: true, document: { select: listSelect } },
  });

  return shares.map((s) => ({
    id: s.document.id,
    title: s.document.title,
    updatedAt: s.document.updatedAt,
    role: s.role,
    ownerName: s.document.owner.name,
    ownerEmail: s.document.owner.email,
  }));
}

/** Only call this after getAccess() has allowed the user in. */
export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, updatedAt: true, version: true },
  });
}
