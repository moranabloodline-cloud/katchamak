import type {HomeBlock, HomeLink, Homepage} from './homepage';
import {availableProjectImage, validProjectImage} from './project-image';
import type {NoteNode, Novel, SectionKey} from './types';
import {stripHtml, uid} from './utils';
import {newStoryBoard} from './story-board';

export const CANVAS_PAGE_TEMPLATES = [
  {id:'blank', label:'Blank canvas', description:'Start with an empty page.'},
  {id:'project-cover', label:'Project cover', description:'Cover art, a story pitch and links into the book.'},
  {id:'character-overview', label:'Character overview', description:'Portrait cards for the cast and their relationships.'},
  {id:'research-board', label:'Research board', description:'Sources, open questions and visual references.'},
  {id:'author-page', label:'Author Page', description:'A portrait, biography, featured work and public links.'},
  {id:'project-example', label:'Project example', description:'A filled-in showcase using this book’s artwork, cast and notes.'},
  {id:'story-board', label:'Story Board', description:'Plan scenes by chapter and plotline, with links into the Binder.'},
  {id:'mind-map', label:'Mind Map', description:'Start with a central idea and connect branches to project notes.'},
] as const;

export type CanvasPageTemplateId = (typeof CANVAS_PAGE_TEMPLATES)[number]['id'];
type TemplateBlock = Omit<HomeBlock, 'id'|'width'|'cell'>;

function row(title: string, ...columns: TemplateBlock[][]): HomeBlock[] {
  const rowId = uid();
  return [
    {id:rowId, layout:'row', width:'full', title, text:'', columns:columns.length},
    ...columns.flatMap((blocks, column) => blocks.map(block => ({
      ...block, id:uid(), width:'full' as const, cell:{rowId,column},
    }))),
  ];
}

function tabLink(label: string, tab: SectionKey): HomeLink {
  return {id:uid(), label, target:{kind:'tab',tab}};
}

function noteLink(node: NoteNode): HomeLink {
  return {id:uid(), label:node.title, target:{kind:'note',id:node.id}};
}

function imageFor(book: Novel, image: string | undefined) {
  return image && validProjectImage(image) && availableProjectImage(book.gallery,image) ? image : undefined;
}

function visibleNotes(roots: NoteNode[]): NoteNode[] {
  const result: NoteNode[] = [];
  function visit(nodes: NoteNode[]) {
    for (const node of nodes) {
      if (node.hidden) continue;
      result.push(node);
      visit(node.children);
    }
  }
  visit(roots);
  return result;
}

function caption(text: string | undefined, maxLength: number): string {
  const clean = stripHtml(text ?? '').replace(/\s+/g,' ').trim();
  if (clean.length <= maxLength) return clean;
  const head = clean.slice(0,maxLength);
  const end = head.lastIndexOf(' ');
  return (end > maxLength / 2 ? head.slice(0,end) : head).trimEnd() + '…';
}

function projectExample(book: Novel): HomeBlock[] {
  const title = book.title.trim() || 'Untitled project';
  const author = book.author.trim();
  const cover = imageFor(book,book.cover?.image);
  const home = book.homepage;
  const artwork = (home?.blocks ?? []).find(block =>
    (block.layout === 'banner' || block.layout === 'image') && imageFor(book,block.image));
  const artworkImage = imageFor(book,artwork?.image);
  const intro = caption(home?.synopsis,240) ||
    caption(home?.blocks.find(block => block.layout === 'text' && block.text.trim())?.text,240) ||
    [book.series, ...(book.genres ?? []).slice(0,2)].filter(Boolean).join(' · ');
  const byline = author ? 'By ' + author : '';

  const binder = visibleNotes(book.sections.binder ?? []);
  const opening = binder.find(node => /^(?:ch\.?|chapter)\s*\d+\b/i.test(node.title.trim())) ??
    binder.find(node => node.kind === 'chapter') ??
    binder.find(node => node.kind !== 'folder' && node.kind !== 'act' && stripHtml(node.content).trim().length > 80);
  const research = visibleNotes(book.sections.research ?? [])
    .filter(node => node.kind !== 'folder' && node.title.trim()).slice(0,3);
  const codex = visibleNotes(book.sections.codex ?? []);
  const cast = codex.find(node => /^(characters|cast|people)\b/i.test(node.title.trim()) && node.children.length);
  const featured = (cast ? visibleNotes(cast.children) : codex)
    .filter(node => node.kind !== 'folder' && node.title.trim())
    .map(node => ({node, image:imageFor(book,node.image)}))
    .sort((a,b) => Number(!!b.image) - Number(!!a.image))
    .slice(0,3);
  const cards = featured.map(({node,image}): TemplateBlock[] => {
    const original = home?.blocks.find(block => block.layout === 'card' &&
      (block.target?.kind === 'note' && block.target.id === node.id ||
        block.title.trim().toLocaleLowerCase() === node.title.trim().toLocaleLowerCase()));
    return [{
      layout:'card', title:node.title,
      text:caption(node.synopsis,155) || caption(original?.text,155),
      image:image ?? imageFor(book,original?.image),
      target:{kind:'note',id:node.id},
    }];
  });
  const readLinks = [opening ? noteLink(opening) : tabLink('Open the Binder','binder'),
    tabLink('Browse the Codex','codex')];
  const researchLinks = research.length ? research.map(noteLink) : [tabLink('Open the Research tab','research')];
  const map = visibleNotes(book.sections.maps ?? []).find(node =>
    node.kind !== 'folder' && imageFor(book,node.image));
  const heading: TemplateBlock = {
    layout:'heading', title,
    text:[byline,intro].filter(Boolean).join('\n\n'),
  };

  return [
    ...(artworkImage ? row('',[
      {layout:'image',title:'',text:'',image:artworkImage,
        imageFrame:artwork?.imageFrame ? {...artwork.imageFrame} : undefined},
    ]) : []),
    ...(cover && !artworkImage
      ? row('',[{layout:'image',title:'',text:'',image:cover}],[heading])
      : row('',[heading])),
    ...(cards.length ? row(cast?'Cast':'Codex highlights',...cards) : []),
    ...row('Explore the book',
      [{layout:'links',title:'Read the draft',text:'',links:readLinks}],
      [{layout:'links',title:'Research notebook',text:'',links:researchLinks}]),
    ...(map ? row('Setting',[
      {layout:'map',title:map.title,text:caption(map.synopsis,155),mapId:map.id},
    ]) : []),
  ];
}

export function buildCanvasPageTemplate(templateId: CanvasPageTemplateId, book: Novel): Homepage {
  if(templateId==='story-board')return {mode:'canvas',locked:false,blocks:[],storyBoard:newStoryBoard(book)};
  if(templateId==='mind-map')return {mode:'canvas',locked:false,viewKey:uid(),blocks:[{
    id:uid(),layout:'note',width:'standard',title:'Central idea',
    text:'Select this card and use Add branch to connect a related idea.',
    at:{x:0,y:0},color:'#c4a0ed',
  }]};
  const bookTitle = book.title.trim() || 'Book title';
  const author = book.author.trim();
  const cover = imageFor(book,book.cover?.image);
  function blocks(id: Exclude<CanvasPageTemplateId, 'story-board' | 'mind-map'>): HomeBlock[] {
    switch (id) {
      case 'blank':
        return [];
      case 'project-cover':
        return [
          ...row('',[{layout:'heading',title:bookTitle,text:author?'By '+author:''}]),
          ...row('About the book',
            [{layout:'image',title:'',text:'',image:cover}],
            [{layout:'text',title:'The story',text:'Add a short pitch that introduces the premise, stakes and setting.'},
              {layout:'links',title:'Start reading',text:'',links:[tabLink('Open the draft','binder')]}]),
          ...row('Project links',[
            {layout:'links',title:'Explore the project',text:'',links:[
              tabLink('Characters and world','codex'),tabLink('Research notebook','research'),
            ]},
          ]),
        ];
      case 'character-overview':
        return [
          ...row('',[{layout:'heading',title:'Character overview',text:''}]),
          ...row('Main cast',
            [{layout:'card',title:'Protagonist',text:'Name, goal and what stands in the way.'}],
            [{layout:'card',title:'Ally',text:'Name, loyalty and the point where it is tested.'}],
            [{layout:'card',title:'Antagonist',text:'Name, motivation and how they challenge the protagonist.'}]),
          ...row('Connections',
            [{layout:'text',title:'Relationships',text:'Summarize the loyalties and conflicts that shape the cast.'}],
            [{layout:'links',title:'Character notes',text:'',links:[tabLink('Open the Codex','codex')]}]),
        ];
      case 'research-board':
        return [
          ...row('',[{layout:'heading',title:'Research board',text:''}]),
          ...row('Sources and questions',
            [{layout:'links',title:'Source list',text:'Add books, articles or interviews you want to revisit.',links:[
              tabLink('Open the Research tab','research'),
            ]}],
            [{layout:'callout',title:'Questions to verify',text:'Record an open question and the evidence that would answer it.'}]),
          ...row('Reference collection',
            [{layout:'image',title:'',text:''}],
            [{layout:'text',title:'Field notes',text:'Add context for the reference and record how it informs the story.'}]),
        ];
      case 'author-page':
        return [
          ...row('',[{layout:'heading',title:author || 'Author name',text:''}]),
          ...row('About the author',
            [{layout:'image',title:'',text:''}],
            [{layout:'text',title:'Biography',text:'Add a short bio with the genres you write, your background and previous work.'}]),
          ...row('Books and links',
            [{layout:'card',title:bookTitle,text:'Add a short description of this book.',image:cover,target:{kind:'tab',tab:'binder'}}],
            [{layout:'links',title:'Website and contact',text:'Add the public links you want readers to use.',links:[]}]),
        ];
      case 'project-example':
        return projectExample(book);
    }
  }
  return {mode:'canvas',locked:false,blocks:blocks(templateId)};
}
