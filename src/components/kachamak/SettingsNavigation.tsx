'use client';

import {useState} from 'react';
import {Archive, BookOpen, CircleHelp, Database, Fingerprint, Mail, Palette, Plug, Search, ShieldCheck, Ticket, UserRound, type LucideIcon} from 'lucide-react';

export type SettingsPage = 'profile' | 'security' | 'membership' | 'admin' | 'appearance' | 'project' | 'notifications' | 'about' | 'storage' | 'backups' | 'integrations';
type SettingsEntry = {id: SettingsPage; label: string; icon: LucideIcon; search?: string; project?: true; admin?: true};

const sections: {label: string; pages: SettingsEntry[]}[] = [
  {label:'Profile', pages:[
    {id:'profile', label:'Personal details', icon:UserRound, search:'avatar display name author email'},
  ]},
  {label:'Account', pages:[
    {id:'security', label:'Sign-in & security', icon:Fingerprint, search:'password email sign out'},
    {id:'membership', label:'Membership', icon:Ticket, search:'license plan'},
    {id:'admin', label:'Administration', icon:ShieldCheck, admin:true, search:'licenses users access demo'},
  ]},
  {label:'App', pages:[
    {id:'appearance', label:'Appearance', icon:Palette, search:'theme dark light interface size'},
    {id:'project', label:'Project settings', icon:BookOpen, project:true, search:'book novel title author series cover archive delete'},
    {id:'notifications', label:'Notifications', icon:Mail, search:'email preferences tips'},
    {id:'about', label:'About Draftopus', icon:CircleHelp, search:'version updates'},
  ]},
  {label:'Data & Privacy', pages:[
    {id:'storage', label:'Cloud storage', icon:Database, search:'files attachments save reload local recovery drafts'},
    {id:'backups', label:'Backups & export', icon:Archive, project:true, search:'manuscript import JSON download'},
  ]},
  {label:'Integrations', pages:[
    {id:'integrations', label:'Connected services', icon:Plug, search:'ChatGPT Gmail'},
  ]},
];

export function SettingsNavigation({page, onSelect, project, admin, busy}: {
  page: SettingsPage; onSelect: (page: SettingsPage) => void; project: boolean; admin: boolean; busy: boolean;
}) {
  const [query,setQuery]=useState('');
  const available=sections.map(section=>({...section,pages:section.pages.filter(item=>
    (!item.project || project) && (!item.admin || admin))})).filter(section=>section.pages.length);
  const words=query.toLowerCase().trim().split(/\s+/);
  const results=available.map(section=>({...section,pages:section.pages.filter(item=>{
    const copy=`${section.label} ${item.label} ${item.search ?? ''}`.toLowerCase();
    return words.every(word=>copy.includes(word));
  })})).filter(section=>section.pages.length);

  return <nav aria-label="Settings sections" className="min-h-0 border-b border-border bg-muted/45 p-4 md:col-start-2 md:row-start-1 md:overflow-y-auto md:border-b-0 md:border-l">
    <label className="relative block md:hidden">
      <span className="sr-only">Settings section</span>
      <select value={page} disabled={busy} onChange={event=>onSelect(event.target.value as SettingsPage)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
        {available.map(section=><optgroup key={section.label} label={section.label}>
          {section.pages.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
        </optgroup>)}
      </select>
    </label>
    <div className="hidden md:block">
      <form role="search" className="relative mb-5" onSubmit={event=>{
        event.preventDefault();
        if (!busy && results[0]) onSelect(results[0].pages[0].id);
      }}>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"/>
        <input type="search" aria-label="Search settings" placeholder="Search settings" value={query} onChange={event=>setQuery(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-amber-500"/>
      </form>
      {results.length ? <div className="space-y-5">{results.map(section=><section key={section.label}>
        <h3 className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">{section.label}</h3>
        {section.pages.map(({id,label,icon:Icon})=><button key={id} type="button" disabled={busy} aria-current={page===id?'page':undefined}
          onClick={()=>onSelect(id)} className="flex min-h-9 w-full items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-left text-sm hover:bg-background focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-60 aria-[current=page]:border-amber-500 aria-[current=page]:bg-background aria-[current=page]:font-semibold">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/>{label}
        </button>)}
      </section>)}</div> : <p className="px-2 text-sm text-muted-foreground">No settings match your search.</p>}
    </div>
  </nav>;
}
