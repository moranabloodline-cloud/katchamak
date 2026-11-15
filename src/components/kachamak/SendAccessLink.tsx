'use client';
import {useRef,useState} from 'react';
export function SendAccessLink({email,disabled=false}:{email:string;disabled?:boolean}) {
  const [busy,setBusy]=useState(false),[result,setResult]=useState<{ok:boolean;text:string}|null>(null);
  const request=useRef<string|null>(null);
  const send=async()=>{if(busy)return;setBusy(true);setResult(null);request.current??=crypto.randomUUID();try{const response=await fetch('/api/admin/send-access-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,requestId:request.current})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Email could not be sent.');setResult({ok:true,text:'Email accepted for sending to '+data.email+'.'});request.current=null;}catch(e){setResult({ok:false,text:e instanceof Error?e.message:String(e)});}finally{setBusy(false);}};
  return <div className="max-w-full"><button type="button" className="rounded border border-amber-400/25 px-3 py-1.5 text-xs hover:bg-amber-400/10 disabled:opacity-40" disabled={disabled||busy} onClick={()=>void send()}>{busy?'Sending…':'Send access link'}</button>{result&&<p role={result.ok?'status':'alert'} className={'mt-2 max-w-sm text-xs '+(result.ok?'text-emerald-200':'text-red-300')}>{result.text}</p>}</div>;
}
