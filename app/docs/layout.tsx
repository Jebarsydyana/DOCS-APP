import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects logged-out visitors; this is the second lock.
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell
      user={{ name: session.user.name ?? null, email: session.user.email ?? "" }}
    >
      {children}
    </DashboardShell>
  );
}
