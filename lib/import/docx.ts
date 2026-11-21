import mammoth from "mammoth";
import { checkDocx } from "./zip-check";
import { htmlToDoc, type ConvertResult } from "./html-to-doc";

export type DocxImport =
  | ({ ok: true } & ConvertResult)
  | { ok: false; error: string };

/**
 * .docx bytes -> editor JSON (never throws).
 * `error` is a user-facing sentence you can show as-is.
 */
export async function convertDocx(bytes: Uint8Array): Promise<DocxImport> {
  const check = checkDocx(bytes);
  if (!check.ok) return check;

  try {
    const { value: html } = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      {
        // mammoth ignores underline by default; keep it
        styleMap: ["u => u"],
        // never embed images: drop them and let htmlToDoc report the count
        convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
      }
    );
    return { ok: true, ...htmlToDoc(html) };
  } catch {
    return { ok: false, error: "We couldn't read this .docx file. It may be damaged." };
  }
}
