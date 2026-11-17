import type {DocumentTarget} from './types';
import {countWords,stripHtml} from './utils';

export const DEFAULT_DOCUMENT_TARGET:DocumentTarget={amount:0,unit:'words',minimum:0,allowance:0,showOverrun:false,showAllowance:false,notifications:false};
export function validDocumentTarget(value:unknown):value is DocumentTarget|undefined {
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as DocumentTarget;
  return [t.amount,t.minimum,t.allowance].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10_000_000)&&t.minimum<=t.amount&&['words','characters'].includes(t.unit)&&[t.showOverrun,t.showAllowance,t.notifications].every(v=>typeof v==='boolean');
}
export function documentTargetProgress(html:string,target:DocumentTarget){
  const count=target.unit==='words'?countWords(html):Array.from(stripHtml(html).trim()).length;
  const maximum=target.amount+(target.showAllowance?target.allowance:0);
  return {count,maximum,percent:maximum?Math.min(100,count/maximum*100):0,overrun:Math.max(0,count-target.amount)};
}
export function crossedTargetMilestones(before:number,after:number,target:DocumentTarget){
  if(!target.notifications||!target.amount)return [];
  return [{at:target.minimum,label:'Minimum target reached'},{at:target.amount,label:'Document target reached'},{at:target.amount+target.allowance,label:'Overrun allowance reached'}].filter((m,i)=>m.at>0&&before<m.at&&after>=m.at&&(i!==2||target.allowance>0)).map(m=>m.label);
}
