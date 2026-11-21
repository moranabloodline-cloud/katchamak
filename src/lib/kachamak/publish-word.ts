import {AlignmentType,Bookmark,BorderStyle,Document,ExternalHyperlink,Footer,Header,HeadingLevel,ImageRun,InternalHyperlink,LevelFormat,Packer,PageNumber,Paragraph,SectionType,Table,TableCell,TableRow,TextRun,WidthType,type IParagraphOptions,type IRunOptions,type ISectionOptions,type ParagraphChild} from 'docx';
import {type BookStyle,trims} from './book-style';
import {imageBytes} from './publish-export';
import type {Publication} from './publication';

const mm=(n:number)=>Math.round(n*1440/25.4);
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
    if(node.nodeType===3)return [new TextRun({...format,text:node.textContent??''})];
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
  async function blocks(parent:HTMLElement,opts:IParagraphOptions={},level=0):Promise<WordBlock[]>{
    const result:WordBlock[]=[];
    for(const node of parent.childNodes){
      if(!(node instanceof HTMLElement)){if(node.textContent?.trim())result.push(new Paragraph({...opts,children:await inline(node)}));continue;}
      const tag=node.tagName,cls=node.className;
      if(tag==='TABLE'){
        const rows:TableRow[]=[];
        for(const tr of (node as HTMLTableElement).rows){const cells:TableCell[]=[];
          for(const td of tr.cells){const nested=await blocks(td);cells.push(new TableCell({columnSpan:td.colSpan,children:nested.length?nested:[new Paragraph('')]}));}
          rows.push(new TableRow({children:cells}));
        }
        if(rows.length)result.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows}));continue;
      }
      if(tag==='UL'||tag==='OL'){
        const instance=++listId;
        for(const li of node.children){const shallow=li.cloneNode(true) as HTMLElement;shallow.querySelectorAll('ol,ul').forEach(l=>l.remove());
          result.push(new Paragraph({numbering:{reference:tag==='OL'?'ordered':'bullets',level:Math.min(level,8),instance},children:await inline(shallow)}));
          for(const child of li.children)if(['OL','UL'].includes(child.tagName)){const wrap=document.createElement('div');wrap.append(child.cloneNode(true));result.push(...await blocks(wrap,{},level+1));}
        }continue;
      }
      if(['ARTICLE','SECTION','FIGURE','NAV','HEADER'].includes(tag)||(tag==='DIV'&&!['ornament','number','scene'].includes(cls)&&node.querySelector('p,div,h1,ul,ol,table'))){
        const head=cls==='chapter-head',title=cls==='title-page';
        result.push(...await blocks(node,head||title?{alignment:title?AlignmentType.CENTER:alignment[s.chapterAlign],spacing:{before:Math.round(mm(height*(title ? .19 : s.sink/100))),after:Math.round(space*s.chapterGap)}}:opts));continue;
      }
      const h=/^H[1-6]$/.test(tag),chapter=tag==='H1',open=cls==='opening';
      const block=tag==='BLOCKQUOTE'?s.blocks.Quote:tag==='PRE'||cls==='verse'?s.blocks.Verse:cls==='letter'?s.blocks.Letter:tag==='ASIDE'||cls==='aside'?s.blocks.Aside:h&&!chapter?s.blocks.Subheading:undefined;
      const decoration=['ornament','number','scene'].includes(cls);
      const format:IRunOptions={font:h?s.headingFont:s.bodyFont,color:h?s.heading.slice(1):decoration?accent:ink,bold:h,italics:block?.italic,size:Math.round(2*(chapter?s.headingSize:s.size*(block?.size??1)))};
      let lead:TextRun|undefined;
      if(open && s.initial!=='Normal'){
        const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
        let text:Text|null;
        while((text=walker.nextNode() as Text|null)){
          const initial=/^(\s*)(\S)/u.exec(text.data);
          if(!initial)continue;
          text.deleteData(initial[1].length,initial[2].length);
          lead=new TextRun({text:initial[2],font:s.headingFont,color:accent,size:Math.round(s.size*(s.initial==='Drop cap'?5:3.5))});
          break;
        }
      }
      const content=await inline(node,format);
      if(lead){
        if(s.initial==='Drop cap')result.push(new Paragraph({frame:{type:'alignment',alignment:{x:'left',y:'top'},anchor:{horizontal:'text',vertical:'text'},lines:3,dropCap:'drop',space:{horizontal:55,vertical:0}},children:[lead]}));
        else content.unshift(lead);
      }
      const decorated=cls==='scene';
      const settings:IParagraphOptions={
        heading:h?(chapter?HeadingLevel.HEADING_1:HeadingLevel.HEADING_2):undefined,keepNext:h,
        alignment:decorated?AlignmentType.CENTER:opts.alignment??alignment[block?.align??s.align],
        indent:{firstLine:tag==='P'&&!opts.alignment&&(!open||s.firstIndent)?Math.round(s.indent*space):0},
        spacing:{line:Math.round(240*s.leading),before:decorated?Math.round(space*s.dividerGap):undefined,after:Math.round(space*(decorated?s.dividerGap:s.paragraphGap)),...opts.spacing},
        border:block?.rule?{left:{style:BorderStyle.SINGLE,color:accent,size:8,space:6}}:undefined,
        children:content
      };
      result.push(new Paragraph(settings));
      // Chapter sink is applied once, before the first title element.
      if(opts.spacing)opts={...opts,spacing:{after:0}};
    }
    return result;
  }
  const sections:ISectionOptions[]=[];
  for(const section of book.sections){
    const root=document.createElement('article');root.innerHTML=section.html;
    const children=await blocks(root);
    children.unshift(new Paragraph({spacing:{line:1,after:0},children:[new Bookmark({id:ids.get(section.id)!,children:[new TextRun({text:'',size:2})]})]}));
    sections.push({properties:{type:s.recto&&section.kind==='chapter'?SectionType.ODD_PAGE:SectionType.NEXT_PAGE,page:{size:{width:mm(width),height:mm(height)},margin:{top:mm(s.top),bottom:mm(s.bottom),left:mm(s.inner),right:mm(s.outer),header:mm(s.top/2),footer:mm(s.bottom/2)}}},
      headers:s.running?{default:new Header({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:book.title,size:18,color:accent})]})]})}:undefined,
      footers:s.folios?{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],size:18})]})]})}:undefined,children});
  }
  return Packer.toBlob(new Document({hyphenation:{autoHyphenation:s.hyphens},title:book.title,creator:book.author,styles:{default:{document:{run:{font:s.bodyFont,size:Math.round(s.size*2),color:ink,language:{value:book.lang}}}}},numbering:{config:['ordered','bullets'].map(reference=>({reference,levels:Array.from({length:9},(_,level)=>({level,format:reference==='ordered'?LevelFormat.DECIMAL:LevelFormat.BULLET,text:reference==='ordered'?'%'+(level+1)+'.':'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360*(level+1),hanging:180}}}}))}))},sections}));
}
