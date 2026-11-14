import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body><div class="kachamak-editor" contenteditable="true"><p>First pane</p></div><div class="kachamak-editor" contenteditable="true"><h2><em>Second pane</em></h2></div><select><option>Toolbar</option></select></body></html>',{url:'https://test.local'}).window;
for(const key of ['window','document','Event'])globalThis[key]=key==='window'?dom:dom[key];
const {editorForRange,selectionBlock,applyBlockStyle}=await import('../src/lib/kachamak/editor-blocks.ts');
const [first,second]=document.querySelectorAll('.kachamak-editor'),range=document.createRange();
range.selectNodeContents(second.querySelector('em'));assert.equal(selectionBlock(range),'h2');assert.equal(editorForRange(range),second);
const saved=range.cloneRange();document.querySelector('select').focus();dom.getSelection().removeAllRanges();
let changes=0,command=null;second.addEventListener('input',()=>changes++);
document.execCommand=(name,_unused,value)=>{command={name,value,editor:editorForRange(dom.getSelection().getRangeAt(0))};return true;};
for(let n=1;n<=6;n++){assert.equal(applyBlockStyle(saved,'h'+n),true);assert.equal(command.value,'h'+n);assert.equal(command.editor,second);}
assert.equal(changes,6,'Every heading command immediately reaches editor persistence');
assert.equal(first.innerHTML,'<p>First pane</p>','Other Split pane stays intact');
assert.equal(applyBlockStyle(saved,'normal'),true);assert.equal(command.value,'p');
assert.equal(applyBlockStyle(saved,'script'),false);assert.equal(applyBlockStyle(null,'h1'),false);
second.remove();assert.equal(applyBlockStyle(saved,'h1'),false,'Stale ranges cannot format another note');
console.log('Heading styles passed: six semantic levels, nested inline selection, preserved range after toolbar focus, correct Split editor, immediate save, Normal and stale-range rejection.');
