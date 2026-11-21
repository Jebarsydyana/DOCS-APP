import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canEdit, getRole } from "@/lib/editor-access";
import { documentPatchSchema, MAX_CONTENT_BYTES } from "@/lib/document-schemas";
import { isValidDocument } from "@/lib/editor-schema";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return fail("Please log in again", 401);

  const { id } = await ctx.params;
  const role = await getRole(session.user.id, id);
  if (!role) return fail("Document not found", 404);
  if (!canEdit(role)) return fail("You have view-only access", 403);

  const body = await req.json().catch(() => null);
  const parsed = documentPatchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  const { version, title, content } = parsed.data;
  if (content) {
    if (Buffer.byteLength(JSON.stringify(content)) > MAX_CONTENT_BYTES) return fail("Document is too large", 413);
    if (!isValidDocument(content)) return fail("Document content is invalid", 400);
  }

  try {
    // One atomic statement matching id AND version. If someone saved in between, nothing
    // matches (P2025) and we answer 409 instead of overwriting their newer content.
    const doc = await prisma.document.update({
      where: { id, version },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content: content as unknown as Prisma.InputJsonValue }),
        version: { increment: 1 },
      },
      select: { version: true, updatedAt: true },
    });
    return NextResponse.json(doc);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      // Send the current state so the client can tell "we lost a race" from "our own
      // earlier save already landed", and so "Keep my version" knows which version to build on.
      const current = await prisma.document.findUnique({
        where: { id },
        select: { version: true, title: true, content: true },
      });
      if (!current) return fail("Document not found", 404); // deleted meanwhile
      return NextResponse.json({ error: "Document was changed elsewhere", current }, { status: 409 });
    }
    throw e;
  }
}
