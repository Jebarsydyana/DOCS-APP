import { describe, it, expect } from "vitest";
import { htmlToDoc } from "../html-to-doc";

describe("htmlToDoc", () => {
  it("converts headings, paragraphs and marks", () => {
    const { doc, isEmpty } = htmlToDoc(
      "<h1>Title</h1><p>Hello <strong>bold</strong> <em>it</em> <u>un</u> &amp; more</p>"
    );
    expect(isEmpty).toBe(false);
    expect(doc.content[0]).toEqual({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Title" }],
    });
    const p = doc.content[1].content!;
    expect(p[0]).toEqual({ type: "text", text: "Hello " });
    expect(p[1]).toEqual({ type: "text", text: "bold", marks: [{ type: "bold" }] });
    expect(p[3]).toEqual({ type: "text", text: "it", marks: [{ type: "italic" }] });
    expect(p[5]).toEqual({ type: "text", text: "un", marks: [{ type: "underline" }] });
    expect(p[6]).toEqual({ type: "text", text: " & more" });
  });

  it("stacks nested marks", () => {
    const { doc } = htmlToDoc("<p><strong><em>both</em></strong></p>");
    expect(doc.content[0].content![0].marks).toEqual([{ type: "bold" }, { type: "italic" }]);
  });

  it("converts bullet, numbered and nested lists", () => {
    const { doc } = htmlToDoc("<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul><ol><li>one</li></ol>");
    const [bullets, numbered] = doc.content;
    expect(bullets.type).toBe("bulletList");
    expect(bullets.content).toHaveLength(2);
    expect(bullets.content![0].content![1].type).toBe("bulletList"); // nested
    expect(numbered.type).toBe("orderedList");
  });

  it("clamps deep headings to level 3 and warns", () => {
    const { doc, warnings } = htmlToDoc("<h5>Deep</h5>");
    expect(doc.content[0].attrs).toEqual({ level: 3 });
    expect(warnings.join(" ")).toMatch(/level 3/);
  });

  it("drops empty paragraphs and reports an empty document", () => {
    const r = htmlToDoc("<p></p><p>   </p>");
    expect(r.isEmpty).toBe(true);
    expect(r.doc.content).toEqual([{ type: "paragraph" }]);
  });

  it("flattens tables, skips images and links, and warns about them", () => {
    const r = htmlToDoc(
      '<table><tr><td>A</td><td>B</td></tr></table><p><img src=""/>See <a href="https://x.dev">site</a></p>'
    );
    expect(r.doc.content[0].content![0].text).toBe("A | B");
    expect(r.doc.content[1].content![0].text).toBe("See site");
    expect(r.doc.content[1].content![0].marks).toBeUndefined();
    expect(r.warnings.join(" ")).toMatch(/table/);
    expect(r.warnings.join(" ")).toMatch(/image/);
  });

  it("never emits tag soup or script content as nodes", () => {
    const { doc } = htmlToDoc("<p>safe</p><script>alert(1)</script>");
    const json = JSON.stringify(doc);
    expect(json).not.toContain('"script"');
    for (const n of doc.content) expect(["paragraph", "heading", "bulletList", "orderedList"]).toContain(n.type);
  });
});
