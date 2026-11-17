import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://test.local'}).window;
for(const key of ['window','document','HTMLElement','Element','Node','NodeFilter','DOMParser','Event','InputEvent','CustomEvent','MouseEvent','KeyboardEvent','getComputedStyle','navigator'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?dom:key==='getComputedStyle'?dom.getComputedStyle.bind(dom):dom[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react'),{createRoot}=await import('react-dom/client');
const {RichEditor}=await import('../src/components/kachamak/RichEditor.tsx');
const {applyEditorQuote,clearEditorFormatting}=await import('../src/lib/kachamak/editor-formatting.ts');
const {applyEditorHistory}=await import('../src/lib/kachamak/editor-blocks.ts');
const box=document.body.appendChild(document.createElement('div')),root=createRoot(box);
let calls=[],changes=[];
// JSDOM has no native editing engine; real command behavior is also checked in Chrome.
document.execCommand=(command)=>{
  calls.push(command);const selection=dom.getSelection(),range=selection.getRangeAt(0),editor=range.startContainer.parentElement.closest('.kachamak-editor');
  if(command==='formatBlock'){
    const paragraph=(range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement).closest('p'),quote=document.createElement('blockquote');paragraph.replaceWith(quote);quote.append(paragraph);
  }else if(command==='removeFormat'){
    const content=range.extractContents();
    for(const el of [...content.querySelectorAll('b,strong,i,em,u,s,span,font')].reverse())el.replaceWith(...el.childNodes);
    range.insertNode(content);
  }
  editor.dispatchEvent(new dom.Event('input',{bubbles:true}));return true;
};
let key=0;
const render=async(html)=>{changes=[];calls=[];await React.act(async()=>root.render(React.createElement(RichEditor,{key:++key,html,onChange:value=>changes.push(value)})));return box.querySelector('[contenteditable]');};
function select(node,start=0,end=start){const range=document.createRange();range.setStart(node,start);range.setEnd(node,end);dom.getSelection().removeAllRanges();dom.getSelection().addRange(range);return range;}
const current=()=>dom.getSelection().getRangeAt(0);
const original='<p>Before</p><blockquote><p>First <b>bold</b></p><p>Middle <a href="#note/target">link</a></p><p>Last</p></blockquote><p>After</p>';
let editor=await render(original),text=editor.querySelectorAll('blockquote p')[1].firstChild;
select(text,2);
await React.act(async()=>assert.equal(applyEditorQuote(current()),true));
assert.deepEqual([...editor.children].map(e=>e.tagName),['P','BLOCKQUOTE','P','BLOCKQUOTE','P']);
assert.equal(editor.querySelectorAll('blockquote')[0].textContent,'First bold');assert.equal(editor.querySelectorAll('blockquote')[1].textContent,'Last');
assert.equal(editor.children[2].textContent,'Middle link');assert.ok(editor.querySelector('a[href="#note/target"]'));
assert.equal(dom.getSelection().anchorNode.textContent,'Middle ');assert.equal(dom.getSelection().anchorOffset,2);
assert.equal(changes.length,1);assert.ok(!changes[0].includes('<!--'));
await React.act(async()=>applyEditorHistory(current(),'undo'));assert.equal(editor.innerHTML,original,'One Undo restores the exact quote and adjacent paragraphs');
editor=await render('<p>Before</p><p>After</p>');select(editor.querySelector('p').firstChild,3);
await React.act(async()=>applyEditorQuote(current()));assert.equal(editor.querySelector('blockquote').textContent,'Before');assert.equal(changes.length,1,'Native intermediate input is not a second history entry');
assert.ok(dom.getSelection().anchorNode.parentElement.closest('blockquote'),'The caret stays inside the new quote for an immediate second click');
await React.act(async()=>applyEditorQuote(current()));assert.equal(editor.innerHTML,'<p>Before</p><p>After</p>');
const styled='<p>Before</p><blockquote><p style="text-align:center"><b>Clear <i>this</i></b><a href="#note/target"> link</a></p></blockquote><p>After</p>';
editor=await render(styled);const p=editor.querySelector('blockquote p'),range=document.createRange();range.selectNodeContents(p);dom.getSelection().removeAllRanges();dom.getSelection().addRange(range);
await React.act(async()=>assert.equal(clearEditorFormatting(current()),true));
assert.equal(editor.textContent,'BeforeClear this linkAfter');assert.equal(editor.querySelectorAll('blockquote,b,i,[style]').length,0);assert.ok(editor.querySelector('a[href="#note/target"]'),'Clearing formatting preserves note targets');
assert.equal(changes.length,1);assert.ok(!editor.innerHTML.includes('<!--'));
await React.act(async()=>applyEditorHistory(current(),'undo'));assert.equal(editor.innerHTML,styled);
editor=await render('<p>Before</p><blockquote>Direct <em>quote</em></blockquote><p>After</p>');select(editor.querySelector('blockquote').firstChild,2);
await React.act(async()=>clearEditorFormatting(current()));assert.equal(editor.innerHTML,'<p>Before</p><p>Direct quote</p><p>After</p>','Clear at a caret normalizes the current quoted paragraph');
editor=await render(original);const ps=editor.querySelectorAll('blockquote p'),boundary=document.createRange();boundary.setStart(ps[0].firstChild,0);boundary.setEnd(ps[1].firstChild,0);dom.getSelection().removeAllRanges();dom.getSelection().addRange(boundary);
await React.act(async()=>applyEditorQuote(current()));assert.equal(editor.querySelector('blockquote').textContent,'Middle linkLast','A zero-length endpoint in the next paragraph does not unquote it');
const before=editor.innerHTML;editor.setAttribute('contenteditable','false');assert.equal(applyEditorQuote(current()),false);assert.equal(editor.innerHTML,before);
await React.act(async()=>root.unmount());
console.log('Quote/Clear passed: repeated toggle, direct quotes, paragraph splitting, caret/selection, links, native event batching, single Undo, boundary safety and read-only guard.');
