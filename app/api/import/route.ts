import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/import/constraints";
import { processImport } from "@/lib/import/process";

export const runtime = "nodejs"; // mammoth (.docx) needs Node, not Edge
export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Please log in again." }, 401);

  // Reject obviously huge uploads before reading the body.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 256 * 1024) {
    return json({ error: "This file is too large to upload." }, 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "The upload couldn't be read. Please try again." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file was received." }, 400);

  const result = await processImport({
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  if (!result.ok) return json({ error: result.error }, 400);

  try {
    const doc = await prisma.document.create({
      data: {
        ownerId: session.user.id, // always the logged-in user, never taken from the request
        title: result.title,
        content: result.content as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, title: true },
    });
    return json({ id: doc.id, title: doc.title, warnings: result.warnings }, 201);
  } catch {
    return json({ error: "The file was read, but saving the document failed. Please try again." }, 500);
  }
}
