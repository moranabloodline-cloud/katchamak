"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, Info, Palette, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccountPreferences } from "@/lib/kachamak/account-preferences";
import { useKachamak } from "@/lib/kachamak/store";
import { AccountDialog, type AccountTab } from "./AccountDialog";

const entries = [
  { tab: "profile", label: "Profile", icon: UserRound },
  { tab: "appearance", label: "Appearance", icon: Palette },
  { tab: "storage", label: "Cloud storage", icon: Folder },
  { tab: "about", label: "About Katchamak", icon: Info },
] as const;

export function AccountAvatar({ photo, className = "h-10 w-10" }: { photo: string | null; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/30 ${className}`}>
    {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
  </span>;
}

export function AccountMenu() {
  const { displayName, photo } = useAccountPreferences();
  const author = useKachamak(s => s.defaultAuthor);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AccountTab>("profile");
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-white/5" aria-label="Account">
          <AccountAvatar photo={photo} className="h-6 w-6 text-[#e8c265]" />Account<ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[310px] max-w-[calc(100vw-24px)] rounded-xl border-[#494949] bg-[#303030] p-3 text-[#e5e5e5] shadow-2xl [font-family:Arial,sans-serif]">
        <div className="flex items-center gap-3 px-2 py-4">
          <AccountAvatar photo={photo} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName || author || "User Name"}</p><p className="mt-1 text-xs text-[#bfbfbf]">Account profile</p></div>
        </div>
        <DropdownMenuSeparator className="my-2 bg-white/10" />
        {entries.map(({ tab, label, icon: Icon }) => <DropdownMenuItem key={tab} onSelect={() => { setTab(tab); setOpen(true); }} className="h-12 cursor-pointer gap-3 rounded-md px-2 focus:bg-white/10 focus:text-white">
          <Icon className="size-4 text-[#ccc]" /><span>{label}</span><ChevronRight className="ml-auto size-4 text-[#aaa]" />
        </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
    <AccountDialog open={open} onOpenChange={setOpen} initialTab={tab} />
  </>;
}
