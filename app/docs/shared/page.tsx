import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import DocumentRows, { type DocRow } from "@/components/documents/DocumentRows";

export const metadata = { title: "Shared with me" };

export default async function SharedWithMePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Only documents that have a share row for THIS user. Nothing else can appear here.
  const shares = await prisma.documentShare.findMany({
    where: { userId: session.user.id },
    orderBy: { document: { updatedAt: "desc" } },
    select: {
      role: true,
      document: {
        select: {
          id: true,
          title: true,
          updatedAt: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });

  const rows: DocRow[] = shares.map((s) => ({
    id: s.document.id,
    title: s.document.title,
    updatedAt: s.document.updatedAt.toISOString(),
    role: s.role,
    sharedBy: s.document.owner.name || s.document.owner.email,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Shared with me</h1>
        <p className="mt-1 text-sm text-gray-500">Documents other people gave you access to.</p>
      </div>

      <DocumentRows
        rows={rows}
        emptyTitle="Nothing has been shared with you yet"
        emptyHint="When someone shares a document with you, it will show up here with your access level."
      />
    </div>
  );
}
