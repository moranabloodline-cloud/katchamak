import type {Novel} from './types';
export type NovelSettingsPatch=Partial<Pick<Novel,'title'|'author'|'series'|'seriesIndex'|'language'|'genres'|'subgenres'|'chapterCount'|'archived'|'cover'>>;
export function validCoverImage(value:unknown) {
  return value===undefined||typeof value==='string'&&value.length<=700_000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
}
const labels=(value:unknown,limit:number)=>value===undefined||Array.isArray(value)&&value.length<=limit&&value.every(item=>typeof item==='string'&&!!item.trim()&&item.length<=100)&&new Set(value.map(item=>item.trim().toLocaleLowerCase())).size===value.length;
export function validNovelMetadata(value:{series?:unknown;seriesIndex?:unknown;language?:unknown;genres?:unknown;subgenres?:unknown;chapterCount?:unknown;archived?:unknown;cover?:{image?:unknown}}) {
  return (value.language===undefined||typeof value.language==='string'&&value.language.length<=100)&&labels(value.genres,4)&&labels(value.subgenres,12)&&(value.chapterCount===undefined||Number.isSafeInteger(value.chapterCount)&&Number(value.chapterCount)>=1&&Number(value.chapterCount)<=1000)&&(value.series===undefined||typeof value.series==='string'&&value.series.length<=200)&&
    (value.seriesIndex===undefined||typeof value.seriesIndex==='string'&&value.seriesIndex.length<=100)&&
    (value.archived===undefined||typeof value.archived==='boolean')&&validCoverImage(value.cover?.image);
}
export function novelSettingsPatch(novel:Novel,patch:NovelSettingsPatch):NovelSettingsPatch|null {
  const next={...novel,...patch};
  if(typeof next.title!=='string'||!next.title.trim()||next.title.length>200||typeof next.author!=='string'||next.author.length>200||!next.cover||typeof next.cover.bg!=='string'||typeof next.cover.icon!=='string'||!validNovelMetadata(next))return null;
  return {title:next.title.trim(),author:next.author.trim(),series:next.series?.trim()||'',seriesIndex:next.seriesIndex?.trim()||'',language:next.language?.trim(),genres:next.genres?.map(value=>value.trim()),subgenres:next.subgenres?.map(value=>value.trim()),chapterCount:next.chapterCount,archived:next.archived??false,cover:{...next.cover}};
}
/** A portable, bounded raster image: included in cloud snapshots and JSON backups. */
export async function readNovelCover(file:File):Promise<string> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 10 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    if(!bitmap.width||!bitmap.height)throw new Error('This image could not be read.');
    const scale=Math.min(1,960/bitmap.width,1440/bitmap.height),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable.');
    ctx.fillStyle='#161616';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [.88,.76,.6,.45]){const image=canvas.toDataURL('image/jpeg',quality);if(validCoverImage(image))return image;}
    throw new Error('This cover is too detailed. Choose a smaller image.');
  }finally{bitmap.close();}
}
