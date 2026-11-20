'use client';
import {useEffect,useRef,useState} from 'react';
import {Target} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {useKachamak} from '@/lib/kachamak/store';
import {DEFAULT_DOCUMENT_TARGET,validDocumentTarget,documentTargetProgress,crossedTargetMilestones} from '@/lib/kachamak/document-target';
import type {NoteNode,SectionKey,DocumentTarget as TargetSettings} from '@/lib/kachamak/types';

export function DocumentTarget({node,section}:{node:NoteNode|null;section:SectionKey}){
  const projectId=useKachamak(s=>s.activeNovelId);
  const settings=node?.documentTarget??DEFAULT_DOCUMENT_TARGET;
  const [open,setOpen]=useState(false),[draft,setDraft]=useState<TargetSettings>({...settings});
  const [error,setError]=useState('');
  const progress=documentTargetProgress(node?.content??'',settings);
  const previous=useRef<{key:string;count:number}|null>(null);
  // Baseline on navigation/settings changes; notify only when the same document crosses a threshold.
  const key=JSON.stringify([projectId,node?.id,settings]);
  useEffect(()=>{
    const last=previous.current;
    if(last?.key===key)for(const message of crossedTargetMilestones(last.count,progress.count,settings))toast.success(`${node?.title||'Untitled note'}: ${message}.`);
    previous.current={key,count:progress.count};
  },[key,progress.count]);
  useEffect(()=>{setOpen(false);},[projectId,node?.id]);
  const changeOpen=(value:boolean)=>{if(value){setDraft({...settings});setError('');}setOpen(value);};
  const current=documentTargetProgress(node?.content??'',draft);
  const unit=settings.unit==='words'?'words':'characters';
  const label=settings.amount?`${progress.count.toLocaleString()} / ${settings.amount.toLocaleString()} ${unit}${settings.showOverrun&&progress.overrun?` · Overrun: +${progress.overrun.toLocaleString()}`:''}`:'Document Target';
  const field='h-9 min-w-0 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-amber-500';
  const numeric=(name:'amount'|'minimum'|'allowance',label:string)=><input aria-label={label} type="number" min={0} max={10000000} step={1} value={Number.isNaN(draft[name])?'':draft[name]} className={field} onChange={e=>{const value=e.currentTarget.valueAsNumber;setDraft({...draft,[name]:value,...(name==='amount'&&value===0?{minimum:0}:{})});}}/>;
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><button type="button" aria-label="Document Target" title={label} disabled={!node} className="absolute left-2 flex h-8 w-7 items-center justify-center rounded text-amber-400/90 hover:bg-white/5 disabled:opacity-30"><Target aria-hidden="true" className="h-4 w-4"/>{settings.amount>0&&<span role="progressbar" aria-label="Document target progress" aria-valuemin={0} aria-valuemax={progress.maximum} aria-valuenow={Math.min(progress.count,progress.maximum)} aria-valuetext={label} className="absolute bottom-0.5 left-0 h-0.5 w-full overflow-hidden rounded bg-white/15"><span className={`block h-full ${progress.count>=settings.amount?'bg-emerald-400':'bg-amber-400'}`} style={{width:`${progress.percent}%`}}/></span>}</button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm"><DialogHeader><DialogTitle>Document Target</DialogTitle><DialogDescription><span style={{color:node?.color || undefined}}>{node?.title||'Untitled note'}</span> · document text only</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event=>{event.preventDefault();if(!validDocumentTarget(draft)){setError('Use whole numbers from 0 to 10,000,000. Minimum target cannot exceed the document target.');return;}const state=useKachamak.getState();if(!node||state.activeNovelId!==projectId||state.selectedNodeId!==node.id){setOpen(false);return;}state.updateNode(section,node.id,{documentTarget:{...draft}});setOpen(false);}}>
        <label className="block space-y-2 text-sm"><span>Target for this document</span><div className="grid grid-cols-[1fr_120px] gap-2">{numeric('amount','Target for this document')}<select aria-label="Target unit" className={field} value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value as TargetSettings['unit']})}><option value="words">Words</option><option value="characters">Characters</option></select></div></label>
        <div className="space-y-3 border-y border-border py-4"><label className="grid grid-cols-2 items-center gap-3 text-sm"><span>Minimum target</span>{numeric('minimum','Minimum target')}</label><label className="grid grid-cols-2 items-center gap-3 text-sm"><span>Overrun allowance</span>{numeric('allowance','Overrun allowance')}</label>
          {([['showOverrun','Show overrun'],['showAllowance','Show allowance in progress bar']] as const).map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-400" checked={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/>{label}</label>)}</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-400" checked={draft.notifications} onChange={e=>setDraft({...draft,notifications:e.target.checked})}/>Show target notifications</label>
        <p className="text-xs text-muted-foreground">{current.count.toLocaleString()} {draft.unit}{draft.amount>0?` / ${draft.amount.toLocaleString()}`:''}{draft.showOverrun&&current.overrun>0&&draft.amount>0?` · Overrun: +${current.overrun.toLocaleString()}`:''}. Set the target to 0 to turn it off.</p>
        {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end"><button type="submit" className="rounded-md bg-amber-400 px-6 py-2 text-sm font-medium text-black hover:bg-amber-300">OK</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
