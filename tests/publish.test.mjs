import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {unzipSync,strFromU8} from 'fflate';
const dom = new JSDOM('<!doctype html><html><body></body></html>',{url:'https://test.local'}).window;
for (const key of ['window','document','NodeFilter','XMLSerializer','HTMLElement','HTMLImageElement']) Object.defineProperty(globalThis,key,{configurable:true,value:dom[key]});
const {useKachamak}=await import('../src/lib/kachamak/store.ts');
const {workspaceTabs}=await import('../src/lib/kachamak/workspace-tabs.ts');
const {houseStyles,houseStyleCatalogVersion}=await import('../src/lib/kachamak/house-styles.ts');
const {genreSamples}=await import('../src/lib/kachamak/genre-samples.ts');
const {baseStyle,trims,validBookStyle}=await import('../src/lib/kachamak/book-style.ts');
const {publication,htmlEdition,binderChapterChoices,prepareChapterSample,chapterSpecimen,projectOpeningSample,projectStyleProof}=await import('../src/lib/kachamak/publication.ts');
const {epubEdition}=await import('../src/lib/kachamak/publish-export.ts');
const {wordEdition}=await import('../src/lib/kachamak/publish-word.ts');
const {validCloudLibrary}=await import('../src/lib/kachamak/cloud-write-validation.mjs');
const state=()=>useKachamak.getState(), book=()=>state().novels[0];
state().createNovel('River & Reed','Ana Petrović');
const ch=state().addNode('binder',null,'chapter','Crossing');
state().updateNode('binder',ch,{content:'<p>First <strong>four</strong> words stay here &amp; travel.</p><hr><p>Last line.</p><ul><li>Harbour</li></ul><script>bad()</script>'});
// Preview selection follows the visible Binder even when an edition excludes or reorders a chapter.
{
  const first=book().sections.binder[0];
  const note=(id,kind,title,content,children=[])=>({...first,id,kind,title,content,children});
  const longScene=note('scene','scene','Arrival','<p><em>Fresh rain</em> on the quay.</p><h3>At dusk</h3><p>'+'The ferry returned. '.repeat(400)+'</p><p>Final sentence.</p>');
  const following=note('next','chapter','Other chapter','<p>Other chapter body</p>');
  const group=note('part','act','Part II','',[note('chosen','chapter','Light & shadow','<p>First line.</p>',[longScene,following]), {...following,id:'secret',hidden:true}]);
  const namedCopy=note('copy','doc','Arrival','<p>Another arrival.</p>');
  const fixture={...book(),language:'Serbian',sections:{...book().sections,binder:[first,group,namedCopy]},publishManuscript:{order:['copy',first.id],included:['copy',first.id]}};
  const before=JSON.stringify(fixture);
  const choices=binderChapterChoices(fixture);
  assert.deepEqual(choices.map(c=>c.node.id),[first.id,'chosen','scene','next','copy']);
  assert.deepEqual(choices.filter(c=>c.node.title==='Arrival').map(c=>c.path),['Part II / Light & shadow / Arrival','Arrival']);
  const {manuscriptEntries}=await import('../src/lib/kachamak/publish-manuscript.ts');
  const auto=projectOpeningSample(fixture,manuscriptEntries(fixture),choices);
  assert.equal(auto.title,'Arrival');
  assert(auto.full.includes('Another arrival.'));
  const empty={...fixture,publishManuscript:{included:[]}};
  assert.equal(projectOpeningSample(empty,manuscriptEntries(empty),choices),null);
  const onlyParent={...fixture,publishManuscript:{included:['chosen']}};
  const parentSample=projectOpeningSample(onlyParent,manuscriptEntries(onlyParent),choices);
  assert(parentSample.full.includes('First line.')&&!parentSample.full.includes('Fresh rain'));
  for(const {style} of houseStyles){
    assert(projectStyleProof(fixture,style,'Chapter opening',auto,true).sections[0].html.includes('Another arrival.'));
    assert(projectStyleProof(empty,style,'Chapter opening',null,true).sections[0].html.includes(fixture.title.replace('&','&amp;')));
    assert.equal(projectStyleProof(fixture,style,'Scene break',auto).sections.length,0);
    assert.equal(projectStyleProof(fixture,style,'Special blocks',auto).sections.length,0);
  }
  const sample=prepareChapterSample(fixture,choices[1]);
  assert.equal(sample.number,2);
  assert(!sample.excerpt.includes('Final sentence.')&&sample.full.includes('Final sentence.'));
  for(const {style} of houseStyles){
    const miniature=chapterSpecimen(fixture,style,sample,true);
    const detail=chapterSpecimen(fixture,style,sample,false);
    const {html,title}=miniature.sections[0];
    assert.equal(title,'Light & shadow');assert.equal(miniature.lang,'sr');
    assert(html.includes('<em>Fresh rain</em>')&&html.includes('<h3>At dusk</h3>')&&html.includes('role="separator"')&&html.includes('Light &amp; shadow'));
    assert(!html.includes('publish-samples/')&&!detail.sections[0].html.includes('Other chapter body'));
    assert(detail.sections[0].html.includes('Final sentence.'));
    const exported=publication(fixture,style).sections.filter(s=>s.kind==='chapter');
    assert.deepEqual(exported.map(s=>s.title),['Arrival',first.title]);
  }
  assert.equal(JSON.stringify(fixture),before);
  assert.deepEqual(binderChapterChoices({...fixture,sections:{binder:[]}}),[]);
}
const original=JSON.stringify(book().sections.binder);
assert(!workspaceTabs(book()).some(t=>t.key==='publish'));
state().setTab('publish');
assert(workspaceTabs(book()).some(t=>t.key==='publish'));
const folder=state().addNode('publish',null,'folder','Fiction');
const sub=state().addNode('publish',folder,'folder','Custom');
const style={...baseStyle,trim:'A5',initial:'Drop cap',smallCaps:true,dedication:'For M.',pages:['Title page','Dedication','Contents','Colophon']};
const id=state().addNode('publish',sub,{bookStyle:style},'River');
assert(id);assert.equal(state().addNode('publish',id,'folder'),null);
state().duplicateNode('publish',id);
assert.equal(book().sections.publish[0].children[0].children.length,2);
state().moveNodeTo('publish',id,'publish',null);
assert(book().sections.publish.some(n=>n.id===id));
assert(validCloudLibrary({novels:[JSON.parse(JSON.stringify(book()))],collections:[]}));
assert(!validBookStyle({...style,inner:-2}));assert(!validBookStyle({...style,heading:'url(bad)'}));
const model=publication(book(),style);
assert.deepEqual(model.sections.map(s=>s.title),['Title page','Dedication','Contents','Crossing','Colophon']);
const html=htmlEdition(model,style);
assert(html.includes('Last line.'));assert(!html.includes('bad()'));assert(html.includes('148mm 210mm'));assert(html.includes('role="separator"'));
const epub=unzipSync(new Uint8Array(await epubEdition(model,style).arrayBuffer()));
assert.equal(Object.keys(epub)[0],'mimetype');assert.equal(strFromU8(epub.mimetype),'application/epub+zip');
const xml=(str)=>{const doc=new dom.DOMParser().parseFromString(str,'application/xml');assert.equal(doc.getElementsByTagName('parsererror').length,0);return doc;};
for(const [file,bytes] of Object.entries(epub))if(/\.(xml|opf|xhtml)$/.test(file))xml(strFromU8(bytes));
assert.equal(xml(strFromU8(epub['Book/package.opf'])).getElementsByTagName('itemref').length,5);
assert.match(strFromU8(epub['Book/section-3.xhtml']),/href="section-4.xhtml#entry-0"/);
const epubPackage = xml(strFromU8(epub['Book/package.opf']));
assert.equal(epubPackage.querySelector('item[properties="cover-image"]'), null);
const epubNavigation = xml(strFromU8(epub['Book/nav.xhtml']));
const landmarks = Array.from(epubNavigation.getElementsByTagName('nav'))
  .find(nav => nav.getAttribute('epub:type') === 'landmarks');
assert.deepEqual(Array.from(landmarks.getElementsByTagName('a'), link => [
  link.getAttribute('epub:type'), link.getAttribute('href')
]), [['toc','section-3.xhtml'],['bodymatter','section-4.xhtml']]);
const word=unzipSync(new Uint8Array(await (await wordEdition(model,style)).arrayBuffer()));
const w=xml(strFromU8(word['word/document.xml']));assert(w.documentElement.textContent.includes('Last line.'));
assert.equal(w.getElementsByTagName('w:pgSz')[0].getAttribute('w:w'),String(Math.round(148*1440/25.4)));
assert.equal(publication(book(),style,'Title page').sections[0].id,'matter-title-page');
assert.equal(w.getElementsByTagName('w:sectPr')[0].getElementsByTagName('w:titlePg').length,1);
assert.equal(JSON.stringify(book().sections.binder),original);
// Reflow typography follows the reading system, while print and DOCX keep publisher metrics.
{
  const src='data:image/png;base64,iVBORw0KGgo=';
  const passage={...book().sections.binder[0],content:'<blockquote><p>First quote.</p><p>Second quote.</p></blockquote><p>Ordinary prose.</p><h3>Subsection</h3><pre class="verse">One line\nSecond line</pre><img src="gallery:figure" alt="Map">'};
  const fixture={...book(),cover:{...book().cover,image:'gallery:figure'},gallery:[{id:'figure',kind:'image',name:'Map',parentId:null,image:src}],sections:{binder:[passage]}};
  const edition=publication(fixture,style);
  const rich=edition.sections.find(s=>s.kind==='chapter');
  const doc=new JSDOM(rich.html).window.document;
  assert.equal(doc.querySelector('img').getAttribute('src'),src);
  assert.equal(doc.querySelector('p.opening').textContent,'Ordinary prose.');
  const archive=unzipSync(new Uint8Array(await epubEdition(edition,style).arrayBuffer()));
  const reflow=strFromU8(archive['Book/style.css']);
  assert(!reflow.includes(style.ink)&&!reflow.match(/body\{[^}]*?(?:font-size|line-height|color):/));
  const archivePackage = xml(strFromU8(archive['Book/package.opf']));
  const coverItems = archivePackage.querySelectorAll('item[properties="cover-image"]');
  assert.equal(coverItems.length, 1);
  const coverPath = coverItems[0].getAttribute('href');
  assert.equal(coverItems[0].getAttribute('media-type'), 'image/png');
  assert.deepEqual(Object.keys(archive).filter(name => name.endsWith('.png')), ['Book/' + coverPath]);
  assert.deepEqual(archive['Book/' + coverPath], Uint8Array.from(Buffer.from(src.split(',')[1], 'base64')));
  assert.equal(xml(strFromU8(archive['Book/section-4.xhtml'])).querySelector('img').getAttribute('src'), coverPath);
  const legacy = publication({...book(), cover:{...book().cover, image:src}}, {...style, pages:[]});
  const legacyArchive = unzipSync(new Uint8Array(await epubEdition(legacy, style).arrayBuffer()));
  assert.equal(xml(strFromU8(legacyArchive['Book/package.opf'])).querySelectorAll('item[properties="cover-image"]').length, 1);
  assert(!strFromU8(legacyArchive['Book/nav.xhtml']).includes('<a epub:type="toc"'));
  const wordModel={...edition,sections:[{...rich,html:rich.html.replace(/<img[^>]*>/g,'')}]};
  const pkg=unzipSync(new Uint8Array(await (await wordEdition(wordModel,style)).arrayBuffer()));
  const settings=xml(strFromU8(pkg['word/settings.xml']));
  assert.equal(settings.getElementsByTagName('w:mirrorMargins').length,1);
  const wordDoc=xml(strFromU8(pkg['word/document.xml']));
  const paragraphs=Array.from(wordDoc.getElementsByTagName('w:p'));
  assert(paragraphs.some(p=>p.textContent==='First quote.'));
  assert(paragraphs.some(p=>p.textContent==='Second quote.'));
  const verse=paragraphs.find(p=>p.textContent.includes('Second line'));
  assert.equal(verse.getElementsByTagName('w:br').length,1);
  const styleName=p=>p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val');
  assert.equal(styleName(paragraphs.find(p=>p.textContent==='Subsection')),'Heading3');
  const gap=p=>p.getElementsByTagName('w:spacing')[0]?.getAttribute('w:after');
  assert.equal(gap(paragraphs.find(p=>p.textContent===rich.title)),String(Math.round(style.size*20*style.chapterGap)));
}
// Rich-text boundaries, editable table structure, and real list counters must survive export.
{
  const html='<p>“Žu<em>ti</em> čamac prelazi prag danas.”</p>'+
    '<ol start="7"><li>First route</li><li value="12"><p>Detour</p><ul><li>Nested path</li></ul><p>After the turn</p></li><li>Final route</li></ol>'+
    '<figure><p>First plate</p><figcaption>Caption below</figcaption></figure>'+
    '<figure><figcaption>Caption above</figcaption><p>Second plate</p></figure><p>Following text</p>'+
    '<table><thead><tr><th>Route</th><th>Place</th><th>Record</th></tr></thead><tbody>'+
    '<tr><td rowspan="2">Pair</td><td colspan="2">A <em>careful</em> record</td></tr><tr><td>East</td><td>West</td></tr></tbody></table>';
  const passage={...book().sections.binder[0],content:html};
  const openingStyle={...style,initial:'Drop cap',smallCaps:true};
  const edition=publication({...book(),sections:{binder:[passage]}},openingStyle);
  const rich=edition.sections.find(section=>section.kind==='chapter');
  const preview=new JSDOM(rich.html).window.document;
  assert.equal(Array.from(preview.querySelectorAll('.lead'),span=>span.textContent).join(''),'“Žuti čamac prelazi prag');
  assert.equal(preview.querySelector('ol li[value]')?.value,12);
  const pkg=unzipSync(new Uint8Array(await (await wordEdition(edition,openingStyle)).arrayBuffer()));
  const word=xml(strFromU8(pkg['word/document.xml'])),numbers=xml(strFromU8(pkg['word/numbering.xml']));
  const tags=(node,name)=>Array.from(node.getElementsByTagName('w:'+name));
  const paragraphs=tags(word,'p');
  const paragraph=text=>paragraphs.find(p=>p.textContent===text);
  assert(paragraph('“Ž'));
  const keepsNext=text=>tags(paragraph(text),'keepNext').some(flag=>flag.getAttribute('w:val')!=='false');
  assert(keepsNext('First plate'));assert(keepsNext('Caption above'));
  assert(!keepsNext('Caption below'));assert(!keepsNext('Second plate'));assert(!keepsNext('Following text'));
  const cell=tags(word,'tc').find(c=>c.textContent==='A careful record');
  assert.equal(tags(cell,'p').length,1);assert.equal(tags(cell,'i').length,1);
  assert.deepEqual(tags(word,'vMerge').map(e=>e.getAttribute('w:val')),['restart','continue']);
  assert(tags(word,'gridSpan').some(e=>e.getAttribute('w:val')==='2'));
  assert(tags(word,'tblHeader').some(e=>e.getAttribute('w:val')!=='false'));
  const numId=text=>tags(paragraph(text),'numId')[0].getAttribute('w:val');
  const start=text=>tags(tags(numbers,'num').find(n=>n.getAttribute('w:numId')===numId(text)),'startOverride')[0].getAttribute('w:val');
  assert.equal(start('First route'),'7');assert.equal(start('Detour'),'12');
  assert.equal(numId('Detour'),numId('Final route'));
  assert(paragraphs.indexOf(paragraph('Nested path'))<paragraphs.indexOf(paragraph('After the turn')));
}
// The editor can store semantic marks as CSS while leaving typography to the edition.
{
  const content='<p>Before <span style="font-weight:700;font-style:italic;text-decoration:underline line-through;font-size:99px;color:#ab54bf">Žuti oblak</span> '+
    '<a href="https://example.com" style="text-decoration-line:underline">a link</a> H<span style="vertical-align:sub">2</span>O and x<span style="vertical-align:super">3</span>.</p>';
  const passage={...book().sections.binder[0],content};
  const edition=publication({...book(),sections:{binder:[passage]}},style);
  const chapter=edition.sections.find(section=>section.kind==='chapter');
  const preview=new JSDOM(chapter.html).window.document;
  assert.equal(preview.querySelector('strong em u s').textContent,'Žuti oblak');
  assert.equal(preview.querySelector('a u').textContent,'a link');
  assert.equal(preview.querySelector('sub').textContent,'2');
  assert.equal(preview.querySelector('sup').textContent,'3');
  assert.equal(preview.querySelector('[style]'),null);
  const packed=unzipSync(new Uint8Array(await (await wordEdition(edition,style)).arrayBuffer()));
  const doc=xml(strFromU8(packed['word/document.xml']));
  assert(doc.getElementsByTagName('w:u').length);
  assert(doc.getElementsByTagName('w:strike').length);
  assert.deepEqual(Array.from(doc.getElementsByTagName('w:vertAlign'),mark=>mark.getAttribute('w:val')),['subscript','superscript']);
  assert.equal(passage.content,content);
}
const {manuscriptEntries}=await import('../src/lib/kachamak/publish-manuscript.ts');
const {stepWorkspaceHistory}=await import('../src/lib/kachamak/store.ts');
const {setHistoryOwner}=await import('../src/lib/kachamak/workspace-history.ts');
setHistoryOwner('publish-test');
const bookId=book().id;
const install=()=>state().installPublishStyles(bookId);
// Upgrade the six-preset library without overwriting a customized, linked original.
const previousFolder=state().addNode('publish',null,'folder','House styles');
const previousBriar=state().addNode('publish',previousFolder,{bookStyle:{...style,size:17}},'Briar');
useKachamak.setState({novels:[{...book(),publishStylesInstalled:true}]});
install();
const archived=book().sections.publish.find(n=>n.id===previousFolder);
assert.equal(archived.title,'Previous house styles');
assert.equal(archived.children[0].id,previousBriar);
assert.equal(archived.children[0].bookStyle.size,17);
assert.equal(book().publishStyleCatalogVersion,houseStyleCatalogVersion);
const house=()=>book().sections.publish.find(node=>node.title==='House styles');
const presetIds=house().children.map(node=>node.id);
const names=['Literary Fiction','Fantasy','Science Fiction','Mystery','Thriller','Suspense','Horror','Romance','Adventure','Historical Fiction','Short Stories','Poetry','Comics','Graphic Novels',"Children's Books",'Young Adult','Biography','Memoir','Self-Help','Business','Investing','Academic'];
assert.deepEqual(house().children.map(n=>n.title),names);
assert.equal(new Set(houseStyles.map(p=>JSON.stringify(p.style))).size,22);
for(const node of house().children){
  const s=node.bookStyle, [width,height]=trims[s.trim];
  const sample=publication(book(),s,'Chapter opening');
  assert.equal(s.sampleGenre,node.title);
  assert.equal(sample.title,genreSamples[node.title].title);
  const sampleDOM=new JSDOM(sample.sections[0].html).window.document;
  assert.equal(sampleDOM.querySelector('h1').textContent,sample.title);
  if(node.title==='Poetry'){
    assert.equal(sampleDOM.querySelectorAll('p.verse').length,3);
    assert.equal(sampleDOM.querySelectorAll('p.verse br').length,9);
  }
  if(['Comics','Graphic Novels',"Children's Books"].includes(node.title)){
    assert(sampleDOM.querySelector('figure img').getAttribute('src').endsWith('.webp'));
    assert(sampleDOM.querySelector('figcaption').textContent.trim());
  }
  const pub=publication(book(),s), formatted=htmlEdition(pub,s);
  assert(!formatted.includes('genre-sample')&&!formatted.includes('publish-samples/')&&!formatted.includes(sample.title));
  assert(formatted.includes('size:'+width+'mm '+height+'mm'));
  assert(formatted.includes('font-size:'+s.size+'pt')&&formatted.includes('line-height:'+s.leading));
}
const childStyle=house().children.find(n=>n.title==="Children's Books").bookStyle;
assert.deepEqual(trims[childStyle.trim],[215.9,215.9]);
assert.equal(childStyle.size,16);
const poetry=house().children.find(n=>n.title==='Poetry').bookStyle;
assert.equal(poetry.align,'left');assert.equal(poetry.hyphens,false);assert.equal(poetry.indent,0);
const academic=house().children.find(n=>n.title==='Academic').bookStyle;
assert.equal(academic.size*academic.leading,12);
const academicWord=unzipSync(new Uint8Array(await (await wordEdition(publication(book(),academic),academic)).arrayBuffer()));
const academicPage=xml(strFromU8(academicWord['word/document.xml'])).getElementsByTagName('w:pgSz')[0];
assert.equal(academicPage.getAttribute('w:w'),String(7*1440));
assert.equal(academicPage.getAttribute('w:h'),String(10*1440));
assert.equal(JSON.stringify(book().sections.binder),original);
assert(house().children.every(node=>node.kind==='doc'&&validBookStyle(node.bookStyle)));
install();
assert.deepEqual(house().children.map(node=>node.id),presetIds);
state().updateNode('publish',presetIds[0],{bookStyle:{...house().children[0].bookStyle,size:18}});
state().deleteNode('publish',presetIds[1]);
install();
assert.equal(house().children.length,21);
assert.equal(house().children[0].bookStyle.size,18);
assert(book().sections.publish.some(node=>node.id===id));

const parent=state().addNode('binder',null,'folder','Notes');
const nested=state().addNode('binder',parent,'doc','Arrival');
const end=state().addNode('binder',null,'chapter','Afterwards');
state().updateNode('binder',nested,{content:'<p>Last ferry for the mainland.</p>'});
const unchanged=JSON.stringify(book().sections.binder);
const apply=action=>state().changePublishManuscript(bookId,action);
const chosen=()=>manuscriptEntries(book()).filter(row=>row.included).map(row=>row.node.id);
apply({type:'none'});
assert.deepEqual(chosen(),[]);
apply({type:'include',id:nested,value:true});
apply({type:'include',id:ch,value:true});
await Promise.resolve();
apply({type:'move',id:nested,target:ch,after:false});
assert.deepEqual(chosen(),[nested,ch]);
assert(stepWorkspaceHistory('undo'));assert.deepEqual(chosen(),[ch,nested]);
assert(stepWorkspaceHistory('redo'));assert.deepEqual(chosen(),[nested,ch]);
const edition=publication(book(),style);
assert.deepEqual(edition.sections.filter(s=>s.kind!=='special').map(s=>s.title),['Arrival','Crossing']);
const {proofDocument}=await import('../src/components/kachamak/PublishProof.tsx');
const folioRule='.contents-page-number{position:absolute';
assert(proofDocument(edition,{...style,folios:true},true).includes(folioRule));
assert(!proofDocument(edition,{...style,folios:false},true).includes(folioRule));
assert(!proofDocument(edition,style,false).includes(folioRule));
assert(!proofDocument(publication(book(),style,'Contents'),style,true).includes(folioRule));
const contents=edition.sections.find(s=>s.title==='Contents').html;
assert(contents.includes('#entry-0">Arrival')&&contents.includes('#entry-1">Crossing'));
assert.equal(publication(book(),style,'Contents').sections[0].html,contents);
const selectEpub=unzipSync(new Uint8Array(await epubEdition(edition,style).arrayBuffer()));
assert.match(strFromU8(selectEpub['Book/section-4.xhtml']),/Last ferry/);
assert.match(strFromU8(selectEpub['Book/section-5.xhtml']),/Last line/);
assert(!htmlEdition(edition,style).includes('Afterwards'));
const selectedWord=unzipSync(new Uint8Array(await (await wordEdition(edition,style)).arrayBuffer()));
const wordText=xml(strFromU8(selectedWord['word/document.xml'])).documentElement.textContent;
assert(wordText.indexOf('Last ferry')<wordText.indexOf('Last line')&&!wordText.includes('Afterwards'));
assert.equal(JSON.stringify(book().sections.binder),unchanged);
const copy=JSON.parse(JSON.stringify(book()));
assert(validCloudLibrary({novels:[copy],collections:[]}));
assert.deepEqual(copy.publishManuscript,book().publishManuscript);
copy.publishManuscript.order=[ch,ch];assert(!validCloudLibrary({novels:[copy],collections:[]}));
apply({type:'binderOrder'});assert.deepEqual(chosen(),[ch,nested]);
const later=state().addNode('binder',null,'doc','New note');
assert(!chosen().includes(later));apply({type:'all'});
assert.deepEqual(chosen(),[ch,parent,nested,end,later]);
state().createNovel('Fresh catalog','Author');
const freshBookId=state().activeNovelId;
state().installPublishStyles(freshBookId);
const freshBook=state().novels.find(n=>n.id===freshBookId);
assert.deepEqual(freshBook.sections.publish.map(n=>n.title),['House styles']);
assert.deepEqual(freshBook.sections.publish[0].children.map(n=>n.title),names);
assert(validCloudLibrary({novels:[freshBook],collections:[]}));
assert(!validCloudLibrary({novels:[{...freshBook,publishStyleCatalogVersion:'2'}],collections:[]}));
// Simulate a v2 catalog after a rename, a typography edit, and a deletion.
const v2=JSON.parse(JSON.stringify(freshBook));
v2.publishStyleCatalogVersion=2;
const v2Notes=v2.sections.publish[0].children;
for(const n of v2Notes)delete n.bookStyle.sampleGenre;
const movedPoetry=v2Notes.find(n=>n.title==='Poetry');movedPoetry.title='My verse';
const editedComic=v2Notes.find(n=>n.title==='Comics');editedComic.bookStyle.size=15;
v2Notes.pop();
v2.sections.publish[0].children=v2Notes.reverse();
const v2Ids=v2Notes.map(n=>n.id);
useKachamak.setState({novels:state().novels.map(n=>n.id===freshBookId?v2:n)});
state().installPublishStyles(freshBookId);
const migrated=state().novels.find(n=>n.id===freshBookId).sections.publish[0].children;
assert.deepEqual(migrated.map(n=>n.id),v2Ids);
assert.equal(migrated.find(n=>n.id===movedPoetry.id).bookStyle.sampleGenre,'Poetry');
assert.equal(migrated.find(n=>n.id===editedComic.id).bookStyle.size,15);
state().updateNode('publish',editedComic.id,{title:'Panel study'});
assert.equal(publication(v2,migrated.find(n=>n.id===editedComic.id).bookStyle,'Chapter opening').title,genreSamples.Comics.title);
console.log('Publish passed: editable preset notes, nested manuscript selection, independent export order, undo/redo, book persistence, EPUB, DOCX, HTML and proof.');
