"use client";

import DOMPurify from "dompurify";
import { useKachamak } from "@/lib/kachamak/store";
import { findNodeInNovel } from "@/lib/kachamak/utils";
import { toast } from "sonner";
import { insertPastedBlocks, type PasteMode } from "@/lib/kachamak/paste-content";
import { editorClipboardData, prepareEditorClipboard, readEditorClipboard, type EditorPasteRequest } from "@/lib/kachamak/editor-clipboard";
import { editorImageAttribute, paintEditorImages, portableEditorHtml, storedEditorHtml, type GalleryImage } from "@/lib/kachamak/project-image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {noteAnchorStyles,openEditorWebsite} from '@/lib/kachamak/note-links';
import { LinkHighlights } from './LinkHighlights';
import {NotePreview} from './NotePreview';
import {repairListWrappers,backspaceListMarker} from '@/lib/kachamak/editor-lists';
import {normalizeEditorContent,onHistoryReset,withEditSource} from '@/lib/kachamak/workspace-history';
import {EditorHistory} from '@/lib/kachamak/editor-history';
import {insertTypedDivider} from '@/lib/kachamak/editor-divider';
import {applyBlockStyle,applyEditorHistory} from '@/lib/kachamak/editor-blocks';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import {trimWordSelection} from '@/lib/kachamak/editor-selection';
import {wrapRootParagraphs} from '@/lib/kachamak/editor-paragraphs';
import {formatEditorMedia} from '@/lib/kachamak/editor-media';
import {formatPastedReports} from '@/lib/kachamak/paste-layout';
import {captureTableCell,focusEditorRange,moveTableCaret,tableCellAt} from '@/lib/kachamak/editor-tables';
import {EditorTableMenu,type EditorTableMenuRequest} from './EditorTableTools';

interface RichEditorProps {
  html: string;
  onChange: (html: string, images?: GalleryImage[]) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  noteId?: string;
  onFocusPlaceholderHide?: boolean;
  colorizeAnnotations?:boolean;
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
  ariaLabel,
  noteId,
  colorizeAnnotations=true,
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const spellCheck=useKachamak(state=>state.editorSpellCheck??true);
  const linkScope='note'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const hasAnchor=/<a[\s/>]/i.test(html);
  const hasImages=html.includes(editorImageAttribute+'=');
  const linkNovel=useKachamak(state=>hasAnchor ? state.novels.find(novel=>novel.id===state.activeNovelId) : undefined);
  const gallery=useKachamak(state=>hasImages ? state.novels.find(novel=>novel.id===state.activeNovelId)?.gallery : undefined);
  const linkStyles=useMemo(()=>noteAnchorStyles(linkNovel,linkScope,colorizeAnnotations),[linkNovel,linkScope,colorizeAnnotations]);
  const lastHtml = useRef<string>("");
  const convertingDivider=useRef(false);
  const pasting=useRef(false);
  const pasteTask=useRef<AbortController|null>(null);
  const nextPasteMode=useRef<PasteMode|null>(null);
  const plainPasteKey=useRef(0);
  const pasteImages=useRef<GalleryImage[]>([]);
  const objectUrls=useRef(new Map<string,{data:string;url:string}>());
  const history=useRef(new EditorHistory());
  const [preview,setPreview]=useState<string|null>(null);
  const [tableMenu,setTableMenu]=useState<EditorTableMenuRequest|null>(null);

  function imageSource(asset:GalleryImage) {
    const urls=objectUrls.current;
    const old=urls.get(asset.id);
    if(old?.data===asset.image)return old.url;
    if(old)URL.revokeObjectURL(old.url);
    if(typeof URL.createObjectURL!=='function')return asset.image;
    const data=asset.image;
    try{
      const bytes=Uint8Array.from(atob(data.slice(data.indexOf(',')+1)),character=>character.charCodeAt(0));
      const url=URL.createObjectURL(new Blob([bytes],{type:data.slice(5,data.indexOf(';'))}));
      urls.set(asset.id,{data,url});
      return url;
    }catch{
      urls.delete(asset.id);
      return data;
    }
  }

  function project() {
    const state=useKachamak.getState();
    return state.novels.find(book=>book.id===state.activeNovelId);
  }

  function paintImages(editor:HTMLElement) {
    if(!editor.querySelector('img['+editorImageAttribute+']'))return;
    const current=project()?.gallery;
    const pending=pasteImages.current;
    paintEditorImages(editor,pending.length?[...(current??[]),...pending]:current,imageSource);
  }

  function openTableMenu(editor:HTMLElement,node:Node|null,point?:{x:number;y:number}){
    const cell=tableCellAt(editor,node);
    if(!cell)return false;
    const target=captureTableCell(editor,cell);
    if(!target)return false;
    const rect=cell.getBoundingClientRect();
    setTableMenu({target,x:point?.x??rect.left,y:point?.y??rect.bottom});
    return true;
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (html !== lastHtml.current && html !== el.innerHTML) {
      pasteTask.current?.abort();
      el.innerHTML = DOMPurify.sanitize(html || "", {FORBID_TAGS:["style","script","iframe","object","embed"],FORBID_ATTR:["srcdoc"],ADD_ATTR:["referrerpolicy"]});
      const repaired=repairListWrappers(el);
      const paragraphs=wrapRootParagraphs(el);
      const repairedHtml=repaired||paragraphs ? storedEditorHtml(el.innerHTML) : undefined;
      formatEditorMedia(el);
      formatPastedReports(el);
      paintImages(el);
      lastHtml.current = storedEditorHtml(el.innerHTML);
      history.current.reset(el);
      if(repairedHtml!==undefined)normalizeEditorContent(()=>onChange(repairedHtml));
    }
  }, [html]);

  useEffect(()=>{
    if(hasImages && ref.current)paintImages(ref.current);
  },[gallery,hasImages]);

  useEffect(()=>{
    const reset=()=>{if(ref.current)history.current.reset(ref.current);};
    const unsubscribe=onHistoryReset(reset);
    const urls=objectUrls.current;
    reset();
    return ()=>{
      unsubscribe();
      pasteTask.current?.abort();
      for(const {url} of urls.values())URL.revokeObjectURL(url);
      urls.clear();
    };
  },[]);

  const handleInput = (event?: {nativeEvent?: Event}) => {
    if (!ref.current) return;
    const input=event?.nativeEvent as InputEvent|undefined;
    if(!pasting.current&&!input?.isComposing&&input?.inputType&&['insertText','insertParagraph','insertLineBreak','insertCompositionText'].includes(input.inputType))wrapRootParagraphs(ref.current);
    if(pasting.current){
      repairListWrappers(ref.current);
      paintImages(ref.current);
    }else if(input?.inputType)pasteTask.current?.abort();
    // Only typed insertions trigger the rule; paste and undo must remain literal.
    if(!pasting.current&&!convertingDivider.current&&input?.inputType==='insertText'&&!input.isComposing){
      history.current.record(ref.current,input.inputType,input.data);
      convertingDivider.current=true;
      try{insertTypedDivider(ref.current);}finally{convertingDivider.current=false;}
    }
    history.current.record(ref.current,input?.inputType,input?.data);
    const stored=storedEditorHtml(ref.current.innerHTML);
    if(stored===lastHtml.current)return;
    lastHtml.current=stored;
    const images=pasteImages.current;
    pasteImages.current=[];
    withEditSource({group:history.current.group,noteId},()=>onChange(stored,images.length?images:undefined));
  };

  async function paste(editor:HTMLElement, mode:PasteMode, read:()=>ReturnType<typeof editorClipboardData>|ReturnType<typeof readEditorClipboard>, toolbar=false) {
    const selection=editor.ownerDocument.getSelection();
    const caret=selection?.rangeCount?selection.getRangeAt(0):null;
    const range=caret&&editor.contains(caret.commonAncestorContainer)?caret.cloneRange():editor.ownerDocument.createRange();
    if(range.commonAncestorContainer===editor.ownerDocument){
      range.selectNodeContents(editor);
      range.collapse(false);
      if(!focusEditorRange(editor,range))return;
    }
    const book=project(), saved=lastHtml.current;
    pasteTask.current?.abort();
    const controller=new AbortController();
    pasteTask.current=controller;
    const canApply=()=>{
      const current=selection?.rangeCount?selection.getRangeAt(0):null;
      return !controller.signal.aborted && ref.current===editor && editor.isConnected &&
        editor.ownerDocument.activeElement===editor && book?.id===project()?.id && saved===lastHtml.current &&
        current?.startContainer===range.startContainer && current.startOffset===range.startOffset &&
        current.endContainer===range.endContainer && current.endOffset===range.endOffset;
    };
    try{
      let data;
      try{data=await read();}
      catch{
        if(toolbar&&canApply()){
          nextPasteMode.current=mode;
          toast.info('Press Ctrl+V or ⌘V in this field to paste in the selected mode.');
        }
        return;
      }
      if(!canApply())return;
      const {html:content,images,unavailable}=await prepareEditorClipboard(data,mode,book?.gallery,controller.signal);
      if(!content||!canApply())return;
      history.current.before(editor);
      pasteImages.current=images;
      pasting.current=true;
      try{
        if(insertPastedBlocks(editor,content))editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}));
        else editor.ownerDocument.execCommand('insertHTML',false,content);
        handleInput();
        if(unavailable)toast.info(unavailable===1?'One image remains linked to its source or described in the note.':
          unavailable+' images remain linked to their sources or described in the note.');
      }finally{pasting.current=false;pasteImages.current=[];}
    }catch{
      if(!controller.signal.aborted)toast.error('Could not paste this content.');
    }finally{
      if(pasteTask.current===controller)pasteTask.current=null;
    }
  }

  useEffect(()=>{
    const editor=ref.current;if(!editor)return;
    const step=(direction:'undo'|'redo')=>{
      const group=history.current.groupFor(direction);
      if(!group||!history.current.step(editor,direction))return false;
      pasteTask.current?.abort();
      paintImages(editor);
      lastHtml.current=storedEditorHtml(editor.innerHTML);withEditSource({group,direction,noteId},()=>onChange(lastHtml.current));
      editor.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));return true;
    };
    const command=(event:Event)=>{const detail=(event as CustomEvent<{direction:'undo'|'redo';applied:boolean}>).detail;if(detail?.direction==='undo'||detail?.direction==='redo')detail.applied=step(detail.direction);};
    const before=(event:Event)=>{const input=event as InputEvent;if(input.inputType==='historyUndo'||input.inputType==='historyRedo'){if(input.cancelable){input.preventDefault();step(input.inputType==='historyUndo'?'undo':'redo');}}else history.current.before(editor);};
    const clipboard=(event:Event)=>{
      const detail=(event as CustomEvent<EditorPasteRequest>).detail;
      if(detail&&focusEditorRange(editor,detail.range))void paste(editor,detail.mode,readEditorClipboard,true);
    };
    editor.addEventListener('kachamak-history',command);editor.addEventListener('beforeinput',before);
    editor.addEventListener('draftopus-paste',clipboard);
    return()=>{editor.removeEventListener('kachamak-history',command);editor.removeEventListener('beforeinput',before);editor.removeEventListener('draftopus-paste',clipboard);};
  },[onChange,noteId]);

  return (
    <div className="relative flex-1 min-h-0">
      {linkStyles && <style>{linkStyles}</style>}
      <div
        data-note-link-scope={linkScope}
        ref={ref}
        spellCheck={spellCheck}
        contentEditable
        data-note-id={noteId}
        role="textbox"
        aria-label={ariaLabel ?? (noteId ? "Note content" : placeholder || "Text")}
        aria-multiline="true"
        suppressContentEditableWarning
        onDoubleClick={event=>{if(!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey)trimWordSelection(ref.current);}}
        onContextMenu={event=>{
          if(openTableMenu(event.currentTarget,event.target as Node,{x:event.clientX,y:event.clientY})){
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={event => {
          const key=event.key.toLowerCase();
          if(key==='v'&&(event.ctrlKey||event.metaKey)&&!event.altKey)plainPasteKey.current=event.shiftKey?Date.now():0;
          if((key==='contextmenu'||key==='f10'&&event.shiftKey)&&
            openTableMenu(event.currentTarget,window.getSelection()?.focusNode??null)){
            event.preventDefault();event.stopPropagation();return;
          }
          if(key==='tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.nativeEvent.isComposing&&moveTableCaret(event.currentTarget,event.shiftKey)){
            event.preventDefault();return;
          }
          if(key==='enter'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.nativeEvent.isComposing&&ref.current){
            history.current.before(ref.current);convertingDivider.current=true;
            try{if(insertTypedDivider(ref.current)){event.preventDefault();handleInput();return;}}finally{convertingDivider.current=false;}
          }
          if(key==='backspace'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&!event.nativeEvent.isComposing&&ref.current&&backspaceListMarker(ref.current)){event.preventDefault();handleInput();return;}
          if((event.ctrlKey||event.metaKey)&&!event.altKey&&(key==='z'||(key==='y'&&!event.shiftKey))){
            event.preventDefault();event.stopPropagation();const selection=window.getSelection();
            applyEditorHistory(selection?.rangeCount?selection.getRangeAt(0):null,key==='y'||event.shiftKey?'redo':'undo');return;
          }
          if((event.ctrlKey||event.metaKey)&&event.altKey&&!event.shiftKey&&/^[0-6]$/.test(event.key)){
            event.preventDefault();const selection=window.getSelection();if(selection?.rangeCount&&!selection.isCollapsed)applyBlockStyle(selection.getRangeAt(0),event.key==='0'?'normal':'h'+event.key);return;
          }
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.dispatchEvent(new Event('katchamak-link')); }
        }}
        onClick={event => {
          const anchor=(event.target as Element).closest('a[href^="#note/"]');
          if (!anchor) { openEditorWebsite(event.nativeEvent); return; }
          event.preventDefault();
          const id=anchor.getAttribute('href')?.slice(6);
          const state=useKachamak.getState(), novel=state.novels.find(n=>n.id===state.activeNovelId);
          const target=id&&novel?findNodeInNovel(novel,id):null;
          if(target){if(event.ctrlKey||event.metaKey)openProjectNote(target.node.id);else setPreview(target.node.id);}else toast.error('This linked note is unavailable. It may be in Trash.');
        }}
        onDrop={event=>{
          const transfer=event.dataTransfer;
          if(Array.from(transfer.files).some(file=>file.type.startsWith('image/')) || /<img\b/i.test(transfer.getData('text/html'))){
            event.preventDefault();
            toast.info('Choose the note image from the book’s Gallery.');
          }
        }}
        onPaste={event => {
          event.preventDefault();
          const mode=Date.now()-plainPasteKey.current<1000?'plain':nextPasteMode.current??'rich';
          plainPasteKey.current=0;
          nextPasteMode.current=null;
          const data=editorClipboardData(event.clipboardData);
          void paste(event.currentTarget,mode,()=>data);
        }}
        onCopy={event=>{
          if(!hasImages)return;
          const editor=event.currentTarget;
          const selection=editor.ownerDocument.getSelection();
          if(!selection?.rangeCount||selection.isCollapsed)return;
          const range=selection.getRangeAt(0);
          if(!editor.contains(range.commonAncestorContainer))return;
          const fragment=range.cloneContents();
          if(!fragment.querySelector('img['+editorImageAttribute+']'))return;
          const template=editor.ownerDocument.createElement('template');
          template.content.append(fragment);
          event.clipboardData.setData('text/html',portableEditorHtml(template.innerHTML,project()?.gallery));
          event.clipboardData.setData('text/plain',selection.toString());
          event.preventDefault();
        }}
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className={`kachamak-editor outline-none ${className ?? ""}`}
      />
      <EditorTableMenu request={tableMenu} close={()=>setTableMenu(null)}/>
      <NotePreview noteId={preview} onClose={()=>setPreview(null)} />
      {noteId && <LinkHighlights editorRef={ref} noteId={noteId} colorize={colorizeAnnotations} />}
    </div>
  );
}
