import type { ConvertResult, PMNode } from "./html-to-doc";

/**
 * Markdown -> editor JSON (no dependencies).
 * Supported: headings (# and underline style), paragraphs, **bold**, *italic*,
 * bullet / numbered / nested lists.
 * Flattened with a warning: links, images, code, block quotes, tables, strikethrough,
 * headings deeper than 3. The editor schema has no nodes for those.
 */

type Mark = "bold" | "italic";
type Ctx = { warnings: Set<string>; links: number; images: number };
type ListItem = { indent: number; ordered: boolean; text: string };

const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;

function textNode(text: string, active: Set<Mark>): PMNode {
  const marks = (["bold", "italic"] as Mark[]).filter((m) => active.has(m)).map((type) => ({ type }));
  return { type: "text", text, ...(marks.length ? { marks } : {}) };
}

function merge(nodes: PMNode[]): PMNode[] {
  const out: PMNode[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (prev && JSON.stringify(prev.marks ?? []) === JSON.stringify(n.marks ?? [])) {
      prev.text = (prev.text ?? "") + (n.text ?? "");
    } else {
      out.push({ ...n });
    }
  }
  return out;
}

const blank = (nodes: PMNode[]) => nodes.every((n) => !(n.text ?? "").trim());

function parseInline(s: string, ctx: Ctx, base: Set<Mark> = new Set()): PMNode[] {
  const out: PMNode[] = [];
  const active = new Set<Mark>(base);
  let buf = "";
  let strike = false;
  const flush = () => {
    if (buf) out.push(textNode(buf, active));
    buf = "";
  };
  const spaceAt = (j: number) => j < 0 || j >= s.length || /\s/.test(s[j]);
  const wordAt = (j: number) => j >= 0 && j < s.length && /\w/.test(s[j]);

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (c === "\\" && i + 1 < s.length && /[\\`*_{}[\]()#+\-.!~|>]/.test(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i) {
        buf += s.slice(i + 1, j);
        i = j + 1;
        continue;
      }
    }
    if (c === "!" || c === "[") {
      const rest = s.slice(i);
      const img = c === "!" ? /^!\[([^\]]*)\]\(([^)]*)\)/.exec(rest) : null;
      if (img) {
        ctx.images++;
        buf += img[1];
        i += img[0].length;
        continue;
      }
      const link = c === "[" ? /^\[([^\]]+)\]\(([^)]*)\)/.exec(rest) : null;
      if (link) {
        ctx.links++;
        flush();
        out.push(...parseInline(link[1], ctx, active));
        i += link[0].length;
        continue;
      }
    }
    if (s.startsWith("~~", i)) {
      if (strike && !spaceAt(i - 1)) {
        strike = false;
        i += 2;
        continue;
      }
      if (!strike && !spaceAt(i + 2) && s.indexOf("~~", i + 2) > i + 2) {
        strike = true;
        ctx.warnings.add("Strikethrough isn't supported; that text was imported without it.");
        i += 2;
        continue;
      }
    }
    if (c === "*" || c === "_") {
      const double = s[i + 1] === c;
      const marker = double ? c + c : c;
      const mark: Mark = double ? "bold" : "italic";
      const len = marker.length;
      const intraword = c === "_";

      if (active.has(mark) && !spaceAt(i - 1) && !(intraword && wordAt(i + len))) {
        flush();
        active.delete(mark);
        i += len;
        continue;
      }
      if (
        !active.has(mark) &&
        !spaceAt(i + len) &&
        !(intraword && wordAt(i - 1)) &&
        s.indexOf(marker, i + len) > i + len
      ) {
        flush();
        active.add(mark);
        i += len;
        continue;
      }
      buf += marker; // not formatting, keep literally (e.g. "5 * 3")
      i += len;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return merge(out);
}

function paragraph(text: string, ctx: Ctx): PMNode | null {
  const content = parseInline(text.trim(), ctx);
  return blank(content) ? null : { type: "paragraph", content };
}

function listItem(text: string, ctx: Ctx): PMNode {
  return { type: "listItem", content: [paragraph(text, ctx) ?? { type: "paragraph" }] };
}

function buildLists(items: ListItem[], ctx: Ctx): PMNode[] {
  type Frame = { indent: number; ordered: boolean; list: PMNode; parent: PMNode[] };
  const root: PMNode[] = [];
  const stack: Frame[] = [];

  const open = (it: ListItem, parent: PMNode[]): Frame => {
    const list: PMNode = { type: it.ordered ? "orderedList" : "bulletList", content: [] };
    parent.push(list);
    const frame = { indent: it.indent, ordered: it.ordered, list, parent };
    stack.push(frame);
    return frame;
  };

  for (const it of items) {
    while (stack.length && stack[stack.length - 1].indent > it.indent) stack.pop();
    let f: Frame | undefined = stack[stack.length - 1];
    if (!f) {
      f = open(it, root);
    } else if (f.indent < it.indent) {
      const siblings = f.list.content!;
      f = open(it, siblings[siblings.length - 1].content!); // nest under the previous item
    } else if (f.ordered !== it.ordered) {
      const parent = f.parent;
      stack.pop();
      f = open(it, parent);
    }
    f.list.content!.push(listItem(it.text, ctx));
  }
  return root;
}

export function markdownToDoc(src: string): ConvertResult {
  const ctx: Ctx = { warnings: new Set(), links: 0, images: 0 };
  const lines = src.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const out: PMNode[] = [];
  let para: string[] = [];
  let fence: string | null = null;

  const flushPara = () => {
    if (!para.length) return;
    const p = paragraph(para.join(" "), ctx);
    if (p) out.push(p);
    para = [];
  };
  const heading = (text: string, level: number) => {
    if (level > 3) ctx.warnings.add("Headings deeper than level 3 were imported as level 3.");
    const content = parseInline(text.trim(), ctx);
    if (!blank(content)) out.push({ type: "heading", attrs: { level: Math.min(level, 3) }, content });
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // fenced code: keep the lines as plain paragraphs
    if (fence) {
      if (line.trim().startsWith(fence)) fence = null;
      else if (line.trim()) out.push({ type: "paragraph", content: [{ type: "text", text: line.replace(/\s+$/, "") }] });
      continue;
    }
    const fenceOpen = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceOpen) {
      flushPara();
      fence = fenceOpen[1].slice(0, 3);
      ctx.warnings.add("Code blocks were imported as plain paragraphs.");
      continue;
    }

    if (!line.trim()) {
      flushPara();
      continue;
    }

    const h = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
    if (h) {
      flushPara();
      heading(h[2], h[1].length);
      continue;
    }

    if (para.length && /^\s{0,3}=+\s*$/.test(line)) {
      heading(para.join(" "), 1);
      para = [];
      continue;
    }
    if (para.length && /^\s{0,3}-+\s*$/.test(line)) {
      heading(para.join(" "), 2);
      para = [];
      continue;
    }
    if (HR_RE.test(line)) {
      flushPara();
      continue;
    }
    if (/^\s{0,3}\[[^\]]+\]:\s+\S+/.test(line)) continue; // link reference definition

    if (LIST_RE.test(line)) {
      flushPara();
      const items: ListItem[] = [];
      let j = i;
      for (; j < lines.length; j++) {
        const l = lines[j];
        const m = LIST_RE.exec(l);
        if (m && !HR_RE.test(l)) {
          items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] });
        } else if (!l.trim()) {
          // a blank line only continues the list if another list line follows
          let k = j + 1;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && LIST_RE.test(lines[k]) && !HR_RE.test(lines[k])) {
            j = k - 1;
            continue;
          }
          break;
        } else if (/^\s{2,}\S/.test(l) && items.length) {
          items[items.length - 1].text += " " + l.trim(); // wrapped item text
        } else {
          break;
        }
      }
      out.push(...buildLists(items, ctx));
      i = j - 1;
      continue;
    }

    const quote = /^\s{0,3}>\s?(.*)$/.exec(line);
    if (quote) {
      ctx.warnings.add("Block quotes were imported as plain paragraphs.");
      line = quote[1];
      if (!line.trim()) {
        flushPara();
        continue;
      }
    }

    if (/^\s*\|/.test(line)) {
      flushPara();
      ctx.warnings.add("Tables were imported as plain text rows.");
      if (/^[\s|:-]+$/.test(line) && line.includes("-")) continue; // separator row
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      const p = paragraph(cells.join(" | "), ctx);
      if (p) out.push(p);
      continue;
    }

    para.push(line.trim());
  }
  flushPara();

  const warnings = [...ctx.warnings];
  if (ctx.links) warnings.push(`${ctx.links} link${ctx.links === 1 ? "" : "s"} imported as plain text (links aren't supported yet).`);
  if (ctx.images) warnings.push(`${ctx.images} image${ctx.images === 1 ? "" : "s"} replaced by their alt text.`);

  const isEmpty = out.length === 0;
  return { doc: { type: "doc", content: isEmpty ? [{ type: "paragraph" }] : out }, warnings, isEmpty };
}
