"use client";

import { preparePastedContent } from "@/lib/kachamak/paste-content";
import { useEffect, useRef } from "react";
import { LinkHighlights } from './LinkHighlights';

interface RichEditorProps {
  html: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
  noteId?: string;
  onFocusPlaceholderHide?: boolean;
}

/**
 * Uncontrolled contentEditable — syncs innerHTML only when the incoming html
 * differs from what the user last typed (prevents caret jumps).
 */
export function RichEditor({
  html,
  onChange,
  className,
  placeholder,
  noteId,
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (html !== lastHtml.current && html !== el.innerHTML) {
      el.innerHTML = html || "";
      lastHtml.current = html;
    }
  }, [html]);

  const handleInput = () => {
    if (!ref.current) return;
    lastHtml.current = ref.current.innerHTML;
    onChange(lastHtml.current);
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-label={noteId ? "Note content" : placeholder || "Text"}
        aria-multiline="true"
        suppressContentEditableWarning
        onPaste={event => {
          event.preventDefault();
          const content = preparePastedContent(event.clipboardData.getData('text/html'), event.clipboardData.getData('text/plain'));
          document.execCommand('insertHTML', false, content);
          handleInput();
        }}
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className={`kachamak-editor outline-none ${className ?? ""}`}
      />
      {noteId && <LinkHighlights editorRef={ref} noteId={noteId} />}
    </div>
  );
}
