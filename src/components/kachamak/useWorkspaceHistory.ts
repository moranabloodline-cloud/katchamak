import {useEffect,useRef,useSyncExternalStore} from 'react';
import {stepWorkspaceHistory} from '@/lib/kachamak/store';
import {editorCanStep,otherMountedEditor} from '@/lib/kachamak/editor-history';
import {historyAvailable,historyGroup,listenHistory,markNativeEdit,type HistoryDirection} from '@/lib/kachamak/workspace-history';

const nativeText='textarea:not([readonly]),input:not([type]):not([readonly]),input:is([type=text],[type=number],[type=search],[type=email],[type=url],[type=tel],[type=password]):not([readonly])';
function observe(update:()=>void){
  const off=listenHistory(update);
  const events=['focusin','focusout','input','selectionchange'];
  for(const name of events)document.addEventListener(name,update);
  return ()=>{off();for(const name of events)document.removeEventListener(name,update);};
}
const serverSnapshot=()=>0;

export function useWorkspaceHistory(){
  const nativeGroups=useRef(new WeakMap<Element,object>());
  const nativeHistory=(direction:HistoryDirection,el:HTMLElement)=>nativeGroups.current.has(el)&&
    (document.queryCommandEnabled?.(direction)??true);
  const lastField=useRef<HTMLElement|null>(null);
  function field(){
    const focused=document.activeElement;
    if(focused?.closest('[data-editor-toolbar]'))return lastField.current?.isConnected?lastField.current:null;
    const target=focused?.closest<HTMLElement>('.kachamak-editor[contenteditable=true],'+nativeText)??null;
    lastField.current=target;return target;
  }
  function permitted(direction:HistoryDirection,editor:HTMLElement|null){
    if(editor?.matches(nativeText)&&nativeHistory(direction,editor))return true;
    if(editor&&editorCanStep(editor,direction))return true;
    const noteId=editor?.dataset.noteId;
    return historyAvailable(direction,noteId)&&!(editor&&otherMountedEditor(historyGroup(direction,noteId),editor));
  }
  function run(direction:HistoryDirection){
    const editor=field();
    if(!permitted(direction,editor))return;
    if(editor?.matches(nativeText)&&nativeHistory(direction,editor)){
      editor.focus({preventScroll:true});document.execCommand(direction);return;
    }
    if(editor&&editorCanStep(editor,direction)){
      const detail={direction,applied:false};
      editor.dispatchEvent(new CustomEvent('kachamak-history',{detail}));
      if(detail.applied)return;
    }
    stepWorkspaceHistory(direction,editor?.dataset.noteId);
  }
  const available=useSyncExternalStore(observe,()=>{
    const editor=field();
    return Number(permitted('undo',editor))+2*Number(permitted('redo',editor));
  },serverSnapshot);
  useEffect(()=>{
    function input(event:Event){
      const el=event.target;
      if(!(el instanceof HTMLElement)||!el.matches(nativeText))return;
      const type=(event as InputEvent).inputType;
      const direction=type==='historyUndo'?'undo':type==='historyRedo'?'redo':undefined;
      const group=nativeGroups.current.get(el)??{};
      nativeGroups.current.set(el,group);markNativeEdit(event,{group,direction});
    }
    function key(event:KeyboardEvent){
      if(event.defaultPrevented||event.isComposing||event.altKey||!(event.ctrlKey||event.metaKey))return;
      const key=event.key.toLowerCase();
      if(key!=='z'&&(key!=='y'||event.shiftKey))return;
      const target=event.target instanceof Element?event.target:null;
      const direction=key==='y'||event.shiftKey?'redo':'undo';
      if(target?.closest('[role=dialog],[role=alertdialog],[role=menu]')||
         target?.closest('[contenteditable=true]')&&!target.closest('.kachamak-editor'))return;
      const input=target?.closest<HTMLElement>(nativeText);
      if(input&&nativeHistory(direction,input))return;
      if(input&&!historyAvailable(direction))return;
      event.preventDefault();event.stopPropagation();run(direction);
    }
    document.addEventListener('keydown',key,true);
    document.addEventListener('input',input,true);
    return ()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('input',input,true);};
  },[]);
  return {canUndo:!!(available&1),canRedo:!!(available&2),run};
}
