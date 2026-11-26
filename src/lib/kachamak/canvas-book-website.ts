import type {HomeBlock, HomeLink, HomePageEntry} from './homepage';
import type {Novel} from './types';
import {uid} from './utils';
import {imageFor, row, tabLink, type TemplateBlock} from './canvas-template-layout';

const pages = {
  inside: {title:'Inside the Novel', menu:'The book'},
  atlas: {title:'The Field Atlas', menu:'World'},
  editions: {title:'The Edition Room', menu:'Editions'},
  author: {title:'Author & Events', menu:'Author'},
  extras: {title:'Reader Room', menu:'Reader room'},
  letter: {title:'The Signal Letter', menu:'Newsletter'},
} as const;

type ChildPage = keyof typeof pages;
type WebsitePage = 'home' | ChildPage;
type RootPage = Pick<HomePageEntry, 'id' | 'title' | 'parentId'>;
const childPages = Object.keys(pages) as ChildPage[];

const title = (name: string, text = ''): TemplateBlock => ({layout:'heading', title:name, text});
const copy = (name: string, text: string): TemplateBlock => ({layout:'text', title:name, text});
const image = (name: string, text: string): TemplateBlock => ({layout:'card', title:name, text});
const links = (name: string, items: HomeLink[], text = ''): TemplateBlock => ({layout:'links', title:name, text, links:items});
const divider: TemplateBlock = {layout:'divider', title:'', text:''};

const formats = [
  ['Paperback','Add the trim size, binding and price.'],
  ['Hardcover','Add the jacket, finish and price.'],
  ['Collector’s Edition','Describe the limited edition and any included extras.'],
  ['eBook','Add the digital formats and price.'],
  ['Audiobook','Add the narrator, runtime and price.'],
] as const;

export function buildBookWebsite(book: Novel, root: RootPage): HomePageEntry[] {
  const ids = new Map<WebsitePage, string>([['home',root.id]]);
  for (const key of childPages) ids.set(key, uid());

  const bookTitle = book.title.trim() || 'Your book title';
  const byline = book.author.trim() ? 'A book by '+book.author.trim() : 'Add your author byline.';
  const cover = imageFor(book,book.cover?.image);
  const to = (key: WebsitePage, label = key === 'home' ? 'Home' : pages[key].menu): HomeLink =>
    ({id:uid(), label, target:{kind:'page', id:ids.get(key)!}});
  const navigation = (key: WebsitePage) => links(bookTitle, [
    key === 'home' ? to('editions','Explore editions') : to('home'),
    ...childPages.filter(item => item !== key && (key !== 'home' || item !== 'editions')).map(item => to(item)),
  ]);
  const returnLinks = (key: ChildPage) => row('', [links('Continue exploring', [
    to('home'), ...(['inside','editions','extras','letter'] as const).filter(item => item !== key).map(item => to(item)),
  ])]);

  const home = [
    ...row('', [navigation('home')]),
    ...row('', [
      title(bookTitle, byline+'\nAdd the opening hook in one or two sentences.'),
      links('', [to('inside','Read an excerpt'), to('atlas','Enter the world')]),
    ], [cover ? {layout:'image',title:'',text:'',image:cover} : image('Book cover','Choose the cover from your Gallery.')]),
    ...row('', [divider]),
    ...row('Awards & Recognition',
      [copy('Literary recognition','Add a verified award, shortlist or selection.')],
      [copy('Critical praise','Choose a short review quote and credit its source.')],
      [copy('Reader response','Add a rating or an accolade from your readers.')]),
    ...row('Discover the Story',
      [title('The heart of the book','Add a short line that captures the book’s central question.')],
      [copy('Synopsis','Introduce the protagonist, the inciting event and what is at stake.'),
       links('', [to('inside','Go inside the novel')])]),
    ...row('Enter the World',
      [image('Primary setting','Add a wide illustration and introduce the book’s main setting.')],
      [image('A second location','Show a contrasting place and explain why it matters.')]),
    ...row('', [links('', [to('atlas','Explore the field atlas')])]),
    ...row('Meet the Characters',
      [image('Protagonist','Add a portrait, a name and the character’s goal.')],
      [image('Ally','Add a portrait and explain their link to the protagonist.')],
      [image('Rival','Add a portrait and describe the conflict they bring.')],
      [image('Key character','Add a portrait and a line that makes this character memorable.')]),
    ...row('', [divider]),
    ...row('Inside the Book',
      [title('Opening line','Replace this with a short quotation from the manuscript.')],
      [copy('A first look','Give readers a glimpse of the structure or themes.'),
       links('', [to('inside','Read the opening excerpt')])]),
    ...row('Book Trailer', [links('Watch the trailer', [], 'Add your trailer link here, or choose Video for this block to show it on the page.')]),
    ...row('Reader Reviews',
      [copy('Reader quote','Add a short review and the reader’s attribution.')],
      [copy('Bookseller or reviewer quote','Add a different perspective on the book.')],
      [copy('Book club response','Add a third credited recommendation.')]),
    ...row('', [divider]),
    ...row('Choose Your Edition', ...formats.slice(0,3).map(([name,text]) => [copy(name,text)])),
    ...row('', ...formats.slice(3).map(([name,text]) => [copy(name,text)]),
      [links('The Edition Room', [to('editions','Compare all five formats')])]),
    ...row('Collector’s Edition', [image('Collector’s edition photograph','Add a wide image of the set and its contents.')]),
    ...row('',
      [title('Designed to be kept','Describe what sets this edition apart.')],
      [copy('Inside the set','List the binding, illustrations or signed extras.'), links('', [to('editions','Explore the collector’s edition')])]),
    ...row('Behind the Story',
      [image('From the writing desk','Add an image from your research or writing process.')],
      [copy('The starting point','Share an inspiration, a surprising discovery or a choice that changed the book.'),
       links('', [to('author','Read the process notes')])]),
    ...row('About the Author',
      [title(book.author.trim() || 'Author name', 'Add a one-line author introduction.')],
      [copy('Biography','Introduce yourself and the kinds of stories you write.'), links('', [to('author','Author & events')])]),
    ...row('Upcoming Releases',
      [copy('Next book','Add a working title, a short pitch and a release window.')],
      [copy('More from the author','Add a forthcoming story, event or collaboration.')],
      [links('', [to('author','See release and event notes')])]),
    ...row('Exclusive Content',
      [copy('Reading guide','Add discussion questions and prompts for book clubs.')],
      [copy('Bonus material','Introduce a deleted scene, illustration or recording.')],
      [links('', [to('extras','Open the reader room')])]),
    ...row('Newsletter',
      [{layout:'callout', title:'The Signal Letter', text:'Name your newsletter and explain what readers can expect.'},
       links('', [to('letter','Read a sample issue')])]),
    ...row('Frequently Asked Questions',
      [copy('Where should I begin?', 'Add guidance for first-time readers.'),
       copy('Where can I get the book?', 'Explain which stores or formats you use.')],
      [copy('What is in the collector’s edition?', 'Describe what readers receive.'),
       copy('How can I hear about new releases?', 'Describe your newsletter and release updates.')]),
    ...row('', [divider]),
    ...row('', [image('Closing image','Add a full-width image that brings readers back to the book’s atmosphere.')]),
    ...row('', [title('Start reading', 'Add a final invitation to discover the book.')],
      [links('', [to('inside','Read the first pages'), to('editions','Browse the editions')])]),
    ...row('', [divider]),
    ...row('', [copy(bookTitle,byline)],
      [links('The book', [to('inside'), to('atlas'), to('editions')])],
      [links('For readers', [to('author'), to('extras'), to('letter')])]),
    ...row('', [{layout:'banner',title:'',text:'Add publication, copyright or website information.'}]),
  ];

  const contents: Record<ChildPage, HomeBlock[]> = {
    inside: [
      ...row('', [title('Inside the Novel','Introduce the book and its central idea.')],
        [copy('The premise','Add a concise, spoiler-free description.')]),
      ...row('', [image('Feature image','Choose artwork that introduces the story.')]),
      ...row('Opening excerpt', [copy('Chapter One','Paste your excerpt here, keeping paragraph breaks.'),
        links('',[tabLink('Continue in Binder','binder')])]),
      ...row('A route through the book',
        [copy('Opening','Give readers a sense of what starts the story.')],
        [copy('Developments','Describe a central complication or theme.')],
        [copy('What’s at stake','Save the resolution for the book itself.')]),
    ],
    atlas: [
      ...row('', [title('The Field Atlas','Introduce the people, places and atmosphere of your world.')]),
      ...row('', [image('Panoramic artwork','Choose a wide image from your Gallery.')]),
      ...row('Key locations',
        [image('First location','Add an illustration or a map and its caption.')],
        [image('Second location','Add a location, scene or landmark.')],
        [image('Third location','Add another setting worth visiting.')]),
      ...row('', [links('World references', [tabLink('Explore the Codex','codex'), tabLink('Open project research','research')])]),
    ],
    editions: [
      ...row('', [title('The Edition Room','Help readers choose the format that fits.')],
        [links('Buy the book', [], 'Add your bookseller or retailer links.')]),
      ...row('Compare formats', [{
        layout:'table',title:'Edition guide',text:'Replace the prices and format details.',
        cells:[['Format','Price'], ...formats.map(([name]) => [name,'Add price'])],
      }]),
      ...row('Print editions', ...formats.slice(0,3).map(([name,text]) => [copy(name,text)])),
      ...row('Digital editions', ...formats.slice(3).map(([name,text]) => [copy(name,text)])),
      ...row('Collector’s Edition',
        [image('Edition photograph','Add an image of the book, slipcase or signed extras.')],
        [copy('Collector’s details','List the contents, print run or special materials.'),
         links('Collector’s links', [], 'Add a store or availability link.')]),
    ],
    author: [
      ...row('', [title(book.author.trim() || 'Author name', 'Tell readers about your work.'),
        copy('Biography','Add your bio, previous work and subjects you return to.')],
        [image('Author portrait','Choose a portrait or an image from your studio.')]),
      ...row('Behind the Story',
        [copy('Inspiration','Share what set the book in motion.')],
        [copy('Research and revision','Describe an interesting detail from the writing process.')]),
      ...row('Author events', [{
        layout:'table',title:'Events',text:'Add confirmed readings, appearances or online events.',
        cells:[['Date','Event','Location'],['Add date','Add event','Add venue']],
      }]),
      ...row('Upcoming Releases',
        [copy('Next release','Add a title, summary and expected release window.')],
        [links('Author links', [], 'Add your website, press kit or events page.')]),
    ],
    extras: [
      ...row('', [title('The Reader Room','Collect bonus material and reading group resources.')],
        [image('Reader room artwork','Choose an illustration, a behind-the-scenes photo or an archival image.')]),
      ...row('Reading Group Guide',
        [copy('An opening question','Add a prompt about the first chapter.')],
        [copy('A character question','Add a prompt about a choice or relationship.')],
        [copy('A theme question','Add a question to revisit after finishing the book.')]),
      ...row('Exclusive Content',
        [links('Reader downloads', [], 'Add your discussion guide, deleted scene or other bonus material.')],
        [links('Around the book', [to('atlas'), to('letter'), to('inside')])]),
    ],
    letter: [
      ...row('', [title('The Signal Letter','Replace this with your newsletter name and description.')]),
      ...row('', [image('Newsletter artwork','Choose a header image for your welcome issue.')]),
      ...row('Welcome issue', [copy('A letter to readers','Write a short welcome and tell readers what you plan to send.')]),
      ...row('What readers will receive',
        [copy('From the writing desk','Add a sample note about the work in progress.')],
        [copy('Book news','Describe the announcements, events or reading recommendations you will share.')]),
      ...row('', [links('Subscribe', [], 'Add the signup link for your newsletter.')]),
    ],
  };

  return [
    {...root, mode:'canvas', locked:false, width:'wide', blocks:home},
    ...childPages.map((key):HomePageEntry => ({
      id:ids.get(key)!, parentId:root.id, title:pages[key].title,
      mode:'canvas', locked:false, width:key==='letter'?'reading':'wide',
      blocks:[...row('', [navigation(key)]), ...contents[key], ...row('', [divider]), ...returnLinks(key)],
    })),
  ];
}
