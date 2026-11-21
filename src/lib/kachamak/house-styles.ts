import {baseStyle, type BookStyle} from './book-style';
import {houseGenres, type HouseGenre} from './house-genres';
import type {NoteNode} from './types';

export const houseStyleCatalogVersion = 3;
export const previousHouseStyleNames = new Set(['Folio','Briar','Signal','Vesper','Quarto','Solstice']);

// Finished-book trim benchmarks (inches), not manuscript submission formats:
// https://www.ingramspark.com/blog/picking-a-popular-trim-size-for-your-book
// https://www.ingramspark.com/hubfs/downloads/Book-Design-Expanded-Guide.pdf
// Chapter treatments, type pairings and ornaments are Kachamak editorial choices.
const fiction: BookStyle = {
  ...baseStyle, size:11, leading:1.35, indent:1.2, numbering:'Arabic',
  ornament:'None', divider:'Stars', chapterGap:1.65, top:19, bottom:22, inner:23, outer:18,
  ink:'#211f1c', heading:'#292622', accent:'#544b40', pages:['Title page','Copyright','Contents']
};
const nonfiction: BookStyle = {
  ...fiction, bodyFont:'Cambria', headingFont:'Arial', headingSize:23, chapterAlign:'left',
  indent:0, paragraphGap:.45, align:'left', hyphens:false, sink:3, chapterGap:1.1,
  divider:'Rule', heading:'#24343b', accent:'#455b64'
};
const illustrated: BookStyle = {
  ...fiction, trim:'6.625 × 10.25 in', bodyFont:'Arial', headingFont:'Trebuchet MS',
  size:11, headingSize:20, leading:1.25, align:'left', indent:0, paragraphGap:.35,
  hyphens:false, numbering:'None', chapterAlign:'left', sink:0, chapterGap:.5,
  divider:'None', dividerGap:.5, running:false, folios:false, top:13, bottom:15, outer:13, inner:18
};

function preset(name:HouseGenre, family:BookStyle, settings:Partial<BookStyle>){
  return {name,style:{...family,...settings,sampleGenre:name}};
}

export const houseStyles = [
  preset('Literary Fiction', fiction, {
    trim:'6 × 9 in', bodyFont:'Palatino Linotype', headingFont:'Palatino Linotype',
    size:11.5, leading:1.4, headingSize:23, numbering:'Roman', sink:12, divider:'Diamonds'
  }),
  preset('Fantasy', fiction, {
    trim:'5.5 × 8.5 in', bodyFont:'Palatino Linotype', headingFont:'Georgia',
    size:11, leading:1.4, headingSize:26, numbering:'Roman', sink:12, ornament:'Fleuron',
    divider:'Diamonds', initial:'Drop cap', recto:true, heading:'#2e392d', accent:'#495941'
  }),
  preset('Science Fiction', fiction, {
    trim:'5.5 × 8.5 in', bodyFont:'Cambria', headingFont:'Arial', headingSize:25,
    chapterAlign:'left', ornament:'Rule', divider:'Rule', sink:5, accent:'#405967'
  }),
  preset('Mystery', fiction, {
    trim:'5.25 × 8 in', bodyFont:'Georgia', headingFont:'Cambria',
    headingSize:22, sink:6, divider:'Diamonds', indent:1, outer:15
  }),
  preset('Thriller', fiction, {
    trim:'5.25 × 8 in', bodyFont:'Cambria', headingFont:'Arial', headingSize:25,
    chapterAlign:'left', sink:3, chapterGap:1, leading:1.3, indent:1, outer:15
  }),
  preset('Suspense', fiction, {
    trim:'5.25 × 8 in', bodyFont:'Georgia', headingFont:'Trebuchet MS',
    headingSize:21, leading:1.4, sink:10, chapterGap:2, divider:'Rule', outer:16
  }),
  preset('Horror', fiction, {
    trim:'5.5 × 8.5 in', headingFont:'Times New Roman', headingSize:28, numbering:'Roman',
    sink:15, chapterGap:2.25, divider:'None', dividerGap:1.8, heading:'#281f20', accent:'#544245'
  }),
  preset('Romance', fiction, {
    trim:'5 × 8 in', bodyFont:'Palatino Linotype', size:11, leading:1.4,
    headingSize:23, ornament:'Fleuron', divider:'Fleuron', sink:8, outer:15, accent:'#70505b'
  }),
  preset('Adventure', fiction, {
    trim:'5.5 × 8.5 in', headingFont:'Trebuchet MS', headingSize:25,
    chapterAlign:'left', chapterGap:1.15, sink:5, ornament:'Rule', divider:'Diamonds'
  }),
  preset('Historical Fiction', fiction, {
    trim:'6 × 9 in', bodyFont:'Palatino Linotype', headingFont:'Times New Roman',
    size:11.5, leading:1.4, headingSize:25, numbering:'Roman', ornament:'Fleuron',
    smallCaps:true, recto:true, sink:11, inner:25, outer:20
  }),
  preset('Short Stories', fiction, {
    trim:'5.5 × 8.5 in', headingSize:22, numbering:'None', sink:8,
    divider:'Diamonds', chapterGap:1.8
  }),
  // https://www.ingramspark.com/blog/what-to-consider-when-publishing-poetry
  preset('Poetry', fiction, {
    trim:'5.5 × 8.5 in', bodyFont:'Palatino Linotype', headingFont:'Palatino Linotype',
    size:12, leading:1.4, indent:0, align:'left', hyphens:false, headingSize:18,
    chapterAlign:'left', numbering:'None', sink:5, chapterGap:2, running:false, divider:'None',
    top:23, bottom:24, inner:22, outer:17,
    blocks:{...fiction.blocks,Verse:{italic:false,size:1,align:'left',rule:false}}
  }),
  // Sizes below are for live captions and prose; lettering inside artwork stays in the image.
  preset('Comics', illustrated, {
    headingFont:'Arial', headingSize:18, size:10.5, chapterGap:.45, pages:['Title page','Copyright']
  }),
  preset('Graphic Novels', illustrated, {
    bodyFont:'Cambria', headingFont:'Arial', size:11.5, leading:1.35, headingSize:24,
    folios:true, chapterGap:.85, bottom:18, inner:20, outer:15
  }),
  // Picture-book treatment for ages 3–7: https://www.taylor.com/blog/a-guide-to-printing-childrens-books
  preset("Children's Books", illustrated, {
    trim:'8.5 × 8.5 in', bodyFont:'Trebuchet MS', headingFont:'Georgia', size:16,
    leading:1.45, headingSize:28, chapterAlign:'center', paragraphGap:.65, chapterGap:.75,
    top:18, bottom:20, inner:22, outer:18, pages:['Title page','Copyright']
  }),
  preset('Young Adult', fiction, {
    trim:'5 × 7 in', size:11.5, leading:1.4, headingFont:'Trebuchet MS',
    headingSize:21, indent:1, sink:5, top:15, bottom:18, inner:20, outer:14
  }),
  preset('Biography', nonfiction, {
    trim:'6 × 9 in', bodyFont:'Cambria', headingFont:'Georgia', size:11.5,
    leading:1.4, indent:1.2, align:'justify', paragraphGap:0, hyphens:true,
    chapterAlign:'center', sink:8, recto:true, ornament:'Rule'
  }),
  preset('Memoir', fiction, {
    trim:'5.25 × 8 in', bodyFont:'Palatino Linotype', headingFont:'Georgia', size:11,
    leading:1.4, headingSize:22, numbering:'None', sink:8, divider:'Fleuron', outer:15
  }),
  preset('Self-Help', nonfiction, {
    trim:'5.25 × 8 in', bodyFont:'Georgia', size:11, leading:1.4, paragraphGap:.55,
    headingFont:'Trebuchet MS', headingSize:22, outer:15,
    blocks:{...nonfiction.blocks,Aside:{italic:false,size:1,align:'left',rule:true}}
  }),
  preset('Business', nonfiction, {
    trim:'5.5 × 8.25 in', size:11, leading:1.35, headingSize:22, ornament:'Rule',
    outer:16, blocks:{...nonfiction.blocks,Subheading:{italic:false,size:1.2,align:'left',rule:false}}
  }),
  preset('Investing', nonfiction, {
    trim:'6 × 9 in', size:11, leading:1.35, headingSize:22, top:19, inner:23, outer:18,
    blocks:{...nonfiction.blocks,Aside:{italic:false,size:.95,align:'left',rule:true}},
    heading:'#27392f', accent:'#4a6154'
  }),
  // Wiley's print-ready academic guideline uses 10/12 pt, indents and no inter-paragraph gap.
  // https://assets.wiley.com/image/upload/v1783020978/author-guidelines-for-preparing-print-ready-pdfs.pdf
  preset('Academic', nonfiction, {
    trim:'7 × 10 in', bodyFont:'Times New Roman', headingFont:'Cambria',
    size:10, leading:1.2, headingSize:20, paragraphGap:0, indent:1, align:'justify',
    hyphens:true, top:23, bottom:25, inner:30, outer:26, sink:2, running:true,
    blocks:{...nonfiction.blocks,Quote:{italic:false,size:.95,align:'left',rule:false}},
    heading:'#252525', accent:'#393939'
  })
];

function settingsKey(style:BookStyle){
  // Backups can serialize object keys in a different order. Array order is significant.
  return JSON.stringify(style,(key,value)=>{
    if(key==='sampleGenre')return undefined;
    if(value&&typeof value==='object'&&!Array.isArray(value))return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
    return value;
  });
}
const originalGenres=new Map(houseStyles.map(p=>[settingsKey(p.style),p.name]));

export function withGenreSample(style:BookStyle,title:string):BookStyle{
  if(style.sampleGenre)return style;
  const genre=houseGenres.find(name=>name===title)??originalGenres.get(settingsKey(style));
  return genre?{...style,sampleGenre:genre}:style;
}

export function attachGenreSamples(nodes:NoteNode[]):NoteNode[]{
  return nodes.map(node=>{
    const children=node.children.length?attachGenreSamples(node.children):node.children;
    const bookStyle=node.bookStyle&&withGenreSample(node.bookStyle,node.title);
    return children===node.children&&bookStyle===node.bookStyle?node:{...node,children,bookStyle};
  });
}
