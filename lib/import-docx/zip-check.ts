/**
 * Cheap safety checks on an uploaded .docx BEFORE it is handed to the parser.
 * A .docx is a zip file. We read only its central directory (the file list),
 * so nothing is decompressed here.
 */

export const MAX_DOCX_BYTES = 4 * 1024 * 1024; // Vercel Hobby request bodies cap at ~4.5 MB
export const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // zip-bomb guard
export const MAX_ZIP_ENTRIES = 2000;

export type DocxCheck = { ok: true } | { ok: false; error: string };

const fail = (error: string): DocxCheck => ({ ok: false, error });

export function checkDocx(buf: Uint8Array): DocxCheck {
  if (buf.length === 0) return fail("This file is empty.");
  if (buf.length > MAX_DOCX_BYTES) {
    return fail(`This file is too large. The maximum size is ${MAX_DOCX_BYTES / 1024 / 1024} MB.`);
  }

  // Old binary .doc files, and password-protected .docx files, both start with this OLE signature.
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return fail(
      "This looks like an old .doc file or a password-protected document. Open it in Word and save it as a regular .docx."
    );
  }
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) return fail("This isn't a valid .docx file.");

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Find the End Of Central Directory record (signature 50 4B 05 06), searching backwards.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return fail("This .docx file is damaged or incomplete.");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || offset === 0xffffffff) return fail("This .docx file is not supported (zip64).");
  if (count > MAX_ZIP_ENTRIES) return fail("This .docx file contains too many parts.");

  let total = 0;
  let hasDocumentXml = false;
  for (let n = 0; n < count; n++) {
    if (offset + 46 > buf.length || view.getUint32(offset, true) !== 0x02014b50) {
      return fail("This .docx file is damaged.");
    }
    const size = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLen > buf.length) return fail("This .docx file is damaged.");

    total += size;
    if (size === 0xffffffff || total > MAX_UNCOMPRESSED_BYTES) {
      return fail("This .docx file expands to an unreasonable size and was rejected.");
    }
    const name = new TextDecoder().decode(buf.subarray(offset + 46, offset + 46 + nameLen));
    if (name === "word/document.xml") hasDocumentXml = true;

    offset += 46 + nameLen + extraLen + commentLen;
  }

  if (!hasDocumentXml) return fail("This file doesn't look like a Word document.");
  return { ok: true };
}
