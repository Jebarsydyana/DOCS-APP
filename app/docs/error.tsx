"use client";

import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function DocsError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description="We couldn't load this page. Please try again."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
