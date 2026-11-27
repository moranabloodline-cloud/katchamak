import {validCurrency} from './finance';
import {clearPastedChartMatte} from './paste-chart-matte';
import type {Novel} from './types';
export type NovelSettingsPatch=Partial<Pick<Novel,'title'|'author'|'series'|'seriesIndex'|'language'|'genres'|'subgenres'|'chapterCount'|'targetAudience'|'tones'|'writingStyles'|'plotTechniques'|'sellingPoints'|'explicitContent'|'archived'|'cover'|'financeCurrency'>>;
import {validProjectImage, validCoverImage, availableProjectImage} from './project-image';
export {validCoverImage} from './project-image';
const labels=(value:unknown,limit:number)=>value===undefined||Array.isArray(value)&&value.length<=limit&&value.every(item=>typeof item==='string'&&!!item.trim()&&item.length<=100)&&new Set(value.map(item=>item.trim().toLocaleLowerCase())).size===value.length;
export function validNovelMetadata(value:{series?:unknown;seriesIndex?:unknown;language?:unknown;genres?:unknown;subgenres?:unknown;chapterCount?:unknown;targetAudience?:unknown;tones?:unknown;writingStyles?:unknown;plotTechniques?:unknown;sellingPoints?:unknown;explicitContent?:unknown;archived?:unknown;cover?:{image?:unknown}}) {
  return (value.targetAudience===undefined||typeof value.targetAudience==='string'&&value.targetAudience.length<=2000)&&(value.explicitContent===undefined||typeof value.explicitContent==='boolean')&&labels(value.tones,8)&&labels(value.writingStyles,12)&&labels(value.plotTechniques,12)&&labels(value.sellingPoints,12)&&(value.language===undefined||typeof value.language==='string'&&value.language.length<=100)&&labels(value.genres,4)&&labels(value.subgenres,12)&&(value.chapterCount===undefined||Number.isSafeInteger(value.chapterCount)&&Number(value.chapterCount)>=1&&Number(value.chapterCount)<=1000)&&(value.series===undefined||typeof value.series==='string'&&value.series.length<=200)&&
    (value.seriesIndex===undefined||typeof value.seriesIndex==='string'&&value.seriesIndex.length<=100)&&
    (value.archived===undefined||typeof value.archived==='boolean')&&validProjectImage(value.cover?.image);
}
export function novelSettingsPatch(novel:Novel,patch:NovelSettingsPatch):NovelSettingsPatch|null {
  const next={...novel,...patch};
  if(typeof next.title!=='string'||!next.title.trim()||next.title.length>200||typeof next.author!=='string'||next.author.length>200||!next.cover||typeof next.cover.bg!=='string'||typeof next.cover.icon!=='string'||(next.financeCurrency!==undefined&&!validCurrency(next.financeCurrency))||!validNovelMetadata(next)||!availableProjectImage(novel.gallery,next.cover.image))return null;
  return {...(next.financeCurrency?{financeCurrency:next.financeCurrency}:{}),title:next.title.trim(),author:next.author.trim(),series:next.series?.trim()||'',seriesIndex:next.seriesIndex?.trim()||'',language:next.language?.trim(),genres:next.genres?.map(value=>value.trim()),subgenres:next.subgenres?.map(value=>value.trim()),chapterCount:next.chapterCount,targetAudience:next.targetAudience?.trim(),tones:next.tones?.map(value=>value.trim()),writingStyles:next.writingStyles?.map(value=>value.trim()),plotTechniques:next.plotTechniques?.map(value=>value.trim()),sellingPoints:next.sellingPoints?.map(value=>value.trim()),explicitContent:next.explicitContent,archived:next.archived??false,cover:{...next.cover}};
}
/** A portable, bounded raster image: included in cloud snapshots and JSON backups. */
export function readNovelCover(file:File,bounds={width:960,height:1440}):Promise<string> {
  return readProjectImage(file,bounds,false);
}

// Account avatars are independent of a book and have a 200,000-character profile limit.
export async function galleryAvatar(src:string):Promise<string> {
  if(src.length<=200_000)return src;
  const img=new Image();
  img.src=src;
  await img.decode();
  const scale=Math.min(1,160/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(scale*img.naturalWidth));
  canvas.height=Math.max(1,Math.round(scale*img.naturalHeight));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('The avatar could not be prepared.');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/webp',0.85);
}

// Keep the original WebP and its embedded credits when a replacement already fits the gallery.
export async function readGalleryReplacement(file:File):Promise<string>{
  if(file.type==='image/webp'&&file.size<=524_970){
    const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
    if(String.fromCharCode(...header.slice(0,4))==='RIFF'&&String.fromCharCode(...header.slice(8,12))==='WEBP'){
      const bitmap=await createImageBitmap(file);
      const fits=bitmap.width>0&&bitmap.height>0&&bitmap.width<=2400&&bitmap.height<=1600;
      bitmap.close();
      if(fits)return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result));
        reader.onerror=()=>reject(new Error('The gallery image could not be read.'));
        reader.readAsDataURL(file);
      });
    }
  }
  return readHomepageImage(file);
}

export function readHomepageImage(file:File):Promise<string> {
  return readProjectImage(file,{width:2400,height:1600},true);
}

async function readProjectImage(file:File,bounds:{width:number;height:number},homepage:boolean):Promise<string> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 10 MB.');
  return encodeProjectBitmap(await createImageBitmap(file),file.type,bounds,homepage);
}

export function encodeHomepageCutout(bitmap:ImageBitmap):string {
  return encodeProjectBitmap(bitmap,'image/png',{width:2400,height:1600},true);
}

export function encodePastedImage(bitmap: ImageBitmap, mime: string, chartSnapshot = false): string {
  return encodeProjectBitmap(bitmap, mime === 'image/jpeg' ? mime : 'image/webp', {width:1280,height:960},true,
    chartSnapshot && mime.toLowerCase().split(';',1)[0]==='image/png');
}

function encodeProjectBitmap(bitmap:ImageBitmap,mime:string,bounds:{width:number;height:number},homepage:boolean,chartMatte=false):string {
  try{
    if(!bitmap.width||!bitmap.height)throw new Error('This image could not be read.');
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Image processing is unavailable.');
    const keepAlpha=homepage && mime!=='image/jpeg';
    let scale=Math.min(1,bounds.width/bitmap.width,bounds.height/bitmap.height);
    do {
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      if(!keepAlpha){
        ctx.fillStyle='#161616';
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      let clearedMatte = false;
      if(chartMatte){
        const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
        clearedMatte = clearPastedChartMatte(pixels);
        if(clearedMatte)ctx.putImageData(pixels,0,0);
      }
      if(keepAlpha && (mime==='image/png' || clearedMatte)){
        const png=canvas.toDataURL('image/png');
        if(validCoverImage(png))return png;
      }
      for(const quality of [.88,.76,.6,.45]){
        const image=canvas.toDataURL(keepAlpha?'image/webp':'image/jpeg',quality);
        if(validCoverImage(image))return image;
      }
      scale*=0.75;
    } while(homepage && (canvas.width>1 || canvas.height>1));
    throw new Error('This image is too detailed. Choose a smaller image.');
  }finally{bitmap.close();}
}

export const PROJECT_BACKUP_ATTACHMENT_NOTICE = 'JSON backups do not include files uploaded to Project files. With the project open, go to My Account → Storage → Project files and click each filename to download it separately.';
