import type { ConvertResult, PMNode } from "./html-to-doc";

/** Plain text -> editor JSON: every non-blank line becomes one paragraph. */
export function textToDoc(src: string): ConvertResult {
  const content: PMNode[] = [];
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\t/g, "    ").replace(/\s+$/, "");
    if (line.trim()) content.push({ type: "paragraph", content: [{ type: "text", text: line }] });
  }
  const isEmpty = content.length === 0;
  return {
    doc: { type: "doc", content: isEmpty ? [{ type: "paragraph" }] : content },
    warnings: [],
    isEmpty,
  };
}
