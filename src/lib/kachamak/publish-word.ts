import {AlignmentType,Bookmark,BorderStyle,Document,ExternalHyperlink,Footer,Header,HeadingLevel,ImageRun,InternalHyperlink,LevelFormat,Packer,PageNumber,Paragraph,SectionType,Table,TableCell,TableRow,TextRun,WidthType,type INumberingOptions,type IParagraphOptions,type IRunOptions,type ISectionOptions,type ParagraphChild} from 'docx';
import {type BookStyle,trims} from './book-style';
import {imageBytes} from './publish-export';
import type {Publication} from './publication';

const mm=(n:number)=>Math.round(n*1440/25.4);
const headingLevels=[HeadingLevel.HEADING_1,HeadingLevel.HEADING_2,HeadingLevel.HEADING_3,HeadingLevel.HEADING_4,HeadingLevel.HEADING_5,HeadingLevel.HEADING_6];
const alignment={left:AlignmentType.LEFT,right:AlignmentType.RIGHT,center:AlignmentType.CENTER,justify:AlignmentType.JUSTIFIED};
export async function wordEdition(book:Publication,s:BookStyle){
  const [width,height]=trims[s.trim],space=s.size*20,ink=s.ink.slice(1),accent=s.accent.slice(1);
  const ids=new Map(book.sections.map((v,i)=>[v.id,'Section_'+i]));
  const art=new Map<string,Promise<{data:Uint8Array<ArrayBuffer>;width:number;height:number}>>();
  const image=async(el:HTMLImageElement)=>{
    const src=el.getAttribute('src')??'';
    if(!art.has(src))art.set(src,(async()=>{
      const picture=new Image();picture.src=src;await picture.decode();
      const canvas=document.createElement('canvas');canvas.width=picture.width;canvas.height=picture.height;
      canvas.getContext('2d')!.drawImage(picture,0,0);
      return {data:imageBytes(canvas.toDataURL('image/png')),width:picture.width,height:picture.height};
    })());
    const img=await art.get(src)!;
    const factor=Math.min(1,(width-s.inner-s.outer)*96/25.4/img.width,(height-s.top-s.bottom-5)*96/25.4/img.height,el.classList.contains('chapter-art')?85/img.height:1);
    return new ImageRun({type:'png',data:img.data,transformation:{width:Math.max(1,Math.round(img.width*factor)),height:Math.max(1,Math.round(img.height*factor))},altText:{name:el.alt||'Illustration',description:el.alt||'',title:el.alt||''}});
  };
  async function inline(node:Node,format:IRunOptions={}):Promise<ParagraphChild[]>{
    if(node.nodeType===3){
      const text=node.textContent??'';
      if(node.parentElement?.closest('pre,.verse'))
        return text.split(/\r\n?|\n/).map((line,i)=>new TextRun({...format,text:line,break:i?1:undefined}));
      return [new TextRun({...format,text})];
    }
    if(!(node instanceof HTMLElement))return [];
    if(node.tagName==='BR')return [new TextRun({break:1})];
    if(node instanceof HTMLImageElement)return [await image(node)];
    const tag=node.tagName,opts:{-readonly [K in keyof IRunOptions]:IRunOptions[K]}={...format};
    if(tag==='B'||tag==='STRONG')opts.bold=true;
    if(tag==='I'||tag==='EM')opts.italics=true;
    if(tag==='U')opts.underline={};
    if(tag==='S')opts.strike=true;
    if(tag==='SUP')opts.superScript=true;
    if(tag==='SUB')opts.subScript=true;
    if(node.classList.contains('lead')&&s.smallCaps)opts.smallCaps=true;
    const runs=(await Promise.all(Array.from(node.childNodes,n=>inline(n,opts)))).flat();
    const href=node.getAttribute('href');
    if(tag==='A' && href && runs.every(r=>r instanceof TextRun)){
      if(/^https?:|^mailto:/i.test(href))return [new ExternalHyperlink({link:href,children:runs})];
      const anchor=ids.get(href.slice(1));if(anchor)return [new InternalHyperlink({anchor,children:runs})];
    }
    return runs;
  }
  type WordBlock=Paragraph|Table;
  let listId=0;
  const numberingDefinitions=new Map<string,INumberingOptions['config'][number]>();
  function listNumbering(ordered:boolean,depth:number,start:number){
    const level=Math.min(depth,8);
    const reference=ordered?'ordered-'+level+'-'+start:'bullets';
    if(!numberingDefinitions.has(reference)){
      const levels=Array.from({length:9},(_,i)=>({
        level:i,start:i===level?start:1,format:ordered?LevelFormat.DECIMAL:LevelFormat.BULLET,
        text:ordered?'%'+(i+1)+'.':'•',alignment:AlignmentType.LEFT,
        style:{paragraph:{indent:{left:360*(i+1),hanging:180}}}
      }));
      numberingDefinitions.set(reference,{reference,levels});
    }
    return {reference,level,instance:++listId};
  }
  // Cells and list items accept both inline runs and full blocks. Group adjacent
  // runs into a single paragraph, keeping their emphasis and their reading order.
  function paragraphsIn(container:HTMLElement){
    const wrapper=container.cloneNode(false) as HTMLElement;
    let paragraph:HTMLElement|undefined;
    for(const child of container.childNodes){
      if(child instanceof HTMLElement && child.matches('p,div,section,aside,figure,blockquote,pre,h1,h2,h3,h4,h5,h6,ol,ul,table')){
        paragraph=undefined;wrapper.append(child.cloneNode(true));continue;
      }
      if(!paragraph){
        if(child.nodeType===3&&!child.textContent?.trim())continue;
        paragraph=document.createElement('p');wrapper.append(paragraph);
      }
      paragraph.append(child.cloneNode(true));
    }
    return wrapper;
  }
  async function blocks(parent:HTMLElement,opts:IParagraphOptions={},level=0):Promise<WordBlock[]>{
    const result:WordBlock[]=[];
    for(const node of parent.childNodes){
      if(!(node instanceof HTMLElement)){if(node.textContent?.trim())result.push(new Paragraph({...opts,children:await inline(node)}));continue;}
      const tag=node.tagName,cls=node.className;
      if(tag==='TABLE'){
        const rows:TableRow[]=[];
        for(const tr of (node as HTMLTableElement).rows){
          const cells:TableCell[]=[];
          for(const td of tr.cells){
            const group=tr.parentElement as HTMLTableSectionElement;
            const remaining=group.rows.length-tr.sectionRowIndex;
            const nested=await blocks(paragraphsIn(td));
            cells.push(new TableCell({columnSpan:td.colSpan,rowSpan:Math.min(td.rowSpan||remaining,remaining),children:nested.length?nested:[new Paragraph('')]}));
          }
          rows.push(new TableRow({tableHeader:tr.parentElement?.tagName==='THEAD',children:cells}));
        }
        if(rows.length)result.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows}));continue;
      }
      if(tag==='UL'||tag==='OL'){
        const ordered=tag==='OL', reversed=ordered&&node.hasAttribute('reversed');
        const items=Array.from(node.children).filter(li=>li.tagName==='LI') as HTMLLIElement[];
        let counter=ordered&&node.hasAttribute('start')?(node as HTMLOListElement).start:reversed?items.length:1;
        let numbering=listNumbering(ordered,level,counter);
        for(const [i,li] of items.entries()){
          if(ordered&&li.hasAttribute('value'))counter=li.value;
          if(ordered&&(li.hasAttribute('value')||reversed&&i>0))numbering=listNumbering(true,level,counter);
          const wrapper=paragraphsIn(li);
          if(wrapper.firstElementChild?.tagName!=='P')wrapper.prepend(document.createElement('p'));
          const first=wrapper.firstElementChild!;
          result.push(new Paragraph({numbering,children:await inline(first)}));
          first.remove();
          result.push(...await blocks(wrapper,{indent:{left:360*(level+1)}},level+1));
          counter+=reversed?-1:1;
        }
        continue;
      }
      if(['ARTICLE','SECTION','FIGURE','NAV','HEADER'].includes(tag)||(['DIV','BLOCKQUOTE','ASIDE'].includes(tag)&&node.querySelector('p,div,h1,h2,h3,h4,h5,h6,ul,ol,table,pre,blockquote'))){
        const head=cls==='chapter-head',title=cls==='title-page';
        result.push(...await blocks(node,head||title?{alignment:title?AlignmentType.CENTER:alignment[s.chapterAlign]}:opts,level));continue;
      }
      const h=/^H[1-6]$/.test(tag),chapter=tag==='H1',open=node.classList.contains('opening');
      const block=h&&!chapter?s.blocks.Subheading:node.closest('blockquote')?s.blocks.Quote:node.closest('pre,.verse')?s.blocks.Verse:node.closest('.letter')?s.blocks.Letter:node.closest('aside,.aside')?s.blocks.Aside:undefined;
      const decoration=['ornament','number','scene'].includes(cls);
      const format:IRunOptions={font:h?s.headingFont:s.bodyFont,color:h?s.heading.slice(1):decoration?accent:ink,bold:h||!!node.closest('th'),italics:block?.italic,size:Math.round(2*(chapter?s.headingSize:s.size*(block?.size??1)))};
      let lead:TextRun|undefined;
      if(open && s.initial!=='Normal'){
        // Match the opening punctuation and the first letter with its combining marks as a single initial.
        const first=/^\s*(\p{P}*[^\s\p{P}]\p{M}*)/u.exec(node.textContent??'');
        if(first){
          let remaining=first[0].length;
          const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
          while(remaining&&walker.nextNode()){
            const text=walker.currentNode as Text,count=Math.min(text.length,remaining);
            text.deleteData(0,count);remaining-=count;
          }
          lead=new TextRun({text:first[1],font:s.headingFont,color:accent,size:Math.round(s.size*(s.initial==='Drop cap'?5:3.5))});
        }
      }
      const content=await inline(node,format);
      if(lead){
        if(s.initial==='Drop cap')result.push(new Paragraph({frame:{type:'alignment',alignment:{x:'left',y:'top'},anchor:{horizontal:'text',vertical:'text'},lines:3,dropCap:'drop',space:{horizontal:55,vertical:0}},children:[lead]}));
        else content.unshift(lead);
      }
      const decorated=cls==='scene';
      const header=node.parentElement;
      const chapterHeader=header?.classList.contains('chapter-head');
      const titlePage=header?.classList.contains('title-page');
      const headerStart=(chapterHeader||titlePage)&&node===header?.firstElementChild;
      const titleEnd=chapterHeader&&node===header?.lastElementChild;
      // Word paginates paragraphs separately. Bind the caption to its adjacent
      // figure content in either caption order, stopping at the figure boundary.
      const nextInFigure=header?.tagName==='FIGURE'?node.nextElementSibling:null;
      const keepWithCaption=nextInFigure!==null&&(tag==='FIGCAPTION'||nextInFigure.tagName==='FIGCAPTION');
      const settings:IParagraphOptions={
        heading:h?headingLevels[Number(tag[1])-1]:undefined,keepNext:h||chapterHeader||keepWithCaption,
        alignment:decorated?AlignmentType.CENTER:opts.alignment??alignment[block?.align??s.align],
        indent:opts.indent??{firstLine:tag==='P'&&!node.closest('td,th')&&!block&&!opts.alignment&&(!open||s.firstIndent)?Math.round(s.indent*space):0},
        spacing:{line:Math.round(240*s.leading),before:headerStart?mm(height*(titlePage ? .19 : s.sink/100)):decorated?Math.round(space*s.dividerGap):undefined,after:Math.round(space*(titleEnd?s.chapterGap:decorated?s.dividerGap:s.paragraphGap))},
        border:block?.rule?{left:{style:BorderStyle.SINGLE,color:accent,size:8,space:6}}:undefined,
        children:content
      };
      result.push(new Paragraph(settings));
    }
    return result;
  }
  const sections:ISectionOptions[]=[];
  for(const section of book.sections){
    const root=document.createElement('article');root.innerHTML=section.html;
    const children=await blocks(root);
    children.unshift(new Paragraph({spacing:{line:1,after:0},children:[new Bookmark({id:ids.get(section.id)!,children:[new TextRun({text:'',size:2})]})]}));
    sections.push({properties:{titlePage:section.id==='matter-title-page',type:s.recto&&section.kind==='chapter'?SectionType.ODD_PAGE:SectionType.NEXT_PAGE,page:{size:{width:mm(width),height:mm(height)},margin:{top:mm(s.top),bottom:mm(s.bottom),left:mm(s.inner),right:mm(s.outer),header:mm(s.top/2),footer:mm(s.bottom/2)}}},
      headers:s.running?{default:new Header({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:book.title,size:18,color:accent})]})]})}:undefined,
      footers:s.folios?{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],size:18})]})]})}:undefined,children});
  }
  const documentFile=new Document({title:book.title,creator:book.author,styles:{default:{document:{run:{font:s.bodyFont,size:Math.round(s.size*2),color:ink,language:{value:book.lang}}}}},numbering:{config:[...numberingDefinitions.values()]},sections});
  // The packer's section API exposes left/right margins. Word uses this document setting to mirror them at the spine.
  const settings='<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:displayBackgroundShape/><w:mirrorMargins/><w:defaultTabStop w:val="720"/>'+
    '<w:autoHyphenation w:val="'+s.hyphens+'"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>';
  return Packer.toBlob(documentFile,false,[{path:'word/settings.xml',data:settings}]);
}
