import type { JSONContent } from "@tiptap/react";

/** Stored as Tiptap/ProseMirror JSON in documents.content (jsonb). */
export type DocumentContent = JSONContent;

export type DocumentPatch = {
  title?: string;
  content?: DocumentContent;
};

export const DEFAULT_TITLE = "Untitled";

export const EMPTY_DOC: DocumentContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/**
 * The DB default is {"type":"doc","content":[]}. A ProseMirror doc needs at least one
 * block, so an empty content array (or any malformed value) becomes one empty paragraph.
 */
export function normalizeContent(raw: unknown): DocumentContent {
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { type?: unknown }).type === "doc" &&
    Array.isArray((raw as { content?: unknown }).content) &&
    (raw as { content: unknown[] }).content.length > 0
  ) {
    return raw as DocumentContent;
  }
  return EMPTY_DOC;
}
