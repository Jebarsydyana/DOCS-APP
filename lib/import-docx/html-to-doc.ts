/**
 * Converts the HTML that `mammoth` produces for a .docx into the editor's
 * ProseMirror JSON. No DOM and no extra packages: mammoth's output is small,
 * regular and well-formed, so a tiny tokenizer + tree walk is enough.
 *
 * Only the node/mark types the editor schema allows are emitted:
 *   doc, paragraph, heading (1-3), bulletList, orderedList, listItem, text,
 *   marks: bold, italic, underline.
 * Anything else (tables, images, links, deeper headings) is flattened and
 * reported in `warnings` so the user is told, not silently surprised.
 */

export type PMMark = { type: "bold" | "italic" | "underline" };
export type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
};
export type PMDoc = { type: "doc"; content: PMNode[] };

export type ConvertResult = { doc: PMDoc; warnings: string[]; isEmpty: boolean };

type HNode = { tag: string; children: (HNode | string)[] };

const VOID = new Set(["br", "img", "hr", "meta", "link", "input"]);

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function safeChar(cp: number): string {
  try {
    return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
  } catch {
    return "";
  }
}

function parseHtml(html: string): HNode {
  const root: HNode = { tag: "#root", children: [] };
  const stack: HNode[] = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>|([^<]+)|</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[4] !== undefined) {
      top.children.push(decode(m[4]));
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      if (m[1]) {
        // closing tag: pop to the matching open tag, ignore stray ones
        const idx = stack.map((n) => n.tag).lastIndexOf(tag);
        if (idx > 0) stack.length = idx;
      } else {
        const node: HNode = { tag, children: [] };
        top.children.push(node);
        if (!VOID.has(tag) && !m[3]) stack.push(node);
      }
    }
  }
  return root;
}

type Ctx = { warnings: Set<string>; images: number; tables: number };

function textOf(n: HNode | string): string {
  return typeof n === "string" ? n : n.children.map(textOf).join("");
}

function inlineNodes(children: (HNode | string)[], marks: PMMark["type"][], ctx: Ctx): PMNode[] {
  const out: PMNode[] = [];
  for (const c of children) {
    if (typeof c === "string") {
      const text = c.replace(/[\r\n\t]+/g, " ");
      if (text) {
        out.push({
          type: "text",
          text,
          ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
        });
      }
      continue;
    }
    switch (c.tag) {
      case "strong":
      case "b":
        out.push(...inlineNodes(c.children, addMark(marks, "bold"), ctx));
        break;
      case "em":
      case "i":
        out.push(...inlineNodes(c.children, addMark(marks, "italic"), ctx));
        break;
      case "u":
        out.push(...inlineNodes(c.children, addMark(marks, "underline"), ctx));
        break;
      case "br":
        out.push({ type: "text", text: " " });
        break;
      case "img":
        ctx.images++;
        break;
      case "ul":
      case "ol":
      case "p":
      case "table":
        break; // block content is handled by the caller, never inline
      default:
        // a, span, s, sub, sup, ... keep the text, drop the formatting
        out.push(...inlineNodes(c.children, marks, ctx));
    }
  }
  return mergeText(out);
}

function addMark(marks: PMMark["type"][], m: PMMark["type"]) {
  return marks.includes(m) ? marks : [...marks, m];
}

function mergeText(nodes: PMNode[]): PMNode[] {
  const out: PMNode[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.type === "text" &&
      n.type === "text" &&
      JSON.stringify(prev.marks ?? []) === JSON.stringify(n.marks ?? [])
    ) {
      prev.text = (prev.text ?? "") + (n.text ?? "");
    } else {
      out.push({ ...n });
    }
  }
  return out;
}

function isBlank(nodes: PMNode[]) {
  return nodes.every((n) => n.type !== "text" || !(n.text ?? "").trim());
}

function paragraph(children: (HNode | string)[], ctx: Ctx): PMNode | null {
  const content = inlineNodes(children, [], ctx);
  if (isBlank(content)) return null; // docx files are full of empty paragraphs
  return { type: "paragraph", content };
}

function listNode(n: HNode, ctx: Ctx): PMNode | null {
  const items: PMNode[] = [];
  for (const li of n.children) {
    if (typeof li === "string" || li.tag !== "li") continue;
    const inline: (HNode | string)[] = [];
    const nested: PMNode[] = [];
    for (const c of li.children) {
      if (typeof c !== "string" && (c.tag === "ul" || c.tag === "ol")) {
        const l = listNode(c, ctx);
        if (l) nested.push(l);
      } else if (typeof c !== "string" && c.tag === "p") {
        inline.push(...c.children, " ");
      } else {
        inline.push(c);
      }
    }
    let first = paragraph(inline, ctx);
    if (!first) {
      if (!nested.length) continue; // empty bullet
      first = { type: "paragraph" }; // item that only holds a sub-list
    }
    items.push({ type: "listItem", content: [first, ...nested] });
  }
  if (!items.length) return null;
  return { type: n.tag === "ol" ? "orderedList" : "bulletList", content: items };
}

function blocks(children: (HNode | string)[], ctx: Ctx): PMNode[] {
  const out: PMNode[] = [];
  let loose: (HNode | string)[] = [];
  const flush = () => {
    if (loose.length) {
      const p = paragraph(loose, ctx);
      if (p) out.push(p);
      loose = [];
    }
  };

  for (const c of children) {
    if (typeof c === "string") {
      loose.push(c);
      continue;
    }
    if (/^h[1-6]$/.test(c.tag)) {
      flush();
      const level = Number(c.tag[1]);
      if (level > 3) ctx.warnings.add("Headings deeper than level 3 were imported as level 3.");
      const content = inlineNodes(c.children, [], ctx);
      if (!isBlank(content)) {
        out.push({ type: "heading", attrs: { level: Math.min(level, 3) }, content });
      }
    } else if (c.tag === "p") {
      flush();
      const p = paragraph(c.children, ctx);
      if (p) out.push(p);
    } else if (c.tag === "ul" || c.tag === "ol") {
      flush();
      const l = listNode(c, ctx);
      if (l) out.push(l);
    } else if (c.tag === "table") {
      flush();
      ctx.tables++;
      for (const row of collect(c, "tr")) {
        const cells = collect(row, "td", "th")
          .map((cell) => textOf(cell).replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (cells.length) out.push({ type: "paragraph", content: [{ type: "text", text: cells.join(" | ") }] });
      }
    } else if (c.tag === "img") {
      ctx.images++;
    } else if (["div", "section", "body", "html", "thead", "tbody", "blockquote"].includes(c.tag)) {
      flush();
      out.push(...blocks(c.children, ctx));
    } else {
      loose.push(c); // inline element sitting at top level
    }
  }
  flush();
  return out;
}

function collect(n: HNode, ...tags: string[]): HNode[] {
  const out: HNode[] = [];
  for (const c of n.children) {
    if (typeof c === "string") continue;
    if (tags.includes(c.tag)) out.push(c);
    else out.push(...collect(c, ...tags));
  }
  return out;
}

export function htmlToDoc(html: string): ConvertResult {
  const ctx: Ctx = { warnings: new Set(), images: 0, tables: 0 };
  const content = blocks(parseHtml(html).children, ctx);
  const warnings = [...ctx.warnings];
  if (ctx.images) warnings.push(`${ctx.images} image${ctx.images === 1 ? "" : "s"} skipped (images aren't supported yet).`);
  if (ctx.tables) warnings.push(`${ctx.tables} table${ctx.tables === 1 ? "" : "s"} converted to plain text rows.`);

  const isEmpty = content.length === 0;
  return {
    // ProseMirror needs at least one block, so an empty result is one empty paragraph
    doc: { type: "doc", content: isEmpty ? [{ type: "paragraph" }] : content },
    warnings,
    isEmpty,
  };
}
