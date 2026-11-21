"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCEPT_ATTR,
  LIMIT_LABEL,
  SUPPORTED_LABEL,
  validateFileMeta,
} from "@/lib/import/constraints";

type State =
  | { kind: "idle" }
  | { kind: "working"; name: string }
  | { kind: "error"; message: string }
  | { kind: "done"; id: string; title: string; warnings: string[] };

export default function ImportDocumentButton({ variant = "sidebar" }: { variant?: "sidebar" | "toolbar" }) {
  const toolbar = variant === "toolbar";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const working = state.kind === "working";

  function open(id: string) {
    router.push(`/docs/${id}`);
    router.refresh();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again after an error
    if (!file) return;

    // 1. Validate type and size in the browser (the server checks again).
    const meta = validateFileMeta(file.name, file.size);
    if (!meta.ok) {
      setState({ kind: "error", message: meta.error });
      return;
    }

    setState({ kind: "working", name: file.name });
    try {
      // 2-6. The server reads, converts, creates the document and saves it.
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.id) {
        setState({
          kind: "error",
          message:
            data?.error ??
            (res.status === 413
              ? "This file is too large for the server."
              : `Import failed (error ${res.status}). Please try again.`),
        });
        return;
      }

      const warnings: string[] = Array.isArray(data.warnings) ? data.warnings : [];
      if (warnings.length === 0) {
        setState({ kind: "done", id: data.id, title: data.title, warnings });
        open(data.id);
      } else {
        // Don't hide what was changed: show the notes and let the user open the document.
        setState({ kind: "done", id: data.id, title: data.title, warnings });
      }
    } catch {
      setState({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  return (
    <div className={toolbar ? "w-full sm:w-auto" : "w-full"}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={onPick}
        className="hidden"
        aria-label={`Import a document (${SUPPORTED_LABEL})`}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => {
          setState({ kind: "idle" });
          inputRef.current?.click();
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${toolbar ? "px-4" : "w-full px-3"}`}
      >
        {working ? "Importing…" : "Import file"}
      </button>

      <p className={`mt-1.5 text-xs text-gray-500 ${toolbar ? "max-w-[15rem]" : ""}`}>
        Supported: {SUPPORTED_LABEL}. {LIMIT_LABEL}.
      </p>

      <div aria-live="polite">
        {state.kind === "working" && (
          <p className="mt-2 text-xs text-gray-600">Reading and converting “{state.name}”…</p>
        )}
        {state.kind === "done" && state.warnings.length === 0 && (
          <p className="mt-2 text-xs text-green-700">Imported “{state.title}”. Opening…</p>
        )}
      </div>

      {state.kind === "error" && (
        <p role="alert" className={`mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 ${toolbar ? "max-w-xs" : ""}`}>
          {state.message}
        </p>
      )}

      {state.kind === "done" && state.warnings.length > 0 && (
        <div className={`mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 ${toolbar ? "max-w-xs" : ""}`}>
          <p className="font-medium">Imported “{state.title}” with changes:</p>
          <ul className="mt-1 list-disc pl-4">
            {state.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => open(state.id)}
            className="mt-2 rounded bg-blue-600 px-2 py-1 font-medium text-white hover:bg-blue-700"
          >
            Open document
          </button>
        </div>
      )}
    </div>
  );
}
