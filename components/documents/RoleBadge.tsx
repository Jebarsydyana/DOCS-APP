import type { DocRole } from "@/lib/access";
import { cn } from "@/lib/cn";

const styles: Record<DocRole, string> = {
  OWNER: "bg-blue-50 text-blue-700",
  EDITOR: "bg-emerald-50 text-emerald-700",
  VIEWER: "bg-slate-100 text-slate-700",
};

const labels: Record<DocRole, string> = {
  OWNER: "Owner",
  EDITOR: "Can edit",
  VIEWER: "View only",
};

export default function RoleBadge({ role }: { role: DocRole }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[role]
      )}
    >
      {labels[role]}
    </span>
  );
}
