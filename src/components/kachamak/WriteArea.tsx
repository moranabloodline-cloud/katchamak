"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  SpellCheck,
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
import {editorForRange,paragraphSelector,selectionBlock,applyBlockStyle,applyEditorHistory,applyEditorIndent,applyEditorColour,applyEditorTypography} from "@/lib/kachamak/editor-blocks";
import {activeWritingEditor} from './WorkspaceNavigation';
import {PageSurface,useNoteAppearance} from './PageSurface';
import {applyEditorQuote,clearEditorFormatting} from '@/lib/kachamak/editor-formatting';
import {PAGE_FONTS,NOTE_FONT_SIZES,noteSizeLabel,LINE_SPACINGS,pageVariables} from '@/lib/kachamak/page-format';
import {PresetColourPicker} from "./PresetColourPicker";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";

const FONTS = PAGE_FONTS;
const SPACINGS = LINE_SPACINGS;

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
  pressed,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  pressed?:boolean;
  disabled?:boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors hover:bg-white/10 hover:text-foreground ${pressed?'bg-amber-400/10 text-amber-300':'text-muted-foreground'}`}
    >
      {children}
    </button>
  );
}

/* ---------- traka 2: formatna traka ---------- */

/* One fixed text toolbar, shared by Split panes. It formats its saved selection;
   the separate Format menu owns the page defaults used as fallback values. */
export function EditorToolbar({node}: {node?: NoteNode | null} = {}) {
  const spellCheck=useKachamak(state=>state.editorSpellCheck??true);
  const setSpellCheck=useKachamak(state=>state.setEditorSpellCheck);
  const {font,size,spacing}=useNoteAppearance(node);
  const [hasSelection,setHasSelection]=useState(false);
  const [selectedTypography,setSelectedTypography]=useState<{font:string;size:number;spacing:string}|null>(null);

  /* Tekući blok selekcije se osvežava na svaku promenu selekcije, da dropdown
     uvek pokazuje stil bloka u kome je kursor (podrazumevano „Normal“). */
  const [blockStyle, setBlockStyle] = useState<string>("normal");
  const [quoteActive,setQuoteActive]=useState(false);
  const savedRange=useRef<Range|null>(null);
  const colourRange=useRef<Range|null>(null);
  const [textColour,setTextColour]=useState(''),[highlightColour,setHighlightColour]=useState('');
  const ownedRange=(range:Range|null)=>{
    const editor=editorForRange(range);
    return editor&&node&&editor.dataset.noteId===node.id&&editor===activeWritingEditor()?range:null;
  };
  const editableRange=(range:Range|null)=>{
    return range&&!range.collapsed?ownedRange(range):null;
  };
  const marked=()=>editableRange(savedRange.current);
  const cmd=(command:string)=>{
    const range=marked(),editor=editorForRange(range);
    if(!range||!editor)return;
    editor.focus();
    const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
    document.execCommand('styleWithCSS',false,'true');
    document.execCommand(command,false);
  };
  useEffect(() => {
    const sync = () => {
      const focused=document.activeElement;
      if(focused?.closest('[data-editor-toolbar]')&&editorForRange(savedRange.current)?.dataset.noteId===node?.id)return;
      if(focused?.matches('input,textarea,select')){savedRange.current=null;setHasSelection(false);setQuoteActive(false);setSelectedTypography(null);setBlockStyle('normal');return;}
      const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
      const editor=editorForRange(range);
      setHasSelection(!!editableRange(range));
      if(editor&&ownedRange(range)){
        savedRange.current=range!.cloneRange();setBlockStyle(selectionBlock(range));
        const element=range!.startContainer.nodeType===1?range!.startContainer as Element:range!.startContainer.parentElement;
        if(element){
          setQuoteActive(!!element.closest('blockquote'));
          const css=getComputedStyle(element),pixels=parseFloat(css.fontSize);
          const paragraph=element.closest(paragraphSelector)??element;
          const blockCss=getComputedStyle(paragraph),line=parseFloat(blockCss.lineHeight)/parseFloat(blockCss.fontSize);
          setSelectedTypography({font:css.fontFamily.split(',')[0].replace(/["']/g,'').trim()||font,size:Number.isFinite(pixels)?Number(pixels.toFixed(3)):size,spacing:Number.isFinite(line)?line.toFixed(2).replace(/0$/,''):spacing});
        }
      }
      else {savedRange.current=null;setQuoteActive(false);setSelectedTypography(null);setBlockStyle('normal');}
    };
    sync();
    document.addEventListener('selectionchange',sync);document.addEventListener('focusin',sync);document.addEventListener('input',sync);
    return()=>{document.removeEventListener('selectionchange',sync);document.removeEventListener('focusin',sync);document.removeEventListener('input',sync);};
  },[node?.id,font,size,spacing]);

  return (
    <div data-editor-toolbar className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto kachamak-scroll border-b border-white/10 px-4 [&>*]:shrink-0">
      <ToolBtn title="Undo (Ctrl+Z)" onClick={()=>applyEditorHistory(ownedRange(savedRange.current),'undo')}><Undo2 className="h-4 w-4" /></ToolBtn>
      <ToolBtn title="Redo (Ctrl+Y)" onClick={()=>applyEditorHistory(ownedRange(savedRange.current),'redo')}><Redo2 className="h-4 w-4" /></ToolBtn>
      <span className="mx-1 h-5 w-px bg-white/10" />
      <fieldset aria-label="Format selected text" title={hasSelection?undefined:'Select text to format it'} disabled={!hasSelection} className="contents [&>*]:shrink-0 disabled:[&>button]:opacity-50 disabled:[&>select]:opacity-50">
      <select
        aria-label="Text style"
        title="Text style"
        value={blockStyle}
        onChange={(e) => {
          const style = BLOCK_STYLES.find((s) => s.value === e.target.value);
          if (!style) return;
          if(applyBlockStyle(marked(),style.value))setBlockStyle(style.value);
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
        value={selectedTypography?.font??font}
        onChange={(e) => {if(applyEditorTypography(marked(),'fontFamily',e.target.value))setSelectedTypography(old=>({...old??{font,size,spacing},font:e.target.value}));}}
        className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
      >
        {[...new Set([selectedTypography?.font??font,...FONTS])].map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        aria-label="Font size"
        value={selectedTypography?.size??size}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (applyEditorTypography(marked(),'fontSize',next+'px')) {
            setSelectedTypography(old=>({...old??{font,size,spacing},size:next}));
          }
        }}
        className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
      >
        {[...new Set([selectedTypography?.size??size,...NOTE_FONT_SIZES])].sort((a,b)=>a-b).map((s) => (
          <option key={s} value={s}>
            {noteSizeLabel(s)}
          </option>
        ))}
      </select>
      <select
        aria-label="Line spacing"
        value={selectedTypography?.spacing??spacing}
        onChange={(e) => {if(applyEditorTypography(marked(),'lineHeight',e.target.value))setSelectedTypography(old=>({...old??{font,size,spacing},spacing:e.target.value}));}}
        className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
      >
        {[...new Set([selectedTypography?.spacing??spacing,...SPACINGS])].map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
      <span className="mx-1 h-5 w-px bg-white/10" />
      <ToolBtn title="Decrease indent" onClick={()=>applyEditorIndent(marked(),'outdent')}><IndentDecrease className="h-4 w-4"/></ToolBtn>
      <ToolBtn title="Increase indent" onClick={()=>applyEditorIndent(marked(),'indent')}><IndentIncrease className="h-4 w-4"/></ToolBtn>
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
        pressed={quoteActive}
        onClick={() => applyEditorQuote(marked())}
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
      <PresetColourPicker label="Text colour" value={textColour} preserveSelection onOpenChange={open=>{if(open)colourRange.current=marked()?.cloneRange()??null;}} onChange={colour=>{if(applyEditorColour(editableRange(colourRange.current),'text',colour))setTextColour(colour);}} className="rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"><Palette className="h-4 w-4"/></PresetColourPicker>
      <PresetColourPicker label="Highlight" value={highlightColour} preserveSelection onOpenChange={open=>{if(open)colourRange.current=marked()?.cloneRange()??null;}} onChange={colour=>{if(applyEditorColour(editableRange(colourRange.current),'highlight',colour))setHighlightColour(colour);}} className="rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"><Highlighter className="h-4 w-4"/></PresetColourPicker>
      <ToolBtn title="Clear formatting" onClick={() => clearEditorFormatting(marked())}>
        <RemoveFormatting className="h-4 w-4" />
      </ToolBtn>
      <span className="mx-1 h-5 w-px bg-white/10" />
      </fieldset>
      <div role="group" aria-label="Edit actions" className="flex items-center justify-start gap-1">
      <button type="button" aria-label="Spelling" aria-pressed={spellCheck} title={spellCheck?'Spelling: on — click to turn off':'Spelling: off — click to turn on'} onMouseDown={event=>event.preventDefault()} onClick={()=>setSpellCheck(!spellCheck)} className={`rounded-md p-1.5 transition-colors hover:bg-white/10 ${spellCheck?'bg-amber-400/10 text-amber-300':'text-muted-foreground'}`}><SpellCheck className="h-4 w-4"/></button>
      <ToolBtn title="Delete" disabled={!hasSelection} onClick={() => cmd("delete")}>
        <Trash2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Link"
        disabled={!selectedTypography}
        onClick={() => {
          const range=ownedRange(savedRange.current),editor=editorForRange(range);
          if(!range||!editor)return;
          editor.focus();
          const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
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
export function RulerRow({node}:{node?:NoteNode|null}={}) {
  const {page}=useNoteAppearance(node);
  /* „?? true“ jer stari sačuvani store nema ovaj ključ (persist je ceo
     state, verzija se ne menja; šema podataka ista) */
  const rulerVisible = useKachamak((s) => s.rulerVisible ?? true);
  const setRulerVisible = useKachamak((s) => s.setRulerVisible);

  return (
    <div data-workspace-chrome className="flex h-9 shrink-0 items-center overflow-y-auto px-6 kachamak-scroll" style={{scrollbarGutter:'stable'}}>
      <div
        data-page-ruler data-page-layout={page.layout}
        className="relative h-7 w-full"
        style={pageVariables(page)}
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

/* One note surface, used by Write and both Split panes. Format supplies page
   defaults; explicit inline styles in the manuscript remain local overrides. */
export function EditorPage({ node, section, continuous=false }: { node: NoteNode; section: SectionKey; continuous?:boolean }) {
  const appearance=useNoteAppearance(node);
  const updateNode = useKachamak((s) => s.updateNode);

  return (
    <div className={continuous ? "min-h-0" : "min-h-0 flex-1 overflow-y-auto kachamak-scroll"} style={continuous?undefined:{scrollbarGutter:'stable'}}>
      <div className="px-6 py-6">
        {/* min(48rem, 100%) — stubac nikad ne buje iz panela ni pri uvećanom
            zoomu (100% je u koordinatama zoomovanog elementa) */}
        <PageSurface appearance={appearance}>
          <input
            value={node.title}
            onChange={(e) => updateNode(section, node.id, { title: e.target.value })}
            aria-label="Title"
            title={node.title}
            style={{color:node.color || undefined}}
            className="mb-4 w-full bg-transparent note-page-title text-center text-ellipsis font-bold focus:text-clip text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Title"
          />
          <div>
            <RichEditor
              colorizeAnnotations={appearance.page.colorizeAnnotations}
              noteId={node.id}
              html={node.content}
              onChange={(html) => updateNode(section, node.id, { content: html })}
              placeholder="Write here..."
              className={continuous ? "min-h-12 text-foreground" : "min-h-[50vh] text-foreground"}
            />
          </div>
        </PageSurface>
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
      <RulerRow node={node} />
      <EditorPage node={node} section={section} />
    </div>
  );
}
