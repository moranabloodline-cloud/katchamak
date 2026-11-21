import assert from 'node:assert/strict';
import {applySelection,boardLayers,extractBoard,framedItems,frameBetween} from '../src/lib/kachamak/canvas-selection.ts';
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
console.log('Canvas marquee, six alignments, equal spacing, group moves, layer order, locks and linked board conversion passed.');
