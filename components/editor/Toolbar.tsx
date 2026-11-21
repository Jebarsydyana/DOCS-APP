"use client";

import { useRef, type KeyboardEvent } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import ToolbarButton from "./ToolbarButton";

const Divider = () => <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />;

export default function Toolbar({ editor }: { editor: Editor | null }) {
  const ref = useRef<HTMLDivElement>(null);

  // Subscribes to editor transactions, so button state follows the cursor/selection
  // even though the parent does not re-render on every keystroke.
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      h1: editor?.isActive("heading", { level: 1 }) ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      h3: editor?.isActive("heading", { level: 3 }) ?? false,
      bullet: editor?.isActive("bulletList") ?? false,
      ordered: editor?.isActive("orderedList") ?? false,
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false,
    }),
  });

  if (!editor || !s) return <div className="h-11 border-b border-gray-200 bg-white" aria-hidden />;

  const mac = /Mac/i.test(navigator.platform);
  const mod = mac ? "⌘" : "Ctrl+";
  const alt = mac ? "⌥" : "Alt+";
  const shift = mac ? "⇧" : "Shift+";
  const run = () => editor.chain().focus();
  const headings = [
    { level: 1 as const, active: s.h1 },
    { level: 2 as const, active: s.h2 },
    { level: 3 as const, active: s.h3 },
  ];

  // Arrow keys move between buttons; Escape returns to the document.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      editor.commands.focus();
      return;
    }
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length].focus();
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Text formatting"
      aria-controls="document-body"
      onKeyDown={onKeyDown}
      className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-3 py-1.5"
    >
      <ToolbarButton label="Undo" shortcut={`${mod}Z`} disabled={!s.canUndo} onClick={() => run().undo().run()}>↶</ToolbarButton>
      <ToolbarButton label="Redo" shortcut={`${mod}${shift}Z`} disabled={!s.canRedo} onClick={() => run().redo().run()}>↷</ToolbarButton>
      <Divider />
      <ToolbarButton label="Bold" shortcut={`${mod}B`} active={s.bold} onClick={() => run().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton label="Italic" shortcut={`${mod}I`} active={s.italic} onClick={() => run().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton label="Underline" shortcut={`${mod}U`} active={s.underline} onClick={() => run().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarButton>
      <Divider />
      {headings.map(({ level, active }) => (
        <ToolbarButton
          key={level}
          label={`Heading ${level}`}
          shortcut={`${mod}${alt}${level}`}
          active={active}
          onClick={() => run().toggleHeading({ level }).run()}
        >
          H{level}
        </ToolbarButton>
      ))}
      <Divider />
      <ToolbarButton label="Bullet list" shortcut={`${mod}${shift}8`} active={s.bullet} onClick={() => run().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton label="Numbered list" shortcut={`${mod}${shift}7`} active={s.ordered} onClick={() => run().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
    </div>
  );
}
