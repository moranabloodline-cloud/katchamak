import type {Point} from './canvas-board';

export const PIN_KINDS=['Dimension','Celestial','Planet','Continent','Forest','Island','Jungle','Lake','Mountain','Ocean','Sea','Subcontinent','Empire','Kingdom','Duchy','County','Settlement','District','Merchant','Location'] as const;
export type PinKind=typeof PIN_KINDS[number];
export type MapFeature=
  | {id:string;kind:'pin';name:string;category:PinKind;point:Point}
  | {id:string;kind:'path'|'region';name:string;points:Point[];color:string};
export type GeoBounds={projection:'equirectangular'|'mercator';west:number;east:number;north:number;south:number;frame?:{left:number;right:number;top:number;bottom:number}};
export type MapAtlas={features:MapFeature[];geo?:GeoBounds;kmPerWidth?:number};
export type MapTool='inspect'|'pin'|'path'|'region'|'measure'|'calibrate';
const unit=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1;
export const mapPoint=(p:Point)=>!!p&&unit(p.x)&&unit(p.y);
const positive=(n:number)=>Number.isFinite(n)&&n>0;
const fullFrame={left:0,right:1,top:0,bottom:1};

export function validAtlas(atlas:MapAtlas):boolean{
  if(!atlas||!Array.isArray(atlas.features))return false;
  const keys=new Set<string>();
  for(const f of atlas.features){
    if(!f||typeof f.id!=='string'||!f.id||keys.has(f.id)||typeof f.name!=='string'||!f.name.trim())return false;
    keys.add(f.id);
    if(f.kind==='pin'){
      if(!PIN_KINDS.includes(f.category)||!mapPoint(f.point))return false;
    }else if(!['path','region'].includes(f.kind)||!/^#[0-9a-f]{6}$/i.test(f.color)||!Array.isArray(f.points)||
      f.points.length<(f.kind==='region'?3:2)||!f.points.every(mapPoint))return false;
  }
  if(atlas.kmPerWidth!==undefined&&!positive(atlas.kmPerWidth))return false;
  const g=atlas.geo;
  if(!g)return g===undefined;
  const frame=g.frame??fullFrame;
  const maxLat=g.projection==='mercator'?85.05113:90;
  return ['equirectangular','mercator'].includes(g.projection)&&g.west>=-180&&g.east<=180&&g.west<g.east&&
    [g.north,g.south,g.west,g.east].every(Number.isFinite)&&g.south>=-maxLat&&g.north<=maxLat&&g.north>g.south&&
    [frame.left,frame.right,frame.top,frame.bottom].every(unit)&&frame.left<frame.right&&frame.top<frame.bottom;
}

export function atlasOf(block:{atlas?:MapAtlas;pin?:Point}):MapAtlas{
  return block.atlas??{features:block.pin?[{id:'original-pin',kind:'pin',category:'Location',name:'Location',point:block.pin}]:[]};
}
const rad=Math.PI/180;
function coordinates(p:Point,g:GeoBounds){
  const f=g.frame??fullFrame;
  const x=(p.x-f.left)/(f.right-f.left),y=(p.y-f.top)/(f.bottom-f.top);
  if(!unit(x)||!unit(y))return null;
  const lon=(g.west+x*(g.east-g.west))*rad;
  if(g.projection==='equirectangular')return {lon,lat:(g.north+y*(g.south-g.north))*rad};
  const merc=(degrees:number)=>Math.asinh(Math.tan(degrees*rad));
  return {lon,lat:Math.atan(Math.sinh(merc(g.north)+y*(merc(g.south)-merc(g.north))))};
}
export function imageDistance(a:Point,b:Point,aspect:number){
  return Math.hypot(b.x-a.x,(b.y-a.y)/aspect);
}
export function mapDistance(points:Point[],atlas:MapAtlas,aspect:number):number|null{
  if(points.length<2)return null;
  let km=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    if(atlas.geo){
      const p=coordinates(a,atlas.geo),q=coordinates(b,atlas.geo);
      if(!p||!q)return null;
      const h=Math.sin((q.lat-p.lat)/2)**2+Math.cos(p.lat)*Math.cos(q.lat)*Math.sin((q.lon-p.lon)/2)**2;
      km+=12742.0176*Math.asin(Math.sqrt(Math.min(1,h)));
    }else if(atlas.kmPerWidth&&positive(aspect))km+=imageDistance(a,b,aspect)*atlas.kmPerWidth;
    else return null;
  }
  return km;
}
