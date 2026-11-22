import type {BoardRect,Point} from './canvas-board';

export type AlignmentGuide={x1:number;y1:number;x2:number;y2:number};

// Compare edges in world coordinates. The caller converts a screen-pixel tolerance at the current zoom.
export function alignCanvasEdges(moving:BoardRect,targets:BoardRect[],tolerance:number){
  const at:Point={x:moving.x,y:moving.y};
  const guides:AlignmentGuide[]=[];
  for(const axis of ['x','y'] as const){
    const size=axis==='x'?'w':'h', cross=axis==='x'?'y':'x', span=cross==='x'?'w':'h';
    let best:{distance:number;gap:number;offset:number;edge:number;target:BoardRect}|undefined;
    for(const target of targets){
      const gap=Math.max(0,moving[cross]-target[cross]-target[span],target[cross]-moving[cross]-moving[span]);
      if(gap>tolerance*65)continue;
      for(const edge of [target[axis],target[axis]+target[size]]){
        for(const side of [moving[axis],moving[axis]+moving[size]]){
          const offset=edge-side,distance=Math.abs(offset);
          if(distance<=tolerance && (!best||distance<best.distance||distance===best.distance&&gap<best.gap)){
            best={distance,gap,offset,edge,target};
          }
        }
      }
    }
    if(!best)continue;
    at[axis]+=best.offset;
    const low=Math.min(moving[cross],best.target[cross]),high=Math.max(moving[cross]+moving[span],best.target[cross]+best.target[span]);
    guides.push(axis==='x'?{x1:best.edge,x2:best.edge,y1:low,y2:high}:{y1:best.edge,y2:best.edge,x1:low,x2:high});
  }
  return {at,guides};
}
