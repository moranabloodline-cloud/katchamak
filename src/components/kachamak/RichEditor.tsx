"use client";

import DOMPurify from "dompurify";
import { useKachamak } from "@/lib/kachamak/store";
import { findNodeInNovel } from "@/lib/kachamak/utils";
import { toast } from "sonner";
import { preparePastedContent } from "@/lib/kachamak/paste-content";
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
      el.innerHTML = DOMPurify.sanitize(html || "", {FORBID_TAGS:["style","script","iframe","object","embed"],FORBID_ATTR:["srcdoc"]});
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
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.dispatchEvent(new Event('katchamak-link')); }
        }}
        onClick={event => {
          const anchor=(event.target as Element).closest('a[href^="#note/"]');
          if (!anchor) return;
          event.preventDefault();
          if (!event.ctrlKey && !event.metaKey) return;
          const id=anchor.getAttribute('href')?.slice(6);
          const state=useKachamak.getState(), novel=state.novels.find(n=>n.id===state.activeNovelId);
          const target=id&&novel?findNodeInNovel(novel,id):null;
          if(target){state.setTab(target.section);state.select(target.node.id);}else toast.error('This linked note is unavailable. It may be in Trash.');
        }}
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
    </div>
  );
}
