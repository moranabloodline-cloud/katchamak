"use client";

import DOMPurify from "dompurify";
import { useKachamak } from "@/lib/kachamak/store";
import { findNodeInNovel } from "@/lib/kachamak/utils";
import { toast } from "sonner";
import { preparePastedContent } from "@/lib/kachamak/paste-content";
import { useEffect, useId, useRef, useState } from "react";
import {noteAnchorStyles} from '@/lib/kachamak/note-links';
import { LinkHighlights } from './LinkHighlights';
import {NotePreview} from './NotePreview';
import {repairListWrappers,backspaceListMarker} from '@/lib/kachamak/editor-lists';
import {EditorHistory} from '@/lib/kachamak/editor-history';
import {insertTypedDivider} from '@/lib/kachamak/editor-divider';
import {applyBlockStyle,applyEditorHistory} from '@/lib/kachamak/editor-blocks';
import {openProjectNote} from '@/lib/kachamak/note-navigation';

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
  const spellCheck=useKachamak(state=>state.editorSpellCheck??true);
  const linkScope='note'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const novel=useKachamak(state=>state.novels.find(novel=>novel.id===state.activeNovelId));
  const lastHtml = useRef<string>("");
  const convertingDivider=useRef(false);
  const pasting=useRef(false);
  const history=useRef(new EditorHistory());
  const [preview,setPreview]=useState<string|null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (html !== lastHtml.current && html !== el.innerHTML) {
      el.innerHTML = DOMPurify.sanitize(html || "", {FORBID_TAGS:["style","script","iframe","object","embed"],FORBID_ATTR:["srcdoc"]});
      const repaired=repairListWrappers(el);
      lastHtml.current = el.innerHTML;
      history.current.reset(el);
      if(repaired)onChange(lastHtml.current);
    }
  }, [html]);

  useEffect(()=>{if(ref.current)history.current.reset(ref.current);},[]);

  const handleInput = (event?: {nativeEvent?: Event}) => {
    if (!ref.current) return;
    const input=event?.nativeEvent as InputEvent|undefined;
    if(pasting.current)repairListWrappers(ref.current);
    // Only typed insertions trigger the rule; paste and undo must remain literal.
    if(!pasting.current&&!convertingDivider.current&&input?.inputType==='insertText'&&!input.isComposing){
      history.current.record(ref.current,input.inputType,input.data);
      convertingDivider.current=true;
      try{insertTypedDivider(ref.current);}finally{convertingDivider.current=false;}
    }
    history.current.record(ref.current,input?.inputType,input?.data);
    lastHtml.current = ref.current.innerHTML;
    onChange(lastHtml.current);
  };

  useEffect(()=>{
    const editor=ref.current;if(!editor)return;
    const step=(direction:'undo'|'redo')=>{
      if(!history.current.step(editor,direction))return false;
      lastHtml.current=editor.innerHTML;onChange(lastHtml.current);
      editor.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));return true;
    };
    const command=(event:Event)=>{const detail=(event as CustomEvent<{direction:'undo'|'redo';applied:boolean}>).detail;if(detail?.direction==='undo'||detail?.direction==='redo')detail.applied=step(detail.direction);};
    const before=(event:Event)=>{const input=event as InputEvent;if(input.inputType==='historyUndo'||input.inputType==='historyRedo'){if(input.cancelable){input.preventDefault();step(input.inputType==='historyUndo'?'undo':'redo');}}else history.current.before(editor);};
    editor.addEventListener('kachamak-history',command);editor.addEventListener('beforeinput',before);
    return()=>{editor.removeEventListener('kachamak-history',command);editor.removeEventListener('beforeinput',before);};
  },[onChange]);

  return (
    <div className="relative flex-1 min-h-0">
      <style>{noteAnchorStyles(novel,linkScope)}</style>
      <div
        data-note-link-scope={linkScope}
        ref={ref}
        spellCheck={spellCheck}
        contentEditable
        data-note-id={noteId}
        role="textbox"
        aria-label={noteId ? "Note content" : placeholder || "Text"}
        aria-multiline="true"
        suppressContentEditableWarning
        onKeyDown={event => {
          const key=event.key.toLowerCase();
          if(key==='backspace'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&!event.nativeEvent.isComposing&&ref.current&&backspaceListMarker(ref.current)){event.preventDefault();handleInput();return;}
          if((event.ctrlKey||event.metaKey)&&!event.altKey&&(key==='z'||(key==='y'&&!event.shiftKey))){
            event.preventDefault();event.stopPropagation();const selection=window.getSelection();
            applyEditorHistory(selection?.rangeCount?selection.getRangeAt(0):null,key==='y'||event.shiftKey?'redo':'undo');return;
          }
          if((event.ctrlKey||event.metaKey)&&event.altKey&&!event.shiftKey&&/^[0-6]$/.test(event.key)){
            event.preventDefault();const selection=window.getSelection();applyBlockStyle(selection?.rangeCount?selection.getRangeAt(0):null,event.key==='0'?'normal':'h'+event.key);return;
          }
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.dispatchEvent(new Event('katchamak-link')); }
        }}
        onClick={event => {
          const anchor=(event.target as Element).closest('a[href^="#note/"]');
          if (!anchor) return;
          event.preventDefault();
          const id=anchor.getAttribute('href')?.slice(6);
          const state=useKachamak.getState(), novel=state.novels.find(n=>n.id===state.activeNovelId);
          const target=id&&novel?findNodeInNovel(novel,id):null;
          if(target){if(event.ctrlKey||event.metaKey)openProjectNote(target.node.id);else setPreview(target.node.id);}else toast.error('This linked note is unavailable. It may be in Trash.');
        }}
        onPaste={event => {
          event.preventDefault();
          const content = preparePastedContent(event.clipboardData.getData('text/html'), event.clipboardData.getData('text/plain'));
          if(ref.current)history.current.before(ref.current);
          pasting.current=true;
          try{document.execCommand('insertHTML', false, content);handleInput();}
          finally{pasting.current=false;}
        }}
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className={`kachamak-editor outline-none ${className ?? ""}`}
      />
      <NotePreview noteId={preview} onClose={()=>setPreview(null)} />
      {noteId && <LinkHighlights editorRef={ref} noteId={noteId} />}
    </div>
  );
}
