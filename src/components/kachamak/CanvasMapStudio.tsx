'use client';
import {useEffect,useRef,useState} from 'react';
import './canvas-map.css';
import {createPortal} from 'react-dom';
import {ArrowLeft,Check,MapPin,Minus,Plus,Route,Ruler,Scan,Trash2,Undo2,X} from 'lucide-react';
import type {Point} from '@/lib/kachamak/canvas-board';
import type {HomeBlock} from '@/lib/kachamak/homepage';
import {atlasOf,imageDistance,mapDistance,PIN_KINDS,type MapAtlas,type MapFeature,type MapTool,type PinKind} from '@/lib/kachamak/canvas-map';
import {registerZoomReset} from '@/lib/kachamak/workspace-zoom';
import {CanvasMapSurface,featureLabel,pinIcons} from './CanvasMapSurface';
import {PresetColourPicker} from './PresetColourPicker';

const commands=[['pin','Add pin',MapPin],['path','Draw path',Route],['region','Draw region',Scan],['measure','Measure distance',Ruler]] as const;
function ToolButtons({tool,choose}:{tool?:MapTool;choose:(tool:MapTool)=>void}){
  return <div className="atlas-tool-grid">{commands.map(([id,label,Icon])=><button type="button" key={id} aria-pressed={tool===id} onClick={()=>choose(id)}><Icon size={16}/>{label}</button>)}</div>;
}


function FeatureDetails({feature,update,remove,move}:{feature:MapFeature;move:()=>void;update:(feature:MapFeature)=>void;remove:()=>void}){
  const [name,setName]=useState(feature.name),[category,setCategory]=useState<PinKind>(feature.kind==='pin'?feature.category:'Location');
  const [color,setColor]=useState(feature.kind==='pin'?'#c79350':feature.color);
  return <form className="atlas-editor" onSubmit={e=>{e.preventDefault();if(name.trim())update(feature.kind==='pin'?{...feature,name:name.trim(),category}:{...feature,name:name.trim(),color});}}>
    <label>Name<input required value={name} onChange={e=>setName(e.target.value)}/></label>
    {feature.kind==='pin'?<label>Pin type<select value={category} onChange={e=>setCategory(e.target.value as PinKind)}>{PIN_KINDS.map(k=><option key={k}>{k}</option>)}</select></label>:
      <div className="flex items-center justify-between gap-2 text-sm"><span>Color</span>
        <PresetColourPicker label="Feature color" value={color} onChange={setColor} allowClear={false}/>
      </div>}
    <div className="atlas-actions"><button type="submit"><Check size={14}/>Save changes</button>{feature.kind==='pin'&&<button type="button" onClick={move}>Move pin</button>}<button type="button" aria-label={'Delete '+feature.name} onClick={remove}><Trash2 size={14}/></button></div>
  </form>;
}

type Props={block:HomeBlock;image:string;host?:HTMLElement|null;close:()=>void;
  initialPinId?:string;backLabel:string;onPick?:()=>void;showTools?:()=>void;persist:(next:MapAtlas)=>boolean};
export function CanvasMapStudio({block,image,host,close,initialPinId,backLabel,onPick,showTools,persist}:Props){
  const atlas=atlasOf(block);
  const [movingPin,setMovingPin]=useState<string|null>(null);
  const [tool,setTool]=useState<MapTool>('inspect'),[points,setPoints]=useState<Point[]>([]),[name,setName]=useState('');
  const [category,setCategory]=useState<PinKind>('Location'),[color,setColor]=useState('#cc963e'),[selected,setSelected]=useState(initialPinId??'');
  const [unit,setUnit]=useState<'km'|'mi'>('km'),[known,setKnown]=useState(''),[aspect,setAspect]=useState(0),[error,setError]=useState('');
  const [zoom,setZoom]=useState(1),[localTools,setLocalTools]=useState(false);
  const scroll=useRef<HTMLDivElement>(null),lastFocus=useRef<Element|null>(null),back=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const el=scroll.current;if(!el)return;
    lastFocus.current=document.activeElement;back.current?.focus({preventScroll:true});
    const reset=registerZoomReset(el,()=>setZoom(1));
    const wheel=(e:WheelEvent)=>{if(e.ctrlKey||e.metaKey){e.preventDefault();e.stopPropagation();setZoom(z=>Math.max(.5,Math.min(4,z*Math.exp(-e.deltaY*.003))));}};
    el.addEventListener('wheel',wheel,{passive:false});
    return ()=>{reset();el.removeEventListener('wheel',wheel);if(lastFocus.current instanceof HTMLElement&&lastFocus.current.isConnected)lastFocus.current.focus({preventScroll:true});};
  },[]);
  useEffect(()=>{
    const area=scroll.current;
    if(!initialPinId||!aspect||!area)return;
    const pin=Array.from(area.querySelectorAll<HTMLElement>('[data-feature-id]')).find(el=>el.dataset.featureId===initialPinId);
    if(pin){const a=area.getBoundingClientRect(),p=pin.getBoundingClientRect();area.scrollTop+=p.top-a.top-area.clientHeight/2+p.height/2;area.scrollLeft+=p.left-a.left-area.clientWidth/2+p.width/2;}
  },[initialPinId,aspect]);
  const active=atlas.features.find(f=>f.id===selected);
  const km=mapDistance(points,atlas,aspect),scaled=!!(atlas.geo||atlas.kmPerWidth);
  function choose(next:MapTool){
    setPoints([]);setSelected('');setMovingPin(null);setName('');setError('');setLocalTools(false);setTool(next);onPick?.();
  }
  function save(next:MapAtlas){
    if(!persist(next)){setError('The map changed. Reopen it and try again.');return false;}
    setError('');return true;
  }
  const storeNew=(f:MapFeature)=>{if(save({...atlas,features:[...atlas.features,f]})){choose('inspect');setSelected(f.id);}};
  function place(p:Point){
    if(tool==='inspect')return;
    setError('');
    if((tool==='measure'||tool==='calibrate')&&atlas.geo&&mapDistance([p,p],atlas,aspect)===null){setError('Choose a point inside the geographic map border.');return;}
    if(tool==='pin'&&movingPin){
      if(save({...atlas,features:atlas.features.map(f=>f.id===movingPin&&f.kind==='pin'?{...f,point:p,category,name:name.trim()||category}:f)})){choose('inspect');setSelected(movingPin);}return;
    }
    if(tool==='pin'){storeNew({id:crypto.randomUUID(),kind:'pin',category,name:name.trim()||category,point:p});return;}
    if(tool==='calibrate'&&points.length>=2)return;
    if(points.length&&imageDistance(points[points.length-1],p,aspect||1)<1e-6)return;
    setPoints([...points,p]);
  }
  function finish(){
    if(tool==='calibrate'){
      const length=points.length===2&&aspect?imageDistance(points[0],points[1],aspect):0;
      const distance=Number(known)*(unit==='mi'?1.609344:1);
      if(!length||!Number.isFinite(distance)||distance<=0){setError('Select two distinct points and enter their known distance.');return;}
      const kmPerWidth=distance/length;
      if(!Number.isFinite(kmPerWidth)||kmPerWidth<=0){setError('The calculated scale is out of range. Enter a different known distance.');return;}
      if(save({...atlas,kmPerWidth}))choose('measure');
    }else if((tool==='path'&&points.length>=2)||(tool==='region'&&points.length>=3)){
      if(tool==='region'){
        const area=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.y-q.x*p.y;},0);
        if(Math.abs(area)<1e-9){setError('Choose points that enclose an area.');return;}
      }
      storeNew({id:crypto.randomUUID(),kind:tool,points:points.slice(),name:name.trim()||(tool==='path'?'Path':'Region'),color});
    }
  }
  const edit=tool==='pin'||tool==='path'||tool==='region';
  const distance=km===null?'':new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(unit==='mi'?km/1.609344:km)+' '+unit;
  const hint=tool==='pin'?'Click the map to place the pin.':tool==='path'?'Click along the path. Double-click or press Enter to finish.':tool==='region'?'Click around the boundary. Click the first point or press Enter to finish.':tool==='calibrate'?'Choose two points a known distance apart.':tool==='measure'?(scaled?'Click the map or pick named pins to measure.':'Set a known distance to calibrate this map.'):'';
  const controls=<section className="atlas-panel" aria-label="Map tools">
    <h3>Map tools</h3><ToolButtons tool={tool} choose={choose}/>
    {edit&&<div className="atlas-editor">
      {tool==='pin'&&<label>Pin type<select value={category} onChange={e=>setCategory(e.target.value as PinKind)}>{PIN_KINDS.map(k=><option key={k}>{k}</option>)}</select></label>}
      <label>Name<input aria-label="New feature name" value={name} placeholder={tool==='pin'?category:tool==='path'?'Path':'Region'} onChange={e=>setName(e.target.value)}/></label>
      {tool!=='pin'&&<div className="flex items-center justify-between gap-2 text-sm"><span>Color</span>
        <PresetColourPicker label="New feature color" value={color} onChange={setColor} allowClear={false}/>
      </div>}
    </div>}
    {(tool==='measure'||tool==='calibrate')&&<div className="atlas-editor"><label>Units<select value={unit} onChange={e=>setUnit(e.target.value as 'mi'|'km')}><option value="km">Kilometres</option><option value="mi">Miles</option></select></label>
      {!atlas.geo&&tool==='measure'&&<button type="button" onClick={()=>choose('calibrate')}><Ruler size={14}/>{scaled?'Recalibrate scale':'Calibrate scale'}</button>}
      {tool==='calibrate'&&<label>Known distance ({unit})<input type="number" min="0" step="any" value={known} onChange={e=>setKnown(e.target.value)}/></label>}
    </div>}
    {active&&<FeatureDetails key={JSON.stringify(active)} feature={active} move={()=>{if(active.kind==='pin'){choose('pin');setMovingPin(active.id);setName(active.name);setCategory(active.category);}}} update={f=>save({...atlas,features:atlas.features.map(old=>old.id===f.id?f:old)})} remove={()=>{if(save({...atlas,features:atlas.features.filter(f=>f.id!==active.id)}))setSelected('');}}/>}
    {atlas.features.length>0&&<div className="atlas-register"><h4>Map features <small>{atlas.features.length}</small></h4>{atlas.features.map(f=>{
      const Icon=f.kind==='pin'?pinIcons[f.category]:f.kind==='path'?Route:Scan;
      return <button type="button" key={f.id} aria-pressed={f.id===selected} onClick={()=>{if(tool==='measure'&&f.kind==='pin')place(f.point);else {choose('inspect');setSelected(f.id);}}}><Icon size={15}/><span>{f.name}</span><small>{featureLabel(f)}</small></button>;
    })}</div>}
  </section>;
  return <section className="atlas-studio" aria-label="Map workspace" onKeyDown={e=>{
    if(e.defaultPrevented)return;
    if(e.key==='Enter'&&(tool==='path'||tool==='region')&&e.target instanceof HTMLElement&&!e.target.closest('button,input,select,textarea')){e.preventDefault();finish();}
    if(e.key==='Escape'){e.stopPropagation();if(tool==='inspect')close();else choose('inspect');}
  }}>
    <header className="atlas-bar"><button ref={back} type="button" onClick={close} title={backLabel} aria-label={backLabel}><ArrowLeft size={17}/></button><h3>{block.title||'Map'}</h3>
      <button type="button" aria-label="Zoom out of map" disabled={zoom<=.5} onClick={()=>setZoom(Math.max(.5,zoom/1.25))}><Minus size={15}/></button>
      <button type="button" title="Fit map width" onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button>
      <button type="button" aria-label="Zoom into map" disabled={zoom>=4} onClick={()=>setZoom(Math.min(4,zoom*1.25))}><Plus size={15}/></button>
      <button type="button" className={host?'lg:hidden':''} onClick={()=>{if(showTools)showTools();else setLocalTools(v=>!v);}}>Tools</button>
    </header>
    {!host&&localTools&&<div className="atlas-local-tools">{controls}</div>}
    {host&&createPortal(controls,host)}
    <div ref={scroll} className="atlas-scroll"><div className="atlas-sheet" style={{width:(100*zoom)+'%'}}>
      <CanvasMapSurface block={block} image={image} tool={tool} points={points} selected={selected} onPoint={place} onFinish={finish} undoPoint={()=>setPoints(p=>p.slice(0,-1))} onAspect={setAspect} onSelect={id=>{choose('inspect');setSelected(id);}}/>
    </div></div>
    {(tool!=='inspect'||error||active)&&<div className="atlas-command" role="group" aria-label="Map command">
      <span role="status">{error||(distance&&tool==='measure'?distance:active?active.name+' · '+featureLabel(active):hint)}</span>
      {points.length>0&&<button type="button" title="Undo last point" aria-label="Undo last point" onClick={()=>setPoints(points.slice(0,-1))}><Undo2 size={16}/></button>}
      {(tool==='path'||tool==='region'||tool==='calibrate')&&<button type="button" disabled={points.length<(tool==='region'?3:2)||tool==='calibrate'&&!(Number(known)>0)} onClick={finish}><Check size={15}/>{tool==='calibrate'?'Set scale':'Finish'}</button>}
      <button type="button" aria-label="Clear map command" onClick={()=>choose('inspect')}><X size={16}/></button>
    </div>}
  </section>;
}
