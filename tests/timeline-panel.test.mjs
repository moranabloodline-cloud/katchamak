import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://test.local'}).window;
for(const key of ['window','document','Document','DocumentFragment','HTMLElement','HTMLInputElement','HTMLButtonElement','HTMLSelectElement','Element','Node','NodeFilter','DOMParser','Event','MouseEvent','CustomEvent','KeyboardEvent','MutationObserver','getComputedStyle','navigator'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?dom:typeof dom[key]==='function'&&!/^[A-Z]/.test(key)?dom[key].bind(dom):dom[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);globalThis.cancelAnimationFrame=clearTimeout;
dom.matchMedia=()=>({matches:false});dom.HTMLElement.prototype.scrollIntoView=()=>{};
const React=await import('react'),{createRoot}=await import('react-dom/client');
const {NotesSection}=await import('../src/components/kachamak/NotesSection.tsx');
const {useKachamak}=await import('../src/lib/kachamak/store.ts');
const {newNovel}=await import('../src/lib/kachamak/seed.ts');
const {GREGORIAN,dateToMinute,minuteToDate,calendarPreset}=await import('../src/lib/kachamak/story-calendar.ts');
const tick=year=>dateToMinute(GREGORIAN,{year,month:0,day:1,hour:0,minute:0});
const note=(id,title,event,children=[])=>({id,title,kind:'doc',content:'<p>Keep prose</p>',synopsis:'<p>Keep synopsis</p>',notes:'<p>Keep notes</p>',status:'',label:'',children,event,createdAt:1,updatedAt:1});
const a=newNovel('Book A',''),b=newNovel('Book B','');
a.sections.timeline=[note('period','A period',{type:'period',start:tick(1900),end:tick(2000),precision:'year'},[note('event','A event',{type:'event',start:tick(1950),precision:'year'}),note('other','A other',{type:'event',start:tick(1970),precision:'year'})])];
a.sections.codex=[note('link','Codex link')];a.timeline={...a.timeline,display:'axis',groups:[{id:'group',name:'Storyline',color:'#58a6ff'}]};
b.sections.timeline=[note('period','B period',{type:'period',start:tick(1900),end:tick(2100),precision:'year'})];b.timeline={...b.timeline,calendar:calendarPreset('uniform'),display:'axis'};
const untouchedB=JSON.stringify(b),box=document.body.appendChild(document.createElement('div')),root=createRoot(box);
await React.act(async()=>{useKachamak.setState({novels:[a,b],activeNovelId:a.id,activeTab:'timeline',selectedNodeId:'period',paneAId:'period',view:'timeline',rightPanelOpen:true});root.render(React.createElement(NotesSection,{section:'timeline'}));});
const field=label=>document.querySelector(`[aria-label="${label}"]`);
const button=label=>[...document.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===label||el.textContent===label)??[...document.querySelectorAll('button')].find(el=>el.textContent.startsWith(label));
const click=async(el)=>{assert.ok(el);await React.act(async()=>{el.dispatchEvent(new dom.MouseEvent('mousedown',{bubbles:true,button:0}));el.click();});await React.act(async()=>new Promise(resolve=>setTimeout(resolve,5)));};
const change=async(label,value)=>{const el=field(label);assert.ok(el,label);await React.act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?dom.HTMLSelectElement.prototype:dom.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new dom.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
// Regression: a Time System draft must not survive switching to another book.
await click(button('Time System'));await change('Time system name','Unsaved A calendar');
await React.act(async()=>useKachamak.setState({activeNovelId:b.id,selectedNodeId:'period',paneAId:'period'}));
assert.ok(!document.querySelector('[role="dialog"]'),'Book change closes the old calendar draft instead of offering to save it into the new book');
assert.equal(JSON.stringify(b),untouchedB);
await React.act(async()=>useKachamak.setState({activeNovelId:a.id,selectedNodeId:'period',paneAId:'period'}));
const inspector=()=>document.querySelector('[aria-label="Note inspector"]');
const tab=label=>[...inspector().querySelectorAll('[role="tab"]')].find(el=>el.textContent===label);
assert.deepEqual([...inspector().querySelectorAll('[role="tab"]')].map(el=>el.textContent),['Info','Details','Mentions','Timeline']);
assert.equal(document.querySelectorAll('[aria-label="Timeline note settings"]').length,1);
assert.ok(field('Timeline note settings').closest('[role="tabpanel"]'),'The existing editor belongs to the standard panel, not a parallel block');
await click(tab('Timeline'));assert.equal(field('Event title').value,'A period');assert.equal(field('Timeline note type').value,'period');assert.ok(button('End date'));
await change('Event title','Draft period title');
for(const label of ['Info','Details','Mentions']){await click(tab(label));assert.equal(tab(label).getAttribute('aria-selected'),'true');}
await click(tab('Timeline'));assert.equal(field('Event title').value,'Draft period title','Switching inspector tabs preserves unapplied form values');
await click(button('Apply dates'));assert.equal(a.sections.timeline[0].title,'Draft period title');
// Every modal belongs to this book, including group edits and navigation dates.
for(const label of ['Groups','Go to date']){
  await click(button(label));assert.ok(document.querySelector('[role="dialog"]'));
  await React.act(async()=>useKachamak.setState({activeNovelId:b.id,selectedNodeId:'period',paneAId:'period'}));
  assert.ok(!document.querySelector('[role="dialog"]'),label+' closes on book change');
  await React.act(async()=>useKachamak.setState({activeNovelId:a.id,selectedNodeId:'period',paneAId:'period'}));
}
await click(button('Open event A event'));assert.equal(field('Event title').value,'A event');assert.equal(field('Timeline note type').value,'event');assert.equal(button('End date'),undefined);
await click(button('Start date'));await change('Start year','1800');await click(button('Apply date'));await click(button('Apply dates'));
assert.match(field('Timeline note settings').textContent,/must stay within/);assert.equal(a.sections.timeline[0].children[0].event.start,tick(1950));
await click(button('Start date'));await change('Start year','1960');await click(button('Apply date'));await click(button('Apply dates'));
assert.equal(minuteToDate(GREGORIAN,a.sections.timeline[0].children[0].event.start).year,1960);
await click([...document.querySelectorAll('summary')].find(el=>el.textContent==='Appearance & links'));
await change('Event group','group');await click(button('Event icon'));await click(button('Choose icon Time period'));
await click(button('Link a note to event'));await change('Search linked notes','Codex link');await click(button('Codex link'));await click(button('Apply dates'));
const event=a.sections.timeline[0].children[0];assert.equal(event.event.groupId,'group');assert.deepEqual(event.links,['link']);assert.ok(event.icon);assert.equal(event.content,'<p>Keep prose</p>');
// Changes made by another existing editor must not be overwritten by a stale inspector.
await React.act(async()=>useKachamak.getState().updateNode('timeline','event',{event:{...event.event,cardColor:'#123456',groupId:''},links:[]}));
await click(button('Apply dates'));assert.equal(event.event.cardColor,'#123456');assert.equal(event.event.groupId,'');assert.deepEqual(event.links,[]);
for(const mode of ['Timeline','Calendar','Cards','Outline']){const list=field('Chronology view');await click([...list.querySelectorAll('[role="tab"]')].find(el=>el.textContent===mode));assert.equal(inspector().querySelectorAll('[role="tab"]').length,4);assert.equal(field('Event title').value,'A event');}
await click(tab('Info'));assert.ok(document.querySelector('[aria-label="Resize Synopsis and Notes"]'));assert.match(document.body.textContent,/Keep synopsis/);
await click(tab('Details'));assert.match(document.body.textContent,/Created/);await click(tab('Mentions'));
assert.equal(JSON.stringify(b),untouchedB,'All edits stay in one book');
await React.act(async()=>useKachamak.setState({view:'write'}));await click(tab('Timeline'));assert.equal(field('Event title').value,'A event','Timeline notes keep their date tab in Write mode too');
await React.act(async()=>{useKachamak.setState({activeTab:'codex',selectedNodeId:'link',paneAId:'link'});root.render(React.createElement(NotesSection,{section:'codex'}));});
assert.deepEqual([...inspector().querySelectorAll('[role="tab"]')].map(el=>el.textContent),['Info','Details','Mentions']);assert.equal(inspector().querySelector('[aria-selected="true"]').textContent,'Info');
// Switching the existing-note chooser must not carry another note's dates/group.
const {TimelineEventEditor}=await import('../src/components/kachamak/TimelineEventEditor.tsx');
await React.act(async()=>{useKachamak.getState().updateNode('timeline','event',{event:{...event.event,groupId:'group'}});root.render(React.createElement(TimelineEventEditor,{novel:a,calendar:GREGORIAN,section:'timeline',start:tick(1920),onClose(){},onSaved(){}}));});
await change('Find an existing note','A event');await click(button('A event'));
assert.equal(field('Event group').value,'group');
await change('Find an existing note','Codex link');await click(button('Codex link'));
assert.equal(field('Event group').value,'','An undated note must not inherit another note’s group');
await click(button('Start date'));assert.equal(field('Start year').value,'1920');assert.equal(field('Start precision').value,'day');
await React.act(async()=>root.unmount());dom.close();
console.log('Timeline panel passed: single standard inspector/four tabs, complete editor, preserved tab draft, validation and apply, links/group/icon, four modes/Write, note/book isolation and calendar draft closure.');
