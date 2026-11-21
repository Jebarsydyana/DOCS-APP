import { describe, it, expect } from "vitest";
import { checkDocx, MAX_DOCX_BYTES } from "../zip-check";

/** Builds a minimal, uncompressed zip with the given entry names. */
function makeZip(entries: { name: string; size?: number }[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: number[][] = [];
  const centrals: number[][] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const e of entries) {
    const name = [...enc.encode(e.name)];
    const size = e.size ?? 0;
    const local = [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(0), ...u32(size), ...u16(name.length), ...u16(0), ...name];
    const central = [...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(0), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(offset), ...name];
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cd = centrals.flat();
  const eocd = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
    ...u32(cd.length), ...u32(offset), ...u16(0)];
  return Uint8Array.from([...locals.flat(), ...cd, ...eocd]);
}

describe("checkDocx", () => {
  it("accepts a zip that contains word/document.xml", () => {
    expect(checkDocx(makeZip([{ name: "[Content_Types].xml" }, { name: "word/document.xml", size: 100 }]))).toEqual({ ok: true });
  });
  it("rejects empty input", () => {
    const r = checkDocx(new Uint8Array());
    expect(r.ok).toBe(false);
  });
  it("rejects oversized files", () => {
    const r = checkDocx(new Uint8Array(MAX_DOCX_BYTES + 1));
    expect(r).toMatchObject({ ok: false });
    expect((r as { error: string }).error).toMatch(/too large/);
  });
  it("rejects non-zip content", () => {
    const r = checkDocx(new TextEncoder().encode("just some text pretending to be a docx"));
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/valid \.docx/) });
  });
  it("explains old .doc / password-protected files", () => {
    const r = checkDocx(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]));
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/old \.doc/) });
  });
  it("rejects a zip that is not a Word document", () => {
    const r = checkDocx(makeZip([{ name: "readme.txt", size: 5 }]));
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/Word document/) });
  });
  it("rejects zip bombs by declared uncompressed size", () => {
    const r = checkDocx(makeZip([{ name: "word/document.xml", size: 60 * 1024 * 1024 }]));
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/unreasonable/) });
  });
});
