'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {useKachamak} from '@/lib/kachamak/store';
import {saveWebLibrary,useWebLibrary} from '@/lib/kachamak/cloud-library';
import {contentText,flattenNotes,type NoteMatch} from '@/lib/kachamak/note-links';
import {TABS} from '@/lib/kachamak/types';
import {findNodeInNovel} from '@/lib/kachamak/utils';
import {mergeReviewChoices,pendingLinkReview,reviewDecisions} from '@/lib/kachamak/link-review';
import {toast} from 'sonner';
import {create} from 'zustand';

export const requestLinkReview=()=>{document.dispatchEvent(new Event('katchamak-save-review'));};
export const useSaveReviewState=create<{phase:'idle'|'preparing'|'saving'}>(()=>({phase:'idle'}));
const SAVE_TOAST='kachamak-manual-save';
const afterPaint=()=>new Promise<void>(resolve=>{
  if(document.visibilityState==='hidden')setTimeout(resolve,0);
  else requestAnimationFrame(()=>setTimeout(resolve,0));
});
type Session={projectId:string;noteId:string;html:string;title:string;matches:NoteMatch[]};
const action='w-full rounded-md border border-white/15 px-3 py-2 text-left text-xs hover:bg-white/5 disabled:opacity-40';

export function AutoLinkReview() {
  const [session,setSession]=useState<Session|null>(null),[selected,setSelected]=useState(''),[working,setWorking]=useState(false);
  const sessionRef=useRef<Session|null>(null),busy=useRef(false);
  const saveAttempt=useRef(0);
  const manualAttempt=useRef(0),preparing=useRef<number|null>(null);
  const manualContext=useRef<{projectId:string|null;noteId:string|null}|null>(null);
  const saveError=useWebLibrary(state=>state.error),savePending=useWebLibrary(state=>state.pending);
  const activeProject=useKachamak(state=>state.activeNovelId);
  const novels=useKachamak(state=>state.novels);
  const put=(value:Session|null)=>{sessionRef.current=value;setSession(value);};
  useEffect(()=>{
    let disposed=false;
    const save=async()=>{
      const before=useKachamak.getState(),projectId=before.activeNovelId,noteId=before.selectedNodeId;
      if(preparing.current||manualContext.current?.projectId===projectId&&manualContext.current?.noteId===noteId)return;
      const attempt=++manualAttempt.current;
      manualContext.current={projectId,noteId};preparing.current=attempt;
      useSaveReviewState.setState({phase:'preparing'});
      toast.loading('Saving…',{id:SAVE_TOAST});
      const canReview=before.activeTab!=='trash'&&!sessionRef.current&&!document.querySelector('[role=dialog]');
      let failed=false,found=false,reviewed=false;
      // Paint acknowledgement before serialization/detection. Local review then
      // runs independently of autosave, refresh and the durable network write.
      const painted=afterPaint();
      const persisted=painted.then(()=>saveWebLibrary()).then(()=>({ok:true as const}),error=>{failed=true;return {ok:false as const,error};});
      try {
        await painted;
        const state=useKachamak.getState();
        if(!disposed&&attempt===manualAttempt.current&&!failed&&canReview&&state.activeNovelId===projectId&&state.selectedNodeId===noteId&&state.activeTab!=='trash'&&!sessionRef.current&&!document.querySelector('[role=dialog]')){
          const novel=state.novels.find(novel=>novel.id===projectId),hit=novel&&noteId?findNodeInNovel(novel,noteId):null;
          const matches=novel&&hit?pendingLinkReview(novel,hit.node):[];
          reviewed=true;found=matches.length>0;
          if(novel&&hit&&found){put({projectId:novel.id,noteId:hit.node.id,html:hit.node.content,title:hit.node.title,matches});toast.dismiss(SAVE_TOAST);}
        }
        if(preparing.current===attempt)preparing.current=null;
        if(!disposed&&attempt===manualAttempt.current)useSaveReviewState.setState({phase:'saving'});
        const outcome=await persisted;
        if(!outcome.ok)throw outcome.error;
        const latest=useKachamak.getState(),sameNote=latest.activeNovelId===projectId&&latest.selectedNodeId===noteId;
        if(!disposed&&attempt===manualAttempt.current&&!found)toast.success(reviewed&&sameNote?'Saved. No new note links to review.':'Saved to your account.',{id:SAVE_TOAST});
      }catch(error){if(!disposed&&attempt===manualAttempt.current)toast.error(error instanceof Error?error.message:String(error),{id:SAVE_TOAST});}
      finally{if(preparing.current===attempt)preparing.current=null;if(!disposed&&attempt===manualAttempt.current){manualContext.current=null;useSaveReviewState.setState({phase:'idle'});}}
    };
    document.addEventListener('katchamak-save-review',save);
    return()=>{disposed=true;manualAttempt.current++;manualContext.current=null;preparing.current=null;useSaveReviewState.setState({phase:'idle'});toast.dismiss(SAVE_TOAST);document.removeEventListener('katchamak-save-review',save);};
  },[]);
  useEffect(()=>{if(session&&session.projectId!==activeProject)put(null);},[activeProject,session]);
  const match=session?.matches[0];
  useEffect(()=>{setSelected(match?.candidates.length===1?match.candidates[0].id:'');},[session?.noteId,match?.start,match?.text]);
  const novel=novels.find(novel=>novel.id===session?.projectId);
  const paths=useMemo(()=>new Map(novel?flattenNotes(novel).map(row=>[row.node.id,[TABS.find(tab=>tab.key===row.section)?.label??row.section,...row.path].join(' / ')]):[]),[novel]);
  const close=()=>{if(!busy.current)put(null);};
  const decide=(targetId:string|null,scope:'one'|'instances'|'remaining')=>{
    if(!session||sessionRef.current!==session||!match||busy.current)return;
    busy.current=true;setWorking(true);
    try {
      const state=useKachamak.getState();
      if(state.activeNovelId!==session.projectId)throw new Error('Return to the original project before reviewing links.');
      const current=state.novels.find(novel=>novel.id===session.projectId),hit=current?findNodeInNovel(current,session.noteId):null;
      if(!current||!hit)throw new Error('The original note is no longer available.');
      const decisions=reviewDecisions(session.matches,match,targetId,scope);
      if(!decisions.length){toast.info('This name has multiple targets. Choose its note before continuing.');return;}
      const choices=mergeReviewChoices(current,hit.node,session.html,decisions);
      state.updateNode(hit.section,hit.node.id,{linkChoices:choices});
      const latest=useKachamak.getState().novels.find(novel=>novel.id===session.projectId);
      const source=latest?findNodeInNovel(latest,session.noteId):null;
      const remaining=latest&&source?pendingLinkReview(latest,source.node):[];
      if(useKachamak.getState().activeNovelId!==session.projectId){put(null);return;}
      if(remaining.length)put({...session,matches:remaining});
      else put(null);
      // Advance locally first. The cloud save loop drains newer decisions while
      // an earlier request is in flight; network latency must not lock the review.
      const attempt=++saveAttempt.current;
      void saveWebLibrary().then(()=>{
        if(attempt===saveAttempt.current&&!sessionRef.current&&useKachamak.getState().activeNovelId===session.projectId)toast.success('Link choices saved to your account.');
      }).catch(error=>{
        if(attempt===saveAttempt.current)toast.error((error instanceof Error?error.message:String(error))+' Your link choices remain in this window. Retry Save.');
      });
    }catch(error){
      toast.error(error instanceof Error?error.message:String(error));
      const state=useKachamak.getState(),current=state.novels.find(novel=>novel.id===session.projectId);
      const source=current?findNodeInNovel(current,session.noteId):null;
      const remaining=current&&source&&source.node.content===session.html?pendingLinkReview(current,source.node):[];
      put(state.activeNovelId===session.projectId&&remaining.length?{...session,matches:remaining}:null);
    }
    finally{busy.current=false;setWorking(false);}
  };
  const text=useMemo(()=>session?contentText(session.html):'',[session?.html]);
  const start=match?Math.max(0,match.start-280):0,end=match?Math.min(text.length,match.end+360):0;
  return <Dialog open={!!session} onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-h-[88vh] overflow-y-auto border-white/15 bg-[#161618] font-sans text-foreground sm:max-w-4xl"><DialogHeader><DialogTitle>Automatic link detection</DialogTitle><DialogDescription>{session?.title} · {session?.matches.length??0} remaining. Targets are searched across every tab in this project.</DialogDescription></DialogHeader>{session&&<p role="status" className="text-xs text-muted-foreground">{saveError?'Choices remain in this window. Saving failed; retry Save.':savePending?'Saving link choices…':'Link choices saved.'}</p>}{session&&match&&<>
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_208px]">
      <div className="min-w-0 space-y-4">
        <div aria-label="Link context" className="min-h-48 whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/20 p-5 text-sm leading-7">{start>0?'…':''}{text.slice(start,match.start)}<mark className="rounded bg-amber-400 px-1 py-0.5 font-semibold text-black">{match.text}</mark>{text.slice(match.end,end)}{end<text.length?'…':''}</div>
        <fieldset className="space-y-2"><legend className="mb-2 text-xs font-semibold">{match.candidates.length>1?'Choose the correct note — this name has multiple targets':'Link target'}</legend>{match.candidates.map(candidate=>{const path=paths.get(candidate.id);return <label key={candidate.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/15 p-3 hover:bg-white/5"><input type="radio" name="automatic-link-target" value={candidate.id} checked={selected===candidate.id} onChange={()=>setSelected(candidate.id)} disabled={working} className="mt-1 accent-amber-400"/><span className="min-w-0"><span className="block text-sm" style={{color:candidate.color||'#e7d6a8'}}>{candidate.title}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{path??'Unavailable note'}</span></span></label>;})}</fieldset>
      </div>
      <div className="space-y-2"><button type="button" className={action+' border-amber-400/50 bg-amber-400 text-black hover:bg-amber-300'} disabled={working||!selected} onClick={()=>void decide(selected,'one')}>Create link</button><button type="button" className={action} disabled={working||!selected} onClick={()=>void decide(selected,'instances')}>Create all instances</button><div className="pt-2"/><button type="button" className={action} disabled={working} onClick={()=>void decide(null,'one')}>Ignore link</button><button type="button" className={action} disabled={working} onClick={()=>void decide(null,'instances')}>Ignore all instances</button><button type="button" className={action} disabled={working} onClick={close}>Decide later</button><div className="pt-3"/><button type="button" className={action} disabled={working} onClick={()=>void decide(null,'remaining')}>Accept all further links</button><button type="button" className={action} disabled={working} onClick={close}>Abandon further links</button><p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">All instances applies to this name in this note. Accept all stops at an ambiguous name. Deferred links appear again on the next Save.</p></div>
    </div>
  </>}</DialogContent></Dialog>;
}
