import {familyCard,familyConnections,familyEdges,familyLayout,familyMembers} from './family-tree';
import {directParentage,relationshipDirection} from './kinship';
import type {FamilyRelationship,NoteNode,Novel} from './types';

type Point={x:number;y:number};
type Port={x:()=>number;y:()=>number};
type Route={roles:FamilyRelationship[];style:'ancestry'|'couple'|'kin';arrow:boolean;draw:()=>string};
type Lane={row:number;xs:(()=>number)[];index:number};

// Only recorded edges participate in placement and routing. Inferences are
// useful in the inspector but should neither draw lines nor move a card.
export function familyDiagram(novel:Novel,tree:NoteNode|null){
  const people=tree?familyMembers(novel,tree):[];
  const edges=familyEdges(novel,people);
  const layout=familyLayout(people,edges);
  const {positions}=layout,{width:w,height:h}=familyCard;
  const levels=[...new Set([...positions.values()].map(p=>p.y))].sort((a,b)=>a-b);
  const rowIndex=new Map(levels.map((y,i)=>[y,i]));
  const row=new Map([...positions].map(([id,p])=>[id,rowIndex.get(p.y)!]));
  const routes:Route[]=[],lanes:Lane[]=[];
  const ports=new Map<string,Port[]>();
  const connections=familyConnections(edges);
  let outerLanes=0;

  function port(id:string,side:'top'|'bottom'):Port{
    const key=JSON.stringify([id,side]);
    const slots=ports.get(key)??[];
    ports.set(key,slots);
    const index=slots.length,p=positions.get(id)!;
    const point={x:()=>p.x+w/2+(index-(slots.length-1)/2)*Math.min(14,w/(slots.length+1)),
      y:()=>side==='top'?p.y:p.y+h};
    slots.push(point);
    return point;
  }
  function channel(row:number,ends:Port[]){
    const lane={row,xs:ends.map(end=>end.x),index:0};
    lanes.push(lane);
    return ()=>levels[row]-18-lane.index*12;
  }
  const adjacent=(a:Point,b:Point)=>a.y===b.y && Math.abs(a.x-b.x)===w+40;
  const pairKey=(a:string,b:string)=>JSON.stringify([a,b].sort());
  const couples=new Set(edges.filter(e=>relationshipDirection(e).line==='couple').map(e=>pairKey(e.from,e.to)));

  // Group children only when their visible parent sets match exactly. A
  // half-sibling with a different set of parents gets a separate junction.
  const localParents=new Map<string,Map<string,FamilyRelationship[]>>();
  const others:typeof connections=[];
  for(const connection of connections){
    const parent=directParentage(connection.edge);
    if(!parent || row.get(parent.to)!==row.get(parent.from)!+1){others.push(connection);continue;}
    const set=localParents.get(parent.to)??new Map<string,FamilyRelationship[]>();
    set.set(parent.from,connection.roles);localParents.set(parent.to,set);
  }
  const families=new Map<string,{parents:string[];children:string[];roles:FamilyRelationship[]}>();
  for(const [child,set] of localParents){
    const parents=[...set.keys()].sort(),key=JSON.stringify(parents);
    const family=families.get(key)??{parents,children:[],roles:[]};
    family.children.push(child);family.roles.push(...[...set.values()].flat());families.set(key,family);
  }

  for(const {parents,children,roles} of families.values()){
    const a=positions.get(parents[0])!,b=positions.get(parents[1]);
    const joined=parents.length===2 && b && adjacent(a,b) && couples.has(pairKey(parents[0],parents[1]));
    const sources=joined?[{x:()=>(a.x+b.x+w)/2,y:()=>a.y+h/2}]:parents.map(id=>port(id,'bottom'));
    const targets=children.map(id=>port(id,'top')),ends=[...sources,...targets];
    const junction=channel(row.get(children[0])!,ends);
    routes.push({roles,style:'ancestry',arrow:false,draw:()=>{
      const y=junction(),xs=ends.map(end=>end.x());
      const branches=ends.map(end=>'M'+end.x()+' '+end.y()+'V'+y);
      return ['M'+Math.min(...xs)+' '+y+'H'+Math.max(...xs),...branches].join(' ');
    }});
  }

  for(const {edge,roles} of others){
    const {from,to,line:style,mutual}=relationshipDirection(edge);
    const a=positions.get(from)!,b=positions.get(to)!,ra=row.get(from)!,rb=row.get(to)!;
    const arrow=!mutual;
    if(adjacent(a,b)){
      routes.push({roles,style,arrow,draw:()=>'M'+(a.x<b.x?a.x+w:a.x)+' '+(a.y+h/2)+'H'+(a.x<b.x?b.x:b.x+w)});
      continue;
    }
    const start=port(from,ra<rb?'bottom':'top'),end=port(to,rb<ra?'bottom':'top');
    if(Math.abs(ra-rb)<=1){
      const y=channel(Math.max(ra,rb),[start,end]);
      routes.push({roles,style,arrow,draw:()=>'M'+start.x()+' '+start.y()+'V'+y()+'H'+end.x()+'V'+end.y()});
    }else{
      // Long connections travel outside intermediate rows, clear of every card.
      const x=layout.width+12*outerLanes++,outside={x:()=>x,y:()=>0};
      const leave=channel(ra<rb?ra+1:ra,[start,outside]),enter=channel(ra<rb?rb:rb+1,[end,outside]);
      routes.push({roles,style,arrow,draw:()=>'M'+start.x()+' '+start.y()+'V'+leave()+'H'+x+'V'+enter()+'H'+end.x()+'V'+end.y()});
    }
  }

  // Unrelated horizontal spans can share a lane only when there is a gap.
  // Grow the space between generations when a family requires more lanes.
  const tracks=levels.map(()=>[] as {min:number;max:number}[][]);
  for(const lane of lanes){
    const xs=lane.xs.map(x=>x()),min=Math.min(...xs),max=Math.max(...xs);
    const levelsHere=tracks[lane.row];
    let i=0;
    while(levelsHere[i]?.some(span=>min<=span.max+8 && max>=span.min-8))i++;
    (levelsHere[i]??=[]).push({min,max});lane.index=i;
  }
  for(let i=0;i<levels.length;i++){
    const gap=Math.max(i===0?32:68,36+tracks[i].length*12);
    levels[i]=(i?levels[i-1]+h:0)+gap;
  }
  for(const [id,p] of positions)p.y=levels[row.get(id)!];
  const paths=routes.map(({draw,...route})=>({...route,d:draw()}));
  return {people,positions,width:layout.width+outerLanes*12,height:(levels.at(-1)??0)+h+30,paths};
}
