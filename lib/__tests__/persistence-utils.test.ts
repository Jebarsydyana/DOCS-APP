import { describe, it, expect } from "vitest";
import { stableStringify, patchAlreadyApplied } from "../stable-equal";
import { isValidDocument } from "../editor-schema";

describe("stable comparison (jsonb reorders keys)", () => {
  it("ignores key order", () => {
    expect(stableStringify({ a: 1, b: { c: 2, d: 3 } })).toBe(stableStringify({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it("detects an already-applied save after a lost response", () => {
    const sent = { type: "doc", content: [{ type: "paragraph", attrs: { x: 1, y: 2 } }] };
    const stored = { content: [{ attrs: { y: 2, x: 1 }, type: "paragraph" }], type: "doc" };
    expect(patchAlreadyApplied({ content: sent }, { title: "t", content: stored })).toBe(true);
    expect(patchAlreadyApplied({ title: "t" }, { title: "t", content: stored })).toBe(true);
  });

  it("does not treat a real conflict as applied", () => {
    const stored = { type: "doc", content: [{ type: "paragraph" }] };
    expect(patchAlreadyApplied({ title: "mine" }, { title: "theirs", content: stored })).toBe(false);
    expect(patchAlreadyApplied({ content: { type: "doc", content: [] } }, { title: "t", content: stored })).toBe(false);
    expect(patchAlreadyApplied({}, { title: "t", content: stored })).toBe(false);
  });
});

describe("server-side document validation", () => {
  const para = (t: string) => ({ type: "paragraph", content: [{ type: "text", text: t }] });

  it("accepts documents the editor can produce", () => {
    expect(isValidDocument({ type: "doc", content: [para("hi")] })).toBe(true);
    expect(
      isValidDocument({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "T", marks: [{ type: "bold" }, { type: "underline" }] }] },
          { type: "bulletList", content: [{ type: "listItem", content: [para("a")] }] },
        ],
      }),
    ).toBe(true);
  });

  it("rejects unknown nodes, disabled nodes, empty docs and garbage", () => {
    expect(isValidDocument({ type: "doc", content: [{ type: "script" }] })).toBe(false);
    expect(isValidDocument({ type: "doc", content: [{ type: "blockquote", content: [para("x")] }] })).toBe(false);
    expect(isValidDocument({ type: "doc", content: [] })).toBe(false);
    expect(isValidDocument("nope")).toBe(false);
    expect(isValidDocument(null)).toBe(false);
  });
});
