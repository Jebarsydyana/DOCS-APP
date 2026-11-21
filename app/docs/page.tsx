import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const count = await prisma.document.count({ where: { ownerId: session.user.id } });

  return (
    <main className="mx-auto mt-16 max-w-2xl px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My documents</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded border px-3 py-1 text-sm">Log out</button>
        </form>
      </div>
      <p className="mt-2 text-sm text-gray-600">Signed in as {session.user.email}</p>
      <p className="mt-8 text-gray-500">
        {count === 0 ? "No documents yet. (Phase 2 adds creation.)" : `${count} document(s)`}
      </p>
    </main>
  );
}