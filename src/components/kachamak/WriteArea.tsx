"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ClipboardPaste,
  SpellCheck,
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
import {editorForRange,selectionBlock,applyBlockStyle,applyEditorIndent,applyEditorColour,applyEditorTypography} from "@/lib/kachamak/editor-blocks";
import {useWorkspaceHistory} from './useWorkspaceHistory';
import {activeWritingEditor} from './WorkspaceNavigation';
import {PageSurface,useNoteAppearance} from './PageSurface';
import {applyEditorQuote,clearEditorFormatting} from '@/lib/kachamak/editor-formatting';
import {PAGE_FONTS,NOTE_FONT_SIZES} from '@/lib/kachamak/page-format';
import {PresetColourPicker} from "./PresetColourPicker";
import { RichEditor } from "./RichEditor";
import {EditorTableInsert} from './EditorTableTools';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import type {EditorPasteRequest} from '@/lib/kachamak/editor-clipboard';
import type {PasteMode} from '@/lib/kachamak/paste-content';
import {LineSpacingMenu} from './LineSpacingMenu';
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";

const FONTS = PAGE_FONTS;
const FONT_POINTS = [...new Set([...NOTE_FONT_SIZES.map(px=>px*.75),8,10,11,14,16,20,22,24,26,28,36,48,72])].sort((a,b)=>a-b);
const PASTE_MODES = [
  {mode:'rich',label:'Paste with Formatting'},
  {mode:'match',label:'Match Draftopus Style'},
  {mode:'plain',label:'Paste as Plain Text'},
] satisfies {mode:PasteMode;label:string}[];

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
export function EditorToolbar({node,inspectorId}: {node?: NoteNode | null; inspectorId?: string} = {}) {
  const history=useWorkspaceHistory();
  const spellCheck=useKachamak(state=>state.editorSpellCheck??true);
  const setSpellCheck=useKachamak(state=>state.setEditorSpellCheck);
  const {font,size}=useNoteAppearance(node);
  const [hasSelection,setHasSelection]=useState(false);
  const [selectedTypography,setSelectedTypography]=useState<{font:string;size:number}|null>(null);
  const [fontSizeDraft,setFontSizeDraft]=useState<string|null>(null);
  const pointSize=Number(((selectedTypography?.size??size)*.75).toFixed(2));

  /* Tekući blok selekcije se osvežava na svaku promenu selekcije, da dropdown
     uvek pokazuje stil bloka u kome je kursor (podrazumevano „Normal“). */
  const [blockStyle, setBlockStyle] = useState<string>("normal");
  const [quoteActive,setQuoteActive]=useState(false);
  const savedRange=useRef<Range|null>(null);
  const colourRange=useRef<Range|null>(null);
  const requestedPaste=useRef<EditorPasteRequest|null>(null);
  const [textColour,setTextColour]=useState(''),[highlightColour,setHighlightColour]=useState('');
  const ownedRange=(range:Range|null)=>{
    const editor=editorForRange(range);
    if(!editor)return null;
    if(inspectorId && editor.closest<HTMLElement>('[data-inspector-prose]')?.dataset.inspectorProse===inspectorId)return range;
    return node && editor.dataset.noteId===node.id && editor===activeWritingEditor()?range:null;
  };
  const editableRange=(range:Range|null)=>{
    return range&&!range.collapsed?ownedRange(range):null;
  };
  const marked=()=>editableRange(savedRange.current);
  const setPointSize=(value:number)=>{
    if(!applyEditorTypography(marked(),'fontSize',value+'pt'))return false;
    setSelectedTypography(old=>({...old??{font,size},size:value*4/3}));
    setFontSizeDraft(null);
    return true;
  };
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
      if(focused?.closest('[data-editor-toolbar],[data-editor-toolbar-popup]') && ownedRange(savedRange.current))return;
      if(focused?.matches('input,textarea,select')){savedRange.current=null;setHasSelection(false);setQuoteActive(false);setSelectedTypography(null);setBlockStyle('normal');return;}
      const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
      const editor=editorForRange(range);
      const textRange=ownedRange(range);
      savedRange.current=textRange?.cloneRange()??null;
      setHasSelection(!!textRange&&!textRange.collapsed);
      if(editor&&textRange){
        setBlockStyle(selectionBlock(range));
        const element=range!.startContainer.nodeType===1?range!.startContainer as Element:range!.startContainer.parentElement;
        if(element){
          setQuoteActive(!!element.closest('blockquote'));
          const css=getComputedStyle(element),pixels=parseFloat(css.fontSize);
          setSelectedTypography({font:css.fontFamily.split(',')[0].replace(/["']/g,'').trim()||font,size:Number.isFinite(pixels)?Number(pixels.toFixed(3)):size});
        }
      }
      else {setQuoteActive(false);setSelectedTypography(null);setBlockStyle('normal');}
    };
    sync();
    document.addEventListener('selectionchange',sync);document.addEventListener('focusin',sync);document.addEventListener('input',sync);
    return()=>{document.removeEventListener('selectionchange',sync);document.removeEventListener('focusin',sync);document.removeEventListener('input',sync);};
  },[node?.id,inspectorId,font,size]);

  return (
    <div data-editor-toolbar role="toolbar" aria-label="Text formatting" className="col-start-1 row-start-1 flex h-10 min-w-0 shrink-0 items-center gap-1 overflow-x-auto kachamak-scroll border-b border-white/10 px-4 [&>*]:shrink-0">
      <ToolBtn title="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={()=>history.run('undo')}><Undo2 className="h-4 w-4" /></ToolBtn>
      <ToolBtn title="Redo (Ctrl+Y)" disabled={!history.canRedo} onClick={()=>history.run('redo')}><Redo2 className="h-4 w-4" /></ToolBtn>
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
        onChange={(e) => {if(applyEditorTypography(marked(),'fontFamily',e.target.value))setSelectedTypography(old=>({...old??{font,size},font:e.target.value}));}}
        className="h-7 rounded-md border border-white/10 bg-black/30 px-1.5 text-xs text-foreground"
      >
        {[...new Set([selectedTypography?.font??font,...FONTS])].map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <div className={`flex h-7 items-stretch rounded-md border border-white/10 bg-black/30 text-xs text-foreground ${hasSelection?'':'opacity-50'}`}>
        <input aria-label="Font size" title="Font size in points (Enter to apply)" inputMode="decimal"
          value={fontSizeDraft??pointSize} maxLength={8}
          onFocus={event=>event.currentTarget.select()}
          onBlur={()=>setFontSizeDraft(null)}
          onChange={event=>setFontSizeDraft(event.target.value)}
          onKeyDown={event=>{
            if(event.nativeEvent.isComposing)return;
            if(event.key==='Escape'){event.stopPropagation();setFontSizeDraft(null);event.currentTarget.select();}
            if(event.key!=='Enter')return;
            event.preventDefault();
            const value=event.currentTarget.value.trim().replace(',','.');
            if(!/^\d+(?:\.\d+)?$/.test(value)||!setPointSize(Number(value)))event.currentTarget.select();
          }}
          className="w-11 rounded-l-md bg-transparent px-1.5 tabular-nums focus-visible:outline focus-visible:outline-ring"
        />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Font size options" disabled={!hasSelection}
              className="grid w-5 place-items-center rounded-r-md border-l border-white/10 hover:bg-white/10">
              <ChevronDown size={12} aria-hidden="true"/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-editor-toolbar-popup aria-label="Font sizes in points" align="end"
            onCloseAutoFocus={event=>{if(editorForRange(marked())===document.activeElement)event.preventDefault();}}
            className="max-h-52 min-w-16 overflow-y-auto p-1 tabular-nums">
            {FONT_POINTS.map(points=><DropdownMenuItem key={points} onSelect={()=>setPointSize(points)}
              className={`py-1 text-xs ${points===pointSize?'bg-accent text-accent-foreground':''}`}>{points}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <LineSpacingMenu key={node?.id} disabled={!hasSelection} selection={marked} validate={editableRange}/>
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
      <EditorTableInsert range={()=>ownedRange(savedRange.current)} owns={ownedRange} disabled={!selectedTypography}/>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Paste options" title="Paste options" disabled={!selectedTypography}
            onMouseDown={event=>event.preventDefault()}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-40">
            <ClipboardPaste className="size-4"/>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-editor-toolbar-popup="" align="end" onCloseAutoFocus={event=>{
          const request=requestedPaste.current;
          requestedPaste.current=null;
          if(!request)return;
          event.preventDefault();
          const range=ownedRange(request.range),editor=editorForRange(range);
          if(range&&editor)editor.dispatchEvent(new CustomEvent<EditorPasteRequest>('draftopus-paste',{detail:{mode:request.mode,range}}));
        }}>
          {PASTE_MODES.map(({mode,label})=><DropdownMenuItem key={mode} onSelect={()=>{
            const range=ownedRange(savedRange.current);
            if(range)requestedPaste.current={mode,range:range.cloneRange()};
          }}>{label}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
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
          <div className="note-page-title relative mb-4 text-center font-bold text-foreground">
            <div aria-hidden="true" className="invisible whitespace-pre-wrap [overflow-wrap:anywhere]">
              {node.title || "Title"}{"\u200b"}
            </div>
            <textarea
              rows={1}
              value={node.title}
              onChange={(e) => updateNode(section, node.id, { title: e.target.value.replace(/[\r\n]+/g, " ") })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
              }}
              aria-label="Title"
              title={node.title}
              style={{color:node.color || undefined}}
              className="absolute inset-0 size-full resize-none overflow-hidden whitespace-pre-wrap bg-transparent text-center [overflow-wrap:anywhere] outline-none placeholder:text-muted-foreground"
              placeholder="Title"
            />
          </div>
          <div>
            <RichEditor
              colorizeAnnotations={appearance.page.colorizeAnnotations}
              noteId={node.id}
              html={node.content}
              onChange={(html, images) => updateNode(section, node.id, { content: html },images)}
              placeholder="Write here..."
              className={continuous ? "min-h-12 text-foreground" : "min-h-[50vh] text-foreground"}
            />
          </div>
        </PageSurface>
      </div>
    </div>
  );
}

export function WriteArea({ node, section }: { node: NoteNode; section: SectionKey }) {

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorPage node={node} section={section} />
    </div>
  );
}
