"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";

import { useAutosave } from "@/hooks/useAutosave";
import { ConflictError, saveDocument, type ServerDoc } from "@/lib/documents-client";
import { DEFAULT_TITLE, normalizeContent, type DocumentPatch } from "@/lib/editor-types";
import { patchAlreadyApplied } from "@/lib/stable-equal";

import { getExtensions } from "./extensions";
import SaveStatus from "./SaveStatus";
import TitleInput from "./TitleInput";
import Toolbar from "./Toolbar";
import "./editor.css";

type Props = {
  documentId: string;
  initialTitle: string;
  initialContent: unknown;
  initialVersion: number;
  canEdit: boolean;
  ownerLabel: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export default function DocumentEditor({
  documentId, initialTitle, initialContent, initialVersion, canEdit, ownerLabel, createdAt, updatedAt: initialUpdatedAt,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const versionRef = useRef(initialVersion); // concurrency token; advanced after every successful save
  const conflictRef = useRef<ServerDoc | null>(null);

  const { status, savedAt, error, schedule, flush, resolveConflict, discard } = useAutosave({
    save: async (patch: DocumentPatch) => {
      try {
        const res = await saveDocument(documentId, { ...patch, version: versionRef.current });
        versionRef.current = res.version;
        setUpdatedAt(res.updatedAt);
        if (patch.title !== undefined) router.refresh(); // refresh sidebar titles; editor state is kept
      } catch (err) {
        if (err instanceof ConflictError && err.current) {
          // A save whose response was lost (timeout/offline) may already have been applied.
          // Retrying it would then look like a conflict with ourselves, so check first.
          if (patchAlreadyApplied(patch, err.current)) {
            versionRef.current = err.current.version;
            return;
          }
          conflictRef.current = err.current;
        }
        throw err;
      }
    },
  });

  const editor = useEditor({
    extensions: getExtensions(),
    content: normalizeContent(initialContent),
    editable: canEdit,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        id: "document-body",
        class: "tiptap-content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Document body",
      },
    },
    onUpdate: ({ editor }) => schedule({ content: editor.getJSON() }),
  });

  useEffect(() => {
    if (!canEdit) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flush, canEdit]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    schedule({ title: value.trim() || DEFAULT_TITLE });
  };

  // Explicit user choices after a conflict. Nothing is overwritten silently.
  const keepMine = () => {
    if (conflictRef.current) versionRef.current = conflictRef.current.version; // build on top of theirs
    resolveConflict();
  };
  const loadLatest = () => {
    discard(); // so the browser doesn't also show a "leave site?" prompt
    window.location.reload();
  };

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TitleInput value={title} onChange={onTitleChange} onEnter={() => editor?.commands.focus("start")} readOnly={!canEdit} />
          {!canEdit && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">View only</span>}
        </div>
        {canEdit && (
          <SaveStatus
            status={status}
            savedAt={savedAt}
            error={error}
            onRetry={() => void flush()}
            onKeepMine={keepMine}
            onLoadLatest={loadLatest}
          />
        )}
      </header>

      <div className="flex flex-wrap gap-x-4 border-b border-gray-100 bg-white px-4 py-1 text-xs text-gray-500">
        <span>Owner: {ownerLabel}</span>
        <span>Created <time dateTime={createdAt} suppressHydrationWarning>{fmt(createdAt)}</time></span>
        <span>Last edited <time dateTime={updatedAt} suppressHydrationWarning>{fmt(updatedAt)}</time></span>
      </div>

      {canEdit && (
        <div className="sticky top-0 z-10">
          <Toolbar editor={editor} />
        </div>
      )}

      <div className="px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-md border border-gray-200 bg-white px-10 py-10 shadow-sm">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
