import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import DocsToolbar from "@/components/documents/DocsToolbar";
import DocumentRows, { type DocRow } from "@/components/documents/DocumentRows";

export const metadata = { title: "My documents" };

export default async function MyDocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const docs = await prisma.document.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, _count: { select: { shares: true } } },
  });

  const rows: DocRow[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt.toISOString(),
    role: "OWNER",
    sharedCount: d._count.shares,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My documents</h1>
          <p className="mt-1 text-sm text-gray-500">Documents you own. Share them, or import .txt, .md and .docx files.</p>
        </div>
        <DocsToolbar />
      </div>

      <DocumentRows
        rows={rows}
        emptyTitle="You don't have any documents yet"
        emptyHint="Create a blank document, or import a .txt, .md or .docx file to start from existing text."
      />
    </div>
  );
}
