"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Role = "VIEWER" | "EDITOR";
type Share = { userId: string; role: Role; email: string; name: string | null };
type Candidate = { id: string; email: string; name: string | null };

const who = (u: { name: string | null; email: string }) => (u.name ? `${u.name} (${u.email})` : u.email);
const roleName = (r: Role) => (r === "EDITOR" ? "Editor" : "Viewer");

export default function ShareDialog({
  documentId,
  title,
  triggerClassName,
}: {
  documentId: string;
  title: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const base = `/api/documents/${documentId}/shares`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) {
        setError(res.status === 404 ? "Only the owner can manage sharing." : "Couldn't load sharing settings.");
        return;
      }
      const data = await res.json();
      setShares(data.shares);
      setCandidates(data.candidates);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    }
  }, [base]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setNote("");
    setShares(null);
    void load();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, load]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  /** Runs one request, shows its error, reloads the list. Returns true on success. */
  async function run(url: string, init: RequestInit, failMessage: string): Promise<boolean> {
    setBusy(true);
    setError("");
    setNote("");
    let ok = false;
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        ok = true;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? failMessage);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    }
    setBusy(false);
    await load();
    return ok;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Choose a person first.");
      return;
    }
    const person = candidates.find((c) => c.id === userId);
    const ok = await run(
      base,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) },
      "Couldn't share this document."
    );
    if (ok) {
      setNote(`Shared with ${person ? who(person) : "that person"} as ${roleName(role)}.`);
      setUserId("");
    }
  }

  function changeRole(s: Share, next: Role) {
    return run(
      `${base}/${s.userId}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: next }) },
      "Couldn't change the role."
    ).then((ok) => ok && setNote(`${who(s)} is now ${roleName(next)}.`));
  }

  function remove(s: Share) {
    return run(`${base}/${s.userId}`, { method: "DELETE" }, "Couldn't remove access.").then(
      (ok) => ok && setNote(`Removed ${who(s)}.`)
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        }
      >
        Share
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Share ${title}`}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Share document</h2>
                  <p className="truncate text-sm text-gray-500">{title}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  aria-label="Person"
                  disabled={shares === null || busy}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="">
                    {shares === null ? "Loading people…" : candidates.length ? "Choose a person…" : "No one left to add"}
                  </option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {who(c)}
                    </option>
                  ))}
                </select>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  aria-label="Access level"
                  disabled={busy}
                  className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={busy || shares === null || candidates.length === 0}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Share"}
                </button>
              </form>
              <p className="mt-1.5 text-xs text-gray-500">
                <strong>Viewer</strong> can read only. <strong>Editor</strong> can read and edit. Only you can change
                sharing.
              </p>
              {shares !== null && candidates.length === 0 && shares.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  There are no other accounts yet. Ask someone to sign up, or run the demo seed (see DEMO_GUIDE.md).
                </p>
              )}

              <div aria-live="polite">{note && <p className="mt-3 text-sm text-green-700">{note}</p>}</div>
              {error && (
                <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-700">
                  {error}
                </p>
              )}

              <h3 className="mt-5 text-sm font-medium text-gray-700">People with access</h3>
              <ul className="mt-1 divide-y divide-gray-100 rounded-md border border-gray-200">
                <li className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">You</span>
                  <span className="text-xs text-gray-500">Owner</span>
                </li>
                {shares === null && <li className="px-3 py-2 text-sm text-gray-500">Loading…</li>}
                {shares?.map((s) => (
                  <li key={s.userId} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name || s.email}</p>
                      {s.name && <p className="truncate text-xs text-gray-500">{s.email}</p>}
                    </div>
                    <select
                      value={s.role}
                      disabled={busy}
                      aria-label={`Access level for ${s.email}`}
                      onChange={(e) => changeRole(s, e.target.value as Role)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(s)}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {shares?.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">Not shared with anyone yet.</li>
                )}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
