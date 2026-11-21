import Link from "next/link";
import RoleBadge from "@/components/documents/RoleBadge";
import { DocumentIcon } from "@/components/ui/icons";
import { formatUpdated } from "@/lib/format";
import type { DocumentListItem } from "@/lib/documents";

type DocumentListProps = {
  documents: DocumentListItem[];
  /** Show "Shared by …" (used on the Shared with me page). */
  showOwner?: boolean;
};

export default function DocumentList({ documents, showOwner = false }: DocumentListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {documents.map((doc) => (
        <li key={doc.id}>
          <Link
            href={`/docs/${doc.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle"
          >
            <DocumentIcon className="size-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.title}</p>
              <p className="truncate text-sm text-muted">
                {showOwner && `Shared by ${doc.ownerName ?? doc.ownerEmail} · `}
                Updated {formatUpdated(doc.updatedAt)}
              </p>
            </div>
            <RoleBadge role={doc.role} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
