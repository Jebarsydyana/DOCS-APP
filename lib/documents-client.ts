import type { DocumentPatch } from "./editor-types";

export type ServerDoc = { version: number; title: string; content: unknown };

export class ConflictError extends Error {
  current?: ServerDoc;
  constructor(message: string, current?: ServerDoc) {
    super(message);
    this.current = current;
  }
}

export async function saveDocument(
  id: string,
  patch: DocumentPatch & { version: number },
): Promise<{ version: number; updatedAt: string }> {
  const body = JSON.stringify(patch);
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
    // lets a save that starts while the tab is closing still complete (browser limit: 64 KB)
    keepalive: new TextEncoder().encode(body).length < 60_000,
  });

  if (res.status === 409) {
    const data = await res.json().catch(() => null);
    throw new ConflictError("Someone else changed this document.", data?.current);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      data?.error ?? (res.status === 401 ? "Your session expired. Log in again." : `Save failed (${res.status})`),
    );
  }
  return res.json();
}
