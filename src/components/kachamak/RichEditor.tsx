"use client";

import { useEffect, useRef } from "react";

interface RichEditorProps {
  html: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
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
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className={`kachamak-editor outline-none ${className ?? ""}`}
      />
    </div>
  );
}
