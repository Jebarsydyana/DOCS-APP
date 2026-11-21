import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canEdit, getRole } from "@/lib/editor-access";
import DocumentEditor from "@/components/editor/DocumentEditor";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const role = await getRole(session.user.id, id);
  if (!role) notFound(); // no access and "doesn't exist" look identical

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true, title: true, content: true, version: true, createdAt: true, updatedAt: true,
      owner: { select: { name: true, email: true } },
    },
  });
  if (!doc) notFound();

  return (
    <DocumentEditor
      // Keyed by id ONLY. Keying by version would remount the editor after every
      // router.refresh() and reset what the user is typing.
      key={doc.id}
      documentId={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content}
      initialVersion={doc.version}
      canEdit={canEdit(role)}
      ownerLabel={role === "OWNER" ? "You" : (doc.owner.name ?? doc.owner.email)}
      createdAt={doc.createdAt.toISOString()}
      updatedAt={doc.updatedAt.toISOString()}
    />
  );
}
