import type {Novel} from './types';

export type LibrarySort='updated'|'title'|'series'|'author'|'created';
export type LibraryGroup='none'|'series'|'date'|'author';
const compare=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
const optional=(a:string|undefined,b:string|undefined)=>!a?.trim()?!b?.trim()?0:1:!b?.trim()?-1:compare(a.trim(),b.trim());

export function compareLibraryProjects(a:Novel,b:Novel,sort:LibrarySort) {
  const order=sort==='series'?optional(a.series,b.series)||optional(a.seriesIndex,b.seriesIndex):sort==='author'?optional(a.author,b.author):sort==='title'?0:sort==='created'?b.createdAt-a.createdAt:b.updatedAt-a.updatedAt;
  return order||compare(a.title,b.title);
}

/** Keep the selected project order inside each group; never mutate input data. */
export function groupLibraryProjects(projects:Novel[],group:LibraryGroup):[string,Novel[]][] {
  if(group==='none')return [['',projects]];
  const buckets=new Map<string,{label:string;projects:Novel[]}>();
  for(const novel of projects){
    const date=new Date(novel.updatedAt);
    const key=group==='date'?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`:group==='series'?novel.series?.trim()||'':novel.author?.trim()||'';
    const label=group==='date'?date.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}):key||(group==='series'?'No series':'Unknown Author');
    if(!buckets.has(key))buckets.set(key,{label,projects:[]});
    buckets.get(key)!.projects.push(novel);
  }
  return [...buckets].sort(([a],[b])=>group==='date'?b.localeCompare(a):optional(a,b)).map(([,value])=>[value.label,value.projects]);
}
