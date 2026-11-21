/**
 * Single source of truth for what can be imported.
 * Pure (no Node or React imports) so the browser and the server share it.
 */

const MB = 1024 * 1024;

export const SUPPORTED_FORMATS = [
  { ext: ".txt", label: "Plain text", maxBytes: 1 * MB },
  { ext: ".md", label: "Markdown", maxBytes: 1 * MB },
  { ext: ".docx", label: "Word", maxBytes: 4 * MB }, // Vercel Hobby request bodies cap near 4.5 MB
] as const;

export type SupportedExt = (typeof SUPPORTED_FORMATS)[number]["ext"];

export const MAX_DOCX_BYTES = 4 * MB;
/** The largest file any type may be; used to reject huge uploads before reading them. */
export const MAX_UPLOAD_BYTES = Math.max(...SUPPORTED_FORMATS.map((f) => f.maxBytes));
/** The document editor refuses saves above 2 MB of JSON, so imports must stay under it too. */
export const MAX_CONTENT_JSON_BYTES = 2 * MB;

export const ACCEPT_ATTR = SUPPORTED_FORMATS.map((f) => f.ext).join(",");
export const SUPPORTED_LABEL = SUPPORTED_FORMATS.map((f) => f.ext).join(", ");
export const LIMIT_LABEL = `Max ${SUPPORTED_FORMATS[0].maxBytes / MB} MB (.docx: ${MAX_DOCX_BYTES / MB} MB)`;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
}

/** ".md" from "notes.v2.MD"; "" when there is no extension. */
export function getExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 || (dot === 0 && base.length > 1) ? base.slice(dot).toLowerCase() : "";
}

export type MetaCheck =
  | { ok: true; ext: SupportedExt; maxBytes: number }
  | { ok: false; error: string };

/** Checks the file name (type) and size. Used in the browser first and again on the server. */
export function validateFileMeta(name: string, size: number): MetaCheck {
  const ext = getExtension(name);

  if (!ext) {
    return { ok: false, error: `This file has no extension. Supported types: ${SUPPORTED_LABEL}.` };
  }
  if (ext === ".doc") {
    return { ok: false, error: "Old .doc files aren't supported. In Word, choose Save As and pick .docx." };
  }
  const format = SUPPORTED_FORMATS.find((f) => f.ext === ext);
  if (!format) {
    const shown = /^\.[a-z0-9]{1,10}$/.test(ext) ? `"${ext}" files` : "This file type";
    return { ok: false, error: `${shown} aren't supported. Supported types: ${SUPPORTED_LABEL}.` };
  }
  if (size === 0) return { ok: false, error: "This file is empty." };
  if (size > format.maxBytes) {
    return {
      ok: false,
      error: `This file is too large (${formatBytes(size)}). The limit for ${format.ext} files is ${formatBytes(format.maxBytes)}.`,
    };
  }
  return { ok: true, ext: format.ext, maxBytes: format.maxBytes };
}

/** "Q3_notes-final.md" -> "Q3_notes-final". Never empty, max 200 chars (the editor's title limit). */
export function titleFromFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/\.[^.]*$/, "");
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 200).trim();
  return cleaned || "Imported document";
}
