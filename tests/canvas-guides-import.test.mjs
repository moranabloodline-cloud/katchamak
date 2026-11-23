import assert from 'node:assert/strict';
import {alignCanvas} from '../src/lib/kachamak/canvas-guides.ts';
import {importCanvasFile,canvasOpeningView} from '../src/lib/kachamak/canvas-file.ts';
import {newNovel} from '../src/lib/kachamak/seed.ts';
const target={x:100,y:200,w:60,h:30},moving={x:139,y:179,w:20,h:20};
const snap=alignCanvas(moving,[target],2.5);
assert.deepEqual(snap.at,{x:140,y:180});
assert.equal(snap.guides.length,2);
assert.deepEqual(alignCanvas(moving,[target],.5),{at:{x:139,y:179},guides:[]});
assert.equal(alignCanvas({...moving,y:-1000},[target],4).guides.length,0);
// Use different card widths so equal gutters cannot be inferred from equally spaced centers.
const row=[{x:0,y:20,w:80,h:80},{x:130.5,y:30,w:66,h:60},{x:247,y:20,w:70,h:80}];
const transpose=r=>({x:r.y,y:r.x,w:r.h,h:r.w});
for (const vertical of [false,true]) {
  const cards=vertical?row.map(transpose):row;
  const axis=vertical?'y':'x',other=vertical?'x':'y';
  for(const zoom of [0.25,1,2,3]) {
    for(const i of [0,1,2]) {
      const rest=cards.filter((_,j)=>j!==i);
      const drag={...cards[i],[axis]:cards[i][axis]+3.5/zoom};
      const result=alignCanvas(drag,rest,5/zoom);
      assert.deepEqual(result.at,{x:cards[i].x,y:cards[i].y});
      const gaps=result.guides.filter(g=>g.kind==='gap');
      assert.deepEqual(gaps.map(g=>[g[axis+'1'],g[axis+'2']]),[[80,130.5],[196.5,247]]);
      assert.ok(gaps.every(g=>g[other+'1']===g[other+'2']&&g[other+'1']===gaps[0][other+'1']));
      assert.ok(result.guides.some(g=>g.kind==='center'&&g[other+'1']===60&&g[other+'2']===60));
      assert.ok(!alignCanvas({...drag,[axis]:cards[i][axis]+5.5/zoom},rest,5/zoom).guides.some(g=>g.kind==='gap'));
    }
  }
}
for (const zoom of [0.25,1,2,3]) {
  const reference={x:12,y:40,w:185,h:50},aligned={x:84,y:125,w:41,h:42};
  const dx=4/zoom;
  const match=alignCanvas({...aligned,x:aligned.x+dx},[reference],5/zoom);
  assert.equal(match.at.x,84);
  assert.deepEqual(match.guides.find(g=>g.kind==='center'),{kind:'center',x1:104.5,y1:40,x2:104.5,y2:167});
  assert.ok(!alignCanvas({...aligned,x:aligned.x+5.5/zoom},[reference],5/zoom).guides.some(g=>g.kind==='center'));
}
const gapGuides=(card,neighbors)=>alignCanvas(card,neighbors,2).guides.filter(g=>g.kind==='gap');
assert.deepEqual(gapGuides(row[1],[row[0]]),[]);
assert.deepEqual(gapGuides(row[1],[row[0],{...row[2],y:300}]),[]);
assert.deepEqual(gapGuides(row[1],[row[0],{...row[0],x:92,w:15},row[2]]),[]);
assert.deepEqual(gapGuides({x:41,y:20,w:80,h:80},[{...row[0]},{...row[0],x:82}]),[]);
const book=newNovel('Sample','A'),current={locked:false,notes:'Keep this',blocks:[]};
const block={id:'one',layout:'image',title:'Sky',text:'',at:{x:-200,y:35},width:'standard',image:'gallery:sky'};
const file={format:'kachamak-canvas/1',projectId:book.id,images:[{name:'Sky',ref:'gallery:sky',data:'data:image/webp;base64,QUJD'}],layout:{mode:'canvas',locked:true,blocks:[block]}};
const first=importCanvasFile(book,current,file);
assert.ok(first);assert.equal(first.gallery.length,1);assert.equal(first.page.notes,'Keep this');
assert.equal(first.page.blocks[0].image,'gallery:'+first.gallery[0].id);
const again=importCanvasFile({...book,gallery:first.gallery},current,file);
assert.deepEqual(again,first);assert.equal(current.blocks.length,0);
assert.equal(importCanvasFile(book,current,{...file,projectId:'another'}),null);
assert.equal(importCanvasFile(book,current,{...file,images:[]}),null);
const view=canvasOpeningView(first.page,510);assert.equal(view.level,1);assert.equal(35+view.y,20);
console.log('Edge and center alignment, equal gaps on both axes, zoom tolerance, Canvas import, Gallery deduplication and opening view passed.');
