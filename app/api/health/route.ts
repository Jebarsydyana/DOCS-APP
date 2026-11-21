import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { missingServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = missingServerEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid environment variables", missing },
      { status: 500 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Database unreachable" }, { status: 500 });
  }
}
