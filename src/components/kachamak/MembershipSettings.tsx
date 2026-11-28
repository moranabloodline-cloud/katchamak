'use client';

import {useEffect, useState} from 'react';
import {Award, Check, Crown, Ticket} from 'lucide-react';
import {requestJson} from '@/lib/kachamak/request-json';

type Membership = {
  edition: 'founder' | 'standard' | 'administrator' | 'manual' | 'none';
  status: 'active' | 'expired' | 'refunded' | 'revoked' | 'none';
  plan: 'lifetime' | 'timed' | 'none';
  expiresAt: number | null;
  founderNumber?: number | null;
  invoiceAvailable?: boolean;
  purchase?: {date:number; amountMinor:number; currency:string; licenseId:string|null};
};

const card = 'rounded-xl border border-border bg-card/60 p-3.5 text-xs';
const statuses = {active:'Active', expired:'Expired', refunded:'Refunded', revoked:'Revoked', none:'No license'};
const dateLabel = (timestamp:number) => new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(timestamp);

export function MembershipSettings() {
  const [record,setRecord]=useState<Membership|null>(null);
  const [error,setError]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const [billingAvailable,setBillingAvailable]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      const {response,data}=await requestJson('/api/account?include=membership',{signal:controller.signal});
      if(controller.signal.aborted)return;
      if(!response.ok||!data.membership)throw new Error();
      setRecord(data.membership);
      setBillingAvailable(data.billingAvailable===true);
      if(!data.billingAvailable||data.membership.purchase||data.membership.status==='active')return;
      // Resume confirmations when a buyer returns after closing checkout.
      const confirmation=await requestJson('/api/account/billing',{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'verify'}), signal:controller.signal,
      });
      if(confirmation.response.ok&&confirmation.data.state==='complete'&&!controller.signal.aborted){
        const updated=await requestJson('/api/account?include=membership',{signal:controller.signal});
        if(updated.response.ok&&updated.data.membership&&!controller.signal.aborted)setRecord(updated.data.membership);
      }
    }
    void load().catch(()=>{if(!controller.signal.aborted)setError(true);});
    return ()=>controller.abort();
  },[attempt]);

  return <section aria-labelledby="membership-title" className="mx-auto max-w-[28rem] space-y-3">
    <header>
      <h2 id="membership-title" className="text-base font-semibold">Membership &amp; License</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Manage your Draftopus membership and license information.</p>
    </header>
    {record ? <>
      <MembershipCards record={record}/>
      {billingAvailable&&!record.purchase&&['none','expired','revoked'].includes(record.status)&&
        <a href="/checkout" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-md bg-[var(--settings-action)] px-3 py-2 text-xs font-semibold text-[var(--settings-action-text)]">View lifetime license</a>}
      {record.invoiceAvailable&&<div className={card}>
        <h3 className="mb-2 font-semibold">Purchase information</h3>
        <a target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" href="/api/account/billing?action=invoice">Download Paddle invoice (PDF)</a>
      </div>}
    </> : error ? <div className={card}>
      <p role="alert">Could not load your membership information.</p>
      <button type="button" className="mt-2 rounded-md border border-border bg-muted px-2.5 py-1.5 hover:bg-card" onClick={()=>{setError(false);setAttempt(n=>n+1);}}>Retry</button>
    </div> : <p role="status" className={card}>Loading membership…</p>}
  </section>;
}

function MembershipCards({record}:{record:Membership}) {
  const {edition,status,plan,expiresAt,founderNumber,purchase}=record;
  const founder=edition==='founder', standard=edition==='standard', active=status==='active';
  const lifetime=plan==='lifetime';
  const title=founder?"Founder's Edition":standard?'Standard Edition':edition==='administrator'?'Administrator access':edition==='manual'&&plan!=='none'?'Manually granted license':'No active membership';
  const Icon=founder?Crown:standard?Award:Ticket;
  const details=[
    ['Product','Draftopus'],
    ['Edition',founder?'Founder':standard?'Standard':edition==='administrator'?'Administrator':edition==='manual'?'Manual grant':'—'],
    ['License type',lifetime?'Lifetime':plan==='timed'?'Time-limited':'—'],
    ...(purchase?[
      ['Payment type','One-time purchase'],
      ['Launch price',founder?'€14.99':'€24.99'],
      ['Purchase price',purchasePrice(purchase)],
      ['Purchase date',dateLabel(purchase.date)],
      ...(purchase.licenseId?[['License ID',purchase.licenseId]]:[]),
    ]:edition==='manual'||edition==='administrator'?[['Source',edition==='manual'?'Administrator grant':'Owner access']]:[]),
    ...(founder&&founderNumber!=null?[['Founder number',`#${String(founderNumber).padStart(4,'0')} of 500`]]:[]),
    ['Expiration',expiresAt?dateLabel(expiresAt):lifetime?'Never':'—'],
  ];
  const benefits=['Full access to Draftopus',...(lifetime?['Lifetime application access','No mandatory subscription']:[]),...(founder?['Founder recognition']:[])];
  const subtitle=lifetime?'Lifetime membership':plan==='timed'?'Time-limited license':'';
  const message=active
    ? founder?'Thank you for being one of the first 500 writers to support Draftopus.'
      : standard?'Your writing workspace, yours for life.'
      : edition==='administrator'?'Lifetime access through your administrator account.'
      : lifetime?'Lifetime access granted by the Draftopus administrator.':'Access granted by the Draftopus administrator.'
    : status==='none'?'Contact the Draftopus administrator for membership support.'
      : `This license has been ${status}.`;
  return <>
    <div className={`${card} ${founder?'border-[color-mix(in_srgb,var(--settings-accent)_35%,transparent)] bg-[var(--settings-selection)]':''}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon aria-hidden="true" className={`size-5 ${founder?'text-[var(--settings-accent)]':'text-muted-foreground'}`}/>
        <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${active?'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300':'bg-muted text-muted-foreground'}`}>{statuses[status]}</span>
      </div>
      <h3 className={`mt-2 text-base font-semibold ${founder?'text-[var(--settings-accent)]':''}`}>{title}</h3>
      {subtitle&&<p className="mt-1 text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        <p>{message}</p>
        {active&&purchase&&<p className="text-muted-foreground">No recurring payments. No expiration.</p>}
      </div>
    </div>
    {edition!=='none'&&<div className={card}>
      <h3 className="mb-1 font-semibold">License details</h3>
      <dl className="divide-y divide-border">
        {details.map(([label,value])=><div key={label} className="flex items-baseline justify-between gap-3 py-2 last:pb-0">
          <dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-right font-medium">{value}</dd>
        </div>)}
      </dl>
    </div>}
    {active&&<div className={card}>
      <h3 className="mb-2 font-semibold">Membership benefits</h3>
      <ul className="space-y-2">{benefits.map(benefit=><li key={benefit} className="flex items-center gap-2">
        <Check aria-hidden="true" className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"/>{benefit}
      </li>)}</ul>
    </div>}
  </>;
}

function purchasePrice({amountMinor,currency}:NonNullable<Membership['purchase']>) {
  const format=new Intl.NumberFormat(undefined,{style:'currency',currency});
  return format.format(amountMinor/10**(format.resolvedOptions().maximumFractionDigits??2));
}
