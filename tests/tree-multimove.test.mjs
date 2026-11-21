import assert from 'node:assert/strict';
import {newNovel} from '../src/lib/kachamak/seed.ts';
import {SECTION_KEYS} from '../src/lib/kachamak/types.ts';
import {useKachamak} from '../src/lib/kachamak/store.ts';
import {branchSources,noteParents,moveNoteBranches} from '../src/lib/kachamak/tree-move.ts';

const book=newNovel('Multi-select','Test'), other=newNovel('Other','Test');
const node=(id,children=[])=>({id,title:id,kind:'doc',children,content:id,notes:'',synopsis:'',status:'Draft',label:''});
const forest=[node('a',[node('child',[node('leaf')])]),node('b'),node('c'),node('d',[node('last')])];
const parents=noteParents(forest);
const chosen=branchSources(['a','child','c'],parents);
for (const section of SECTION_KEYS) {
  book.sections[section]=forest;
  useKachamak.setState({novels:[book,other],activeNovelId:book.id});
  const {moveTreeNotes}=useKachamak.getState();
  const moved=()=>useKachamak.getState().novels[0].sections[section];
  for (const target of ['leaf','a','child','missing']) assert.throws(()=>moveTreeNotes(book.id,section,chosen,target));
  assert.equal(moved(),forest);
  assert.throws(()=>moveTreeNotes(other.id,section,chosen,'d'));
  moveTreeNotes(book.id,section,chosen,'d',{id:'last',side:'before'});
  assert.deepEqual(moved().map(n=>n.id),['b','d']);
  assert.deepEqual(moved()[1].children,[forest[0],forest[2],forest[3].children[0]]);
  assert.throws(()=>moveTreeNotes(book.id,section,chosen,null));
  const back=branchSources(['a','c'],noteParents(moved()));
  moveTreeNotes(book.id,section,back,null,{id:'b',side:'after'});
  assert.deepEqual(moved().map(n=>n.id),['b','a','c','d']);
  assert.equal(moved()[1],forest[0]);
}
let deep=node('end');
for (let i=0;i<97;i++) deep=node('level'+i,[deep]);
assert.throws(()=>moveNoteBranches([...forest,deep],chosen,'end'),/deep/);

const empty={locked:true,blocks:[]};
book.homePages=[['a',null],['child','a'],['leaf','child'],['c',null],['d','home']].map(([id,parentId])=>({...empty,id,parentId,title:id}));
book.gallery=[...book.homePages.map(({id,parentId})=>({kind:'folder',id,name:id,parentId:parentId==='home'?null:parentId})),{kind:'image',id:'photo',name:'Photo',parentId:'leaf',image:'data:image/png;base64,aQ=='}];
for (const key of ['gallery','homePages']) {
  useKachamak.setState({novels:[book,other],activeNovelId:book.id});
  const get=()=>useKachamak.getState().novels[0][key];
  const move=(sources,target)=> key==='gallery'?useKachamak.getState().editGallery(book.id,{type:'moveFolders',sources,parentId:target}):useKachamak.getState().moveHomePages(book.id,sources,target);
  const original=get();
  assert.throws(()=>move(chosen,'leaf'));
  assert.throws(()=>move(chosen,'missing'));
  assert.equal(get(),original);
  move(chosen,'d');
  assert.deepEqual(get(),original.map(item=>['a','c'].includes(item.id)?{...item,parentId:'d'}:item));
  assert.throws(()=>move(chosen,null));
  move([{id:'a',parentId:'d'},{id:'c',parentId:'d'}],null);
  assert.deepEqual(get(),original);
}
console.log('Verified atomic moves, mixed depths, descendant and stale-drop rejection, folder contents, relative order, root and book isolation for every tree.');
