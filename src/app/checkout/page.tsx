'use client';

import {useCallback, useEffect, useState} from 'react';
import {requestJson} from '@/lib/kachamak/request-json';

type Edition = 'founder'|'standard';
type Checkout =
  | {state:'offer'; edition:Edition; amountMinor:number}
  | {state:'pending'; edition:Edition; transactionId:string; clientToken:string}
  | {state:'unavailable'|'ineligible'|'complete'|'reserved'|'settling'|'preparing'|'canceled'|'available'};
type PaddleClient = {
  Initialize: (options:{token:string;eventCallback:(event:{name:string})=>void})=>void;
  Checkout: {open: (options:{transactionId:string;settings:{allowLogout:false}})=>void};
};

let paddleScript:Promise<PaddleClient>|undefined;
let paddleInitialized=false;
let paymentCompleted:(()=>void)|undefined;

function loadPaddle() {
  if(paddleScript)return paddleScript;
  paddleScript=new Promise<PaddleClient>((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.paddle.com/paddle/v2/paddle.js';
    script.onload=()=>{
      const sdk=(window as Window&{Paddle?:PaddleClient}).Paddle;
      if(sdk)resolve(sdk);
      else {script.remove();paddleScript=undefined;reject(new Error('Paddle Checkout could not load.'));}
    };
    script.onerror=()=>{script.remove();paddleScript=undefined;reject(new Error('Paddle Checkout could not load.'));};
    document.head.append(script);
  });
  return paddleScript;
}

const editionName=(edition:Edition)=>edition==='founder'?"Founder's Edition":'Standard Edition';
const button='rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50';
const descriptions:Record<Exclude<Checkout['state'],'offer'|'pending'>,string> = {
  unavailable:'Purchases are currently unavailable.',
  ineligible:'Your account already has access to Draftopus.',
  complete:'Paddle confirmed your purchase. Your license is in Settings → Membership & License.',
  reserved:'The remaining Founder places are reserved by open checkouts. Check availability again shortly.',
  settling:'Paddle is processing your payment. Your license will appear once it is confirmed.',
  preparing:'Your checkout is being prepared.',
  canceled:'Your Paddle checkout was canceled.',
  available:'Check the current offer to begin a new checkout.',
};

export default function CheckoutPage() {
  const [checkout,setCheckout]=useState<Checkout|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [poll,setPoll]=useState(false);

  const query=useCallback(async (action?:'start'|'verify'|'cancel',edition?:Edition)=>{
    const result=await requestJson('/api/account/billing',action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,edition})}:undefined,25000);
    if(!result.response.ok||!result.data.state)throw new Error(result.data.error||'Could not reach checkout. Please retry.');
    return result.data as Checkout;
  },[]);
  const run=useCallback(async (work:()=>Promise<void>)=>{
    setBusy(true);setError('');
    try{await work();}
    catch(err){setError(err instanceof Error?err.message:'Checkout could not continue.');}
    finally{setBusy(false);}
  },[]);
  const refresh=useCallback(async ()=>{
    const current=await query();
    setCheckout(current.state==='pending'?await query('verify'):current);
  },[query]);
  useEffect(()=>{void run(refresh);},[run,refresh]);

  useEffect(()=>{
    if(!poll&&checkout?.state!=='settling')return;
    if(checkout?.state==='complete'||checkout?.state==='canceled'){setPoll(false);return;}
    let stopped=false, attempts=0, timer:ReturnType<typeof setTimeout>;
    async function check(){
      try{
        const next=await query('verify');
        if(stopped)return;
        setCheckout(next);
        if(next.state==='complete'||next.state==='canceled'||next.state==='available'){setPoll(false);return;}
      }catch{/* Transient provider errors can recover on the next poll. */}
      if(!stopped&&++attempts<15)timer=setTimeout(check,3500);
    }
    timer=setTimeout(check,1500);
    return ()=>{stopped=true;clearTimeout(timer);};
  },[poll,checkout?.state,query]);

  async function openPayment(state:Extract<Checkout,{state:'pending'}>) {
    const sdk=await loadPaddle();
    paymentCompleted=()=>{setPoll(true);void run(async()=>setCheckout(await query('verify')));};
    if(!paddleInitialized){
      sdk.Initialize({token:state.clientToken,eventCallback:event=>{if(event.name==='checkout.completed')paymentCompleted?.();}});
      paddleInitialized=true;
    }
    sdk.Checkout.open({transactionId:state.transactionId,settings:{allowLogout:false}});
  }

  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 bg-[#131314] p-5 font-sans text-stone-100">
    <header>
      <a href="/" className="text-sm text-amber-300 underline-offset-4 hover:underline">← Back to Draftopus</a>
      <h1 className="mt-3 text-xl font-semibold">Draftopus lifetime license</h1>
    </header>
    <section className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
      {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
      {!checkout&&<p role="status">{busy?'Loading checkout…':'Checkout is unavailable.'}</p>}
      {checkout?.state==='offer'&&<>
        <h2 className="font-semibold">{editionName(checkout.edition)}</h2>
        <p className="text-lg font-semibold">{new Intl.NumberFormat(undefined,{style:'currency',currency:'EUR'}).format(checkout.amountMinor/100)}</p>
        <p className="text-sm text-stone-300">One-time purchase. Paddle shows your total before payment.</p>
        <button className={button} disabled={busy} onClick={()=>void run(async()=>{
          const next=await query('start',checkout.edition);setCheckout(next);
          if(next.state==='pending')await openPayment(next);
        })}>Continue to Paddle</button>
      </>}
      {checkout?.state==='pending'&&<>
        <h2 className="font-semibold">{editionName(checkout.edition)}</h2>
        <p className="text-sm text-stone-300">Awaiting payment confirmation.</p>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy} onClick={()=>void run(async()=>{
            const next=await query('verify');setCheckout(next);
            if(next.state==='pending')await openPayment(next);
          })}>Open Paddle checkout</button>
          <button className={button} disabled={busy} onClick={()=>void run(refresh)}>Check payment</button>
          <button className={button} disabled={busy} onClick={()=>void run(async()=>setCheckout(await query('cancel')))}>Cancel checkout</button>
        </div>
      </>}
      {checkout&&checkout.state!=='offer'&&checkout.state!=='pending'&&<p role="status" className="text-sm">{descriptions[checkout.state]}</p>}
      {(!checkout||['settling','reserved','preparing','canceled','available'].includes(checkout.state))&&
        <button className={button} disabled={busy} onClick={()=>void run(refresh)}>Refresh status</button>}
    </section>
  </main>;
}
