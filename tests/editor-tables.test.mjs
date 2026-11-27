import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom = new JSDOM('<main></main>').window;
for (const key of ['window','document','Event','InputEvent','DOMParser']) globalThis[key] = key === 'window' ? dom : dom[key];
const {
  captureTableCell, captureTableInsertion, editEditorTable, insertEditorTable, moveTableCaret, tableCellOptions,
} = await import('../src/lib/kachamak/editor-tables.ts');
const {EditorHistory} = await import('../src/lib/kachamak/editor-history.ts');
const {preparePastedContent} = await import('../src/lib/kachamak/paste-content.ts');

const editor = html => {
  const element = document.createElement('div');
  element.className = 'kachamak-editor';
  element.setAttribute('contenteditable','true');
  element.innerHTML = html;
  document.querySelector('main').append(element);
  return element;
};
const select = (node, offset, to = node, end = offset) => {
  const range = document.createRange();
  range.setStart(node,offset);
  range.setEnd(to,end);
  dom.getSelection().removeAllRanges();
  dom.getSelection().addRange(range);
  return range;
};
const edit = (editor, row, column, action) => {
  const table = editor.querySelector('table');
  const cell = table.rows[row].cells[column];
  assert.equal(editEditorTable(captureTableCell(editor, cell), action), true);
  return editor.querySelector('table');
};
const values = table => [...table.rows].map(row => [...row.cells].map(cell => cell.textContent));

{
  const note = editor('<table><tr><td colspan="2">Title</td></tr><tr><td>Scene</td><td>Act</td></tr></table>');
  const table = note.querySelector('table');
  note.getBoundingClientRect = () => ({width:400});
  table.getBoundingClientRect = () => ({width:180});
  table.rows[0].cells[0].getBoundingClientRect = () => ({width:180});
  for (const cell of table.rows[1].cells) cell.getBoundingClientRect = () => ({width:90});
  const wider = edit(note,1,0,{type:'resize',axis:'column',delta:40,scale:1});
  assert.equal(wider.rows[0].cells[0].style.width,'220px');
  assert.deepEqual([...wider.rows[1].cells].map(cell=>cell.style.width),['130px','90px']);
  wider.rows[1].getBoundingClientRect = () => ({height:25});
  const taller = edit(note,1,0,{type:'resize',axis:'row',delta:30,scale:1});
  assert.equal(taller.rows[1].style.height,'55px');
  const pasted = editor(preparePastedContent(taller.outerHTML,'','rich'));
  assert.equal(pasted.querySelector('tr:last-child').style.height,'55px');
  const fitted = edit(note,1,0,{type:'fit',fit:'contents'});
  assert.equal(fitted.rows[1].cells[0].style.width,'');
  assert.equal(fitted.rows[1].style.height,'55px');
}

// Insertion at a selection keeps the manuscript on both sides and records one edit.
{
  const other = editor('<p>Other pane</p>');
  const source = '<p>Before <strong>selected text</strong> after</p>';
  const note = editor(source);
  const history = new EditorHistory();
  const types = [];
  history.reset(note);
  note.addEventListener('beforeinput',() => history.before(note));
  note.addEventListener('input',event => {
    types.push(event.inputType);
    history.record(note,event.inputType,event.data);
  });
  const text = note.querySelector('strong').firstChild;
  const range = select(text,0,text,8);
  assert.equal(insertEditorTable(captureTableInsertion(range),{rows:2,columns:5}),true);
  assert.equal(note.firstChild.innerHTML,'Before <strong>selected</strong>');
  assert.equal(note.lastChild.innerHTML,'<strong> text</strong> after');
  const table = note.querySelector('table');
  assert.deepEqual(values(table),Array.from({length:2},()=>Array(5).fill('')));
  assert.equal(dom.getSelection().focusNode,table.rows[0].cells[0]);
  assert.equal(moveTableCaret(note,false),true);
  assert.equal(dom.getSelection().focusNode,table.rows[0].cells[1]);
  assert.deepEqual(types,['insertTable']);
  assert(history.step(note,'undo'));
  assert.equal(note.innerHTML,source);
  assert(history.step(note,'redo'));
  assert.equal(note.querySelectorAll('td').length,10);
  assert.equal(other.innerHTML,'<p>Other pane</p>');
}

// Disjoint table sections and existing rowspan/colspan survive changes at logical boundaries.
{
  const note = editor('<table><thead><tr><th colspan="3">Heading</th></tr></thead><tbody>'+
    '<tr><td rowspan="2"><em>Spanning</em></td><td colspan="2">First</td></tr><tr><td>Second</td><td>Third</td></tr></tbody></table>');
  const target = captureTableCell(note,note.querySelector('tbody td'));
  assert.deepEqual(tableCellOptions(target),{structural:true,shift:false,rows:2,columns:1});
  assert.equal(editEditorTable(target,{type:'deleteCell',axis:'row'}),false);
  let table = edit(note,2,1,{type:'insertColumn',edge:'before'});
  assert.equal(table.rows[0].cells[0].colSpan,4);
  assert.equal(table.rows[1].cells[1].colSpan,3);
  assert.deepEqual(values(table)[2],['Second','','Third']);
  table = edit(note,1,1,{type:'insertRow',edge:'after'});
  assert.equal(table.rows[1].cells[0].rowSpan,3);
  assert.deepEqual(values(table)[2],['','','']);
  table = edit(note,1,1,{type:'deleteRow'});
  assert.deepEqual(values(table),[['Heading'],['Spanning','','',''],['Second','','Third']]);
  assert.equal(table.rows[1].cells[0].innerHTML,'<em>Spanning</em>');
  assert.equal(table.rows[1].cells[0].rowSpan,2);
}

// Splitting a plain cell creates matching tracks. Other cells keep their text and span the new tracks.
{
  const note = editor('<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>');
  const table = edit(note,0,0,{type:'split',size:{rows:2,columns:2}});
  assert.deepEqual(values(table),[['A','','B'],['',''],['C','D']]);
  assert.equal(table.rows[0].cells[2].rowSpan,2);
  assert.equal(table.rows[2].cells[0].colSpan,2);
}

// Inserting and removing cells shifts only the affected line, with blank slots elsewhere.
{
  const note = editor('<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>');
  assert.deepEqual(values(edit(note,0,0,{type:'insertCell',axis:'column'})),[['','A','B'],['C','D','']]);
  assert.deepEqual(values(edit(note,0,0,{type:'deleteCell',axis:'column'})),[['A','B',''],['C','D','']]);
  assert.deepEqual(values(edit(note,0,1,{type:'insertCell',axis:'row'})),[['A','',''],['C','B',''],['','D','']]);
  assert.deepEqual(values(edit(note,0,1,{type:'deleteCell',axis:'row'})),[['A','B',''],['C','D',''],['','','']]);
}

// Commands refuse stale selections. Table layout and alignment can round-trip through paste.
{
  const note = editor('<p>Initial</p><table><tr><td>A</td></tr></table><p>After</p>');
  const table = note.querySelector('table');
  const target = captureTableCell(note,table.rows[0].cells[0]);
  table.rows[0].cells[0].textContent='Changed';
  assert.equal(editEditorTable(target,{type:'deleteTable'}),false);
  edit(note,0,0,{type:'properties',properties:{fit:'fixed',width:68,alignment:'center',borders:false}});
  edit(note,0,0,{type:'align',horizontal:'right'});
  edit(note,0,0,{type:'align',vertical:'bottom'});
  const pasted = new JSDOM(preparePastedContent(note.innerHTML,'')).window.document;
  assert.equal(pasted.querySelector('table').style.width,'68%');
  assert.equal(pasted.querySelector('table').style.tableLayout,'fixed');
  assert.equal(pasted.querySelector('table').getAttribute('data-editor-table-borderless'),'true');
  assert.equal(pasted.querySelector('td').style.textAlign,'right');
  assert.equal(pasted.querySelector('td').style.verticalAlign,'bottom');
  assert.equal(edit(note,0,0,{type:'deleteTable'}),null);
  assert.equal(note.innerHTML,'<p>Initial</p><p>After</p>');
}

console.log('Editor tables passed for lossless insertion, history, merged cells, shifts, sizing, paste and stale targets.');
