import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/share-access";
import { idSchema, updateShareSchema } from "@/lib/share-schemas";

type Ctx = { params: Promise<{ id: string; userId: string }> };

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

/** Owner only: switch someone between Viewer and Editor. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const check = await requireOwner(id);
  if (!check.ok) return check.res;
  if (!idSchema.safeParse(userId).success) return notFound();

  const parsed = updateShareSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const { count } = await prisma.documentShare.updateMany({
    where: { documentId: check.docId, userId },
    data: { role: parsed.data.role },
  });
  return count === 0 ? notFound() : NextResponse.json({ ok: true });
}

/** Owner only: remove someone's access. Takes effect on their very next request. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const check = await requireOwner(id);
  if (!check.ok) return check.res;
  if (!idSchema.safeParse(userId).success) return notFound();

  await prisma.documentShare.deleteMany({ where: { documentId: check.docId, userId } });
  return NextResponse.json({ ok: true });
}
