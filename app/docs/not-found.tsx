import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { DocumentIcon } from "@/components/ui/icons";

export default function DocsNotFound() {
  return (
    <EmptyState
      icon={<DocumentIcon className="size-8" />}
      title="Document not found"
      description="It may have been deleted, or you may not have access to it."
      action={
        <Link href="/docs" className={buttonClasses()}>
          Back to my documents
        </Link>
      }
    />
  );
}
