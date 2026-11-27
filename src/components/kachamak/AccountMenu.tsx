"use client";

import {useState} from 'react';
import {UserRound} from 'lucide-react';
import {useAccountPreferences} from '@/lib/kachamak/account-preferences';
import {useKachamak} from '@/lib/kachamak/store';
import {WebAccountDialog} from './WebAccountDialog';

export function AccountMenu({workspace=false}: {workspace?:boolean}) {
  const {displayName,photo}=useAccountPreferences();
  const author=useKachamak(s=>s.defaultAuthor);
  const [open,setOpen]=useState(false);
  const initials=(displayName||author).trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  const trigger=<button type="button" aria-label="Account settings" title="Account settings"
    className={workspace?'workspace-action group':'group grid size-10 place-items-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-amber-500'}>
    <span aria-hidden="true" className="grid size-7 place-items-center overflow-hidden rounded-full border border-amber-400/60 bg-muted text-[10px] font-bold leading-none text-foreground group-hover:border-amber-400">
      {photo?<img src={photo} alt="" className="size-full object-cover"/>:initials||<UserRound className="size-4"/>}
    </span>
  </button>;
  return <WebAccountDialog open={open} onOpenChange={setOpen} trigger={trigger}/>;
}
