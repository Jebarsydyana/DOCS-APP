"use client";

import { useFormStatus } from "react-dom";
import { createDocument } from "@/app/docs/actions";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";

function SubmitButton({ fullWidth }: { fullWidth: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className={fullWidth ? "w-full" : undefined}>
      {!pending && <PlusIcon className="size-4" />}
      New document
    </Button>
  );
}

export default function NewDocumentButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <form action={createDocument}>
      <SubmitButton fullWidth={fullWidth} />
    </form>
  );
}
