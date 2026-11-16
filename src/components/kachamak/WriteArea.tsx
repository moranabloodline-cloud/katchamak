"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Eye,
  EyeOff,
  Highlighter,
  Italic,
  IndentDecrease,
  IndentIncrease,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Trash2,
  Underline,
  RemoveFormatting,
  Undo2,
  Redo2,
} from "lucide-react";
import {editorForRange,selectionBlock,applyBlockStyle,applyEditorHistory,applyEditorIndent} from "@/lib/kachamak/editor-blocks";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";

const FONTS = ["Segoe UI", "Georgia", "Garamond", "Courier New", "Verdana", "Times New Roman"];
const SIZES = [12, 14, 16, 18, 20, 24];
const SPACINGS = ["1.0", "1.15", "1.5", "2.0"];

/* Text Style (tačka 8, spec §8): dropdown ISpred font kontrola,
   podrazumevano „Normal“. formatBlock radi nad blokom u kome je kursor/
   selekcija; `div` je Chrome-ov podrazumevani blok = tretira se kao Normal. */
const BLOCK_STYLES = [
  { value: "normal", label: "Normal", block: "<p>" },
  { value: "h1", label: "Heading 1", block: "<h1>" },
  { value: "h2", label: "Heading 2", block: "<h2>" },
  { value: "h3", label: "Heading 3", block: "<h3>" },
  { value: "h4", label: "Heading 4", block: "<h4>" },
  { value: "h5", label: "Heading 5", block: "<h5>" },
  { value: "h6", label: "Heading 6", block: "<h6>" },
  { value: "quote", label: "Quote", block: "<blockquote>" },
] as const;


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

/* ---------- traka 2: formatna traka ---------- */

/* JEDNA fiksna formatna traka (po Nikoli): stoji uvek na istom mestu iznad
   radne površine i NE duplira se po panelu u Splitu — na njenu širinu utiču
   jedino bočni paneli kad se pomeraju. Font/veličina/prored žive u store-u
   (vaze za stranu u Write i u oba Split panela). */
export function EditorToolbar() {
  const font = useKachamak((s) => s.editorFont ?? "Segoe UI");
  const setFont = useKachamak((s) => s.setEditorFont);
  const size = useKachamak((s) => s.editorSize ?? 16);
  const setSize = useKachamak((s) => s.setEditorSize);
  const spacing = useKachamak((s) => s.editorSpacing ?? "1.5");
  const setSpacing = useKachamak((s) => s.setEditorSpacing);

  /* Tekući blok selekcije se osvežava na svaku promenu selekcije, da dropdown
     uvek pokazuje stil bloka u kome je kursor (podrazumevano „Normal“). */
  const [blockStyle, setBlockStyle] = useState<string>("normal");
  const savedRange=useRef<Range|null>(null);
  useEffect(() => {
    const sync = () => {
      const focused=document.activeElement;
      if(focused?.closest('[data-editor-toolbar]'))return;
      if(focused?.matches('input,textarea,select')){savedRange.current=null;setBlockStyle('normal');return;}
      const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
      if(editorForRange(range)){savedRange.current=range!.cloneRange();setBlockStyle(selectionBlock(range));}
      else {savedRange.current=null;setBlockStyle('normal');}
    };
    document.addEventListener('selectionchange',sync);document.addEventListener('focusin',sync);document.addEventListener('input',sync);
    return()=>{document.removeEventListener('selectionchange',sync);document.removeEventListener('focusin',sync);document.removeEventListener('input',sync);};
  },[]);

  return (
    <div data-editor-toolbar className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto kachamak-scroll border-b border-white/10 px-4 [&>*]:shrink-0">
      <ToolBtn title="Undo (Ctrl+Z)" onClick={()=>applyEditorHistory(savedRange.current,'undo')}><Undo2 className="h-4 w-4" /></ToolBtn>
      <ToolBtn title="Redo (Ctrl+Y)" onClick={()=>applyEditorHistory(savedRange.current,'redo')}><Redo2 className="h-4 w-4" /></ToolBtn>
      <span className="mx-1 h-5 w-px bg-white/10" />
      <select
        aria-label="Text style"
        title="Text style"
        value={blockStyle}
        onChange={(e) => {
          const style = BLOCK_STYLES.find((s) => s.value === e.target.value);
          if (!style) return;
          if(applyBlockStyle(savedRange.current,style.value))setBlockStyle(style.value);
        }}
        className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
      >
        {BLOCK_STYLES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
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
      <ToolBtn title="Decrease indent" onClick={()=>applyEditorIndent(savedRange.current,'outdent')}><IndentDecrease className="h-4 w-4"/></ToolBtn>
      <ToolBtn title="Increase indent" onClick={()=>applyEditorIndent(savedRange.current,'indent')}><IndentIncrease className="h-4 w-4"/></ToolBtn>
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
      <span className="mx-1 h-5 w-px bg-white/10" />
      <div role="group" aria-label="Edit actions" className="flex items-center justify-start gap-1">
      <ToolBtn
        title="Copy"
        onClick={() => {
          try {
            document.execCommand("copy");
          } catch {
            /* bez selekcije/dozvole — ništa */
          }
        }}
      >
        <Copy className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn title="Delete" onClick={() => cmd("delete")}>
        <Trash2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Link"
        onClick={() => {
          document.dispatchEvent(new Event('katchamak-link'));
        }}
      >
        <LinkIcon className="h-4 w-4" />
      </ToolBtn>
      </div>
    </div>
  );
}

/* ---------- traka 3: lenjir ---------- */

/* A display ruler in CSS centimeters. Zero follows the text edge; all
   subdivisions and labels share one origin. The separate eye toggles visibility. */
function RulerStrip() {
  const strip=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(0);
  useEffect(()=>{
    const element=strip.current;if(!element)return;
    const measure=()=>setWidth(element.clientWidth);measure();
    if(typeof ResizeObserver==='undefined')return;
    const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();
  },[]);
  const cm=96/2.54,leading=12;
  return (
    <div ref={strip} role="img" aria-label="Text ruler in centimeters" title="Centimeters · zero aligns with the text edge" className="relative h-7 overflow-hidden rounded-[3px] bg-muted/20 text-muted-foreground ring-1 ring-inset ring-border" style={{marginLeft:-leading,width:`calc(100% + ${leading}px)`}}>
      {/* Every tick and label shares the same zero and CSS centimeter. */}
      {[{step:cm/10,height:4,opacity:.3},{step:cm/2,height:7,opacity:.45},{step:cm,height:10,opacity:.65}].map(({step,height,opacity})=><div key={step} aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{height,opacity,backgroundPositionX:leading,backgroundSize:`${step}px 100%`,backgroundImage:`repeating-linear-gradient(to right, currentColor 0px, currentColor 1px, transparent 1px, transparent ${step}px)`}}/>)}
      {Array.from({length:Math.floor(Math.max(0,width-leading-9)/cm)+1},(_,i)=><span key={i} aria-hidden="true" className="absolute top-1 font-sans text-[10px] leading-[10px] tabular-nums" style={{left:leading+.5+i*cm,transform:'translateX(-50%)'}}>{i}</span>)}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border"/>
    </div>
  );
}

/* traka 3 — red sa lenjirom preko CELE radne površine. Bez pozadine i ivica:
   ista boja kao radna površina (#0d0d0d sa Workspace roota), zato se traka
   „ne vidi“ (po Nikoli) — ali je traka, i NE deli se u Splitu; deli se samo
   površina ISPOD nje. */
export function RulerRow() {
  /* „?? true“ jer stari sačuvani store nema ovaj ključ (persist je ceo
     state, verzija se ne menja; šema podataka ista) */
  const rulerVisible = useKachamak((s) => s.rulerVisible ?? true);
  const setRulerVisible = useKachamak((s) => s.setRulerVisible);

  return (
    <div className="flex h-9 shrink-0 items-center overflow-y-auto px-6 kachamak-scroll" style={{scrollbarGutter:'stable'}}>
      <div
        className="relative mx-auto h-7 w-full"
        style={{ maxWidth: "min(48rem, 100%)" }}
      >
        {rulerVisible && <RulerStrip />}
        <button
          type="button"
          title={rulerVisible ? "Hide ruler" : "Show ruler"}
          aria-label={rulerVisible ? "Hide ruler" : "Show ruler"}
          onClick={() => setRulerVisible(!rulerVisible)}
          className="absolute -right-6 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          {rulerVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

/* ---------- strana: naslov + tekst ---------- */

/* Sadržaj JEDNOG editora (naslov + RichEditor) — koristi ga Write mod i
   OBA Split panela. Font/veličina/prored dolaze iz store-a (fiksna formatna
   traka iznad njih je jedina instanta). */
export function EditorPage({ node, section, continuous=false }: { node: NoteNode; section: SectionKey; continuous?:boolean }) {
  const updateNode = useKachamak((s) => s.updateNode);
  const font = useKachamak((s) => s.editorFont ?? "Segoe UI");
  const size = useKachamak((s) => s.editorSize ?? 16);
  const spacing = useKachamak((s) => s.editorSpacing ?? "1.5");

  return (
    <div className={continuous ? "min-h-0" : "min-h-0 flex-1 overflow-y-auto kachamak-scroll"} style={continuous?undefined:{scrollbarGutter:'stable'}}>
      <div className="px-6 py-6">
        {/* min(48rem, 100%) — stubac nikad ne buje iz panela ni pri uvećanom
            zoomu (100% je u koordinatama zoomovanog elementa) */}
        <div
          className="mx-auto w-full"
          style={{ maxWidth: "min(48rem, 100%)" }}
        >
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
              noteId={node.id}
              html={node.content}
              onChange={(html) => updateNode(section, node.id, { content: html })}
              placeholder="Write here..."
              className={continuous ? "min-h-12 text-foreground" : "min-h-[50vh] text-foreground"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Write mod: lenjir + strana ---------- */

/* U Write modu ispod fiksne formatne trake (traka 2, koju renderuje
   NotesSection) idu: lenjir (traka 3) pa strana. Zoom srednjeg panela
   (Ctrl + skrol) važi za lenjir i stranu, NE i za formatnu traku — da
   donje linije trake 2 ostanu u istom redu kroz panele. */
export function WriteArea({ node, section }: { node: NoteNode; section: SectionKey }) {
  const midZoom = useKachamak((s) => s.midZoom ?? 1);

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ zoom: midZoom }}>
      <RulerRow />
      <EditorPage node={node} section={section} />
    </div>
  );
}
