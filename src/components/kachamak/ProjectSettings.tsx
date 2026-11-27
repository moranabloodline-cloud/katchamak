'use client';
import {GalleryImagePicker} from './GalleryImagePicker';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {useEffect,useId,useRef,useState} from 'react';
import {Archive,Download,ImagePlus,Trash2,Upload} from 'lucide-react';
import {useKachamak,exportNovelJson} from '@/lib/kachamak/store';
import {saveWebLibrary,prepareWebImport,importWebProject,removeWebProject} from '@/lib/kachamak/cloud-library';
import {PROJECT_BACKUP_ATTACHMENT_NOTICE} from '@/lib/kachamak/project-settings';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import {ManuscriptExport} from './ManuscriptExport';
import {toast} from 'sonner';

const field='mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-amber-400/70';
const button='inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted disabled:opacity-40';
const card='rounded-xl border border-border bg-card p-4';
export function ProjectSettings({open,onOpenChange,section,onBusyChange}:{
  open:boolean;onOpenChange:(open:boolean)=>void;section?:'project'|'backups'|'hidden';onBusyChange?:(busy:boolean)=>void;
}) {
  const novels=useKachamak(s=>s.novels),active=useKachamak(s=>s.activeNovelId),novel=novels.find(n=>n.id===active);
  const [title,setTitle]=useState(''),[author,setAuthor]=useState(''),[series,setSeries]=useState(''),[seriesIndex,setSeriesIndex]=useState('');
  const [image,setImage]=useState<string|undefined>(),[newSeries,setNewSeries]=useState<string|null>(null),[working,setWorking]=useState(false);
  const [exportOpen,setExportOpen]=useState(false),[deleteOpen,setDeleteOpen]=useState(false),[confirmTitle,setConfirmTitle]=useState(''),[importReady,setImportReady]=useState(false);
  const backupNoticeId=useId();
  const backupInput=useRef<HTMLInputElement>(null),openedAt=useRef(0);
  useEffect(()=>{if(open&&novel){setTitle(novel.title);setAuthor(novel.author);setSeries(novel.series||'');setSeriesIndex(novel.seriesIndex||'');setImage(novel.cover.image);setNewSeries(null);setDeleteOpen(false);setConfirmTitle('');setImportReady(false);openedAt.current=novel.updatedAt;}},[open,novel?.id]);
  if(!novel)return null;
  const seriesNames=[...new Set(novels.map(n=>n.series?.trim()).filter((s):s is string=>!!s).concat(series?[series]:[]))].sort((a,b)=>a.localeCompare(b));
  const persist=async(archived=novel.archived??false)=>{
    const current=useKachamak.getState().novels.find(n=>n.id===novel.id);
    if(!current)throw new Error('This project is no longer available.');
    if(current.updatedAt!==openedAt.current)throw new Error('This project changed while Settings was open. Reopen Settings to review the latest version.');
    if(!useKachamak.getState().updateNovelSettings(novel.id,{title,author,series,seriesIndex,archived,cover:{...current.cover,image}}))throw new Error('Enter a novel title and check the metadata fields.');
    openedAt.current=useKachamak.getState().novels.find(n=>n.id===novel.id)!.updatedAt;
    await saveWebLibrary();
  };
  const run=async(action:()=>Promise<void>)=>{if(working)return;setWorking(true);onBusyChange?.(true);try{await action();}catch(error){toast.error(error instanceof Error?error.message:String(error));}finally{setWorking(false);onBusyChange?.(false);}};
  const showProject=section===undefined||section==='project',showBackups=section===undefined||section==='backups';
  const content=section==='hidden'?null:
      <div className={showProject?'grid gap-5 @lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]':'grid gap-5'}>
        <div className="min-w-0 space-y-5">
          {showProject&&<form className={card} onSubmit={e=>{e.preventDefault();void run(async()=>{await persist();toast.success('Novel settings saved.');});}}>
            <h2 className="text-sm font-semibold">Project details</h2>
            <label className="mt-4 block text-xs">Novel Title<input aria-label="Novel Title" required maxLength={200} className={field} value={title} onChange={e=>setTitle(e.target.value)} disabled={working}/></label>
            <label className="mt-3 block text-xs">Author / Pen name<input aria-label="Author / Pen name" maxLength={200} className={field} value={author} onChange={e=>setAuthor(e.target.value)} disabled={working}/></label>
            <div className="mt-3 grid gap-3">
              <div><label className="block text-xs" htmlFor="novel-series">Series (optional)</label><div className="flex items-center gap-1"><select id="novel-series" className={field} value={series} onChange={e=>setSeries(e.target.value)} disabled={working}><option value="">Select</option>{seriesNames.map(name=><option key={name}>{name}</option>)}</select><button type="button" className={button+' mt-1 shrink-0 px-2'} onClick={()=>setNewSeries('')} disabled={working}>New Series</button></div></div>
              <label className="text-xs">Series index<input aria-label="Series index" maxLength={100} placeholder="e.g. Book 1" className={field} value={seriesIndex} onChange={e=>setSeriesIndex(e.target.value)} disabled={working}/></label>
            </div>
            {newSeries!==null&&<div className="mt-3 flex gap-2"><input autoFocus aria-label="New series name" placeholder="Series name" maxLength={200} className={field+' mt-0'} value={newSeries} onChange={e=>setNewSeries(e.target.value)}/><button type="button" className={button} disabled={!newSeries.trim()} onClick={()=>{setSeries(seriesNames.find(s=>s.toLocaleLowerCase()===newSeries.trim().toLocaleLowerCase())||newSeries.trim());setNewSeries(null);}}>Add</button><button type="button" className={button} onClick={()=>setNewSeries(null)}>Cancel</button></div>}
            <div className="mt-4 flex justify-end"><button type="submit" disabled={working||!title.trim()} className="rounded bg-amber-400 px-4 py-2 text-xs font-medium text-black disabled:opacity-40">{working?'Saving…':'Save changes'}</button></div>
          </form>}
          {showBackups&&<section className={card}><h2 className="text-sm font-semibold">{novel.title}</h2><div className="mt-3 space-y-2"><button className={button+' w-full'} onClick={()=>setExportOpen(true)}><Download className="h-3.5 w-3.5"/>Export manuscript</button><p id={backupNoticeId} className="text-xs leading-relaxed text-muted-foreground">{PROJECT_BACKUP_ATTACHMENT_NOTICE}</p><button className={button+' w-full'} aria-describedby={backupNoticeId} onClick={()=>{exportNovelJson(novel);toast.success('Backup downloaded.');}}>Export JSON backup</button><button className={button+' w-full'} disabled={working} onClick={()=>{if(importReady)backupInput.current?.click();else void run(async()=>{await prepareWebImport(null);setImportReady(true);});}}><Upload className="h-3.5 w-3.5"/>{importReady?'Choose JSON backup':'Import into library'}</button><input ref={backupInput} disabled={working} type="file" className="sr-only" aria-label="Import JSON backup" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{await importWebProject(file,null);setImportReady(false);onOpenChange(false);toast.success('Project imported.');});}}/></div></section>}
        </div>
        {showProject&&<section className={card+' min-w-0'}><h2 className="text-sm font-semibold">Cover</h2><div className="my-3 flex flex-wrap items-center gap-2"><GalleryImagePicker novel={novel} onPick={ref=>setImage(ref)}><button type="button" className={button} disabled={working}><ImagePlus className="h-3.5 w-3.5"/>Choose cover from Gallery</button></GalleryImagePicker><button aria-label="Remove cover" title="Remove cover" className={button+' px-2'} disabled={working||!image} onClick={()=>setImage(undefined)}><Trash2 className="h-3.5 w-3.5"/></button></div>
          <div className="mx-auto flex aspect-[2/3] w-full max-w-[14rem] items-center justify-center overflow-hidden rounded bg-black text-white" style={!image?{background:novel.cover.bg}:undefined}>{image?<img src={projectImageSrc(novel.gallery,image)} alt={`Cover preview for ${title}`} className="h-full w-full object-contain"/>:<div className="px-5 text-center"><div className="text-5xl">{novel.cover.icon}</div><p className="mt-3 font-serif text-lg">{title||'Your novel'}</p></div>}</div>
        </section>}
        {showProject&&<section className={card+' @lg:col-span-2'}><h2 className="text-sm font-semibold">Archive or delete</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Archiving keeps all your work. Export a backup before permanently deleting the novel.</p><div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={working} onClick={()=>void run(async()=>{await persist(!novel.archived);onOpenChange(false);useKachamak.getState().closeNovel();toast.success(novel.archived?'Novel restored to the library.':'Novel archived. Find it under Archived in the library.');})}><Archive className="h-3.5 w-3.5"/>{novel.archived?'Unarchive Novel':'Archive Novel'}</button><button className={button+' text-red-500'} disabled={working} onClick={()=>{setConfirmTitle('');setDeleteOpen(true);}}><Trash2 className="h-3.5 w-3.5"/>Delete Novel</button></div></section>}
      </div>;
  return <>
    {section!==undefined ? content : <Dialog open={open} onOpenChange={value=>{if(!working)onOpenChange(value);}}>
      <DialogContent aria-describedby={undefined} className="@container max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Project settings</DialogTitle></DialogHeader>
        {content}
      </DialogContent>
    </Dialog>}
    <ManuscriptExport open={exportOpen} onOpenChange={setExportOpen}/>
    <AlertDialog open={deleteOpen} onOpenChange={value=>{if(!working)setDeleteOpen(value);}}><AlertDialogContent className="border-white/15 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete {novel.title}?</AlertDialogTitle><AlertDialogDescription>This removes the novel, its notes and its library memberships. Export a JSON backup before continuing. Type the novel title to confirm.</AlertDialogDescription><p id={backupNoticeId+'-delete'} className="text-xs leading-relaxed text-muted-foreground">{PROJECT_BACKUP_ATTACHMENT_NOTICE}</p></AlertDialogHeader><input aria-label="Confirm novel title" className={field} value={confirmTitle} onChange={e=>setConfirmTitle(e.target.value)} disabled={working}/><button className={button} aria-describedby={backupNoticeId+'-delete'} onClick={()=>exportNovelJson(novel)}>Export backup</button><AlertDialogFooter><AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel><button className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={working||confirmTitle!==novel.title} onClick={()=>void run(async()=>{await removeWebProject(novel.id);setDeleteOpen(false);onOpenChange(false);toast.success('Novel deleted.');})}>Delete permanently</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
