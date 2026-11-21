import { describe, it, expect } from "vitest";
import { addShareSchema, updateShareSchema, idSchema } from "../share-schemas";

const uuid = "3f2b8c1e-6d4a-4b7e-9a1c-2d5e8f0a7b3c";

describe("share schemas", () => {
  it("accepts a user id with Viewer or Editor", () => {
    expect(addShareSchema.safeParse({ userId: uuid, role: "VIEWER" }).success).toBe(true);
    expect(addShareSchema.safeParse({ userId: uuid, role: "EDITOR" }).success).toBe(true);
  });
  it("rejects bad ids, unknown roles and OWNER", () => {
    expect(addShareSchema.safeParse({ userId: "bob", role: "VIEWER" }).success).toBe(false);
    expect(addShareSchema.safeParse({ userId: uuid, role: "OWNER" }).success).toBe(false);
    expect(addShareSchema.safeParse({ userId: uuid }).success).toBe(false);
    expect(updateShareSchema.safeParse({ role: "ADMIN" }).success).toBe(false);
  });
  it("idSchema only accepts uuids", () => {
    expect(idSchema.safeParse(uuid).success).toBe(true);
    expect(idSchema.safeParse("../../etc").success).toBe(false);
  });
});
