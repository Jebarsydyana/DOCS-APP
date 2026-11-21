// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import { getExtensions } from "../extensions";
import { EMPTY_DOC, normalizeContent } from "../../../lib/editor-types";
import { documentPatchSchema } from "../../../lib/document-schemas";

const make = (content?: unknown) => new Editor({ extensions: getExtensions(), content: content as never });

describe("formatting commands", () => {
  it("applies bold, italic and underline as marks", () => {
    const e = make("<p>hello</p>");
    e.chain().selectAll().toggleBold().toggleItalic().toggleUnderline().run();
    expect(e.isActive("bold") && e.isActive("italic") && e.isActive("underline")).toBe(true);
    const marks = e.getJSON().content![0].content![0].marks!.map((m) => m.type).sort();
    expect(marks).toEqual(["bold", "italic", "underline"]);
  });

  it("toggles marks off again", () => {
    const e = make("<p>hello</p>");
    e.chain().selectAll().toggleBold().run();
    e.chain().selectAll().toggleBold().run();
    expect(e.isActive("bold")).toBe(false);
  });

  it("sets heading levels and reports the active level", () => {
    const e = make("<p>hello</p>");
    e.chain().selectAll().toggleHeading({ level: 2 }).run();
    expect(e.isActive("heading", { level: 2 })).toBe(true);
    expect(e.isActive("heading", { level: 1 })).toBe(false);
    expect(e.getJSON().content![0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
  });

  it("creates bullet and numbered lists", () => {
    const e = make("<p>one</p>");
    e.chain().selectAll().toggleBulletList().run();
    expect(e.isActive("bulletList")).toBe(true);
    e.chain().selectAll().toggleOrderedList().run();
    expect(e.isActive("orderedList")).toBe(true);
    expect(e.getJSON().content![0].type).toBe("orderedList");
  });
});

describe("persistence format", () => {
  it("survives a JSON stringify/parse + reload round trip", () => {
    const e = make("<h1>T</h1><p><strong>b</strong> <em>i</em> <u>u</u></p><ul><li><p>a</p></li></ul><ol><li><p>b</p></li></ol>");
    const saved = JSON.parse(JSON.stringify(e.getJSON())); // what is written to / read from jsonb
    expect(make(saved).getJSON()).toEqual(e.getJSON());
    expect(saved.content.map((n: { type: string }) => n.type)).toEqual(["heading", "paragraph", "bulletList", "orderedList"]);
  });

  it("opens the DB default {type:'doc',content:[]} as an editable empty document", () => {
    const normalized = normalizeContent({ type: "doc", content: [] });
    expect(normalized).toEqual(EMPTY_DOC);
    expect(() => make(normalized)).not.toThrow();
  });

  it("falls back for null or malformed content", () => {
    expect(normalizeContent(null)).toEqual(EMPTY_DOC);
    expect(normalizeContent({ foo: 1 })).toEqual(EMPTY_DOC);
  });
});

describe("save payload validation", () => {
  const doc = { type: "doc", content: [{ type: "paragraph" }] };
  it("accepts title and/or content with a version", () => {
    expect(documentPatchSchema.safeParse({ version: 1, title: " Hi " }).data?.title).toBe("Hi");
    expect(documentPatchSchema.safeParse({ version: 2, content: doc }).success).toBe(true);
  });
  it("rejects empty patches, blank titles, bad versions and non-doc content", () => {
    expect(documentPatchSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(documentPatchSchema.safeParse({ version: 1, title: "  " }).success).toBe(false);
    expect(documentPatchSchema.safeParse({ title: "x" }).success).toBe(false);
    expect(documentPatchSchema.safeParse({ version: 1, content: { type: "paragraph" } }).success).toBe(false);
  });
});
