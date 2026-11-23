import type {BoardRect,Point} from './canvas-board';

type Axis='x'|'y';
type GuideKind='edge'|'center'|'gap';
export type AlignmentGuide={kind:GuideKind;x1:number;y1:number;x2:number;y2:number};

type Interval={start:number;end:number;near:number;far:number};
function project(r:BoardRect,axis:Axis):Interval{
  return axis==='x'
    ? {start:r.x,end:r.x+r.w,near:r.y,far:r.y+r.h}
    : {start:r.y,end:r.y+r.h,near:r.x,far:r.x+r.w};
}

type Match={at:number;distance:number;crossGap:number;kind:'edge'|'center';anchor:number;target:Interval};
function alignment(m:Interval,targets:Interval[],tolerance:number):Match|undefined{
  let best:Match|undefined;
  for(const target of targets){
    const crossGap=Math.max(0,m.near-target.far,target.near-m.far);
    if(crossGap>tolerance*65)continue;
    function consider(source:number,anchor:number,kind:Match['kind']){
      const delta=anchor-source,distance=Math.abs(delta);
      if(distance>tolerance)return;
      if(!best||distance<best.distance||distance===best.distance&&(crossGap<best.crossGap||
        crossGap===best.crossGap&&kind==='center'&&best.kind==='edge')){
        best={at:m.start+delta,distance,crossGap,kind,anchor,target};
      }
    }
    consider((m.start+m.end)/2,(target.start+target.end)/2,'center');
    for(const anchor of [target.start,target.end]){
      consider(m.start,anchor,'edge');
      consider(m.end,anchor,'edge');
    }
  }
  return best;
}

type Spacing={at:number;distance:number;gap:number;trio:Interval[]};
function equalSpacing(m:Interval,targets:Interval[],tolerance:number){
  // Only consecutive cards in an overlapping row or column can form two visible gaps.
  const lane=targets.filter(t=>t.far>m.near&&t.near<m.far);
  if(lane.length<2)return;
  lane.push(m);
  lane.sort((a,b)=>a.start-b.start||a.end-b.end);
  const index=lane.indexOf(m),size=m.end-m.start;
  let best:Spacing|undefined;
  for(let i=Math.max(0,index-2);i<=Math.min(index,lane.length-3);i++){
    const trio=lane.slice(i,i+3),[a,b,c]=trio;
    if(Math.max(a.near,b.near,c.near)>=Math.min(a.far,b.far,c.far))continue;
    let at:number,gap:number;
    if(m===b){
      gap=(c.start-a.end-size)/2;
      at=a.end+gap;
    }else if(m===a){
      gap=c.start-b.end;
      at=b.start-gap-size;
    }else{
      gap=b.start-a.end;
      at=b.end+gap;
    }
    const distance=Math.abs(at-m.start);
    if(gap>0&&distance<=tolerance&&(!best||distance<best.distance||distance===best.distance&&gap<best.gap)){
      best={at,distance,gap,trio};
    }
  }
  return best;
}

function line(axis:Axis,kind:GuideKind,start:number,near:number,end:number,far:number):AlignmentGuide{
  return axis==='x'?{kind,x1:start,y1:near,x2:end,y2:far}:{kind,x1:near,y1:start,x2:far,y2:end};
}

// Rectangles and guides share world coordinates. The caller supplies a screen-pixel tolerance in world units.
export function alignCanvas(moving:BoardRect,targets:BoardRect[],tolerance:number){
  const at:Point={x:moving.x,y:moving.y};
  const axes=(['x','y'] as const).map(axis=>{
    const m=project(moving,axis),neighbors=targets.map(r=>project(r,axis));
    const aligned=alignment(m,neighbors,tolerance),spaced=equalSpacing(m,neighbors,tolerance);
    const closest=spaced&&(!aligned||spaced.distance<aligned.distance)?spaced:aligned;
    if(closest)at[axis]=closest.at;
    return {axis,m,aligned,spaced};
  });
  const guides:AlignmentGuide[]=[];
  for(const {axis,m,aligned,spaced} of axes){
    const placed=project({...moving,...at},axis);
    if(aligned&&aligned.at===at[axis]){
      guides.push(line(axis,aligned.kind,aligned.anchor,Math.min(placed.near,aligned.target.near),
        aligned.anchor,Math.max(placed.far,aligned.target.far)));
    }
    if(spaced&&spaced.at===at[axis]){
      const [a,b,c]=spaced.trio.map(r=>r===m?placed:r);
      const low=Math.max(a.near,b.near,c.near),high=Math.min(a.far,b.far,c.far);
      if(high<=low)continue;
      const track=low+(high-low)/4;
      guides.push(line(axis,'gap',a.end,track,b.start,track),line(axis,'gap',b.end,track,c.start,track));
    }
  }
  return {at,guides};
}
