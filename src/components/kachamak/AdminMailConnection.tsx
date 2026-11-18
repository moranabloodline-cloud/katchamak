'use client';
import { requestJson } from '@/lib/kachamak/request-json';
import {useEffect,useState} from 'react';
export function AdminMailConnection(){
  const [sender,setSender]=useState<{connected:boolean;email:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let alive=true;requestJson('/api/admin/gmail/status',{cache:'no-store'}).then(({response:r,data})=>{if(!r.ok)throw new Error(data.error||'Could not check email sender.');if(alive)setSender(data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  const connect=async()=>{setBusy(true);setError('');try{const {response:r,data}=await requestJson('/api/admin/gmail/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw new Error(data.error||'Could not connect Gmail.');const url=new URL(data.url);if(url.origin!=='https://accounts.google.com')throw new Error('Invalid Google connection.');window.location.assign(url.href);}catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false);}};
  return <section aria-label="Access email sender" className="rounded-lg border border-white/10 p-3 text-sm"><h3 className="font-medium">Access emails</h3>{sender&&<p className="mt-1 text-xs text-stone-400">{sender.connected?'Send link uses ':'Approve sending from '}{sender.email}{sender.connected?'.':' once. Then use Send link beside each license.'}</p>}{sender&&<button className="mt-2 rounded border border-amber-400/25 px-3 py-1.5 text-xs disabled:opacity-40" type="button" disabled={busy} onClick={()=>void connect()}>{busy?'Opening Google…':sender.connected?'Reconnect Gmail':'Connect Gmail'}</button>}{error&&<p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}</section>;
}
