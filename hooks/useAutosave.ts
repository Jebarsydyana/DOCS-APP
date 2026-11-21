"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SaveQueue, type SaveSnapshot } from "@/lib/save-queue";
import type { DocumentPatch } from "@/lib/editor-types";

export type { SaveStatus } from "@/lib/save-queue";

type Options = {
  save: (patch: DocumentPatch) => Promise<unknown>;
  delay?: number;
  maxWait?: number;
};

/** React wrapper around SaveQueue: owns the queue, exposes its state, guards tab close. */
export function useAutosave({ save, delay = 1000, maxWait = 5000 }: Options) {
  const [snap, setSnap] = useState<SaveSnapshot>({ status: "saved", savedAt: null, error: null });

  const ref = useRef<SaveQueue | null>(null);
  if (!ref.current) ref.current = new SaveQueue({ save, onChange: setSnap, delay, maxWait });
  const q = ref.current;

  useEffect(() => {
    q.setSave(save);
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (q.hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void q.flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      void q.flush(); // best-effort save when navigating away inside the app
    };
  }, [q]);

  const schedule = useCallback((p: DocumentPatch) => q.schedule(p), [q]);
  const flush = useCallback(() => q.flush(), [q]);
  const resolveConflict = useCallback(() => q.resolveConflict(), [q]);
  const discard = useCallback(() => q.discard(), [q]);

  return { ...snap, schedule, flush, resolveConflict, discard };
}
