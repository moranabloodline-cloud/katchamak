import assert from 'node:assert/strict';
import {unifiedCanvas,inFixedRow} from '../src/lib/kachamak/canvas-layout.ts';
import {changeHomepage,validHomepage} from '../src/lib/kachamak/homepage.ts';
import {useKachamak} from '../src/lib/kachamak/store.ts';
import {newNovel} from '../src/lib/kachamak/seed.ts';
import {isReadableProject} from '../src/lib/kachamak/project-validation.ts';

const item=(id,layout,extra={})=>({id,layout,title:id,text:'',width:'standard',...extra});
const row=item('r','row',{width:'full',columns:6});
const source={locked:false,blocks:[item('banner','banner',{width:'full'}),item('m','card'),item('n','card'),row,
  item('scene','note',{cell:{rowId:'r',column:0}}),item('end','text',{cell:{rowId:'r',column:5}})]};
const old=structuredClone(source);
let page=unifiedCanvas(source);
assert.deepEqual(old,source);assert.deepEqual(page,unifiedCanvas(source));assert.equal(unifiedCanvas(page),page);
assert.ok(validHomepage(page));assert.ok(page.blocks.filter(b=>b.layout!=='row').every(b=>!!b.cell));
assert.equal(page.blocks.find(b=>b.id==='m').cell.rowId,page.blocks.find(b=>b.id==='n').cell.rowId);
const apply=action=>{const next=changeHomepage(page,action);assert.ok(next);assert.ok(validHomepage(next));page=next;};
apply({type:'into',id:'scene',cell:{rowId:'r',column:5}});
apply({type:'move',id:'scene',offset:-1});
assert.deepEqual(page.blocks.filter(b=>b.cell?.column===5).map(b=>b.id),['scene','end']);
for(const action of [{type:'move',id:'r',offset:-1},{type:'boardMove',id:'r',at:{x:0,y:0}},
 {type:'boardMove',id:'end',at:{x:0,y:0}},{type:'place',id:'end',targetId:'r',side:'after'},
 {type:'into',id:'end',cell:page.blocks.find(b=>b.id==='m').cell}])assert.equal(changeHomepage(page,action),null);
apply({type:'edit',original:row,block:{...row,columns:2}});
assert.ok(page.blocks.filter(b=>b.cell?.rowId==='r').every(b=>b.cell.column===1));
const fixed=page.blocks.filter(inFixedRow);
for(const [n,id] of ['x','y'].entries())apply({type:'add',block:item(id,'note',{at:{x:n*300,y:0}})});
apply({type:'add',block:item('edge','line',{edge:{from:'x',to:'y'}})});
apply({type:'boardMove',id:'x',at:{x:-20,y:87}});
assert.deepEqual(page.blocks.filter(inFixedRow),fixed);
assert.equal(changeHomepage(page,{type:'into',id:'x',cell:{rowId:'r',column:0}}),null);
assert.equal(changeHomepage(page,{type:'add',block:item('invalid','line',{edge:{from:'x',to:'end'}})}),null);
const book=newNovel('Canvas','Test');book.homePages=[{...page,id:'c',title:'One canvas',parentId:null}];
useKachamak.setState({novels:[book],activeNovelId:book.id,activeHomePageId:'c'});
assert.ok(useKachamak.getState().convertBoardSelection(book.id,'c',['x','y'],'Linked canvas',[]));
const updated=useKachamak.getState().novels[0];assert.ok(isReadableProject(JSON.parse(JSON.stringify(updated))));
assert.deepEqual(updated.homePages[0].blocks.filter(inFixedRow),fixed);assert.equal(updated.homePages[1].mode,'canvas');
apply({type:'remove',original:page.blocks.find(b=>b.id==='r')});
assert.ok(page.blocks.find(b=>b.id==='end').at);assert.ok(!page.blocks.find(b=>b.id==='end').cell);
assert.ok(validHomepage(JSON.parse(JSON.stringify(page))));
const board={mode:'board',locked:true,blocks:[item('a','note',{at:{x:-22,y:32}})]};
assert.deepEqual(unifiedCanvas(board).blocks,board.blocks);
assert.equal(changeHomepage(unifiedCanvas(board),{type:'add',block:row}),null);
console.log('Unified Canvas passed fixed rows, legacy layout, resize, reorder, free movement, connections, release and nested conversion.');
