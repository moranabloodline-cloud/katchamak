import assert from 'node:assert/strict';
import {newNovel} from '../src/lib/kachamak/seed.ts';
import {useKachamak} from '../src/lib/kachamak/store.ts';
import {isReadableProject} from '../src/lib/kachamak/project-validation.ts';
import {changeHomepage,EMPTY_HOMEPAGE,validHomepage,youtubeVideoId} from '../src/lib/kachamak/homepage.ts';
import {readHomepageImage} from '../src/lib/kachamak/project-settings.ts';
import {openProjectNote,returnToPreviousNote} from '../src/lib/kachamak/note-navigation.ts';

const first=newNovel('First book','Tester'),second=newNovel('Second book','Tester');
useKachamak.setState({novels:[first,second],activeNovelId:first.id});
const store=useKachamak.getState;
const noteId=store().addNode('codex',null,'doc','Harbour');
const current=()=>store().novels[0], original=current();
store().setView('homepage');
assert.equal(current(),original);
assert.equal(current().homepage,undefined);
assert.ok(isReadableProject(current()));
const card={id:'card',layout:'card',width:'standard',title:'Harbour',text:'',target:{kind:'note',id:noteId}};
const banner={...card,id:'banner',layout:'banner',width:'full',target:{kind:'tab',tab:'timeline'},image:'data:image/png;base64,aQ=='};
const add=block=>({type:'add',block});
const change=action=>store().changeHomepage(first.id,action);
assert.equal(change(add(card)),true);
assert.equal(change(add(card)),false);
assert.ok(change(add(banner)));
const map={...card,id:'map'}, guide={...card,id:'guide'};
assert.ok(change(add(map)));
assert.ok(change(add(guide)));
const place=(id,targetId,side)=>change({type:'place',id,targetId,side});
assert.ok(place('card','map','after'));
assert.deepEqual(current().homepage.blocks,[banner,map,card,guide]);
assert.ok(place('guide','card','before'));
assert.deepEqual(current().homepage.blocks,[banner,map,guide,card]);
assert.equal(place('guide','card','before'),false);
assert.equal(place('guide','guide','after'),false);
assert.equal(place('absent','card','after'),false);
assert.equal(place('card','removed','after'),false);
assert.ok(change({type:'remove',original:guide}));
assert.ok(change({type:'remove',original:map}));
assert.ok(place('card','banner','before'));
assert.ok(change({type:'move',id:'banner',offset:-1}));
assert.equal(change({type:'move',id:'banner',offset:-1}),false);
const revised={...card,title:'Old harbour'};
assert.ok(change({type:'edit',original:card,block:revised}));
assert.equal(change({type:'remove',original:card}),false,'A stale dialog must preserve the newer block');
assert.deepEqual(current().homepage.blocks,[banner,revised]);
assert.equal(current().sections,original.sections);
assert.equal(store().novels[1],second);
assert.ok(change({type:'lock',locked:true}));
assert.ok(change({type:'info',field:'synopsis',value:'<p>Working synopsis</p>'}));
assert.ok(change({type:'info',field:'notes',value:'<p>Author notes</p>'}));
assert.equal(current().homepage.locked,true);
assert.equal(current().homepage.synopsis,'<p>Working synopsis</p>');
assert.equal(current().homepage.notes,'<p>Author notes</p>');
assert.equal(place('card','banner','before'),false);
assert.deepEqual(current().homepage.blocks,[banner,revised]);
for(const action of [add({...card,id:'new'}),{type:'remove',original:revised},{type:'move',id:'card',offset:-1},{type:'edit',original:revised,block:card}])assert.equal(change(action),false);
assert.ok(openProjectNote(noteId));
assert.equal(store().view,'write');
assert.equal(store().selectedNodeId,noteId);
assert.ok(returnToPreviousNote());
assert.equal(store().view,'homepage');
const backup=JSON.stringify(current());
assert.ok(isReadableProject(JSON.parse(backup)));
assert.ok(store().importNovel(backup).ok);
const restored=store().novels.at(-1);
const restoredBanner=restored.homepage.blocks.find(b=>b.id===banner.id);
assert.equal(restored.gallery.find(image=>'gallery:'+image.id===restoredBanner.image)?.image,banner.image);
assert.deepEqual(restored.homepage,{...current().homepage,blocks:[{...banner,image:restoredBanner.image},revised]});
assert.ok(openProjectNote(noteId),'Restored note links resolve inside the imported book');
store().openNovel(second.id);
assert.equal(change({type:'lock',locked:false}),false);
assert.equal(store().novels[1].homepage,undefined);
store().openNovel(first.id);
assert.ok(change({type:'lock',locked:false}));
assert.ok(change({type:'remove',original:banner}));
assert.deepEqual(current().homepage.blocks,[revised]);
store().setView('homepage');
store().openNoteTab(noteId);
assert.equal(store().view,'write');
assert.equal(store().selectedNodeId,noteId);
store().setView('homepage');
const draft=store().addNode('binder',null,'doc','Fresh note');
assert.equal(store().selectedNodeId,draft);
assert.equal(store().view,'write');
assert.deepEqual(EMPTY_HOMEPAGE,{locked:false,blocks:[]});
for(const blocks of [[card,card],[{...card,image:'broken'}],[{...card,target:{kind:'web',url:'file:///book'}}],[{...card,target:{kind:'tab',tab:'missing'}}]]){
  assert.equal(validHomepage({locked:false,blocks}),false);
  assert.equal(isReadableProject({...current(),homepage:{locked:true,blocks}}),false);
}
const slot={id:'logo',layout:'image',width:'full',title:'',text:''};
assert.ok(change(add(slot)));
const crop={ratio:3,zoom:1.5,x:.25,y:.4,fade:true};
const linkedLogo={...slot,image:banner.image,imageFrame:crop,imageCutout:'data:image/webp;base64,Yg==',target:card.target};
assert.ok(validHomepage({locked:false,blocks:[linkedLogo]}));
for(const invalid of [{zoom:.5},{zoom:7},{ratio:0},{x:NaN},{y:1.01},{fade:'on'}]){
  assert.equal(validHomepage({locked:false,blocks:[{...linkedLogo,imageFrame:{...crop,...invalid}}]}),false);
}
assert.equal(validHomepage({locked:false,blocks:[{...linkedLogo,image:undefined}]}),false);
assert.equal(validHomepage({locked:false,blocks:[{...linkedLogo,imageCutout:'invalid'}]}),false);
assert.ok(change({type:'edit',original:slot,block:linkedLogo}));
assert.ok(change({type:'lock',locked:true}));
const saved=JSON.parse(JSON.stringify(current()));
assert.ok(isReadableProject(saved));
assert.deepEqual(saved.homepage.blocks.find(b=>b.id==='logo'),linkedLogo);
assert.equal(change({type:'edit',original:linkedLogo,block:slot}),false);
assert.equal(store().novels[1],second);
// Grid membership and reading order survive edits to the row itself.
let grid={locked:false,blocks:[]};
const apply=action=>{const next=changeHomepage(grid,action);assert.ok(next);assert.ok(validHomepage(next));grid=next;};
const row={...card,layout:'row',columns:3,target:undefined,id:'row'};
apply({type:'width',width:'reading'});
apply(add(row));
for(const [id,column] of [['right',2],['left',0],['middle',1],['left-2',0]]){
  apply(add({...card,id,cell:{rowId:'row',column}}));
}
apply({type:'place',id:'right',targetId:'middle',side:'before'});
assert.deepEqual(grid.blocks.find(b=>b.id==='right').cell,{rowId:'row',column:1});
apply({type:'into',id:'middle',cell:{rowId:'row',column:2}});
apply({type:'move',id:'left-2',offset:-1});
assert.equal(changeHomepage(grid,{type:'into',id:'row',cell:{rowId:'row',column:0}}),null);
assert.equal(changeHomepage(grid,add({...card,cell:{rowId:'missing',column:0}})),null);
apply({type:'edit',original:row,block:{...row,columns:2}});
assert.deepEqual(grid.blocks.filter(b=>b.cell?.column===1).map(b=>b.id),['right','middle']);
const shortRow=grid.blocks.find(b=>b.id==='row');
assert.equal(changeHomepage(grid,{type:'edit',original:row,block:{...row,columns:4}}),null);
assert.ok(validHomepage(JSON.parse(JSON.stringify(grid))));
apply({type:'lock',locked:true});
assert.equal(changeHomepage(grid,{type:'into',id:'middle',cell:{rowId:'row',column:0}}),null);
apply({type:'lock',locked:false});
apply({type:'remove',original:shortRow});
assert.deepEqual(grid.blocks.map(b=>b.id),['left-2','left','right','middle']);
assert.ok(grid.blocks.every(b=>!b.cell));
for(const url of ['https://www.youtube.com/watch?v=M7lc1UVf-VE','https://youtu.be/M7lc1UVf-VE','https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'])assert.equal(youtubeVideoId(url),'M7lc1UVf-VE');
assert.equal(youtubeVideoId('https://example.com/watch?v=M7lc1UVf-VE'),null);
assert.equal(validHomepage({locked:false,blocks:[{...row,columns:0}]}),false);
assert.equal(validHomepage({locked:false,blocks:[{...card,layout:'links',links:[{id:'one',label:'Missing',target:{kind:'note'}}]}]}),false);
// A transparent logo must never pass through the opaque JPEG cover encoder.
const encodedTypes=[];
let drawnSize,closedBitmaps=0;
const context={
  drawImage(_bitmap,_x,_y,width,height){drawnSize=[width,height];},
  fillRect(){assert.fail('Homepage PNG/WebP must retain the transparent canvas');},
};
globalThis.createImageBitmap=async()=>({width:3000,height:300,close(){closedBitmaps++;}});
let forceCompression=false;
globalThis.document={createElement(){
  return {getContext:()=>context,toDataURL(mime){
    encodedTypes.push(mime);
    if(forceCompression && (mime==='image/png'||this.width>2000))return 'data:'+mime+';base64,'+'A'.repeat(700000);
    return 'data:'+mime+';base64,aQ==';
  }};
}};
const png=new File(['logo'],'logo.png',{type:'image/png'});
assert.match(await readHomepageImage(png),/^data:image\/png/);
assert.deepEqual(encodedTypes,['image/png']);
assert.deepEqual(drawnSize,[2400,240]);
forceCompression=true;
assert.match(await readHomepageImage(png),/^data:image\/webp/);
assert.ok(encodedTypes.every(type=>type==='image/png'||type==='image/webp'));
assert.deepEqual(drawnSize,[1800,180]);
assert.equal(closedBitmaps,2);
delete globalThis.document;
delete globalThis.createImageBitmap;
// A pre-tree page stays at its original address and keeps its own locked canvas.
store().openNovel(first.id);
const oldRoot=structuredClone(current().homepage);
assert.ok(store().createHomePage(first.id,'home','Atlas'));
const atlas=store().activeHomePageId;
assert.ok(store().createHomePage(first.id,atlas,'Port'));
const port=store().activeHomePageId;
assert.ok(store().createHomePage(first.id,null,'Index'));
assert.ok(store().openHomePage(first.id,atlas));
assert.ok(store().changeHomepage(first.id,add({...card,target:{kind:'page',id:port}}),atlas));
assert.ok(store().changeHomepage(first.id,{type:'lock',locked:true},atlas));
assert.ok(store().changeHomepage(first.id,add({...card,title:'Deep water'}),port));
assert.equal(store().changeHomepage(first.id,add(map),atlas),false);
assert.equal(store().renameHomePage(first.id,port,'Harbour'),true);
assert.deepEqual(current().homepage,oldRoot);
assert.equal(current().homePages.find(p=>p.id===atlas).blocks[0].target.id,port);
assert.equal(current().homePages.find(p=>p.id===port).locked,false);
assert.ok(isReadableProject(JSON.parse(JSON.stringify(current()))));
for(const homePages of [[{...current().homePages[0],parentId:'missing'}],
  current().homePages.map(p=>p.id===atlas?{...p,parentId:port}:p),
  [...current().homePages,current().homePages[0]], [{...current().homePages[0],id:'home'}]]) {
  assert.equal(isReadableProject({...current(),homePages}),false);
}
assert.ok(store().openHomePage(first.id,port));
assert.equal(store().openHomePage(first.id,'missing'),false);
assert.equal(store().changeHomepage(first.id,add(map),'missing'),false);
assert.equal(store().createHomePage(second.id,null,'Wrong project'),false);
store().openNovel(second.id);
assert.equal(store().activeHomePageId,'home');
assert.equal(store().novels[1].homePages,undefined);
console.log('Homepage tree, edits, project isolation, locks, order, navigation, backup and validation passed.');
