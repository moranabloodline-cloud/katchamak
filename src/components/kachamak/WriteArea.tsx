"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Underline,
  RemoveFormatting,
} from "lucide-react";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";

const FONTS = ["Segoe UI", "Georgia", "Garamond", "Courier New", "Verdana", "Times New Roman"];
const SIZES = [12, 14, 16, 18, 20, 24];
const SPACINGS = ["1.0", "1.15", "1.5", "2.0"];

function ToolBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
    >
      {children}
    </button>
  );
}

const cmd = (command: string, value?: string) => {
  document.execCommand("styleWithCSS", false, "true");
  document.execCommand(command, false, value);
};

export function WriteArea({ node, section }: { node: NoteNode; section: SectionKey }) {
  const updateNode = useKachamak((s) => s.updateNode);
  // prefs reset naturally because NotesSection mounts this with key={node.id}
  const [font, setFont] = useState("Segoe UI");
  const [size, setSize] = useState(16);
  const [spacing, setSpacing] = useState("1.5");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-1.5">
        <select
          aria-label="Font"
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          aria-label="Font size"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Line spacing"
          value={spacing}
          onChange={(e) => setSpacing(e.target.value)}
          className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
        >
          {SPACINGS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn title="Bold" onClick={() => cmd("bold")}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Italic" onClick={() => cmd("italic")}>
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Underline" onClick={() => cmd("underline")}>
          <Underline className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => cmd("strikeThrough")}>
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn title="Bulleted list" onClick={() => cmd("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Numbered list" onClick={() => cmd("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="Quote"
          onClick={() => cmd("formatBlock", "<blockquote>")}
        >
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn title="Align left" onClick={() => cmd("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Align center" onClick={() => cmd("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Align right" onClick={() => cmd("justifyRight")}>
          <AlignRight className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Justify" onClick={() => cmd("justifyFull")}>
          <AlignJustify className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <label className="relative cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground" title="Text colour" aria-label="Text colour">
          <Palette className="h-4 w-4" />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => cmd("foreColor", e.target.value)}
          />
        </label>
        <label className="relative cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground" title="Highlight" aria-label="Highlight">
          <Highlighter className="h-4 w-4" />
          <input
            type="color"
            className="sr-only"
            defaultValue="#f0883e"
            onChange={(e) => cmd("hiliteColor", e.target.value)}
          />
        </label>
        <ToolBtn title="Clear formatting" onClick={() => cmd("removeFormat")}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolBtn>
      </div>

      {/* the page */}
      <div className="flex-1 overflow-y-auto kachamak-scroll px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-orange-400/80">
            {node.kind === "act"
              ? "Act"
              : node.kind === "chapter"
                ? "Chapter"
                : node.kind === "scene"
                  ? "Scene"
                  : node.kind === "folder"
                    ? "Folder"
                    : "Note"}
          </p>
          <input
            value={node.title}
            onChange={(e) => updateNode(section, node.id, { title: e.target.value })}
            aria-label="Title"
            className="mb-4 w-full bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Title"
          />
          <div
            style={{
              fontFamily: `'${font}', system-ui, sans-serif`,
              fontSize: `${size}px`,
              lineHeight: spacing,
            }}
          >
            <RichEditor
              html={node.content}
              onChange={(html) => updateNode(section, node.id, { content: html })}
              placeholder="Write here..."
              className="min-h-[50vh] text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
