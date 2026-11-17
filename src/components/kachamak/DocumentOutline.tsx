"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

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
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
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
  }, [scopeKey, pane]);

  useEffect(() => { setOpen(false); }, [scopeKey, pane]);

  const baseLevel = headings.reduce((level, heading) => Math.min(level, heading.level), 6);
  return <div className="flex h-full min-h-0 min-w-0">
    <aside aria-label="Document outline" onPointerEnter={event => { if (event.pointerType !== "touch") setOpen(true); }} onPointerLeave={() => setOpen(false)} onFocusCapture={() => setOpen(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); event.stopPropagation(); } }} className="relative hidden w-9 shrink-0 flex-col items-center pt-10 md:flex">
      <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setOpen(value => !value)} aria-label="Document outline" title="Document outline" aria-controls={menuId} aria-expanded={open} className="flex max-h-[calc(100%-1rem)] w-8 flex-col items-end gap-2 overflow-hidden rounded py-3 pr-1.5 outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50">
        {headings.length ? headings.map((heading, index) => <span key={index} aria-hidden="true" style={{ width: active === heading.element ? 22 : Math.max(7, 16 - (heading.level - baseLevel) * 2) }} className={`block h-px shrink-0 ${active === heading.element ? "bg-foreground" : "bg-muted-foreground/40"}`}/>) : <><span aria-hidden="true" className="h-px w-5 bg-muted-foreground/60"/><span aria-hidden="true" className="h-px w-3 bg-muted-foreground/30"/><span aria-hidden="true" className="h-px w-3 bg-muted-foreground/30"/></>}
      </button>
      {open && <div className="absolute left-full top-10 z-30 w-64 max-w-[calc(100vw-5rem)] pl-1">
      <nav id={menuId} aria-label="Document headings" className="max-h-[min(70vh,40rem)] overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-xl kachamak-scroll">
        <div className="mb-1 break-words px-2 py-1.5 text-xs font-semibold">{title || "Untitled note"}</div>
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
      </nav></div>}
    </aside>
    <div ref={contentRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto kachamak-scroll">{children}</div>
  </div>;
}
