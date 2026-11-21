"use client";

import type { ReactNode } from "react";

type Props = {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

export default function ToolbarButton({ label, shortcut, active = false, disabled = false, onClick, children }: Props) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep selection and focus in the editor on click
      onClick={onClick}
      className={[
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-blue-600",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-blue-100 text-blue-800" : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
