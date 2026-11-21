import { getSchema } from "@tiptap/core";
import { getSchemaExtensions } from "../components/editor/extensions";

const schema = getSchema(getSchemaExtensions());

/**
 * Server-side check that stored content is a valid document for OUR editor schema.
 * Without it, a hand-crafted API call could store JSON the editor can't open, and the
 * next autosave from the editor would silently replace it.
 */
export function isValidDocument(content: unknown): boolean {
  try {
    schema.nodeFromJSON(content).check();
    return true;
  } catch {
    return false;
  }
}
