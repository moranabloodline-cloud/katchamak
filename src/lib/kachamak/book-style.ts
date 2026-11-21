import {z} from 'zod';
import {houseGenres} from './house-genres';

export const fonts = ['Georgia','Palatino Linotype','Times New Roman','Cambria','Arial','Trebuchet MS'] as const;
// Keep the intended serif/sans distinction on readers without Windows fonts.
export const fontStacks:Record<typeof fonts[number],string>={
  Georgia:'Georgia, "Times New Roman", serif',
  'Palatino Linotype':'"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  'Times New Roman':'"Times New Roman", Times, serif',
  Cambria:'Cambria, Georgia, serif',
  Arial:'Arial, Helvetica, sans-serif',
  'Trebuchet MS':'"Trebuchet MS", Arial, sans-serif'
};
export const trims = {
  '5 × 7 in':[127,177.8], '5 × 8 in':[127,203.2], '5.25 × 8 in':[133.35,203.2],
  '5.5 × 8.25 in':[139.7,209.55], '5.5 × 8.5 in':[139.7,215.9], '6 × 9 in':[152.4,228.6],
  '6.625 × 10.25 in':[168.275,260.35], '7 × 10 in':[177.8,254], '8.5 × 8.5 in':[215.9,215.9],
  A5:[148,210], A4:[210,297], 'US Letter':[215.9,279.4]
} as const;
export const alignments = ['left','center','right','justify'] as const;
export const ornaments = ['None','Rule','Diamonds','Stars','Fleuron'] as const;
export const glyphs = {None:'',Rule:'―',Diamonds:'◇',Stars:'✧  ✧  ✧',Fleuron:'❦'};
export const blockNames = ['Quote','Subheading','Letter','Verse','Aside'] as const;
export const specialPages = ['Title page','Copyright','Dedication','Contents','About the author','Colophon'] as const;
const number = (min:number,max:number)=>z.number().finite().min(min).max(max);
const color=z.string().regex(/^#[a-f0-9]{6}$/i);
const block=z.object({italic:z.boolean(),size:number(.7,2),align:z.enum(alignments),rule:z.boolean()});
const schema=z.object({
  sampleGenre:z.enum(houseGenres).optional(),
  bodyFont:z.enum(fonts), headingFont:z.enum(fonts), size:number(8,20), headingSize:number(14,48),
  leading:number(1,2.4), paragraphGap:number(0,2), indent:number(0,3), align:z.enum(alignments), hyphens:z.boolean(),
  numbering:z.enum(['Arabic','Roman','None']), chapterAlign:z.enum(['left','center','right']), sink:number(0,30),
  ornament:z.enum(ornaments), chapterGap:number(.3,4), chapterImage:z.string().regex(/^gallery:.+$/).optional(),
  initial:z.enum(['Normal','Drop cap','Raised cap']), smallCaps:z.boolean(), firstIndent:z.boolean(),
  divider:z.enum(ornaments), dividerGap:number(.25,4), blocks:z.object({Quote:block,Subheading:block,Letter:block,Verse:block,Aside:block}),
  trim:z.enum(Object.keys(trims) as [keyof typeof trims,...(keyof typeof trims)[]]),
  top:number(8,40),bottom:number(8,40),inner:number(8,40),outer:number(8,40),
  folios:z.boolean(),running:z.boolean(),recto:z.boolean(),ink:color,heading:color,accent:color,
  pages:z.array(z.enum(specialPages)).max(specialPages.length),
  copyright:z.string().max(10000),dedication:z.string().max(10000),biography:z.string().max(10000),colophon:z.string().max(10000)
});
export type BookStyle=z.infer<typeof schema>;
export type BlockName=typeof blockNames[number];
export type SpecialPage=typeof specialPages[number];
export const validBookStyle=(value:unknown):value is BookStyle=>schema.safeParse(value).success;
const basic={italic:false,size:1,align:'left' as const,rule:false};
export const baseStyle:BookStyle={
  bodyFont:'Georgia',headingFont:'Georgia',size:11,headingSize:24,leading:1.45,paragraphGap:0,indent:1.25,align:'justify',hyphens:true,
  numbering:'Roman',chapterAlign:'center',sink:9,ornament:'Rule',chapterGap:1.5,initial:'Normal',smallCaps:false,firstIndent:false,
  divider:'Diamonds',dividerGap:1.5,blocks:{Quote:{...basic,italic:true,rule:true},Subheading:{...basic,size:1.25},Letter:{...basic,italic:true},Verse:{...basic},Aside:{...basic,size:.9,rule:true}},
  trim:'6 × 9 in',top:19,bottom:22,inner:22,outer:16,folios:true,running:true,recto:false,ink:'#26231f',heading:'#28211c',accent:'#875f31',
  pages:['Title page','Contents'],copyright:'',dedication:'',biography:'',colophon:''
};
