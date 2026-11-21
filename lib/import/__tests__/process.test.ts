import { describe, it, expect } from "vitest";
import { processImport } from "../process";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("processImport", () => {
  it("imports a .txt file with the file name as title", async () => {
    const r = await processImport({ name: "My notes.txt", bytes: bytes("hello\nworld") });
    expect(r).toMatchObject({ ok: true, title: "My notes", ext: ".txt" });
    if (r.ok) expect(r.content.content).toHaveLength(2);
  });
  it("imports .md as structured content", async () => {
    const r = await processImport({ name: "a.md", bytes: bytes("# Hi\n\n- x") });
    if (!r.ok) throw new Error(r.error);
    expect(r.content.content[0].type).toBe("heading");
    expect(r.content.content[1].type).toBe("bulletList");
  });
  it("strips a UTF-8 BOM", async () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes("text")]);
    const r = await processImport({ name: "a.txt", bytes: withBom });
    if (!r.ok) throw new Error(r.error);
    expect(r.content.content[0].content![0].text).toBe("text");
  });
  it("rejects unsupported types, empty, whitespace-only and binary files", async () => {
    expect(await processImport({ name: "a.pdf", bytes: bytes("x") })).toMatchObject({ ok: false });
    expect(await processImport({ name: "a.txt", bytes: new Uint8Array() })).toMatchObject({ ok: false, error: expect.stringMatching(/empty/) });
    expect(await processImport({ name: "a.md", bytes: bytes("  \n\n ") })).toMatchObject({ ok: false, error: expect.stringMatching(/no text/) });
    expect(await processImport({ name: "a.txt", bytes: bytes("ab\u0000cd") })).toMatchObject({ ok: false, error: expect.stringMatching(/binary/) });
    expect(await processImport({ name: "a.txt", bytes: Uint8Array.from([0xff, 0xfe, 0xfa]) })).toMatchObject({ ok: false, error: expect.stringMatching(/UTF-8/) });
  });
  it("rejects a markdown file that contains no importable text", async () => {
    expect(await processImport({ name: "a.md", bytes: bytes("---\n---") })).toMatchObject({ ok: false });
  });
  it("rejects files over the size limit", async () => {
    const big = new Uint8Array(1024 * 1024 + 1).fill(97);
    expect(await processImport({ name: "a.txt", bytes: big })).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) });
  });
  it("rejects a fake .docx before parsing it", async () => {
    expect(await processImport({ name: "a.docx", bytes: bytes("not a zip") })).toMatchObject({ ok: false, error: expect.stringMatching(/valid \.docx/) });
  });
});
