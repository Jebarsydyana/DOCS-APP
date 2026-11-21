"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteDocument } from "@/app/docs/document-actions";
import ShareDialog from "./ShareDialog";

export type DocRow = {
  id: string;
  title: string;
  updatedAt: string; // ISO string (serialisable from the server page)
  role: "OWNER" | "EDITOR" | "VIEWER";
  sharedCount?: number; // owner rows: how many people have access
  sharedBy?: string; // shared rows: who owns it
};

const BADGE: Record<DocRow["role"], { text: string; cls: string }> = {
  OWNER: { text: "Owner", cls: "bg-blue-50 text-blue-700" },
  EDITOR: { text: "Editor", cls: "bg-green-50 text-green-700" },
  VIEWER: { text: "View only", cls: "bg-gray-100 text-gray-700" },
};

function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export default function DocumentRows({
  rows,
  emptyTitle,
  emptyHint,
  children,
}: {
  rows: DocRow[];
  emptyTitle: string;
  emptyHint: string;
  children?: React.ReactNode; // optional call-to-action shown in the empty state
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onDelete(row: DocRow) {
    const extra = row.sharedCount ? ` It is shared with ${row.sharedCount} ${row.sharedCount === 1 ? "person" : "people"}, who will lose access.` : "";
    if (!window.confirm(`Delete “${row.title}”?${extra} This can't be undone.`)) return;
    setError("");
    startTransition(async () => {
      const res = await deleteDocument(row.id);
      if (!res.ok) setError(res.error ?? "Couldn't delete the document.");
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
        <p className="font-medium text-gray-900">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{emptyHint}</p>
        {children && <div className="mt-5 flex justify-center">{children}</div>}
      </div>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {rows.map((row) => {
          const badge = BADGE[row.role];
          return (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/docs/${row.id}`} className="min-w-0 flex-1 rounded hover:text-blue-700">
                <p className="truncate font-medium text-gray-900">{row.title || "Untitled"}</p>
                <p className="truncate text-xs text-gray-500" suppressHydrationWarning>
                  Updated {timeAgo(row.updatedAt)}
                  {row.sharedBy ? ` · Shared by ${row.sharedBy}` : ""}
                  {row.role === "OWNER" && row.sharedCount ? ` · Shared with ${row.sharedCount}` : ""}
                </p>
              </Link>

              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.text}</span>

              {row.role === "OWNER" && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <ShareDialog documentId={row.id} title={row.title || "Untitled"} />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(row)}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
