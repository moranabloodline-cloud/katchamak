import assert from 'node:assert/strict';
import {applySelection,boardLayers,extractBoard,framedItems,frameBetween} from '../src/lib/kachamak/canvas-selection.ts';
import {expandCardGroups,clearSingletonGroups} from '../src/lib/kachamak/canvas-groups.ts';
import {alignCanvas,canvasDragFrame} from '../src/lib/kachamak/canvas-guides.ts';
import {boardRects} from '../src/lib/kachamak/canvas-board.ts';
import {changeHomepage,validHomepage} from '../src/lib/kachamak/homepage.ts';

const card=(id,layout,x,y,extra={})=>({id,layout,title:id,width:'standard',text:'',at:{x,y},...extra});
const edge=(id,from,to)=>({id,title:'',width:'standard',text:'',layout:'line',edge:{from,to}});
const page={id:'parent',mode:'board',locked:false,title:'Original',parentId:null,blocks:[
  card('a','column',30,60),card('inside','note',0,0,{columnId:'a'}),
  card('b','note',440,90),card('c','note',850,10),card('outside','heading',1250,20),
  edge('internal','a','inside'),edge('external','inside','outside')]};
const ids=['a','b','c'],heights=[['b',130],['c',60]];
const apply=(source,command,members=ids)=>applySelection(source,{type:'boardSelection',ids:members,command,heights});
const rects=boardRects(page.blocks,new Map(heights));
assert.deepEqual(framedItems(page.blocks,rects,frameBetween({x:1000,y:400},{x:0,y:0})),ids);
assert.deepEqual(framedItems(page.blocks,rects,{x:40,y:130,w:180,h:35}),['inside']);
for(const alignment of ['left','center','right','top','middle','bottom']){
  const output=apply(page,{kind:'align',alignment});
  const updated=boardRects(output.blocks,new Map(heights));
  const vertical=['top','middle','bottom'].includes(alignment);
  const factor=['left','top'].includes(alignment)?0:['center','middle'].includes(alignment)?.5:1;
  const anchors=ids.map(id=>{const b=updated.get(id);return vertical?b.y+b.h*factor:b.x+b.w*factor;});
  assert.equal(new Set(anchors).size,1);
}
for(const axis of ['x','y']){
  const after=boardRects(apply(page,{kind:'distribute',axis}).blocks,new Map(heights));
  // The vertical example has overlapping items, so the signed gaps may be negative.
  const orderedIds=[...ids].sort((a,b)=>rects.get(a)[axis]-rects.get(b)[axis]);
  const [a,b,c]=orderedIds.map(id=>after.get(id)),size=axis==='x'?'w':'h';
  assert.equal(b[axis]-a[axis]-a[size],c[axis]-b[axis]-b[size]);
}
const colored=apply(page,{kind:'color',color:'#ffccaa'});
assert.ok(ids.every(id=>colored.blocks.find(b=>b.id===id).color==='#ffccaa'));
const locked=apply(colored,{kind:'lock',locked:true});
assert.equal(apply(locked,{kind:'translate',delta:{x:20,y:10}}),null);
assert.equal(changeHomepage(locked,{type:'boardMove',id:'inside',at:{x:20,y:10}}),null);
const moved=apply(apply(locked,{kind:'lock',locked:false}),{kind:'translate',delta:{x:-50,y:40}});
assert.deepEqual(boardRects(moved.blocks,new Map(heights)).get('inside').x,rects.get('inside').x-50);
for(const front of [true,false]){
  const ranks=boardLayers(apply(page,{kind:'stack',front},['a','b']).blocks);
  assert.equal(ranks.get('a')>ranks.get('outside'),front);
  assert.equal(ranks.get('b')>ranks.get('outside'),front);
}
const connected=apply(page,{kind:'connect'});
assert.equal(connected.blocks.length,page.blocks.length+2);
assert.deepEqual(apply(connected,{kind:'connect'}),connected);
const {parent,child}=extractBoard(connected,ids,'Act II','child','portal',heights);
assert.ok(validHomepage(parent)&&validHomepage(child));
assert.equal(parent.blocks.find(b=>b.id==='portal').target.id,'child');
assert.equal(child.parentId,'parent');
assert.equal(child.blocks.find(b=>b.id==='inside').columnId,'a');
assert.deepEqual(child.blocks.find(b=>b.id==='internal').edge,{from:'a',to:'inside'});
assert.deepEqual(parent.blocks.find(b=>b.id==='external').edge,{from:'portal',to:'outside'});
assert.equal(child.blocks.filter(b=>b.layout==='line').length,3);
assert.equal(extractBoard(parent,ids,'Retry','other','other-link',heights),null);
assert.equal(apply({...page,locked:true},{kind:'connect'}),null);
// Treat the entire multi-selection, including the empty space between staggered cards, as one item.
const pair=[
  card('one','note',12.5,45.25,{extent:{w:40,h:20}}),
  card('two','note',71.25,63.5,{extent:{w:28.75,h:31}}),
];
const left=card('left','note',-80,0,{extent:{w:80,h:100}});
const right=card('right','note',200,0,{extent:{w:50,h:100}});
const linked=edge('linked','one','two');
const sheet={mode:'canvas',locked:false,blocks:[left,...pair,right,linked]};
const members=new Set(['two','one']);
const scene=[...boardRects(sheet.blocks,new Map())].map(([id,rect])=>({id,rect}));
const group=canvasDragFrame(scene,members);
assert.deepEqual(group.bounds,{x:12.5,y:45.25,w:87.5,h:49.25});
assert.deepEqual(group.targets,[scene[0].rect,scene[3].rect]);
assert.equal(canvasDragFrame(scene,new Set()),undefined);
for(const zoom of [.25,1,2.5]){
  const snap=alignCanvas({...group.bounds,x:56.25+1/zoom,y:25.375+1/zoom},group.targets,5/zoom);
  assert.ok(Math.abs(snap.at.x-56.25)<1e-9&&Math.abs(snap.at.y-25.375)<1e-9);
  assert.deepEqual(snap.guides.filter(g=>g.kind==='gap').map(g=>g.x2-g.x1),[56.25,56.25]);
  assert.ok(snap.guides.some(g=>g.kind==='center'&&g.y1===50&&g.y2===50));
  const edgeSnap=alignCanvas({...group.bounds,x:200-87.5+1/zoom,y:130},group.targets,5/zoom);
  assert.equal(edgeSnap.at.x+group.bounds.w,200);
  assert.ok(edgeSnap.guides.some(g=>g.kind==='edge'&&g.x1===200&&g.x2===200));
  const delta={x:snap.at.x-group.bounds.x,y:snap.at.y-group.bounds.y};
  const dropped=changeHomepage(sheet,{type:'boardSelection',ids:[...members],command:{kind:'translate',delta}});
  for(const item of pair){
    assert.deepEqual(dropped.blocks.find(b=>b.id===item.id).at,{x:item.at.x+delta.x,y:item.at.y+delta.y});
  }
  for(const neighbor of [left,right,linked])assert.deepEqual(dropped.blocks.find(b=>b.id===neighbor.id),neighbor);
}

const groupChange=(page,ids,groupId)=>changeHomepage(page,{type:'cardGroup',ids,groupId});
const memberIds=pair.map(b=>b.id);
const savedGroup=groupChange(sheet,memberIds,'duo');
assert.ok(validHomepage(savedGroup));
const restored=JSON.parse(JSON.stringify(savedGroup));
assert.deepEqual([...expandCardGroups(restored.blocks,new Set(['two']))].sort(),memberIds);
assert.deepEqual(restored.blocks.map(b=>b.at),sheet.blocks.map(b=>b.at));
assert.equal(groupChange(restored,['two'],'duplicate'),null);
assert.equal(groupChange(sheet,['one','missing'],'ghost'),null);
assert.equal(groupChange({...restored,locked:true},['two'],null),null);
const movedGroup=changeHomepage(restored,{type:'boardMove',id:'two',at:{x:0.5,y:-35}});
const translated=movedGroup.blocks.find(b=>b.id==='one').at;
assert.deepEqual(translated,{x:0.5+pair[0].at.x-pair[1].at.x,y:-35+pair[0].at.y-pair[1].at.y});
const independent=groupChange(movedGroup,['two'],null);
assert.deepEqual(independent.blocks.map(b=>b.at),movedGroup.blocks.map(b=>b.at));
assert.deepEqual(independent.blocks.find(b=>b.id==='linked'),linked);
const single=changeHomepage(independent,{type:'boardMove',id:'two',at:{x:50,y:75}});
assert.deepEqual(single.blocks.find(b=>b.id==='one').at,translated);
assert.ok(single.blocks.every(b=>!b.groupId));
const joined=groupChange(restored,['one','left'],'larger');
assert.deepEqual(joined.blocks.filter(b=>b.groupId==='larger').map(b=>b.id).sort(),['left','one','two']);
assert.equal(clearSingletonGroups(joined),joined);
const removed=changeHomepage(restored,{type:'deleteItems',originals:[restored.blocks.find(b=>b.id==='one')],positions:{}});
assert.ok(removed.blocks.every(b=>!b.groupId));
const container=card('row','row',500,0,{columns:2,width:'full'});
const docked=changeHomepage({...restored,blocks:[container,...restored.blocks]},{type:'dockCards',ids:['two'],cell:{rowId:'row',column:0}});
assert.ok(validHomepage(docked));
assert.ok(docked.blocks.filter(b=>b.groupId==='duo').every(b=>b.cell?.column===0));
assert.equal(groupChange(docked,['left','one'],'mixed'),null);
const released=changeHomepage(docked,{type:'releaseCards',ids:['one'],cell:{rowId:'row',column:0},at:{x:300,y:100}});
assert.ok(released.blocks.filter(b=>b.groupId==='duo').every(b=>b.at&&!b.cell));

// Only the cloned subgraph travels with a duplicate. Free copies also get their own drag geometry.
const duplicate=(p,copyId='copy')=>changeHomepage(p,{type:'duplicateGroup',groupId:'duo',copyId});
const original={...restored,blocks:[...restored.blocks,edge('external-link','two','right')]};
const duplicated=duplicate(original);
assert.ok(validHomepage(duplicated));
assert.deepEqual(duplicated.blocks.slice(0,original.blocks.length),original.blocks);
const copies=duplicated.blocks.filter(b=>b.groupId==='copy');
assert.deepEqual(copies.map(b=>b.at),pair.map(b=>({x:b.at.x+32,y:b.at.y+32})));
assert.deepEqual(duplicated.blocks.slice(-1)[0].edge,{from:copies[0].id,to:copies[1].id});
assert.equal(duplicated.blocks.length,original.blocks.length+3);
const copyMoved=changeHomepage(JSON.parse(JSON.stringify(duplicated)),{type:'boardMove',id:copies[1].id,at:{x:10,y:20}});
assert.deepEqual(copyMoved.blocks.filter(b=>b.groupId==='duo'),original.blocks.filter(b=>b.groupId==='duo'));
assert.deepEqual(copyMoved.blocks.find(b=>b.id===copies[0].id).at,{x:10+pair[0].at.x-pair[1].at.x,y:20+pair[0].at.y-pair[1].at.y});
assert.equal(duplicate(duplicated),null);
assert.notDeepEqual(duplicate(duplicated,'again').blocks.find(b=>b.groupId==='again').at,copies[0].at);
assert.equal(duplicate({...original,locked:true}),null);
const dockCopy=duplicate(docked);
assert.ok(validHomepage(dockCopy));
assert.deepEqual(dockCopy.blocks.filter(b=>b.cell).map(b=>b.groupId),['duo','duo','copy','copy']);
assert.deepEqual(dockCopy.blocks.at(-1).edge,{from:'copy-card-0',to:'copy-card-1'});

console.log('Canvas marquee, six alignments, equal spacing, group moves, layer order, locks and linked board conversion passed.');
