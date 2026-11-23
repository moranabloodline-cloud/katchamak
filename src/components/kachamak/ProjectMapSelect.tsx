'use client';
import type {Novel} from '@/lib/kachamak/types';
import {projectMaps} from '@/lib/kachamak/project-maps';

export function ProjectMapSelect({book,value,onChange}:{book:Novel;value?:string;onChange:(id:string)=>void}){
  const rows=projectMaps(book).filter(({node})=>node.image);
  return <label className="grid gap-1 text-sm">Map
    <select aria-label="Choose a project map" className="w-full rounded border border-border bg-background p-2" value={value??''} onChange={e=>onChange(e.target.value)}>
      <option value="" disabled>Choose map</option>
      {rows.map(({node,path})=><option key={node.id} value={node.id}>{path}</option>)}
    </select>
    {!rows.length&&<small className="text-muted-foreground">Create a map from a Gallery image in the Maps tab first.</small>}
  </label>;
}
