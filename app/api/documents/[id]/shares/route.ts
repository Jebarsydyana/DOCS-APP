import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/share-access";
import { addShareSchema } from "@/lib/share-schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Owner only: who has access now, and which accounts can still be picked. */
export async function GET(_req: Request, { params }: Ctx) {
  const check = await requireOwner((await params).id);
  if (!check.ok) return check.res;

  const rows = await prisma.documentShare.findMany({
    where: { documentId: check.docId },
    orderBy: { createdAt: "asc" },
    select: { userId: true, role: true, user: { select: { email: true, name: true } } },
  });
  const shares = rows.map((r) => ({
    userId: r.userId,
    role: r.role,
    email: r.user.email,
    name: r.user.name,
  }));

  // Demo-style picker: every other account that doesn't have access yet (capped).
  const candidates = await prisma.user.findMany({
    where: { id: { notIn: [check.userId, ...shares.map((s) => s.userId)] } },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 100,
    select: { id: true, email: true, name: true }, // never password_hash
  });

  return NextResponse.json({ shares, candidates });
}

/** Owner only: give someone Viewer or Editor access (or change it if they already have some). */
export async function POST(req: Request, { params }: Ctx) {
  const check = await requireOwner((await params).id);
  if (!check.ok) return check.res;

  const parsed = addShareSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a person and a role." }, { status: 400 });
  }
  const { userId, role } = parsed.data;

  if (userId === check.userId) {
    return NextResponse.json({ error: "You already own this document." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });

  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: check.docId, userId } },
    create: { documentId: check.docId, userId, role },
    update: { role },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
