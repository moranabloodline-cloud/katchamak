'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,Check,Download,FolderTree,Grid2X2,Moon,Settings2,Sun} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {baseStyle,trims,type BookStyle} from '@/lib/kachamak/book-style';
import {binderChapterChoices,bookArticles,bookCss,chapterSpecimen,prepareChapterSample,proofs,publication,type ChapterSample,type Proof} from '@/lib/kachamak/publication';
import {withGenreSample} from '@/lib/kachamak/house-styles';
import {galleryImage,galleryImageRef} from '@/lib/kachamak/project-image';
import {findNode,locateNode} from '@/lib/kachamak/utils';
import {useKachamak} from '@/lib/kachamak/store';
import type {NoteNode,Novel} from '@/lib/kachamak/types';
import {PublishManuscript} from './PublishManuscript';
import {manuscriptEntries} from '@/lib/kachamak/publish-manuscript';
import {PublishTools} from './PublishTools';
import {proofDocument,PublishProof} from './PublishProof';

const btn='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40';
const active=' border-amber-400/60 bg-amber-400/10 text-amber-200';
type StyleCard={name:string;style:BookStyle;node:NoteNode};
function styleCards(nodes:NoteNode[]):StyleCard[]{
  return nodes.flatMap(node=>node.hidden?[]:node.bookStyle?[{name:node.title,style:node.bookStyle,node}]:styleCards(node.children));
}
function Miniature({book,entry,comparison,selected,choose}:{book:Novel;entry:StyleCard;comparison:ChapterSample|null;selected:boolean;choose:()=>void}){
  const holder=useRef<HTMLDivElement>(null),[width,setWidth]=useState(160);
  useEffect(()=>{if(!holder.current)return;const observer=new ResizeObserver(([r])=>setWidth(r.contentRect.width));observer.observe(holder.current);return()=>observer.disconnect();},[]);
  const s=entry.style,[w,h]=trims[s.trim],sheet=w*96/25.4;
  const source=useMemo(()=>{
    const sample=comparison?chapterSpecimen(book,s,comparison,true):publication(book,s,'Chapter opening');
    const padding=[s.top,s.outer,s.bottom,s.inner].map(value=>value+'mm').join(' ');
    const paper='html{background:white;overflow:hidden}body{padding:'+padding+'}.book-name{display:none}';
    // Flow overflow into clipped columns so the first sheet ends on a whole line above its bottom margin.
    const firstSheet=comparison?'body{height:100vh}main{height:100%;columns:1;column-fill:auto;overflow:hidden}':'';
    return '<!doctype html><html lang="'+sample.lang+'"><meta charset="utf-8"><style>'+bookCss(s,'print')+paper+firstSheet+'</style><body><main>'+bookArticles(sample)+'</main></body></html>';
  },[book,s,comparison]);
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
  useEffect(()=>{useKachamak.getState().installPublishStyles(novel.id);},[novel.id,novel.publishStyleCatalogVersion]);
  const rows=useMemo(()=>manuscriptEntries(novel),[novel]);
  const chapterChoices=useMemo(()=>binderChapterChoices(novel),[novel]);
  const [comparisonId,setComparisonId]=useState('');
  const selectedChapter=chapterChoices.find(choice=>choice.node.id===comparisonId);
  const comparison=useMemo(()=>selectedChapter?prepareChapterSample(novel,selectedChapter):null,[novel,selectedChapter]);
  useEffect(()=>{if(comparisonId&&!selectedChapter)setComparisonId('');},[comparisonId,selectedChapter]);
  const includedRows=useMemo(()=>rows.filter(row=>row.included),[rows]);
  const hasContents=includedRows.length>0;
  const [focusNote,setFocusNote]=useState<string|null>(null);
  const focusIndex=includedRows.findIndex(row=>row.node.id===focusNote);
  const anchor=inspector==='manuscript'&&focusIndex>=0?'entry-'+focusIndex:undefined;
  const [gallery,setGallery]=useState(!selected?.bookStyle),[print,setPrint]=useState(true),[proof,setProof]=useState<Proof>(!selected?.bookStyle&&rows.length?'Manuscript':'Chapter opening');
  useEffect(()=>{if(inspector==='manuscript'){setGallery(false);setProof('Manuscript');}},[inspector]);
  const [darkReader,setDarkReader]=useState(false);
  const [saving,setSaving]=useState(false),[styleName,setStyleName]=useState(''),[destination,setDestination]=useState('');
  const [busy,setBusy]=useState(false),[wantPdf,setWantPdf]=useState(false),[ready,setReady]=useState(false),frame=useRef<HTMLIFrameElement>(null);
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
  useEffect(()=>{if(selected?.id!==prev.current){
    if(selected){
      if(gallery&&selected.bookStyle&&(comparison||selected.bookStyle.sampleGenre))setProof('Chapter opening');
      setGallery(!selected.bookStyle);
    }
    prev.current=selected?.id;
  }},[selected,gallery,comparison]);
  const options=treeOptions(roots);
  const source=useMemo(()=>{
    if(gallery||!hasStyle)return '';
    const book=proof==='Chapter opening'&&comparison?chapterSpecimen(novel,s,comparison,false):publication(novel,s,proof);
    return proofDocument(book,s,print);
  },[novel,s,proof,print,gallery,comparison,hasStyle]);
  const compare=(id:string)=>{
    setComparisonId(id);setProof('Chapter opening');setWantPdf(false);
  };
  const open=(card:StyleCard)=>{
    useKachamak.getState().select(card.node.id);
    onInspect('tools');setWantPdf(false);
    if(comparison||card.style.sampleGenre)setProof('Chapter opening');
    setGallery(false);
  };
  const change=(next:BookStyle)=>{
    const state=useKachamak.getState();
    if(!entry)return;
    state.updateNode('publish',entry.node.id,{bookStyle:next});
    if(!saved)state.select(entry.node.id);
    if(gallery){setPrint(true);setProof('Chapter opening');}
    setGallery(false);
  };
  const saveAs=()=>{setDestination(folder?.id??'');setStyleName(entry?entry.name+' copy':'New style');setSaving(true);};
  const inspect=(v:Proof)=>{setWantPdf(false);setProof(v);setGallery(false);};
  const download=async(format:'PDF'|'EPUB'|'DOCX'|'HTML')=>{
    if(!entry)return;
    if(!hasContents){toast.error('Select at least one Binder item in Manuscript.');return;}
    if(format==='PDF'){
      if(!gallery&&print&&proof==='Manuscript'&&ready&&frame.current?.contentDocument?.documentElement.dataset.ready==='yes'){frame.current.contentWindow?.print();return;}
      setReady(false);setPrint(true);setProof('Manuscript');setGallery(false);setWantPdf(true);return;
    }
    setBusy(true);
    try{await (await import('@/lib/kachamak/publish-export')).exportEdition(format,publication(novel,s),s);}
    catch{toast.error('The edition could not be exported. Please try again.');}finally{setBusy(false);}
  };
  const onReady=useCallback((v:boolean)=>setReady(v),[]);
  useEffect(()=>{if(!wantPdf||!ready||!print||gallery||proof!=='Manuscript'||frame.current?.contentDocument?.documentElement.dataset.ready!=='yes')return;
    setWantPdf(false);frame.current.contentWindow?.print();
  },[wantPdf,ready,print,gallery,proof]);
  const group=(items:StyleCard[])=>items.length>0&&<section className="mb-7"><div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,232px),1fr))"}}>{items.map(card=><Miniature key={card.node.id} book={novel} entry={card} comparison={comparison} selected={card.node.id===entry?.node.id} choose={()=>open(card)}/>)}</div></section>;
  return <>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button className={btn+' md:hidden'} onClick={onShowTree} aria-label="Style folders"><FolderTree className="size-4"/></button>
        <button className={btn+(gallery?active:'')} onClick={()=>{setWantPdf(false);setGalleryStyleId(entry?.node.id);onInspect('tools');useKachamak.getState().select(folder?.id??null);setGallery(true);}}><Grid2X2 className="size-3.5"/>Styles</button>
        <button disabled={!entry} className={btn+(!gallery?active:'')} onClick={()=>{if(gallery){setProof('Chapter opening');if(entry)useKachamak.getState().select(entry.node.id);}setGallery(false);}}><BookOpen className="size-3.5"/>Proof</button>
        {(gallery||proof==='Chapter opening')&&<div role="group" aria-label="Style samples" className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 border-l border-white/10 pl-2 max-sm:order-last max-sm:w-full max-sm:border-0 max-sm:pl-0">
          <select aria-label="Compare Binder chapter" className={btn+' min-w-0 max-w-full shrink bg-background sm:max-w-64'} disabled={!chapterChoices.length} value={selectedChapter?.node.id??''} onChange={e=>compare(e.target.value)}>
            <option disabled value="">{chapterChoices.length?'Compare Binder chapter…':'No Binder chapters'}</option>
            {chapterChoices.map(({node,path})=><option key={node.id} value={node.id}>{path}</option>)}
          </select>
          <button type="button" aria-pressed={!comparison} className={btn+(!comparison?active:'')} onClick={()=>compare('')}>Genre samples</button>
        </div>}
        {comparison&&!comparison.full&&(gallery||proof==='Chapter opening')&&<span role="status" className="text-xs text-muted-foreground">This chapter has no text yet.</span>}
        <span className="min-w-1 flex-1"/>
        <button className={btn+' lg:hidden'} onClick={onShowTools} aria-label="Show style tools"><Settings2 className="size-4"/></button>
        <DropdownMenu><DropdownMenuTrigger asChild><button disabled={busy||!hasContents||!entry} title={!entry?'Choose a book style':!hasContents?'Select at least one Binder item in Manuscript':undefined} className={btn}>{busy?'Exporting…':'Export book'}<Download className="size-3.5"/></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">{(['PDF','EPUB','DOCX','HTML'] as const).map(f=><DropdownMenuItem key={f} onSelect={()=>void download(f)}>{f==='PDF'?'Print / Save PDF':f}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      </div>
      {gallery?<div className="kachamak-scroll min-h-0 flex-1 overflow-auto p-5" style={{zoom}}><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold">{folder?.title??'Book styles'}</h1><div className="flex flex-wrap gap-2"><button className={btn} onClick={()=>{useKachamak.getState().addNode('publish',folder?.id??null,'folder','New folder');}}>New folder</button>{otherStyles.length>0&&<button className={btn} onClick={()=>setImporting(true)}>Use style from another book</button>}</div></div>
        {savedCards.length?group(savedCards):<button className={btn} onClick={saveAs}>Create a style in this folder</button>}
      </div>:<>
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-xs">
          <strong className="mr-auto truncate">{entry?.name??"Book proof"}</strong>
          <select aria-label="Preview content" className={btn+' bg-background'} value={proof} onChange={e=>inspect(e.target.value as Proof)}>{proofs.map(v=><option key={v} value={v}>{v==='Chapter opening'&&comparison?'Binder chapter':v==='Chapter opening'&&s.sampleGenre?'Style sample':v}</option>)}</select>
          <div className="flex gap-1">{['Print','eBook'].map(m=><button key={m} aria-pressed={(m==='Print')===print} className={btn+((m==='Print')===print?active:'')} onClick={()=>{setWantPdf(false);setPrint(m==='Print');}}>{m}</button>)}</div>
          {!print&&<button type="button" className={btn} aria-pressed={darkReader} aria-label="Dark reader preview" title={darkReader?'Use light reader background':'Use dark reader background'} onClick={()=>setDarkReader(!darkReader)}>{darkReader?<Sun className="size-3.5"/>:<Moon className="size-3.5"/>}</button>}
        </div>
        {!entry?<p className="p-5 text-sm text-muted-foreground">Choose a style to preview the book.</p>:proof==='Manuscript'&&!hasContents?<p className="p-5 text-sm text-muted-foreground">Select a Binder chapter or note in Manuscript to preview the book.</p>:<PublishProof key={source} anchor={anchor} source={source} print={print} darkReader={darkReader} frameRef={frame} onReady={onReady} zoom={zoom}/>}
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
