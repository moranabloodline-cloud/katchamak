'use client';
import {useEffect,useRef,useState} from 'react';
import {Archive,Download,ImagePlus,Trash2,Upload} from 'lucide-react';
import {useKachamak,exportNovelJson} from '@/lib/kachamak/store';
import {saveWebLibrary,prepareWebImport,importWebProject,removeWebProject} from '@/lib/kachamak/cloud-library';
import {readNovelCover} from '@/lib/kachamak/project-settings';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import {BookMetadataFields} from './BookMetadataFields';
import {ManuscriptExport} from './ManuscriptExport';
import {toast} from 'sonner';

const field='mt-1 w-full rounded border border-white/25 bg-[#252529] px-2.5 py-2 text-sm text-foreground outline-none focus:border-amber-400/70';
const button='inline-flex items-center justify-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40';
const card='rounded-md border border-white/15 bg-[#1e1e20] p-4';
export function ProjectSettings({open,onOpenChange}:{open:boolean;onOpenChange:(open:boolean)=>void}) {
  const novels=useKachamak(s=>s.novels),active=useKachamak(s=>s.activeNovelId),novel=novels.find(n=>n.id===active);
  const [title,setTitle]=useState(''),[author,setAuthor]=useState(''),[series,setSeries]=useState(''),[seriesIndex,setSeriesIndex]=useState('');
  const [language,setLanguage]=useState(''),[genres,setGenres]=useState<string[]>([]),[subgenres,setSubgenres]=useState<string[]>([]),[chapterCount,setChapterCount]=useState('');
  const [image,setImage]=useState<string|undefined>(),[newSeries,setNewSeries]=useState<string|null>(null),[working,setWorking]=useState(false);
  const [exportOpen,setExportOpen]=useState(false),[deleteOpen,setDeleteOpen]=useState(false),[confirmTitle,setConfirmTitle]=useState(''),[importReady,setImportReady]=useState(false);
  const imageInput=useRef<HTMLInputElement>(null),backupInput=useRef<HTMLInputElement>(null),openedAt=useRef(0);
  useEffect(()=>{if(open&&novel){setTitle(novel.title);setAuthor(novel.author);setSeries(novel.series||'');setSeriesIndex(novel.seriesIndex||'');setImage(novel.cover.image);setLanguage(novel.language??'');setGenres(novel.genres??[]);setSubgenres(novel.subgenres??[]);setChapterCount(novel.chapterCount?.toString()??'');setNewSeries(null);setDeleteOpen(false);setConfirmTitle('');openedAt.current=novel.updatedAt;}},[open,novel?.id]);
  if(!novel)return null;
  const seriesNames=[...new Set(novels.map(n=>n.series?.trim()).filter((s):s is string=>!!s).concat(series?[series]:[]))].sort((a,b)=>a.localeCompare(b));
  const persist=async(archived=novel.archived??false)=>{
    const current=useKachamak.getState().novels.find(n=>n.id===novel.id);
    if(!current)throw new Error('This project is no longer available.');
    if(current.updatedAt!==openedAt.current)throw new Error('This project changed while Settings was open. Reopen Settings to review the latest version.');
    if(!useKachamak.getState().updateNovelSettings(novel.id,{title,author,series,seriesIndex,language,genres,subgenres,chapterCount:chapterCount?Number(chapterCount):undefined,archived,cover:{...current.cover,image}}))throw new Error('Enter a novel title and check the metadata fields.');
    openedAt.current=useKachamak.getState().novels.find(n=>n.id===novel.id)!.updatedAt;
    await saveWebLibrary();
  };
  const run=async(action:()=>Promise<void>)=>{if(working)return;setWorking(true);try{await action();}catch(error){toast.error(error instanceof Error?error.message:String(error));}finally{setWorking(false);}};
  const upload=async(file:File)=>{await run(async()=>{setImage(await readNovelCover(file));});};
  return <>
    <Dialog open={open} onOpenChange={value=>{if(!working)onOpenChange(value);}}><DialogContent className="max-h-[92vh] overflow-y-auto border-white/15 bg-[#19191b] text-foreground sm:max-w-4xl"><DialogHeader><DialogTitle>Settings</DialogTitle><DialogDescription>Metadata and cover for this novel. Save changes to update your library.</DialogDescription></DialogHeader>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <form className={card} onSubmit={e=>{e.preventDefault();void run(async()=>{await persist();toast.success('Novel settings saved.');});}}>
            <h2 className="text-xs font-bold uppercase tracking-wide">Metadata</h2><p className="mt-2 text-xs leading-relaxed text-[#cfb77d]">This is the metadata of your novel, used for organizing your novel collection.</p>
            <label className="mt-4 block text-xs">Novel Title<input aria-label="Novel Title" required maxLength={200} className={field} value={title} onChange={e=>setTitle(e.target.value)} disabled={working}/></label>
            <label className="mt-3 block text-xs">Author / Pen name<input aria-label="Author / Pen name" maxLength={200} className={field} value={author} onChange={e=>setAuthor(e.target.value)} disabled={working}/></label>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <div><label className="block text-xs" htmlFor="novel-series">Series (optional)</label><div className="flex items-center gap-1"><select id="novel-series" className={field} value={series} onChange={e=>setSeries(e.target.value)} disabled={working}><option value="">Select</option>{seriesNames.map(name=><option key={name}>{name}</option>)}</select><button type="button" className={button+' mt-1 shrink-0 px-2'} onClick={()=>setNewSeries('')} disabled={working}>New Series</button></div></div>
              <label className="text-xs">Series index<input aria-label="Series index" maxLength={100} placeholder="e.g. Book 1" className={field} value={seriesIndex} onChange={e=>setSeriesIndex(e.target.value)} disabled={working}/></label>
            </div>
            {newSeries!==null&&<div className="mt-3 flex gap-2"><input autoFocus aria-label="New series name" placeholder="Series name" maxLength={200} className={field+' mt-0'} value={newSeries} onChange={e=>setNewSeries(e.target.value)}/><button type="button" className={button} disabled={!newSeries.trim()} onClick={()=>{setSeries(seriesNames.find(s=>s.toLocaleLowerCase()===newSeries.trim().toLocaleLowerCase())||newSeries.trim());setNewSeries(null);}}>Add</button><button type="button" className={button} onClick={()=>setNewSeries(null)}>Cancel</button></div>}
            <BookMetadataFields language={language} genres={genres} subgenres={subgenres} chapterCount={chapterCount} onLanguage={setLanguage} onGenres={setGenres} onSubgenres={setSubgenres} onChapterCount={setChapterCount} disabled={working} extraGenres={novels.flatMap(value=>value.genres??[])} extraSubgenres={novels.flatMap(value=>value.subgenres??[])}/>
            <div className="mt-4 flex justify-end"><button type="submit" disabled={working||!title.trim()} className="rounded bg-amber-400 px-4 py-2 text-xs font-medium text-black disabled:opacity-40">{working?'Saving…':'Save changes'}</button></div>
          </form>
          <section className={card}><h2 className="text-xs font-bold uppercase tracking-wide">Danger Zone</h2><p className="mt-2 text-xs leading-relaxed text-[#cfb77d]">Archiving keeps all your work. Deleting removes this novel from your library and cannot be undone here. Export a backup first.</p><div className="mt-3 flex flex-wrap justify-between gap-2"><button className={button} disabled={working} onClick={()=>void run(async()=>{await persist(!novel.archived);onOpenChange(false);useKachamak.getState().closeNovel();toast.success(novel.archived?'Novel restored to the library.':'Novel archived. Find it under Archived in the library.');})}><Archive className="h-3.5 w-3.5"/>{novel.archived?'Unarchive Novel':'Archive Novel'}</button><button className={button+' text-red-400'} disabled={working} onClick={()=>{setConfirmTitle('');setDeleteOpen(true);}}><Trash2 className="h-3.5 w-3.5"/>Delete Novel</button></div></section>
          <details className={card}><summary className="cursor-pointer text-xs font-bold uppercase tracking-wide">Backups &amp; Export</summary><div className="mt-3 space-y-2"><button className={button+' w-full'} onClick={()=>setExportOpen(true)}><Download className="h-3.5 w-3.5"/>Export manuscript</button><button className={button+' w-full'} onClick={()=>{exportNovelJson(novel);toast.success('Backup downloaded.');}}>Export JSON backup</button><button className={button+' w-full'} onClick={()=>{if(importReady)backupInput.current?.click();else void run(async()=>{await prepareWebImport(null);setImportReady(true);});}}><Upload className="h-3.5 w-3.5"/>{importReady?'Choose JSON backup':'Import into library'}</button><input ref={backupInput} type="file" className="sr-only" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{await importWebProject(await file.text(),null);setImportReady(false);onOpenChange(false);toast.success('Project imported.');});}}/></div></details>
        </div>
        <section className={card} onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file&&!working)void upload(file);}}><h2 className="text-xs font-bold uppercase tracking-wide">Cover</h2><p className="mt-2 text-xs leading-relaxed text-[#cfb77d]">This is the cover of your novel. It will be displayed on the novel collection page.</p><div className="my-3 flex flex-wrap items-center gap-2"><button className={button} disabled={working} onClick={()=>imageInput.current?.click()}><ImagePlus className="h-3.5 w-3.5"/>Upload your cover</button><button aria-label="Remove cover" title="Remove cover" className={button+' px-2'} disabled={working||!image} onClick={()=>setImage(undefined)}><Trash2 className="h-3.5 w-3.5"/></button><span className="text-xs text-muted-foreground">or drag and drop on the area</span></div><input ref={imageInput} aria-label="Upload novel cover" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/>
          <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded bg-black" style={!image?{background:novel.cover.bg}:undefined}>{image?<img src={image} alt={`Cover preview for ${title}`} className="h-full w-full object-contain"/>:<div className="px-5 text-center"><div className="text-6xl">{novel.cover.icon}</div><p className="mt-4 font-serif text-xl">{title||'Your novel'}</p><p className="mt-2 text-xs text-muted-foreground">Upload a cover image</p></div>}</div><p className="mt-3 text-xs text-muted-foreground">JPG, PNG or WebP · up to 10 MB. Save changes to apply the cover.</p>
        </section>
      </div>
    </DialogContent></Dialog>
    <ManuscriptExport open={exportOpen} onOpenChange={setExportOpen}/>
    <AlertDialog open={deleteOpen} onOpenChange={value=>{if(!working)setDeleteOpen(value);}}><AlertDialogContent className="border-white/15 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete {novel.title}?</AlertDialogTitle><AlertDialogDescription>This removes the novel, its notes and its library memberships. Export a JSON backup before continuing. Type the novel title to confirm.</AlertDialogDescription></AlertDialogHeader><input aria-label="Confirm novel title" className={field} value={confirmTitle} onChange={e=>setConfirmTitle(e.target.value)} disabled={working}/><button className={button} onClick={()=>exportNovelJson(novel)}>Export backup</button><AlertDialogFooter><AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel><button className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={working||confirmTitle!==novel.title} onClick={()=>void run(async()=>{await removeWebProject(novel.id);setDeleteOpen(false);onOpenChange(false);toast.success('Novel deleted.');})}>Delete permanently</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
