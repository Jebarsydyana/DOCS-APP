import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

/** Nodes and marks that define what a document may contain (also used server-side for validation). */
export function getSchemaExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
    }),
    Underline,
  ];
}

/** Full browser extension list = schema + UI-only extensions. */
export function getExtensions() {
  return [...getSchemaExtensions(), Placeholder.configure({ placeholder: "Start writing…" })];
}
