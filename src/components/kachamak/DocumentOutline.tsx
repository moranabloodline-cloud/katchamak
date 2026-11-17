"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ListTree, FileText } from "lucide-react";

const headingSelector = "h1,h2,h3,h4,h5,h6";
type Heading = { element: HTMLElement; text: string; level: number };

/** Read only the rendered document. Never add IDs or rewrite saved manuscript HTML. */
export function DocumentOutline({ children, title, scopeKey, pane }: {
  children: ReactNode;
  title: string;
  scopeKey: string;
  pane?: "a" | "b";
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root || !open) return;
    let frame = 0;
    let current: Heading[] = [];
    const scope = () => pane ? root.querySelector<HTMLElement>(`[data-pane="${pane}"]`) : root;
    const refresh = () => {
      const next: Heading[] = [];
      scope()?.querySelectorAll<HTMLElement>(".kachamak-editor").forEach(editor => {
        editor.querySelectorAll<HTMLElement>(headingSelector).forEach(element => {
          const text = element.textContent?.replace(/\s+/g, " ").trim();
          if (text) next.push({ element, text, level: Number(element.tagName[1]) });
        });
      });
      if (next.length !== current.length || next.some((h, i) => h.element !== current[i].element || h.text !== current[i].text)) {
        current = next;
        setHeadings(next);
      }
    };
    const markVisible = () => {
      frame = 0;
      const bounds = scope()?.getBoundingClientRect();
      const top = bounds?.top ?? 0;
      let visible: HTMLElement | null = null;
      let firstInView: HTMLElement | null = null;
      for (const heading of current) {
        const rect = heading.element.getBoundingClientRect();
        if (!firstInView && rect.top >= top && rect.top < (bounds?.bottom ?? Infinity)) firstInView = heading.element;
        if (rect.top <= top + 80) visible = heading.element;
      }
      // Near the document end the browser cannot align a heading to the top.
      if (firstInView && (!visible || visible.getBoundingClientRect().bottom < top)) visible = firstInView;
      setActive(visible);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(markVisible);
    };
    // Ordinary paragraph typing does not rescan the outline or the project.
    const containsHeading = (node: Node) => node.nodeType === 1 && (
      (node as Element).matches(headingSelector) || !!(node as Element).querySelector(headingSelector)
    );
    const observer = new MutationObserver(records => {
      if (records.some(record => {
        const target = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement;
        return !!target?.closest(headingSelector) || Array.from(record.addedNodes).some(containsHeading) || Array.from(record.removedNodes).some(containsHeading);
      })) { refresh(); onScroll(); }
    });
    setHeadings([]);
    setActive(null);
    refresh();
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    root.addEventListener("scroll", onScroll, true);
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onScroll, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, scopeKey, pane]);

  const baseLevel = headings.reduce((level, heading) => Math.min(level, heading.level), 6);
  return <div className="flex h-full min-h-0 min-w-0">
    <aside aria-label="Document outline" className={`${open ? "w-44 xl:w-52" : "w-9"} hidden shrink-0 flex-col border-r border-border/60 bg-black/10 md:flex`}>
      <div className="flex h-10 shrink-0 items-center gap-2 px-2">
        {open && <span className="pl-1 text-xs font-medium text-muted-foreground">Outline</span>}
        <button type="button" onClick={() => setOpen(value => !value)} aria-label={open ? "Hide document outline" : "Show document outline"} title={open ? "Hide document outline" : "Show document outline"} aria-expanded={open} className="ml-auto rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground">
          {open ? <ChevronLeft className="h-4 w-4"/> : <ListTree className="h-4 w-4"/>}
        </button>
      </div>
      {open && <nav aria-label="Document headings" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 kachamak-scroll">
        <div className="mb-2 flex items-start gap-2 rounded-md bg-amber-400/10 px-2 py-2 text-xs font-medium text-foreground">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80"/><span className="min-w-0 break-words">{title || "Untitled note"}</span>
        </div>
        {headings.length ? <ul className="space-y-0.5">
          {headings.map((heading, index) => <li key={index}>
            <button type="button" aria-label={`Go to ${heading.text}`} aria-current={active === heading.element ? "location" : undefined} onMouseDown={event => event.preventDefault()} onClick={() => {
              heading.element.scrollIntoView({ block: "start", inline: "nearest" });
              setActive(heading.element);
            }} style={{ paddingLeft: 8 + (heading.level - baseLevel) * 12 }} className={`w-full break-words rounded-md py-1.5 pr-2 text-left text-xs leading-relaxed transition-colors ${active === heading.element ? "bg-amber-400/10 text-amber-200" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              {heading.text}
            </button>
          </li>)}
        </ul> : <p className="px-2 py-1 text-xs italic leading-relaxed text-muted-foreground/70">Headings you add to this note will appear here.</p>}
      </nav>}
    </aside>
    <div ref={contentRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto kachamak-scroll">{children}</div>
  </div>;
}
