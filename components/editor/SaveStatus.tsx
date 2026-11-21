"use client";

import type { SaveStatus as Status } from "@/hooks/useAutosave";

type Props = {
  status: Status;
  savedAt: Date | null;
  error: string | null;
  onRetry: () => void;
  onKeepMine: () => void;
  onLoadLatest: () => void;
};

const DOT: Record<Status, string> = {
  saved: "bg-green-500",
  unsaved: "bg-amber-500",
  saving: "bg-blue-500 animate-pulse",
  error: "bg-red-500",
  conflict: "bg-red-500",
};

const action =
  "rounded px-1.5 py-0.5 font-medium text-red-700 underline hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600";

export default function SaveStatus({ status, savedAt, error, onRetry, onKeepMine, onLoadLatest }: Props) {
  const time = savedAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const label =
    status === "saved" ? (savedAt ? `Saved at ${time}` : "All changes saved")
    : status === "saving" ? "Saving…"
    : status === "unsaved" ? "Unsaved changes"
    : status === "conflict" ? `${error ?? "Document changed."} Your latest edits are not saved.`
    : `Save failed${error ? `: ${error}` : ""}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2 text-sm text-gray-600" role="status" aria-live="polite">
      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]}`} aria-hidden />
      <span>{label}</span>
      {status === "error" && <button type="button" onClick={onRetry} className={action}>Retry</button>}
      {status === "conflict" && (
        <>
          <button type="button" onClick={onKeepMine} className={action}>Keep my version</button>
          <button type="button" onClick={onLoadLatest} className={action}>Load latest</button>
        </>
      )}
    </div>
  );
}
