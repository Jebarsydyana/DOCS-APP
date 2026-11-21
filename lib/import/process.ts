import {
  MAX_CONTENT_JSON_BYTES,
  titleFromFilename,
  validateFileMeta,
  type SupportedExt,
} from "./constraints";
import type { ConvertResult, PMDoc } from "./html-to-doc";
import { markdownToDoc } from "./markdown-to-doc";
import { checkDocx } from "./zip-check";
import { textToDoc } from "./text-to-doc";

export type ImportInput = { name: string; bytes: Uint8Array };

export type ImportResult =
  | { ok: true; ext: SupportedExt; title: string; content: PMDoc; warnings: string[] }
  | { ok: false; error: string };

const fail = (error: string): ImportResult => ({ ok: false, error });

/**
 * Whole import pipeline up to (not including) the database:
 * validate type + size -> read -> convert -> check empty -> check final size -> title.
 * Pure and never throws, so it can be unit-tested without a server.
 */
export async function processImport({ name, bytes }: ImportInput): Promise<ImportResult> {
  // Use the real byte length, never a size the client claimed.
  const meta = validateFileMeta(name, bytes.length);
  if (!meta.ok) return fail(meta.error);

  let converted: ConvertResult;

  if (meta.ext === ".docx") {
    const check = checkDocx(bytes); // cheap safety checks first (type, damage, zip bombs)
    if (!check.ok) return fail(check.error);
    const { convertDocx } = await import("./docx"); // mammoth is loaded only for real .docx files
    const r = await convertDocx(bytes);
    if (!r.ok) return fail(r.error);
    converted = r;
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); // also strips a BOM
    } catch {
      return fail("This file isn't valid UTF-8 text. Re-save it as UTF-8 and try again.");
    }
    if (text.includes("\u0000")) return fail("This looks like a binary file, not text.");
    if (!text.trim()) return fail("This file has no text to import.");
    converted = meta.ext === ".md" ? markdownToDoc(text) : textToDoc(text);
  }

  if (converted.isEmpty) return fail("This file has no text to import.");

  if (new TextEncoder().encode(JSON.stringify(converted.doc)).length > MAX_CONTENT_JSON_BYTES) {
    return fail("This file is too large to edit as a document. Split it into smaller files.");
  }

  return {
    ok: true,
    ext: meta.ext,
    title: titleFromFilename(name),
    content: converted.doc,
    warnings: converted.warnings,
  };
}
