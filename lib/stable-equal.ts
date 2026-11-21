import type { DocumentPatch } from "./editor-types";

/** JSON stringify with sorted keys. Postgres jsonb does not preserve key order, so plain
 *  JSON.stringify comparison between client JSON and DB JSON would give false mismatches. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** True when the server already holds exactly what this patch would write. */
export function patchAlreadyApplied(
  patch: DocumentPatch,
  current: { title: string; content: unknown },
): boolean {
  if (patch.title === undefined && patch.content === undefined) return false;
  if (patch.title !== undefined && patch.title !== current.title) return false;
  if (patch.content !== undefined && stableStringify(patch.content) !== stableStringify(current.content)) return false;
  return true;
}
