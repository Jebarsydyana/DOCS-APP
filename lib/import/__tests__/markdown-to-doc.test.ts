import { describe, it, expect } from "vitest";
import { markdownToDoc } from "../markdown-to-doc";
import { textToDoc } from "../text-to-doc";

describe("markdownToDoc", () => {
  it("converts headings and inline marks", () => {
    const { doc } = markdownToDoc("# Title\n\nHello **bold** and *it* and ***both***.");
    expect(doc.content[0]).toEqual({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] });
    const p = doc.content[1].content!;
    expect(p[1]).toEqual({ type: "text", text: "bold", marks: [{ type: "bold" }] });
    expect(p[3]).toEqual({ type: "text", text: "it", marks: [{ type: "italic" }] });
    expect(p[5].marks).toEqual([{ type: "bold" }, { type: "italic" }]);
  });
  it("supports underline-style headings and clamps deep ones", () => {
    const a = markdownToDoc("Big\n===\n\nSmall\n---").doc.content;
    expect(a[0].attrs).toEqual({ level: 1 });
    expect(a[1].attrs).toEqual({ level: 2 });
    const b = markdownToDoc("###### deep");
    expect(b.doc.content[0].attrs).toEqual({ level: 3 });
    expect(b.warnings.join(" ")).toMatch(/level 3/);
  });
  it("builds bullet, numbered and nested lists", () => {
    const { doc } = markdownToDoc("- a\n  - a1\n  - a2\n- b\n\n1. one\n2. two");
    expect(doc.content[0].type).toBe("bulletList");
    expect(doc.content[0].content).toHaveLength(2);
    expect(doc.content[0].content![0].content![1].type).toBe("bulletList");
    expect(doc.content[0].content![0].content![1].content).toHaveLength(2);
    expect(doc.content[1].type).toBe("orderedList");
    expect(doc.content[1].content).toHaveLength(2);
  });
  it("joins wrapped lines and splits paragraphs on blank lines", () => {
    const { doc } = markdownToDoc("line one\nline two\n\nnext");
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].content![0].text).toBe("line one line two");
  });
  it("flattens links, images, code and quotes with warnings", () => {
    const r = markdownToDoc("See [site](https://x.dev) ![alt](a.png)\n\n```\ncode line\n```\n\n> quoted");
    const texts = r.doc.content.map((n) => n.content![0].text);
    expect(texts[0]).toBe("See site alt");
    expect(texts[1]).toBe("code line");
    expect(texts[2]).toBe("quoted");
    expect(r.warnings.length).toBeGreaterThanOrEqual(4);
  });
  it("leaves stray asterisks and escapes alone", () => {
    const { doc } = markdownToDoc("5 * 3 = 15 and \\*not italic\\*");
    expect(doc.content[0].content![0].text).toBe("5 * 3 = 15 and *not italic*");
  });
  it("reports empty results", () => {
    expect(markdownToDoc("---\n\n").isEmpty).toBe(true);
    expect(markdownToDoc("").doc.content).toEqual([{ type: "paragraph" }]);
  });
  it("never emits empty text nodes", () => {
    const json = JSON.stringify(markdownToDoc("**\n\n- \n\n__x__").doc);
    expect(json).not.toContain('"text":""');
  });
});

describe("textToDoc", () => {
  it("makes one paragraph per non-blank line", () => {
    const { doc, isEmpty } = textToDoc("one\r\n\r\ntwo   \n  three");
    expect(isEmpty).toBe(false);
    expect(doc.content.map((n) => n.content![0].text)).toEqual(["one", "two", "  three"]);
  });
  it("detects whitespace-only input", () => {
    expect(textToDoc(" \n\t\n").isEmpty).toBe(true);
  });
});
