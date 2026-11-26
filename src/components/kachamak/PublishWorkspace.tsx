'use client';
import {useEffect,useMemo,useReducer,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,Check,Download,FolderTree,Grid2X2,Moon,Settings2,Sun} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {baseStyle,fontStacks,trims,type BookStyle} from '@/lib/kachamak/book-style';
import {binderChapterChoices,bookArticles,bookCss,escapeText,pageMargins,projectStyleProof,prepareChapterSample,proofs,publication,sampleChapterOpening,type ChapterSample,type Proof} from '@/lib/kachamak/publication';
import {houseStyleCatalogVersion,withGenreSample} from '@/lib/kachamak/house-styles';
import {galleryImage,galleryImageRef} from '@/lib/kachamak/project-image';
import {findNode,locateNode} from '@/lib/kachamak/utils';
import {useKachamak} from '@/lib/kachamak/store';
import type {NoteNode,Novel} from '@/lib/kachamak/types';
import {PublishManuscript} from './PublishManuscript';
import {manuscriptEntries} from '@/lib/kachamak/publish-manuscript';
import {PublishTools} from './PublishTools';
import {proofDocument,PublishProof,previewModes,type PreviewMode} from './PublishProof';

const btn='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40';
const active=' border-amber-400/60 bg-amber-400/10 text-amber-200';
type StyleCard={name:string;style:BookStyle;node:NoteNode};
function styleCards(nodes:NoteNode[]):StyleCard[]{
  return nodes.flatMap(node=>node.hidden?[]:node.bookStyle?[{name:node.title,style:node.bookStyle,node}]:styleCards(node.children));
}
function styleProof(book: Novel, style: BookStyle, proof: Proof, comparison: ChapterSample | null, genre: boolean, thumbnail = false) {
  if (comparison) return projectStyleProof(book, style, proof, comparison, thumbnail);
  if (genre) return publication(book, style, proof);
  if (proof === 'Chapter opening') return sampleChapterOpening(book, style);
  if (proof === 'Body text' || proof === 'Scene break' || proof === 'Special blocks') return publication(book, style, proof);
  return projectStyleProof(book, style, proof, null);
}
function Miniature({book,entry,comparison,genre,selected,choose}:{book:Novel;entry:StyleCard;comparison:ChapterSample|null;genre:boolean;selected:boolean;choose:()=>void}){
  const holder=useRef<HTMLDivElement>(null),[width,setWidth]=useState(160);
  useEffect(()=>{if(!holder.current)return;const observer=new ResizeObserver(([r])=>setWidth(r.contentRect.width));observer.observe(holder.current);return()=>observer.disconnect();},[]);
  const s=entry.style,[w,h]=trims[s.trim],sheet=w*96/25.4;
  const source=useMemo(()=>{
    const sample=styleProof(book,s,'Chapter opening',comparison,genre,true);
    const margins='.running,.folio{position:absolute;left:'+s.inner+'mm;right:'+s.outer+'mm;display:grid;place-content:center;overflow:hidden;white-space:nowrap}'+
      '.running{top:0;height:'+s.top+'mm;font:9pt '+fontStacks[s.headingFont]+';color:'+s.accent+'}.folio{bottom:0;height:'+s.bottom+'mm;font:9pt '+fontStacks[s.bodyFont]+'}';
    const paper='html{background:white;overflow:hidden}body{position:relative;height:100vh;overflow:hidden;padding:'+pageMargins(s)+'}.book-name{display:none}'+
      'main{height:100%;columns:1;column-fill:auto;overflow:hidden}'+margins;
    const running=s.running?'<div class="running">'+escapeText(sample.title)+'</div>':'';
    const folio=s.folios?'<div class="folio">1</div>':'';
    return '<!doctype html><html lang="'+sample.lang+'"><meta charset="utf-8"><style>'+bookCss(s,'print')+paper+'</style><body>'+running+'<main>'+bookArticles(sample)+'</main>'+folio+'</body></html>';
  },[book,s,comparison,genre]);
  return <button type="button" aria-label={'Preview '+entry.name} aria-pressed={selected} onClick={choose} className={'group flex min-w-0 flex-col rounded-lg border p-2 text-left transition-colors '+(selected?'border-amber-400/70 bg-amber-400/5':'border-white/10 bg-white/[.025] hover:border-amber-300/40')}>
    <div ref={holder} className="pointer-events-none relative w-full overflow-hidden rounded-sm bg-white" style={{aspectRatio:w+'/'+h}}>
      <iframe title={entry.name+' specimen'} tabIndex={-1} sandbox="allow-same-origin" scrolling="no" loading="lazy" srcDoc={source} className="absolute left-0 top-0 origin-top-left border-0" style={{width:sheet,height:h*96/25.4,transformOrigin:'top left',transform:'scale('+width/sheet+')'}}/>
    </div><div className="mt-auto flex w-full items-center justify-between gap-2 px-1 pt-2"><span className="truncate font-semibold">{entry.name}</span>{selected&&<Check className="size-3.5 shrink-0 text-amber-300"/>}</div>
    <span className="w-full truncate px-1 pb-0.5 text-xs text-muted-foreground">{s.trim} · {s.bodyFont} · {s.size} pt</span>
  </button>;
}
function treeOptions(nodes:NoteNode[],depth=0):{id:string;label:string}[]{return nodes.filter(n=>n.kind==='folder').flatMap(n=>[{id:n.id,label:'  '.repeat(depth)+n.title},...treeOptions(n.children,depth+1)]);}
export function PublishWorkspace({novel,selected,rootId,zoom,toolsHost,inspector,onInspect,onShowTools,onShowTree}:{inspector:"tools"|"manuscript";onInspect:(tab:"tools"|"manuscript")=>void;novel:Novel;selected:NoteNode|null;rootId?:string|null;zoom:number;toolsHost:HTMLDivElement|null;onShowTools:()=>void;onShowTree:()=>void}){
  const books=useKachamak(state=>state.novels);
  const [importing,setImporting]=useState(false);
  const otherStyles=useMemo(()=>{
    const choices:{book:Novel;node:NoteNode;path:string}[]=[];
    function visit(book:Novel,nodes:NoteNode[],prefix:string){for(const n of nodes){
      const path=prefix+' / '+n.title;
      if(n.bookStyle)choices.push({book,node:n,path});
      visit(book,n.children,path);
    }}
    for(const b of books)if(b.id!==novel.id)visit(b,b.sections.publish??[],b.title);
    return choices;
  },[books,novel.id]);
  const needsHouseStyles=(novel.publishStyleCatalogVersion??0)<houseStyleCatalogVersion;
  const rows=useMemo(()=>manuscriptEntries(novel),[novel]);
  const chapterChoices=useMemo(()=>binderChapterChoices(novel),[novel]);
  // Start with the shared sample. A Binder chapter or genre sample is an explicit choice.
  const [comparisonId,setComparisonId]=useState<string|null>(null);
  const genre=comparisonId==='';
  const selectedChapter=chapterChoices.find(choice=>choice.node.id===comparisonId);
  const comparison=useMemo(()=>selectedChapter?prepareChapterSample(novel,selectedChapter):null,[novel,selectedChapter]);
  useEffect(()=>{if(comparisonId&&!selectedChapter)setComparisonId(null);},[comparisonId,selectedChapter]);
  const includedRows=useMemo(()=>rows.filter(row=>row.included),[rows]);
  const hasContents=includedRows.length>0;
  const [focusNote,setFocusNote]=useState<string|null>(null);
  const focusIndex=includedRows.findIndex(row=>row.node.id===focusNote);
  const anchor=inspector==='manuscript'&&focusIndex>=0?'entry-'+focusIndex:undefined;
  const [gallery,setGallery]=useState(!selected?.bookStyle),[previewMode,setPreviewMode]=useState<PreviewMode>('Print'),[proof,setProof]=useState<Proof>(!selected?.bookStyle&&rows.length?'Manuscript':'Chapter opening');
  const print = previewMode === 'Print';
  useEffect(()=>{if(inspector==='manuscript'){setGallery(false);setProof('Manuscript');}},[inspector]);
  const [darkReader,setDarkReader]=useState(false);
  const [saving,setSaving]=useState(false),[styleName,setStyleName]=useState(''),[destination,setDestination]=useState('');
  const [busy,setBusy]=useState(false),[pdfStyleId,setPdfStyleId]=useState<string|null>(null);
  const [proofAttempt,retryProof]=useReducer((count:number)=>count+1,0);
  const [loadedProofRevision,notifyProofLoaded]=useReducer((count:number)=>count+1,0);
  const frame=useRef<HTMLIFrameElement>(null);
  const prev=useRef(selected?.id);
  const roots=novel.sections.publish??[];
  const [galleryStyleId,setGalleryStyleId]=useState<string>();
  const saved=selected?.bookStyle;
  const loc=selected?locateNode(roots,selected.id):null;
  const folderId=selected?(selected.kind==='folder'?selected.id:loc?.parentId??null):rootId??null;
  const folder=folderId?findNode(roots,folderId):null;
  const savedCards=styleCards(folder?folder.children:roots);
  const entry=saved&&selected?{name:selected.title,style:saved,node:selected}:savedCards.find(card=>card.node.id===galleryStyleId)??savedCards[0];
  const s=entry?.style??baseStyle;
  const hasStyle=!!entry;
  const styleId=entry?.node.id;
  useEffect(()=>{if(selected?.id!==prev.current){
    setPdfStyleId(null);
    if(selected){
      if(gallery&&selected.bookStyle)setProof('Chapter opening');
      setGallery(!selected.bookStyle);
    }
    prev.current=selected?.id;
  }},[selected,gallery]);
  const options=treeOptions(roots);
  const source=useMemo(()=>{
    if(gallery||!hasStyle)return '';
    const book=styleProof(novel,s,proof,comparison,genre);
    if(!book.sections.length)return '';
    return proofDocument(book,s,print,previewMode === 'Print' ? undefined : previewMode);
  },[novel,s,proof,print,previewMode,gallery,comparison,genre,hasStyle]);
  const compare=(id:string|null)=>{
    setComparisonId(id);setProof('Chapter opening');setPdfStyleId(null);
  };
  const open=(card:StyleCard)=>{
    useKachamak.getState().select(card.node.id);
    onInspect('tools');setPdfStyleId(null);
    setProof('Chapter opening');
    setGallery(false);
  };
  const change=(next:BookStyle)=>{
    const state=useKachamak.getState();
    if(!entry)return;
    setPdfStyleId(null);
    state.updateNode('publish',entry.node.id,{bookStyle:next});
    if(!saved)state.select(entry.node.id);
    if(gallery){setPreviewMode('Print');setProof('Chapter opening');}
    setGallery(false);
  };
  const saveAs=()=>{setDestination(folder?.id??'');setStyleName(entry?entry.name+' copy':'New style');setSaving(true);};
  const inspect=(v:Proof)=>{setPdfStyleId(null);setProof(v);setGallery(false);};
  const download=async(format:'PDF'|'EPUB'|'DOCX'|'HTML')=>{
    if(!entry)return;
    if(!hasContents){toast.error('Select at least one Binder item in Manuscript.');return;}
    if(format==='PDF'){
      if(!gallery&&print&&proof==='Manuscript'){
        const proofFrame=frame.current;
        const status=proofFrame?.contentDocument?.documentElement.dataset.ready;
        if(status==='yes'){proofFrame?.contentWindow?.print();return;}
        if(status==='error')retryProof();
      }
      setPreviewMode('Print');setProof('Manuscript');setGallery(false);setPdfStyleId(entry.node.id);return;
    }
    setBusy(true);
    try{await (await import('@/lib/kachamak/publish-export')).exportEdition(format,publication(novel,s),s);}
    catch{toast.error('The edition could not be exported. Please try again.');}finally{setBusy(false);}
  };
  useEffect(()=>{
    if(!pdfStyleId)return;
    if(pdfStyleId!==styleId||!hasContents){setPdfStyleId(null);return;}
    if(!print||gallery||proof!=='Manuscript')return;
    const proofFrame=frame.current;
    const status=proofFrame?.contentDocument?.documentElement.dataset.ready;
    if(status!=='yes'&&status!=='error')return;
    setPdfStyleId(null);
    if(status==='yes')proofFrame?.contentWindow?.print();
    else toast.error('PDF pagination failed. Use Print / Save PDF to retry.');
  },[pdfStyleId,styleId,hasContents,loadedProofRevision,print,gallery,proof]);
  const group=(items:StyleCard[])=>items.length>0&&<section className="mb-7"><div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,232px),1fr))"}}>{items.map(card=><Miniature key={card.node.id} book={novel} entry={card} comparison={comparison} genre={genre} selected={card.node.id===entry?.node.id} choose={()=>open(card)}/>)}</div></section>;
  return <>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button className={btn+' md:hidden'} onClick={onShowTree} aria-label="Style folders"><FolderTree className="size-4"/></button>
        <button className={btn+(gallery?active:'')} onClick={()=>{setPdfStyleId(null);setGalleryStyleId(entry?.node.id);onInspect('tools');useKachamak.getState().select(folder?.id??null);setGallery(true);}}><Grid2X2 className="size-3.5"/>Styles</button>
        <button disabled={!entry} className={btn+(!gallery?active:'')} onClick={()=>{if(gallery){setProof('Chapter opening');if(entry)useKachamak.getState().select(entry.node.id);}setGallery(false);}}><BookOpen className="size-3.5"/>Proof</button>
        {(gallery||proof==='Chapter opening')&&<div role="group" aria-label="Style samples" className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 border-l border-white/10 pl-2 max-sm:order-last max-sm:w-full max-sm:border-0 max-sm:pl-0">
          <select aria-label="Compare Binder chapter" className={btn+' min-w-0 max-w-full shrink bg-background sm:max-w-64'} value={genre?':genre':selectedChapter?.node.id??''} onChange={e=>compare(e.target.value||null)}>
            {genre&&<option hidden value=":genre">Compare Binder chapter…</option>}
            <option value="">Universal sample</option>
            {chapterChoices.map(({node,path})=><option key={node.id} value={node.id}>{path}</option>)}
          </select>
          <button type="button" aria-pressed={genre} className={btn+(genre?active:'')} onClick={()=>compare('')}>Genre samples</button>
        </div>}
        {comparison&&!comparison.full&&(gallery||proof==='Chapter opening')&&<span role="status" className="text-xs text-muted-foreground">This chapter has no text yet.</span>}
        <span className="min-w-1 flex-1"/>
        <button className={btn+' lg:hidden'} onClick={onShowTools} aria-label="Show style tools"><Settings2 className="size-4"/></button>
        <DropdownMenu><DropdownMenuTrigger asChild><button disabled={busy||!!pdfStyleId||!hasContents||!entry} title={!entry?'Choose a book style':!hasContents?'Select at least one Binder item in Manuscript':undefined} className={btn}>{pdfStyleId?'Preparing PDF…':busy?'Exporting…':'Export book'}<Download className="size-3.5"/></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">{(['PDF','EPUB','DOCX','HTML'] as const).map(f=><DropdownMenuItem key={f} onSelect={()=>void download(f)}>{f==='PDF'?'Print / Save PDF':f}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      </div>
      {gallery?<div className="kachamak-scroll min-h-0 flex-1 overflow-auto p-5" style={{zoom}}><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold">{folder?.title??'Book styles'}</h1><div className="flex flex-wrap gap-2">{needsHouseStyles&&<button type="button" className={btn} onClick={()=>useKachamak.getState().installPublishStyles(novel.id)}>{novel.publishStyleCatalogVersion||novel.publishStylesInstalled?'Update House styles':'Add House styles'}</button>}<button className={btn} onClick={()=>{useKachamak.getState().addNode('publish',folder?.id??null,'folder','New folder');}}>New folder</button>{otherStyles.length>0&&<button className={btn} onClick={()=>setImporting(true)}>Use style from another book</button>}</div></div>
        {savedCards.length?group(savedCards):<button className={btn} onClick={saveAs}>Create a style in this folder</button>}
      </div>:<>
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-xs">
          <strong className="mr-auto truncate">{entry?.name??"Book proof"}</strong>
          <select aria-label="Preview content" className={btn+' bg-background'} value={proof} onChange={e=>inspect(e.target.value as Proof)}>{proofs.map(v=><option key={v} value={v}>{v==='Chapter opening'&&comparison?'Binder chapter':v==='Chapter opening'?'Style sample':v}</option>)}</select>
          <select aria-label="Preview mode" className={btn+' bg-background'} value={previewMode} onChange={event=>{
            setPdfStyleId(null);
            setPreviewMode(event.target.value as PreviewMode);
          }}>{previewModes.map(mode=><option key={mode}>{mode}</option>)}</select>
          {!print&&<button type="button" className={btn} aria-pressed={darkReader} aria-label="Dark reader preview" title={darkReader?'Use light reader background':'Use dark reader background'} onClick={()=>setDarkReader(!darkReader)}>{darkReader?<Sun className="size-3.5"/>:<Moon className="size-3.5"/>}</button>}
        </div>
        {!entry?<p className="p-5 text-sm text-muted-foreground">Choose a style to preview the book.</p>:proof==='Manuscript'&&!hasContents?<p className="p-5 text-sm text-muted-foreground">Select a Binder chapter or note in Manuscript to preview the book.</p>:!source?<p role="status" className="p-5 text-sm text-muted-foreground">{proof==='Scene break'?'This chapter has no scene break.':proof==='Special blocks'?'This chapter has no special blocks.':'This chapter has no text yet.'}</p>:<PublishProof key={proofAttempt?proofAttempt+':'+source:source} anchor={anchor} source={source} mode={previewMode} darkReader={darkReader} frameRef={frame} onLoaded={notifyProofLoaded} zoom={zoom}/>}
      </>}
    </div>
    {toolsHost&&createPortal(inspector==='manuscript'?<PublishManuscript book={novel} rows={rows} change={action=>{
      if(action.type==='move'||(action.type==='include'&&action.value))setFocusNote(action.id);
      else if(action.type==='include'){
        const index=includedRows.findIndex(row=>row.node.id===action.id);
        setFocusNote((includedRows[index+1]??includedRows[index-1])?.node.id??null);
      }else setFocusNote(null);
      inspect('Manuscript');useKachamak.getState().changePublishManuscript(novel.id,action);
    }}/>:entry?<PublishTools novel={novel} name={entry.name} style={s} change={change} save={saveAs} inspect={inspect} print={gallery||print}/>:<button className={btn} onClick={saveAs}>Create style</button>,toolsHost)}
    <Dialog open={importing} onOpenChange={setImporting}><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>Use style from another book</DialogTitle></DialogHeader>
      <div className="grid max-h-[60vh] gap-2 overflow-y-auto">{otherStyles.map(item=><button key={item.book.id+':'+item.node.id} className={btn+' justify-start text-left'} onClick={()=>{
        const style={...withGenreSample(item.node.bookStyle!,item.node.title)};
        if(style.chapterImage){
          const source=galleryImage(item.book.gallery,style.chapterImage);
          const match=source&&novel.gallery?.find(img=>img.kind==='image'&&img.image===source.image);
          if(match)style.chapterImage=galleryImageRef(match.id);
          else {delete style.chapterImage;toast.message('Style copied. Choose chapter artwork from this book’s Gallery.');}
        }
        if(useKachamak.getState().addNode('publish',folder?.id??null,{bookStyle:style},item.node.title)){setImporting(false);setGallery(false);}
      }}>{item.path}</button>)}</div></DialogContent></Dialog>
    <Dialog open={saving} onOpenChange={setSaving}><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>Save as style</DialogTitle></DialogHeader>
      <form className="grid gap-4" onSubmit={e=>{e.preventDefault();const name=styleName.trim();if(!name)return;
        const id=useKachamak.getState().addNode('publish',destination||null,{bookStyle:s},name);if(id){setSaving(false);setGallery(false);}
      }}><label className="grid gap-1 text-sm">Style name<input autoFocus required maxLength={200} className={btn+' bg-background'} value={styleName} onChange={e=>setStyleName(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Folder<select className={btn+' bg-background'} value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Styles library</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <button type="submit" className={btn+active} disabled={!styleName.trim()}>Save style</button></form></DialogContent></Dialog>
  </>;
}
