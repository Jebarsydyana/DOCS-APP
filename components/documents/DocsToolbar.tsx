"use client";

import { useState, useTransition } from "react";
import { createBlankDocument } from "@/app/docs/document-actions";
import ImportDocumentButton from "./ImportDocumentButton";

/** The two main actions on the My documents page: New document and Import file. */
export default function DocsToolbar() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function create() {
    setError("");
    startTransition(async () => {
      try {
        await createBlankDocument(); // redirects to the new document
      } catch {
        setError("Couldn't create the document. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div>
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Creating…" : "+ New document"}
        </button>
        {error && (
          <p role="alert" className="mt-2 max-w-xs text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      <ImportDocumentButton variant="toolbar" />
    </div>
  );
}
