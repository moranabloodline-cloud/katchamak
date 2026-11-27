import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>').window;globalThis.window=dom;globalThis.document=dom.document;globalThis.DOMParser=dom.DOMParser;
const {preparePastedContent,insertHeadingFragment}=await import('../src/lib/kachamak/paste-content.ts');
const root=document.createElement('div');
root.innerHTML=preparePastedContent('<style>.source { margin-bottom:18pt; font-family:Georgia; color:red; background:white; }</style><p class="source"><b>First</b></p><p>&nbsp;</p><p style="text-align:center; margin-left:36pt; color:black;background-color:white"><i>Last</i></p><ul><li>Item</li></ul>','');
assert.equal(root.querySelectorAll('p').length,3);assert.ok(root.querySelectorAll('p')[1].querySelector('br'));
assert.ok(root.querySelector('b'));assert.ok(root.querySelector('i'));assert.ok(root.querySelector('li'));
assert.equal(root.querySelector('p').style.marginBottom,'18pt');assert.equal(root.querySelector('p').style.fontFamily,'');assert.equal(root.querySelectorAll('p')[2].style.textAlign,'');assert.equal(root.querySelectorAll('p')[2].style.marginLeft,'');
assert.ok(!/color:|background|class=/.test(root.innerHTML));
root.innerHTML=preparePastedContent('','First\r\n\r\n\r\nLast');assert.deepEqual([...root.children].map(p=>p.textContent),['First','','','Last']);assert.equal(root.querySelectorAll('p > br').length,2);
root.innerHTML=preparePastedContent('','  <First>  &\tLast  ');
assert.equal(root.textContent,'  <First>  &\tLast  ');assert.equal(root.firstChild.style.whiteSpace,'pre-wrap');
root.innerHTML=preparePastedContent('<style>.huge {font: bold 15cm Georgia; line-height:8; width:50cm; color:red; text-align:right}</style><div class="huge"><h3 style="font-size:15cm"><font face="Georgia" size="7">Heading</font></h3><p><span class="huge" style="font-style:italic;text-decoration:underline">Body</span><br>Next</p><div><p></p><p></p></div><hr><table><tr><td colspan="2">Cell</td></tr></table><ol start="3"><li value="5"><a href="#note/target" data-katchamak-note="target">Link</a></li></ol></div>','');
assert.equal(root.querySelector('h3').textContent,'Heading');assert.equal(root.querySelector('span').style.fontWeight,'bold');
assert.equal(root.querySelector('span').style.fontStyle,'italic');assert.equal(root.querySelector('span').style.textDecorationLine,'underline');
assert.equal(root.querySelectorAll('p > br').length,3);assert.ok(root.querySelector('hr'));assert.ok(root.querySelector('td[colspan="2"]'));
assert.ok(root.querySelector('ol[start="3"] li[value="5"] a[href="#note/target"]'));
assert.doesNotMatch(root.innerHTML,/15cm|Georgia|font-size|font-family|line-height|text-align|width:|color:|face=|size=|margin-bottom/);
root.innerHTML=preparePastedContent('<p class="MsoHeading3">Word</p><div role="heading" aria-level="2">Accessible</div><p style="font-size:100px">Ordinary</p>','');
assert.deepEqual([...root.children].map(el=>el.tagName),['H3','H2','P']);
assert.equal(preparePastedContent('<style>p {color:red}</style>','Fallback'),'Fallback');
const clean=preparePastedContent('<script>alert(1)</script><p onclick="bad()" style="background:url(https://bad.test);color:red">Safe<a href="javascript:bad()">link</a></p>','');assert.ok(!/onclick|javascript:|<script|url\(/.test(clean));
const editor=document.body.appendChild(document.createElement('div'));
const place=(start,from,end=start,to=from)=>{
  const range=document.createRange();range.setStart(start,from);range.setEnd(end,to);
  dom.getSelection().removeAllRanges();dom.getSelection().addRange(range);
};
const pasted=preparePastedContent('<h3 style="font-size:66px">Heading</h3><p>First<br>line</p><p></p><p>Last</p>\n','');
editor.innerHTML='<p><b style="font-size:36px">LeftRight</b></p>';
place(editor.querySelector('b').firstChild,4);
assert.ok(insertHeadingFragment(editor,pasted));
assert.deepEqual([...editor.children].map(el=>el.tagName),['P','H3','P','P','P','P']);
assert.deepEqual([...editor.querySelectorAll('b')].map(el=>el.outerHTML),['<b style="font-size:36px">Left</b>','<b style="font-size:36px">Right</b>']);
assert.equal(editor.querySelectorAll('p > br').length,2);
assert.equal(dom.getSelection().anchorNode.textContent,'Last');
editor.innerHTML='<p>ab</p><p>replace me</p><p>cd</p>';
place(editor.firstChild.firstChild,1,editor.lastChild.firstChild,1);
assert.ok(insertHeadingFragment(editor,pasted));
assert.deepEqual([...editor.children].map(el=>el.textContent),['a','Heading','Firstline','','Last','d']);
editor.innerHTML='<ul><li><span style="font-size:36px">abc</span></li></ul>';
place(editor.querySelector('span').firstChild,1);
assert.ok(insertHeadingFragment(editor,pasted));
assert.equal(editor.querySelector('h3').parentElement.tagName,'LI');
assert.deepEqual([...editor.querySelectorAll('li > span')].map(el=>el.textContent),['a','bc']);
editor.innerHTML='<p><br></p>';
place(editor.firstChild,0);
assert.ok(insertHeadingFragment(editor,'<h3>Only</h3>'));
assert.equal(editor.innerHTML,'<h3>Only</h3>');
const editorial='<style>.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}th{padding:6px}</style>'+
  '<h1>Research</h1><p style="line-height:1.6;text-align:center;background:url(https://example.test/no)">Source text</p>'+
  '<div class="grid"><div data-d-component="grid-item"><h2>Locations</h2></div><div><p>Photos</p></div></div>'+
  '<aside><p>Keep the original figures.</p></aside><figure><figcaption>Coastline</figcaption></figure>'+
  '<table><colgroup><col width="40%"><col width="60%"></colgroup><tr><th scope="col">Location</th><th>County</th></tr>'+
  '<tr><td colspan="2">Bantry</td></tr></table><progress value="1" max="4" aria-label="Progress"></progress>';
root.innerHTML=preparePastedContent(editorial,'','rich');
assert.equal(root.querySelector('[data-draftopus-layout="grid"]').getAttribute('data-draftopus-columns'),'2');
assert.equal(root.querySelector('[data-draftopus-layout="card"] h2').textContent,'Locations');
assert.equal(root.querySelector('figcaption').textContent,'Coastline');
assert.equal(root.querySelector('p').style.lineHeight,'1.6');
assert.equal(root.querySelector('p').style.textAlign,'center');
assert.equal(root.querySelector('th').style.width,'40%');
assert.equal(root.querySelector('th').style.padding,'6px');
assert.equal(root.querySelector('td').colSpan,2);
assert.equal(root.querySelector('[data-draftopus-layout="bar"]').style.width,'25%');
assert.doesNotMatch(root.innerHTML,/background|example\.test\/no|class="grid"/);
root.innerHTML=preparePastedContent(editorial,'','match');
assert.ok(root.querySelector('table')&&root.querySelector('h1'));
assert.doesNotMatch(root.innerHTML,/data-draftopus-layout|text-align: center/);
assert.equal(preparePastedContent(editorial,'<heading>','plain'),'&lt;heading&gt;');
const {formatEditorMedia,formatEditorMediaHtml}=await import('../src/lib/kachamak/editor-media.ts');
const {indexText}=await import('../src/lib/kachamak/note-links.ts');
const {prepareEditorClipboard}=await import('../src/lib/kachamak/editor-clipboard.ts');
const imageLink='https://images.openai.com/static-rsc-4/photo_test?purpose=inline';
const sourceLink='https://www.example.test/reading-room';
const oldPaste='<h3>Rural life</h3><div><div><a href="'+imageLink+'">A rural photograph</a><div><a href="'+sourceLink+'">example.test</a></div></div></div>';
const prose='<p>Follow <a href="https://example.test/detail.png">this reference image</a> to compare dates.</p><p><a href="#note/cork">Cork</a></p>';
root.innerHTML=oldPaste+prose;
const coordinates=indexText(root).text;
formatEditorMedia(root);
assert.equal(root.querySelector('img').getAttribute('src'),imageLink);
assert.equal(root.querySelector('img').getAttribute('referrerpolicy'),'no-referrer');
assert.equal(root.querySelector('img').getAttribute('loading'),'lazy');
assert.equal(root.querySelector('[data-draftopus-media-credit]').getAttribute('href'),sourceLink);
assert.equal(root.querySelector('[data-draftopus-media-picture]').textContent,'');
assert.equal(root.querySelector('p a').textContent,'this reference image');
assert.equal(indexText(root).text,coordinates,'Existing note link coordinates survive formatting');
assert.equal(formatEditorMediaHtml(root.innerHTML),root.innerHTML);
root.innerHTML=oldPaste+'<div><figure><img data-draftopus-image="gallery:original" alt="A rural photograph"></figure></div>'+prose;
formatEditorMedia(root);
assert.equal(root.querySelectorAll('img').length,1,'Reuse a copied photo immediately beneath its source');
assert.ok(root.querySelector('[data-draftopus-media-picture] img[data-draftopus-image="gallery:original"]'));
root.innerHTML=oldPaste+'<p><img data-draftopus-image="gallery:unrelated" alt="image.png"></p>';
formatEditorMedia(root);
assert.equal(root.querySelectorAll('img').length,2,'Independent photographs retain their own frame');
const plain=new AbortController().signal;
const pastedMedia=await prepareEditorClipboard({html:oldPaste+prose,text:'',markdown:'',files:[]},'rich',[],plain);
assert.match(pastedMedia.html,/data-draftopus-media-picture/);
const imageGroup='<div><div><div><a href="'+imageLink+'">First photo</a></div></div><div><div><a href="'+imageLink+'-next">Second photo</a><div>12</div></div></div></div>';
root.innerHTML=imageGroup;
const imageGroupText=indexText(root).text;
formatEditorMedia(root);
assert.equal(root.querySelectorAll('[data-draftopus-media-picture] img').length,2);
assert.equal(root.querySelector('div[hidden]').textContent,'12');
assert.equal(indexText(root).text,imageGroupText,'Hiding the copied counter preserves text coordinates');
assert.equal(formatEditorMediaHtml(root.innerHTML),root.innerHTML);
const pastedGroup=await prepareEditorClipboard({html:imageGroup,text:'',markdown:'',files:[]},'rich',[],plain);
assert.equal(pastedGroup.html.match(/data-draftopus-media-picture/g)?.length,2,'Images in a copied group are inserted on the first paste');
const pastedAddress=await prepareEditorClipboard({html:'',text:imageLink,markdown:'',files:[]},'rich',[],plain);
assert.match(pastedAddress.html,/data-draftopus-media="linked"/);
const plainAddress=await prepareEditorClipboard({html:'',text:imageLink,markdown:'',files:[]},'plain',[],plain);
assert.equal(plainAddress.html,imageLink);
const {formatPastedReports}=await import('../src/lib/kachamak/paste-layout.ts');
const sampleMetrics='<div><div><span>Market average</span><h1><strong>€2,239</strong></h1></div>'+
  '<div><span>Available homes</span><h1><strong>2,795</strong></h1><span>Reported this month</span></div></div>';
const rentRows=[['North','€2,563','94.9259%'],['East','€2,343','86.7778%'],['South','€2,268','84%']];
const rentalChart=keepBars=>'<div>'+rentRows.map(([name,value,width])=>'<div><div><p>'+name+
  '</p><div></div><p>'+value+'</p></div>'+(keepBars?'<div style="height:13px"><div style="height:13px;width:'+width+
  ';background-color:rgb(67,135,101)"></div></div>':'')+'</div>').join('')+'</div>';
const photoAndText='<div><div><a href="'+imageLink+'">Photo source</a></div>'+
  '<div><p><span><strong>Townhouses</strong></span></p><p>Buildings along the street.</p></div></div>';
const reportHead='<h3>Rental market</h3>'+sampleMetrics+'<span>Report note.</span><p><strong>Market comparison</strong></p>';
const chartWidths=()=>Array.from(root.querySelectorAll('[data-draftopus-layout="bar-track"] > div')).map(bar=>bar.style.width);
root.innerHTML=preparePastedContent(reportHead+rentalChart(true)+photoAndText,'','rich');
assert.equal(root.querySelector('[data-draftopus-layout="grid"]').getAttribute('data-draftopus-columns'),'2');
assert.equal(root.querySelectorAll('[data-draftopus-layout="metric"]').length,2);
assert.deepEqual(chartWidths(),rentRows.map(row=>row[2]),'Source widths survive a formatted paste');
assert.ok(root.querySelector('[data-draftopus-layout="photo-row"] a'));
const formattedReport=root.innerHTML;
root.innerHTML=preparePastedContent(formattedReport,'','rich');
assert.deepEqual(chartWidths(),rentRows.map(row=>row[2]),'Copying within Draftopus preserves the original scale');
root.innerHTML='<div data-draftopus-paste>'+reportHead+rentalChart(false).replaceAll('<div></div>','')+photoAndText+'</div>';
const legacyText=indexText(root).text;
formatPastedReports(root);
assert.deepEqual(chartWidths(),rentRows.map(row=>row[2]),'Old repeated label/value rows get a comparable scale');
assert.equal(indexText(root).text,legacyText,'Reconstructing a report leaves its text and link coordinates intact');
assert.ok(root.querySelector('[data-draftopus-layout="photo-row"]'));
const restoredReport=root.innerHTML;
formatPastedReports(root);
assert.equal(root.innerHTML,restoredReport,'Restoration is stable across repeated opening');
root.innerHTML=preparePastedContent(reportHead+rentalChart(true),'','match');
assert.doesNotMatch(root.innerHTML,/data-draftopus-layout/);
root.innerHTML='<div data-draftopus-paste><p>Ordinary notes</p>'+rentalChart(false).replaceAll('<div></div>','')+'</div>';
formatPastedReports(root);
assert.equal(chartWidths().length,0,'Ordinary repeated paragraphs stay as written');
const webLayout='<style>.catalog{display:grid;grid-template-columns:minmax(0,1fr) 2fr;gap:12px}</style>'+
  '<section class="catalog"><div style="grid-column:span 2;padding:8px;border:1px solid #444">Overview</div>'+
  '<div style="display:flex;flex-direction:row-reverse;justify-content:space-between;column-gap:10px">'+
  '<div style="flex:0 1 30%;max-width:126px;aspect-ratio:4 / 3;background:#556677;position:fixed">Left</div>'+
  '<div style="display:flex;flex-direction:column;gap:5px"><p>Right <kbd>R</kbd></p><dl><dt>Harbour</dt><dd>Location</dd></dl></div></div>'+
  '<details open><summary>Details</summary><p>More information</p></details></section>';
root.innerHTML=preparePastedContent(webLayout,'','rich');
const webGrid=root.querySelector('[data-draftopus-flow="grid"]');
assert.equal(webGrid.style.getPropertyValue('--draftopus-paste-tracks'),'minmax(0px, 1fr) 2fr');
assert.equal(webGrid.style.columnGap,'12px');
assert.equal(webGrid.firstElementChild.style.gridColumn,'span 2');
const webRow=webGrid.querySelector('[data-draftopus-flow="row"]');
assert.equal(webRow.style.flexDirection,'row-reverse');
assert.equal(webRow.firstElementChild.style.flexBasis,'30%');
assert.equal(webRow.firstElementChild.style.maxWidth,'126px');
assert.equal(webRow.firstElementChild.style.aspectRatio,'4 / 3');
assert.equal(webRow.querySelector('[data-draftopus-flow="column"]').style.rowGap,'5px');
assert.ok(webGrid.querySelector('details[open] summary') && webGrid.querySelector('dl dt'));
assert.doesNotMatch(root.innerHTML,/position: fixed|class="catalog"|<style/);
root.innerHTML=preparePastedContent(root.innerHTML,'','rich');
assert.equal(root.querySelector('[data-draftopus-flow="grid"]').style.getPropertyValue('--draftopus-paste-tracks'),'minmax(0px, 1fr) 2fr');
const copiedComponents='<div data-d-component="row" style="gap:calc(var(--spacing, 0.25rem) * 3)">'+
  '<p data-d-component="text" data-d-size="sm">Label</p><div data-d-component="spacer"></div>'+
  '<div style="width:37%;height:13px;background:rgb(67,135,101)"></div></div>';
root.innerHTML=preparePastedContent(copiedComponents,'','rich');
assert.equal(root.querySelector('[data-draftopus-flow="row"]').style.columnGap,'0.75rem');
assert.ok(root.querySelector('[data-draftopus-flow="spacer"]'));
assert.equal(root.querySelector('[data-draftopus-size]').style.getPropertyValue('--draftopus-paste-size'),'.9em');
assert.equal(root.querySelector('[data-draftopus-layout="bar"]').style.width,'37%');
const fromMarkdown=await prepareEditorClipboard({html:'',text:'# Imported heading\n\nA paragraph.',markdown:'',files:[]},'rich',[],plain);
assert.match(fromMarkdown.html,/<h1>Imported heading<\/h1>/);
const dashDialogue=await prepareEditorClipboard({html:'',text:'- One line of dialogue.',markdown:'',files:[]},'rich',[],plain);
assert.equal(dashDialogue.html,'- One line of dialogue.');
const styledHtml='<style>.field{color:#912755;background-color:#fff1d0;font-family:Georgia, serif;letter-spacing:.04em}</style>'+
  '<h2 style="font-size:22px;font-weight:650;margin-block-start:18px">Field report</h2>'+
  '<p class="field" style="font-size:17px;line-height:26px;margin-bottom:14px;text-indent:12px">Observations</p>'+
  '<span style="color:var(--ink,#8b2233)">Caption</span>'+
  '<div role="separator" style="border-top:2px dashed #e04a57;margin-bottom:12px"></div>';
root.innerHTML=preparePastedContent(styledHtml,'','rich');
const styledText=root.querySelector('p');
assert.equal(styledText.style.color,'rgb(145, 39, 85)');
assert.equal(styledText.style.backgroundColor,'rgb(255, 241, 208)');
assert.equal(styledText.style.fontFamily,'Georgia, serif');
assert.equal(styledText.style.getPropertyValue('--draftopus-paste-size'),'17px');
assert.equal(styledText.style.lineHeight,'26px');
assert.equal(styledText.style.marginBottom,'14px');
assert.equal(styledText.style.textIndent,'12px');
assert.equal(root.querySelector('h2').style.fontWeight,'650');
assert.equal(root.querySelector('h2').style.marginTop,'18px');
assert.equal(root.querySelector('hr').style.borderTopStyle,'dashed');
assert.equal(root.querySelector('span').style.color,'rgb(139, 34, 51)');
const richStyled=root.innerHTML;
root.innerHTML=preparePastedContent(richStyled,'','rich');
assert.equal(root.querySelector('p').style.fontFamily,'Georgia, serif');
assert.equal(root.querySelector('p').style.backgroundColor,'rgb(255, 241, 208)');
root.innerHTML=preparePastedContent(styledHtml,'','match');
assert.equal(root.querySelector('p').style.color,'');
assert.equal(root.querySelector('p').style.fontFamily,'');
const composed='<div data-theme="dark"><h3 data-d-component="title" data-d-text-flow data-d-size="md">A collection</h3>'+
  '<span data-d-component="caption" data-d-text-flow data-d-size="lg">Caption</span></div>';
root.innerHTML=preparePastedContent(composed,'','rich');
assert.ok(root.querySelector('[data-draftopus-source-theme="dark"]'));
assert.equal(root.querySelector('h3').style.getPropertyValue('--draftopus-paste-size'),'16px');
assert.equal(root.querySelector('span').style.getPropertyValue('--draftopus-paste-size'),'14px');
const crop='<style>.cover{width:100%;height:100%;aspect-ratio:5 / 3;object-fit:cover;object-position:50% 100%;border-radius:var(--dil-radius-xl)}</style>'+
  '<figure><img class="cover" data-draftopus-image="gallery:photo" alt="Landscape"><figcaption>Landscape</figcaption></figure>';
const preparedCrop=await prepareEditorClipboard({html:crop,text:'',markdown:'',files:[]},'rich',
  [{id:'photo',kind:'image',name:'Landscape',parentId:null,image:'data:image/png;base64,AA=='}],plain);
root.innerHTML=preparedCrop.html;
assert.equal(root.querySelector('img').style.objectPosition,'50% 100%');
assert.equal(root.querySelector('img').style.aspectRatio,'5 / 3');
assert.equal(root.querySelector('img').style.borderRadius,'16px');
assert.equal(root.querySelector('img').getAttribute('data-draftopus-image'),'gallery:photo');
console.log('Paste formatting: empty lines, local typography, HTML/Word heading levels, original paragraph gaps, soft breaks, emphasis, links, tables, lists and whitespace passed.');
