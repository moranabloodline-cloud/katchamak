import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://test.local'}).window;
for(const key of ['window','document','Event','CustomEvent'])globalThis[key]=key==='window'?dom:dom[key];
const {insertTypedDivider}=await import('../src/lib/kachamak/editor-divider.ts');
const {applyEditorHistory}=await import('../src/lib/kachamak/editor-blocks.ts');
const editor=document.createElement('div');editor.className='kachamak-editor';editor.contentEditable='true';document.body.append(editor);
const other=document.createElement('div');other.className='kachamak-editor';other.innerHTML='<p>Other pane</p>';document.body.append(other);
const caret=(el,offset)=>{const r=document.createRange();r.setStart(el,offset??el.length);r.collapse(true);const s=dom.getSelection();s.removeAllRanges();s.addRange(r);return r;};
let commands=[];document.execCommand=(name,_unused,html)=>{commands.push(name);if(name==='insertHTML'){const r=dom.getSelection().getRangeAt(0);r.deleteContents();r.insertNode(r.createContextualFragment(html));}return true;};
editor.innerHTML='<p>Before</p><p>---</p><p>After</p>';caret(editor.children[1].firstChild);
assert.equal(insertTypedDivider(editor),true);assert.equal(editor.querySelectorAll('hr').length,1);assert.ok(editor.textContent.includes('Before'));assert.ok(editor.textContent.includes('After'));assert.ok(!editor.textContent.includes('---'));assert.equal(other.innerHTML,'<p>Other pane</p>');
for(const html of ['<p>word --- word</p>','<p>----</p>','<h2>---</h2>','<pre>---</pre>','<p><code>---</code></p>','<ul><li>word --- word</li></ul>']){editor.innerHTML=html;const walker=document.createTreeWalker(editor,dom.NodeFilter.SHOW_TEXT);const text=walker.nextNode();caret(text);assert.equal(insertTypedDivider(editor),false,html);assert.equal(editor.innerHTML,html);}
for(const html of ['<ul><li>---</li></ul>','<ul><li><p><b>---</b></p></li></ul>','<ol start="4"><li>Before</li><li>---</li><li>After</li></ol>','<ol reversed><li>Before</li><li>---</li><li>After</li></ol>']){
 editor.innerHTML=html;const marker=[...editor.querySelectorAll('li')].find(item=>item.textContent==='---');const walker=document.createTreeWalker(marker,dom.NodeFilter.SHOW_TEXT);caret(walker.nextNode());
 assert.equal(insertTypedDivider(editor),true,html);assert.equal(editor.querySelectorAll('hr').length,1);assert.ok(!editor.querySelector('li hr'),'The rule exits its list item');assert.equal(editor.querySelector('hr').nextElementSibling.tagName,'P');
 if(html.includes('Before')){assert.equal(editor.querySelectorAll('li').length,2);assert.equal(editor.querySelector('ol').getAttribute('start'),html.includes('reversed')?'3':'4');assert.equal(editor.querySelectorAll('ol')[1].getAttribute('start'),html.includes('reversed')?'1':'6');}
}
editor.innerHTML='<div>Before<br><b>---</b><br>After</div>';caret(editor.querySelector('b').firstChild);assert.equal(insertTypedDivider(editor),true,'Soft-break lines are independent');assert.ok(editor.textContent.includes('Before')&&editor.textContent.includes('After'));assert.equal(editor.querySelectorAll('hr').length,1);
editor.innerHTML='';const wrapper=document.createElement('p'),list=document.createElement('ul');list.innerHTML='<li>Before</li><li>---</li>';wrapper.append(list);editor.append(wrapper);caret(list.lastChild.firstChild);assert.equal(insertTypedDivider(editor),true);assert.ok(!editor.querySelector('p ul,p hr'),'Browser-created paragraph wrappers split into valid block siblings');assert.ok(editor.textContent.includes('Before'));
editor.innerHTML='<p>---</p>';caret(editor.firstChild.firstChild,1);assert.equal(insertTypedDivider(editor),false,'Do not convert from the middle of a line');
editor.innerHTML='---';caret(editor.firstChild);assert.equal(insertTypedDivider(editor),true,'Bare first line is supported');
editor.innerHTML='<p>Undo target</p>';const range=caret(editor.firstChild.firstChild);let changes=0;
editor.addEventListener('kachamak-history',event=>{changes++;event.detail.applied=true;});
assert.equal(applyEditorHistory(range,'undo'),true);assert.equal(applyEditorHistory(range,'redo'),true);assert.equal(changes,2,'History is routed to this editor');
assert.equal(applyEditorHistory(null,'undo'),false);editor.remove();assert.equal(applyEditorHistory(range,'undo'),false,'Disconnected editor is never a global undo target');
console.log('Divider passed: isolated paragraphs and soft lines, bullet/numbered lists, valid block wrappers, surrounding text, prose/code/heading guards, caret boundary and editor-scoped history.');
