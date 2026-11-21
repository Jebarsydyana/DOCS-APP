import { describe, it, expect } from "vitest";
import { getExtension, titleFromFilename, validateFileMeta, SUPPORTED_LABEL } from "../constraints";

describe("validateFileMeta", () => {
  it("accepts .txt, .md and .docx (any case)", () => {
    expect(validateFileMeta("a.txt", 10)).toMatchObject({ ok: true, ext: ".txt" });
    expect(validateFileMeta("README.MD", 10)).toMatchObject({ ok: true, ext: ".md" });
    expect(validateFileMeta("x.DOCX", 10)).toMatchObject({ ok: true, ext: ".docx" });
  });
  it("rejects unsupported types out loud and lists supported ones", () => {
    const r = validateFileMeta("report.pdf", 10);
    expect(r).toMatchObject({ ok: false });
    expect((r as { error: string }).error).toContain(".pdf");
    expect((r as { error: string }).error).toContain(SUPPORTED_LABEL);
  });
  it("explains .doc and missing extensions", () => {
    expect(validateFileMeta("old.doc", 10)).toMatchObject({ ok: false, error: expect.stringMatching(/\.docx/) });
    expect(validateFileMeta("noext", 10)).toMatchObject({ ok: false, error: expect.stringMatching(/no extension/) });
  });
  it("rejects empty and oversized files", () => {
    expect(validateFileMeta("a.txt", 0)).toMatchObject({ ok: false, error: expect.stringMatching(/empty/) });
    expect(validateFileMeta("a.txt", 2 * 1024 * 1024)).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) });
    expect(validateFileMeta("a.docx", 3 * 1024 * 1024)).toMatchObject({ ok: true });
  });
});

describe("names", () => {
  it("getExtension uses the last dot", () => {
    expect(getExtension("notes.v2.md")).toBe(".md");
    expect(getExtension("C:\\docs\\a.TXT")).toBe(".txt");
    expect(getExtension("none")).toBe("");
  });
  it("titleFromFilename drops the extension and falls back", () => {
    expect(titleFromFilename("Meeting  notes.md")).toBe("Meeting notes");
    expect(titleFromFilename(".md")).toBe("Imported document");
    expect(titleFromFilename("a".repeat(300) + ".txt")).toHaveLength(200);
  });
});
