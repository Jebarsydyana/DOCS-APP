import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SaveQueue, type SaveSnapshot } from "../save-queue";
import { ConflictError } from "../documents-client";
import type { DocumentPatch } from "../editor-types";

const doc = (t: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] });
const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

function make(save: (p: DocumentPatch) => Promise<unknown>) {
  let last: SaveSnapshot = { status: "saved", savedAt: null, error: null };
  const spy = vi.fn(save);
  const q = new SaveQueue({ save: spy, delay: 1000, maxWait: 5000, onChange: (s) => (last = s) });
  return { q, save: spy, snap: () => last };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("debounce", () => {
  it("collapses rapid edits into one save with the latest content", async () => {
    const { q, save } = make(async () => {});
    q.schedule({ content: doc("a") });
    await tick(500);
    q.schedule({ content: doc("ab") });
    await tick(999);
    expect(save).not.toHaveBeenCalled();
    await tick(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ content: doc("ab") });
  });

  it("still saves during continuous typing (maxWait)", async () => {
    const { q, save } = make(async () => {});
    for (let i = 0; i < 12; i++) {
      q.schedule({ content: doc(String(i)) });
      await tick(500); // never 1s of quiet
    }
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe("race conditions", () => {
  it("never runs two saves at once and sends edits made mid-flight afterwards, in order", async () => {
    const calls: DocumentPatch[] = [];
    let release!: () => void;
    let active = 0;
    let maxActive = 0;
    const { q, snap } = make(async (p) => {
      calls.push(p);
      active++;
      maxActive = Math.max(maxActive, active);
      if (calls.length === 1) await new Promise<void>((r) => (release = r));
      active--;
    });

    q.schedule({ content: doc("a") });
    await tick(1000); // save #1 in flight (blocked)
    q.schedule({ content: doc("ab") });
    await tick(1000); // debounce fires, but must not start a concurrent request
    expect(calls).toHaveLength(1);

    release();
    await tick(10);
    expect(calls).toHaveLength(2);
    expect(calls[1].content).toEqual(doc("ab")); // newest content goes out last
    expect(maxActive).toBe(1);
    expect(snap().status).toBe("saved");
  });
});

describe("failed saves", () => {
  it("keeps the failed patch, merges newer edits, and retries", async () => {
    let fail = true;
    const { q, save, snap } = make(async () => {
      if (fail) throw new Error("offline");
    });
    q.schedule({ title: "T", content: doc("a") });
    await tick(1000);
    expect(snap()).toMatchObject({ status: "error", error: "offline" });
    expect(q.hasUnsaved).toBe(true);

    fail = false;
    q.schedule({ content: doc("ab") }); // newer content, title still pending from the failed save
    await tick(1000);
    expect(save).toHaveBeenLastCalledWith({ title: "T", content: doc("ab") });
    expect(snap().status).toBe("saved");
    expect(q.hasUnsaved).toBe(false);
  });

  it("goes through saving -> saved", async () => {
    const states: string[] = [];
    const q = new SaveQueue({ save: async () => {}, onChange: (s) => states.push(s.status) });
    q.schedule({ title: "x" });
    await tick(1000);
    expect(states).toEqual(["unsaved", "saving", "saved"]);
  });
});

describe("conflicts", () => {
  it("stops autosaving on conflict and resumes only after the user chooses", async () => {
    let mode: "conflict" | "ok" = "conflict";
    const { q, save, snap } = make(async () => {
      if (mode === "conflict") throw new ConflictError("changed", { version: 5, title: "x", content: {} });
    });
    q.schedule({ content: doc("a") });
    await tick(1000);
    expect(snap().status).toBe("conflict");
    expect(save).toHaveBeenCalledTimes(1);

    q.schedule({ content: doc("ab") });
    await tick(10_000);
    expect(save).toHaveBeenCalledTimes(1); // no silent retries

    mode = "ok";
    q.resolveConflict();
    await tick(10);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ content: doc("ab") });
    expect(snap().status).toBe("saved");
  });

  it("discard drops pending edits", async () => {
    const { q, save } = make(async () => {});
    q.schedule({ content: doc("a") });
    q.discard();
    await tick(5000);
    expect(save).not.toHaveBeenCalled();
    expect(q.hasUnsaved).toBe(false);
  });
});
