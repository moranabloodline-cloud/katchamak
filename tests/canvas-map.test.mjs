import assert from 'node:assert/strict';
import {atlasOf,imageDistance,mapDistance,PIN_KINDS,validAtlas} from '../src/lib/kachamak/canvas-map.ts';
import {changeHomepage,validHomepage} from '../src/lib/kachamak/homepage.ts';
import {importCanvasFile} from '../src/lib/kachamak/canvas-file.ts';
import {newNovel} from '../src/lib/kachamak/seed.ts';

const a={x:.25,y:.1},b={x:.75,y:.1},c={x:.75,y:.8};
const features=PIN_KINDS.map((category,i)=>({id:'p'+i,kind:'pin',category,name:category,point:a}));
features.push({id:'road',kind:'path',name:'Road',color:'#cc9510',points:[a,b]},
  {id:'area',kind:'region',name:'Coast',color:'#229988',points:[a,b,c]});
const atlas={features,kmPerWidth:40};
assert.equal(PIN_KINDS.length,20);assert.ok(validAtlas(atlas));
assert.equal(imageDistance({x:0,y:0},{x:0,y:1},2),.5);
assert.equal(mapDistance([a,b,c],atlas,2),34);
assert.equal(mapDistance([a,b],{features:[]},2),null);
const geo={west:-1,east:1,north:1,south:-1,projection:'mercator',frame:{left:.1,right:.9,top:.1,bottom:.9}};
assert.ok(Math.abs(mapDistance([{x:.5,y:.5},{x:.9,y:.5}],{features:[],geo},2)-111.195)<.003);
assert.equal(mapDistance([{x:0,y:.5},c],{features:[],geo},2),null);
assert.equal(validAtlas({...atlas,geo:{...geo,frame:{...geo.frame,bottom:0}}}),false);
assert.equal(validAtlas({...atlas,features:[features[0],features[0]]}),false);
assert.equal(validAtlas({features:[{...features[0],point:{x:1.2,y:0}}]}),false);
assert.equal(validAtlas({features:[{...features.at(-1),points:[a,b]}]}),false);
const img='data:image/webp;base64,QUJD';
const legacy={id:'map',layout:'map',width:'standard',title:'Atlas',text:'',image:'gallery:base',at:{x:100,y:30},pin:a};
assert.deepEqual(atlasOf(legacy).features[0].point,a);
for(const fixed of [false,true]){
  const row={id:'row',layout:'row',width:'full',title:'',text:'',columns:1};
  const original=fixed?{...legacy,at:undefined,cell:{rowId:row.id,column:0}}:legacy;
  const page={mode:'canvas',locked:false,blocks:fixed?[row,original]:[original]};
  const action={type:'edit',original,block:{...original,atlas,pin:undefined}};
  const next=changeHomepage(page,action);assert.ok(next&&validHomepage(next));
  assert.equal(changeHomepage(next,action),null);
  const locked={...page,locked:true};
  assert.equal(changeHomepage(locked,action),null);
  const annotate={type:'mapAnnotations',original,atlas};
  const annotated=changeHomepage(locked,annotate);
  assert.ok(annotated.locked&&validHomepage(annotated));
  assert.deepEqual(annotated.blocks.find(b=>b.id===original.id),{...original,pin:undefined,atlas});
  assert.equal(changeHomepage(annotated,annotate),null);
  assert.equal(changeHomepage(locked,{...annotate,original:{...original,image:'gallery:other'}}),null);
  assert.equal(changeHomepage(locked,{...annotate,atlas:{features:[{kind:'invalid'}]}}),null);
  const book=newNovel('Atlas tests','Author');book.gallery=[{id:'base',kind:'image',name:'Base',parentId:null,image:img}];
  const roundTrip=importCanvasFile(book,page,JSON.parse(JSON.stringify({format:'kachamak-canvas/1',projectId:book.id,layout:next,images:[]})));
  assert.deepEqual(roundTrip.page.blocks.find(b=>b.id==='map').atlas,atlas);
}
console.log('All 20 pin types, paths, regions, guarded edits, legacy pins, Gallery round trips, geodesic and calibrated distances passed.');
