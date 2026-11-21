"use client";

import { DEFAULT_TITLE } from "@/lib/editor-types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  readOnly?: boolean;
};

export default function TitleInput({ value, onChange, onEnter, readOnly = false }: Props) {
  return (
    <input
      value={value}
      readOnly={readOnly}
      maxLength={200}
      aria-label="Document title"
      placeholder={DEFAULT_TITLE}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (!readOnly && !value.trim()) onChange(DEFAULT_TITLE); // never persist an empty title
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter(); // jump into the body
        }
      }}
      className="w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-xl font-semibold text-gray-900 hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:outline-none read-only:hover:border-transparent"
    />
  );
}
