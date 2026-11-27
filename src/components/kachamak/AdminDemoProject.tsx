'use client';
import {useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {publishedDemoStats,publishDemoProject} from '@/lib/kachamak/cloud-library';
export function AdminDemoProject({onOpen}:{onOpen:()=>void}) {
  const novels=useKachamak(s=>s.novels);
  const sources=novels.filter(n=>(!n.demo||n.demo.source)&&/morrigan/i.test(n.title));
  const [source,setSource]=useState(sources[0]?.id??''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const demo=novels.find(n=>n.demo?.source)||novels.find(n=>n.demo?.key==='morrigans-ocean'&&!n.archived);
  async function run(action:()=>Promise<string>){
    setBusy(true);setError('');setMessage('');
    try{setMessage(await action());}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }
  return <section aria-label="Shared demo project" className="space-y-3 rounded-xl border border-amber-400/20 p-4">
    <h3 className="font-medium">Morrigan’s Ocean demo</h3>
    <p className="text-xs text-stone-400">Publish the selected novel, including Canvas and the example Story Timeline. Readers receive the latest edition when reopening Draftopus. Their previous copy and edits stay in Archived projects.</p>
    <label className="grid gap-1 text-xs">Source novel
      <select aria-label="Demo source novel" className="rounded border border-white/20 bg-[#222] p-2" value={source} onChange={e=>setSource(e.target.value)}>
        {!sources.length&&<option value="">No original Morrigan’s Ocean project found</option>}
        {sources.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy||!source} className="rounded-lg border border-amber-400/25 px-3 py-2 text-sm hover:bg-amber-400/10 disabled:opacity-50" onClick={()=>void run(async()=>{
        const result=await publishDemoProject(source);
        return `${result.title} published with ${result.chapterCount} Timeline events and ${result.canvasPageCount} populated Canvas pages.`;
      })}>Publish demo for all accounts</button>
      <button type="button" disabled={busy} className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={()=>void run(async()=>{
        const result=await publishedDemoStats();
        if(!result.available)return 'No demo has been published.';
        return `${result.title} · ${result.canvasPageCount} populated Canvas pages · Published ${new Date(result.version!).toLocaleString()}`;
      })}>Check published demo</button>
      {demo&&<button type="button" disabled={busy} className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={()=>{const state=useKachamak.getState();state.openNovel(demo.id);state.setTab('timeline');state.setView('timeline');onOpen();}}>Open demo Timeline</button>}
    </div>
    {message&&<p role="status" className="text-xs text-emerald-300">{message}</p>}
    {error&&<p role="alert" className="text-xs text-red-300">{error}</p>}
  </section>;
}
