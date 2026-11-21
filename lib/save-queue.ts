import type { DocumentPatch } from "./editor-types";
import { ConflictError } from "./documents-client";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";
export type SaveSnapshot = { status: SaveStatus; savedAt: Date | null; error: string | null };

type Options = {
  save: (patch: DocumentPatch) => Promise<unknown>;
  onChange: (snapshot: SaveSnapshot) => void;
  /** quiet time after the last edit before saving */
  delay?: number;
  /** longest an edit may wait, so continuous typing still gets saved */
  maxWait?: number;
};

/**
 * Framework-free save scheduler (the React hook is a thin wrapper), so the race-condition
 * rules can be unit-tested with fake timers.
 *
 * Rules:
 *  1. At most ONE request in flight. Edits made meanwhile are merged and sent afterwards,
 *     so responses can't arrive out of order and the version token stays consistent.
 *  2. Trailing debounce (delay) + maxWait cap.
 *  3. A failed patch is never dropped. It is merged with newer edits and retried.
 *  4. A conflict stops autosaving until the user chooses (resolveConflict / discard).
 */
export class SaveQueue {
  private pending: DocumentPatch | null = null;
  private inFlight = false;
  private conflict = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private firstEditAt: number | null = null;
  private snap: SaveSnapshot = { status: "saved", savedAt: null, error: null };

  constructor(private opts: Options) {}

  setSave(save: Options["save"]) {
    this.opts.save = save;
  }

  /** Reads the field through a method so TypeScript doesn't keep the `null` it narrowed it to
   *  earlier in flush() (that narrowing caused "Spread types may only be created from object types"). */
  private latest(): DocumentPatch | null {
    return this.pending;
  }

  get hasUnsaved() {
    return this.pending !== null || this.inFlight;
  }

  private set(partial: Partial<SaveSnapshot>) {
    this.snap = { ...this.snap, ...partial };
    this.opts.onChange(this.snap);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  schedule(patch: DocumentPatch) {
    this.pending = { ...this.pending, ...patch }; // newest value per field wins
    if (this.conflict) return;
    this.set({ status: "unsaved", error: null });

    const { delay = 1000, maxWait = 5000 } = this.opts;
    const now = Date.now();
    if (this.firstEditAt === null) this.firstEditAt = now;
    const wait = Math.max(0, Math.min(delay, this.firstEditAt + maxWait - now));
    this.clearTimer();
    this.timer = setTimeout(() => void this.flush(), wait);
  }

  async flush() {
    this.clearTimer();
    if (this.inFlight || this.conflict) return; // the running loop picks up newer edits
    this.inFlight = true;
    try {
      while (this.pending) {
        const patch = this.pending;
        this.pending = null;
        this.firstEditAt = null;
        this.set({ status: "saving", error: null });
        try {
          await this.opts.save(patch);
          this.snap = { ...this.snap, savedAt: new Date() }; // published with the next status change
        } catch (err) {
          this.pending = { ...patch, ...this.latest() }; // keep it; edits made during the request win
          if (err instanceof ConflictError) {
            this.conflict = true;
            this.set({ status: "conflict", error: err.message });
          } else {
            this.set({ status: "error", error: err instanceof Error ? err.message : "Save failed" });
          }
          return;
        }
      }
      this.set({ status: "saved" });
    } finally {
      this.inFlight = false;
    }
  }

  /** User chose "keep my version": caller has already moved the version token forward. */
  resolveConflict() {
    this.conflict = false;
    if (this.pending) void this.flush();
    else this.set({ status: "saved", error: null });
  }

  /** User chose to throw away unsaved edits (e.g. load the latest version). */
  discard() {
    this.clearTimer();
    this.pending = null;
    this.firstEditAt = null;
    this.conflict = false;
  }
}
