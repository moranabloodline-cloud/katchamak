"use client";

import { useEffect, useState } from "react";
import { useWebLibrary, saveWebLibrary } from "@/lib/kachamak/cloud-library";
import { toast } from "sonner";
import { watchApplicationUpdates } from "@/lib/kachamak/application-updates";

export function ApplicationUpdates() {
  const [available,setAvailable]=useState(false),[working,setWorking]=useState(false);
  const ready=useWebLibrary(s=>s.ready);
  useEffect(() => {
    const current=process.env.NEXT_PUBLIC_APPLICATION_SOURCE_TREE;
    if(process.env.NODE_ENV!=='production'||!current||('__TAURI_INTERNALS__' in window))return;
    return watchApplicationUpdates({current,fetchVersion:async()=>{
      const response=await fetch('/api/app-version',{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('Version unavailable');return response.json();
    },canReload:()=>true,reload:()=>setAvailable(true),target:window,intervalMs:60000});
  },[]);
  if(!available||!ready)return null;
  return <div role="status" className="fixed bottom-12 right-4 z-[90] max-w-sm rounded-xl border border-amber-400/25 bg-background p-4 text-sm text-foreground shadow-xl"><p>A new version of Katchamak is ready.</p><div className="mt-3 flex gap-3"><button disabled={working} className="rounded bg-amber-400 px-3 py-1.5 text-black disabled:opacity-40" onClick={async()=>{setWorking(true);try{await saveWebLibrary();window.location.reload();}catch(error){toast.error(String(error));setWorking(false);}}}>{working?'Saving…':'Save & reload'}</button><button onClick={()=>setAvailable(false)} className="text-muted-foreground">Later</button></div></div>;
}
