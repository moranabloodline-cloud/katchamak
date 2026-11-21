import {historyDigest,readBookHistory,writeBookHistory} from './history-storage';
import {toast} from 'sonner';
import type {Novel,NoteNode,SectionKey} from './types';

export type HistoryDirection='undo'|'redo';
type Location={selectedNodeId:string|null; paneAId:string|null; paneBId:string|null; activeHomePageId:string};
type Workspace=Location & {novels:Novel[];activeNovelId:string|null};
type Path=(string|number)[];
type Delta={path:Path;before:unknown;after:unknown};
type EditSource={group:object; direction?:HistoryDirection;noteId?:string};
type Entry={changes:Delta[];start:Location;end:Location;noteId?:string;group?:object};

export type SavedHistory={version:1;past:Entry[];future:Entry[]};
type Journal=SavedHistory & {book:Novel;owner:string|null;dirty:boolean;loading?:Promise<void>;touched:boolean;discarded?:boolean};
const journals=new Map<string,Journal>();
let current:Journal|undefined,owner:string|null=null;
let writes=Promise.resolve(),leaving=Promise.resolve();
let scheduled:ReturnType<typeof setTimeout>|undefined;
let storageWarning=false;
function warnStorage(){
  if(!storageWarning){storageWarning=true;toast.warning('Undo history could not be saved or loaded on this device.');}
}
function resetEditors(){batch=undefined;for(const reset of resetListeners)reset();notify();}
function serializeBook(book:Novel){
  // A cloud reload can reorder JSON keys or restore different navigation preferences.
  return JSON.stringify(capture(book),(key,value)=>{
    // Empty Kanban sections added to older books must match their saved history.
    if ((key === 'kanban' || key === 'publish') && Array.isArray(value) && !value.length) return undefined;
    if(key==='updatedAt'||key==='collapsed')return undefined;
    if(!record(value)||Array.isArray(value))return value;
    return Object.fromEntries(Object.keys(value).sort().map(field=>[field,value[field]]));
  });
}
function validHistory(value:SavedHistory|undefined):value is SavedHistory{
  const validLocation=(value:Location)=>value&&typeof value.activeHomePageId==='string'&&
    [value.selectedNodeId,value.paneAId,value.paneBId].every(id=>id===null||typeof id==='string');
  const validEntry=(entry:Entry)=>entry&&validLocation(entry.start)&&validLocation(entry.end)&&Array.isArray(entry.changes)&&entry.changes.length>0&&
    entry.changes.every(d=>d&&Array.isArray(d.path)&&d.path.length>0&&d.path.every(part=>
      typeof part==='number'?Number.isSafeInteger(part)&&part>=0:typeof part==='string'&&!['__proto__','constructor','prototype'].includes(part)));
  return value?.version===1&&[value.past,value.future].every(stack=>Array.isArray(stack)&&stack.length<=100&&stack.every(validEntry));
}
function openJournal(book:Novel){
  const existing=journals.get(book.id);
  if(existing&&(existing.book===book||serializeBook(existing.book)===serializeBook(book))){existing.book=book;return existing;}
  if(existing)existing.discarded=true;
  const j:Journal={book,owner,version:1,past:[],future:[],dirty:false,touched:false};
  journals.set(book.id,j);
  if(owner&&typeof indexedDB==='undefined')warnStorage();
  if(owner&&typeof indexedDB!=='undefined'){
    const scope=owner,content=serializeBook(book);
    j.loading=(async()=>{
      // A reopen can race the last checkpoint from this same window.
      const pending=Promise.all([writes,leaving]);
      const digest=await historyDigest(content);await pending;
      const saved=await readBookHistory(scope,book.id,digest);
      if(j.discarded||!validHistory(saved))return;
      if(!j.touched)j.future=saved.future;
      j.past=[...saved.past,...j.past];
      j.past.splice(0,Math.max(0,j.past.length+j.future.length-100));
      if(current===j)notify();
    })().catch(warnStorage).finally(()=>{j.loading=undefined;});
  }
  return j;
}
export function discardBookHistory(id:string){
  const journal=journals.get(id);
  if(journal)journal.discarded=true;
  journals.delete(id);
  if(owner&&typeof indexedDB!=='undefined'){
    const scope=owner;
    writes=writes.then(()=>writeBookHistory(scope,id)).catch(warnStorage);
  }
}
function activateEmpty(book:Novel){
  current={book,owner,version:1,past:[],future:[],dirty:false,touched:false};
  journals.set(book.id,current);resetEditors();
}
function persist(j:Journal){
  if(!j.owner||typeof indexedDB==='undefined'||!j.dirty||j.discarded)return;
  // Capture immutable checkpoint values before later typing or a book/account switch.
  j.dirty=false;
  const scope=j.owner,id=j.book.id,content=serializeBook(j.book);
  const portable=(stack:Entry[])=>stack.map(({group,...entry})=>({...entry,changes:entry.changes.map(d=>({...d}))}));
  const saved:SavedHistory={version:1,past:portable(j.past),future:portable(j.future)};
  writes=writes.then(async()=>{
    const digest=await historyDigest(content);
    await writeBookHistory(scope,id,{digest,history:saved});
  }).catch(()=>{j.dirty=true;warnStorage();});
}
export async function flushBookHistories(){
  if(scheduled){clearTimeout(scheduled);scheduled=undefined;}
  const pending=[...journals.values()].filter(j=>j.dirty);
  for(const j of pending){
    if(j.loading)await j.loading;
    persist(j);
  }
  await writes;
}
function checkpointSoon(j:Journal){
  j.dirty=true;
  if(!j.owner)return;
  if(scheduled)clearTimeout(scheduled);
  scheduled=setTimeout(()=>{void flushBookHistories();},350);
}
function changed(j:Journal){j.touched=true;checkpointSoon(j);}
export function setHistoryOwner(next:string|null){
  if(owner===next)return;
  leaving=Promise.all([leaving,flushBookHistories()]).then(()=>{});
  journals.clear();owner=next;current=undefined;
  storageWarning=false;resetEditors();
}
const expired=new WeakSet<object>();
export const usableHistoryGroup=(group:object|undefined)=>!!group&&!expired.has(group);
const listeners=new Set<()=>void>();
let source:EditSource|undefined,inside=0,batch:Entry|undefined;
let nativeEdit:{event:Event;source:EditSource}|undefined;
export function markNativeEdit(event:Event,edit:EditSource){
  const context={event,source:edit};nativeEdit=context;
  queueMicrotask(()=>{if(nativeEdit===context)nativeEdit=undefined;});
}
const overlaps=(left:Path,right:Path)=>left.slice(0,Math.min(left.length,right.length)).every((part,i)=>part===right[i]);
export const listenHistory=(listener:()=>void)=>{listeners.add(listener);return ()=>{listeners.delete(listener);};};
const notify=()=>{for(const listener of listeners)listener();};
function targetIndex(stack:Entry[],noteId?:string){
  const last=stack.length-1;
  if(!noteId||!stack[last]?.noteId||stack[last].noteId===noteId)return last;
  const index=stack.map(entry=>entry.noteId).lastIndexOf(noteId);
  if(index<0)return -1;
  return stack.slice(index+1).some(other=>other.changes.some(a=>stack[index].changes.some(b=>overlaps(a.path,b.path))))?-1:index;
}
const stackFor=(dir:HistoryDirection)=>dir==='undo'?current?.past:current?.future;
export const historyGroup=(dir:HistoryDirection,noteId?:string)=>{const stack=stackFor(dir);return stack?.[targetIndex(stack,noteId)]?.group;};
export const historyAvailable=(dir:HistoryDirection,noteId?:string)=>{const stack=stackFor(dir);return !!stack&&targetIndex(stack,noteId)>=0;};
export function withEditSource<T>(edit:EditSource,run:()=>T){
  const previous=source;source=edit;
  try{return run();}finally{source=previous;}
}
const resetListeners=new Set<()=>void>();
export const onHistoryReset=(listener:()=>void)=>{resetListeners.add(listener);return ()=>{resetListeners.delete(listener);};};
let normalizing=0;
export function normalizeEditorContent(run:()=>void){normalizing++;try{run();}finally{normalizing--;}}
function active(s:Workspace){return s.novels.find(n=>n.id===s.activeNovelId);}
export function historyStoreChanged(next:Workspace){
  const book=active(next);
  if(!book){
    if(current){current=undefined;resetEditors();}
  }else if(current?.book.id!==book.id||(!inside&&current.book!==book)){
    const journal=openJournal(book);
    if(journal!==current){current=journal;resetEditors();}
  }else current.book=book;
}
const location=(s:Workspace):Location=>({selectedNodeId:s.selectedNodeId,paneAId:s.paneAId,paneBId:s.paneBId,activeHomePageId:s.activeHomePageId});
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null;
function copy(value:unknown):unknown{
  if(Array.isArray(value))return value.map(copy);
  if(record(value))return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)]));
  return value;
}
// Text and Gallery image strings are shared. Only changed fields or reordered lists enter history.
function differences(before:unknown,after:unknown,path:Path,out:Delta[]){
  if(before===after)return;
  if(Array.isArray(before)&&Array.isArray(after)&&before.length===after.length&&
     before.every((v,i)=>!record(v)||!('id' in v)||v.id===after[i]?.id)){
    before.forEach((v,i)=>differences(v,after[i],[...path,i],out));return;
  }
  if(record(before)&&record(after)&&!Array.isArray(before)&&!Array.isArray(after)){
    for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
      if(key!=='updatedAt'&&key!=='collapsed')differences(before[key],after[key],[...path,key],out);
    }
    return;
  }
  out.push({path,before:copy(before),after:copy(after)});
}
function write(root:unknown,path:Path,index:number,value:unknown):unknown{
  if(index===path.length)return copy(value);
  const next=Array.isArray(root)?root.slice():{...(root as object)};
  const key=path[index],fields=next as Record<string,unknown>;
  if(index===path.length-1&&value===undefined)delete fields[key];
  else fields[key]=write(fields[key],path,index+1,value);
  return next;
}
const mutatingTrees=new Set(['addNode','deleteNode','moveNode','moveNodeTo','duplicateNode','sortChildren','restoreFromTrash']);
const tracked=new Set([...mutatingTrees,'updateNode','moveTreeNotes','renameNovel','addStatus','removeStatus','editGallery',
  'changeHomepage','createHomePage','renameHomePage','moveHomePages','deleteHomePage','convertBoardSelection',
  'changeFamilyRelationship','setTabFormat','updateNovelSettings','setTimeline','importTimeline','cloneTab']);
function treeCopy(nodes:NoteNode[]):NoteNode[]{
  return nodes.map(n=>({...n,children:treeCopy(n.children)}));
}
// updateNode edits the note in place. Save just its path before the action touches it.
function copyPath(nodes:NoteNode[],id:unknown):NoteNode[]{
  for(let index=0;index<nodes.length;index++){
    const n=nodes[index];
    const children=n.id===id?n.children:copyPath(n.children,id);
    if(n.id===id||children!==n.children){const next=nodes.slice();next[index]={...n,children};return next;}
  }
  return nodes;
}
function capture(book:Novel,action?:string,args:unknown[]=[]){
  const {updatedAt,inspectorByTab,openNoteTabs,tabOrder,hiddenSections,hiddenTabs,hiddenInspectorTabs,timeline,...content}=book;
  const result={...content,timeline:{calendar:timeline?.calendar,groups:timeline?.groups}};
  if(!action||!mutatingTrees.has(action)&&action!=='updateNode')return result;
  const section=args[0] as SectionKey,patch=args[2] as Partial<NoteNode>|undefined;
  const linksMayChange=section==='codex'&&(action==='deleteNode'||action==='duplicateNode'||action==='moveNodeTo'||action==='updateNode'&&(patch?.title!==undefined||patch?.aliases!==undefined));
  const sections={...book.sections};
  if(linksMayChange)for(const key of Object.keys(sections) as SectionKey[])sections[key]=treeCopy(sections[key]);
  else if(action==='updateNode')sections[section]=copyPath(sections[section],args[1]);
  else{
    const keys=action==='restoreFromTrash'?[book.trash.find(t=>t.id===args[0])?.section]:[section,...(action==='moveNodeTo'?[args[2] as SectionKey]:[])];
    for(const key of new Set(keys))if(key&&sections[key])sections[key]=treeCopy(sections[key]);
  }
  return {...result,sections};
}
function append(changes:Delta[],start:Location,end:Location){
  if(!current)return;
  const {past,future}=current;changed(current);
  const edit=source??(nativeEdit?.event.eventPhase?nativeEdit.source:undefined);
  const direction=edit?.direction;
  const back=direction==='undo'?past:future,forward=direction==='undo'?future:past;
  if(direction&&edit){
    // Split panes can undo independently. Cross only intervening edits to disjoint fields.
    const index=back.map(entry=>entry.group).lastIndexOf(edit.group);
    const entry=back[index],restorable=entry&&changes.every(change=>entry.changes.some(delta=>
      delta.path.length===change.path.length&&overlaps(delta.path,change.path)&&
      (delta[direction==='undo'?'before':'after']===change.after||
        JSON.stringify(delta[direction==='undo'?'before':'after'])===JSON.stringify(change.after))));
    if(restorable&&!back.slice(index+1).some(other=>other.changes.some(a=>entry.changes.some(b=>overlaps(a.path,b.path))))){
      back.splice(index,1);forward.push(entry);batch=undefined;notify();return;
    }
  }
  const previous=past.at(-1);
  if(!direction&&previous&&(batch===previous||edit&&previous.group===edit.group)){
    // Repeated typing in the same field retains only the two ends of the edit.
    if(previous.changes.length===changes.length&&changes.every((d,i)=>JSON.stringify(d.path)===JSON.stringify(previous.changes[i].path))){
      changes.forEach((d,i)=>{previous.changes[i].after=d.after;});
    }else previous.changes.push(...changes);
    previous.end=end;
  }else{
    const entry={changes,start,end,group:edit?.group,noteId:edit?.noteId};
    past.push(entry);if(past.length>100)past.shift();batch=entry;
    queueMicrotask(()=>{if(batch===entry)batch=undefined;});
  }
  for(const entry of future)if(entry.group&&entry.group!==edit?.group)expired.add(entry.group);
  future.length=0;notify();
}
export function runWorkspaceAction<T>(get:()=>Workspace,name:string,args:unknown[],run:()=>T):T{
  const state=get(),book=active(state);
  const journal=current;
  const before=!normalizing&&book&&tracked.has(name)?capture(book,name,args):null;
  const start=before?location(state):null;
  inside++;
  try{
    const result=run(),next=get(),current=active(next);
    if(book&&current!==book&&current?.id===book.id){
      if(name==='deleteForever'||name==='emptyTrash'){
        discardBookHistory(book.id);
        activateEmpty(current);
      }
      else if(normalizing&&journal&&(journal.loading||journal.past.length||journal.future.length)){
        checkpointSoon(journal);
      }else if(before&&start){
        const changes:Delta[]=[];
        differences(before,capture(current),[],changes);
        if(changes.length)append(changes,start,location(next));
      }
    }
    return result;
  }finally{inside--;}
}
export function trackWorkspaceActions<S extends Workspace>(actions:S,get:()=>S):S{
  const wrapped={...actions};
  for(const name of Object.keys(actions) as (keyof S & string)[]){
    const fn=actions[name];
    if(typeof fn==='function')wrapped[name]=((...args:unknown[])=>runWorkspaceAction(get,name,args,()=>fn(...args))) as S[typeof name];
  }
  return wrapped;
}
export function stepBookHistory<S extends Workspace>(direction:HistoryDirection,state:S,set:(update:Partial<S>)=>void,noteId?:string){
  if(!current)return false;
  const journal=current,{past,future}=journal;
  const from=direction==='undo'?past:future,to=direction==='undo'?future:past;
  const index=targetIndex(from,noteId),entry=from[index],book=active(state);
  if(!entry||!book)return false;
  const undo=direction==='undo',changes=undo?[...entry.changes].reverse():entry.changes;
  let next=book;
  for(const d of changes)next=write(next,d.path,0,undo?d.before:d.after) as Novel;
  const origin=undo?entry.end:entry.start,destination=undo?entry.start:entry.end,nav:Partial<Location>={};
  for(const key of ['selectedNodeId','paneAId','paneBId','activeHomePageId'] as const){
    if(origin[key]!==destination[key]&&state[key]===origin[key])Object.assign(nav,{[key]:destination[key]});
  }
  // A command may first change the tree and then select its result (for example a Timeline import).
  if(changes.some(d=>d.path[0]==='sections')){
    const exists=(nodes:NoteNode[],id:string):boolean=>nodes.some(n=>n.id===id||exists(n.children,id));
    for(const key of ['selectedNodeId','paneAId','paneBId'] as const){
      const id=key in nav?nav[key]:state[key];
      if(id&&!Object.values(next.sections).some(nodes=>exists(nodes,id)))nav[key]=null;
    }
  }
  if(changes.some(d=>d.path[0]==='homePages')){
    const id=nav.activeHomePageId??state.activeHomePageId;
    if(id!=='home'&&!next.homePages?.some(page=>page.id===id))nav.activeHomePageId='home';
  }
  inside++;
  try{
    set({...nav,novels:state.novels.map(n=>n===book?{...next,updatedAt:Date.now()}:n)} as Partial<S>);
    from.splice(index,1);to.push(entry);batch=undefined;changed(journal);notify();return true;
  }finally{inside--;}
}
