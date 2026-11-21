'use client';
import {useState} from 'react';
import {ArrowDown, ArrowUp, ArrowUpDown, Folder, FolderPlus, Plus} from 'lucide-react';
import type {Novel, NoteNode} from '@/lib/kachamak/types';
import {FINANCE_CURRENCIES, decimalAmount, financeOverview, financeScope, parseAmount, sortedTransactions, validCurrency, validTransaction, type FinanceSort, type TransactionNode} from '@/lib/kachamak/finance';
import {findParentId} from '@/lib/kachamak/utils';
import {useKachamak} from '@/lib/kachamak/store';

const button = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-amber-400';
const field = 'mt-1 block w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground';
const panel = 'min-w-0 rounded-xl border border-border bg-card/50 p-4';
const typeLabel = {income:'Income',expense:'Expense'};
const typeColor = {income:'text-emerald-300',expense:'text-rose-300'};
const incomeAmountColor = 'text-emerald-300/80 [[data-theme=light]_&]:text-emerald-800';
const expenseAmountColor = 'text-rose-300/80 [[data-theme=light]_&]:text-rose-800';

export function addFinanceNote(parentId:string|null, kind:'folder'|'income'|'expense') {
  const state = useKachamak.getState();
  state.addNode('finance',parentId,kind,kind==='folder'?'New folder':'New '+kind);
}

export function FinanceEditor({node,currency}:{node:NoteNode;currency:string}) {
  const update = useKachamak(s=>s.updateNode);
  const t = node.transaction!;
  const [draft,setDraft] = useState<string|null>(null);
  const invalid = draft!==null && parseAmount(draft)===null;
  const change = (patch:Partial<typeof t>)=>{
    const value = {...t,...patch};
    if (validTransaction(value)) update('finance',node.id,{transaction:value});
  };
  return <div className="space-y-4 text-xs" aria-label="Transaction inspector">
    <h3 className="text-base font-semibold">Transaction</h3>
    <label className="block">Title<input className={field} value={node.title} onChange={e=>update('finance',node.id,{title:e.target.value})} onBlur={()=>{if(!node.title.trim()) update('finance',node.id,{title:'Untitled transaction'});}}/></label>
    <label className="block">Type<select className={field} value={t.type} onChange={e=>change({type:e.target.value==='expense'?'expense':'income'})}><option value="income">Income</option><option value="expense">Expense</option></select></label>
    <label className="block">Amount · {currency}<input aria-label="Amount" inputMode="decimal" aria-invalid={invalid} className={field} value={draft??String(t.amountMinor/100)} onChange={e=>{
      setDraft(e.target.value);
      const minor=parseAmount(e.target.value);
      if(minor!==null) change({amountMinor:minor});
    }} onBlur={()=>{if(!invalid)setDraft(null);}}/></label>
    {invalid && <p role="alert" className="text-amber-300">Enter a positive amount or zero, with up to two decimal places.</p>}
    <label className="block">Date<input type="date" className={field} value={t.date} onChange={e=>change({date:e.target.value})}/></label>
    <label className="block min-w-0">Description <span className="text-muted-foreground">(optional)</span>
      <textarea rows={4} wrap="soft" className={field+' min-h-[calc(4lh+1rem+2px)] max-w-full field-sizing-content resize-y whitespace-pre-wrap wrap-anywhere'}
        value={t.description} onChange={e=>change({description:e.target.value})}/>
    </label>
  </div>;
}

type Overview = ReturnType<typeof financeOverview>;
type Money = (minor:number|bigint)=>string;
function MonthlyChart({months,money}:{months:Overview['months'];money:Money}) {
  const max = months.reduce((largest,[,m])=>Math.max(largest,Number(m.income),Number(m.expense)),1);
  return <section className={panel}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Income and expenses over time</h3>
      <div className="flex gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-sm bg-emerald-400"/>Income</span><span><i className="mr-1 inline-block size-2 rounded-sm bg-rose-400"/>Expenses</span></div>
    </div>
    {months.length===0?<p className="text-sm text-muted-foreground">No transactions yet.</p>:<div className="overflow-x-auto">
      <div className="flex min-w-full items-end gap-3" style={{minWidth:months.length*68}}>
        {months.map(([month,m])=><div key={month} className="min-w-14 flex-1 text-center" title={month+' · Income '+money(m.income)+' · Expenses '+money(m.expense)}>
          <div className="flex h-24 items-end justify-center gap-1 border-b border-border">
            <div className="w-4 bg-emerald-400/80" style={{height:100*Number(m.income)/max+'%',minHeight:m.income?2:0}}/>
            <div className="w-4 bg-rose-400/80" style={{height:100*Number(m.expense)/max+'%',minHeight:m.expense?2:0}}/>
          </div><span className="mt-1 block text-xs text-muted-foreground">{month}</span><span className="sr-only">Income {money(m.income)}, expenses {money(m.expense)}</span>
        </div>)}
      </div>
    </div>}
  </section>;
}

function FolderTotals({groups,type,money,open}:{groups:Overview['groups'];type:'income'|'expense';money:Money;open:(id:string)=>void}) {
  const rows = groups.filter(g=>g[type]>0).sort((a,b)=>a[type]===b[type]?0:a[type]>b[type]?-1:1);
  return <section className={panel}><h3 className="mb-3 font-semibold">{type==='income'?'Income':'Expenses'} by folder</h3>
    {rows.length?<ul className="divide-y divide-border">{rows.map(g=><li key={g.id} className="flex items-center justify-between gap-2 py-2 text-sm">
      {g.id?<button className="inline-flex min-w-0 items-center gap-2 text-left hover:text-amber-300" onClick={()=>open(g.id)}><Folder size={15} className="shrink-0 text-muted-foreground"/><span className="break-words">{g.title}</span></button>:g.title}
      <span className="shrink-0 tabular-nums">{money(g[type])}</span>
    </li>)}</ul>:<p className="text-sm text-muted-foreground">No {type==='income'?'income':'expenses'} recorded.</p>}
  </section>;
}

function Transactions({entries,money,open,selected,full}:{entries:TransactionNode[];money:Money;open:(id:string)=>void;selected?:string;full:boolean}) {
  const [sort,setSort]=useState<{key:FinanceSort;asc:boolean}>({key:'date',asc:false});
  const sorted=sortedTransactions(entries,full?sort.key:'date',full?sort.asc:false);
  const headers=['Title','Type','Amount','Date'] as const;
  return <section className={panel}><h3 className="mb-3 font-semibold">{full?'Transactions':'Recent transactions'}</h3>
    {sorted.length===0?<p className="text-sm text-muted-foreground">No transactions in this view.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b border-border text-xs text-muted-foreground"><tr>{headers.map(label=>{
        const key=label.toLowerCase() as FinanceSort;
        const sortable=full && label!=='Type';
        const Icon=key!==sort.key?ArrowUpDown:sort.asc?ArrowUp:ArrowDown;
        return <th key={label} scope="col" className={'py-2 pr-3 font-medium '+(key==='amount'?'text-right':'')} aria-sort={sortable && key===sort.key?(sort.asc?'ascending':'descending'):undefined}>{sortable?<button className="inline-flex items-center gap-1" onClick={()=>setSort({key,asc:key===sort.key?!sort.asc:key==='title'})}>{label}<Icon size={12}/></button>:label}</th>;
      })}</tr></thead>
      <tbody className="divide-y divide-border">{(full?sorted:sorted.slice(0,6)).map(n=><tr key={n.id} className={n.id===selected?'bg-amber-400/10':'hover:bg-muted/40'} onClick={()=>open(n.id)}>
        <td className="py-2 pr-3"><button className="text-left hover:text-amber-300" onClick={e=>{e.stopPropagation();open(n.id);}}>{n.title}</button></td>
        <td className={'pr-3 '+typeColor[n.transaction.type]}>{typeLabel[n.transaction.type]}</td><td className="whitespace-nowrap pr-3 text-right tabular-nums">{money(n.transaction.amountMinor)}</td><td className="whitespace-nowrap text-muted-foreground">{n.transaction.date}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}

export function FinanceWorkspace({novel,selected,rootId,list}:{novel:Novel;selected:NoteNode|null;rootId?:string;list:boolean}) {
  const roots=novel.sections.finance??[];
  const scope=financeScope(roots,selected?.id,rootId);
  const parentId=scope?.transaction?findParentId(roots,scope.id):scope?.id??null;
  const overview=financeOverview(scope?.transaction?[scope]:scope?.children??roots);
  const noExpenses = overview.entries.length > 0 && overview.expense === BigInt(0);
  const netColor = overview.net > 0 ? incomeAmountColor : overview.net < 0 ? expenseAmountColor : '';
  const currency=novel.financeCurrency??'EUR';
  const formatter=new Intl.NumberFormat(undefined,{style:'currency',currency});
  const money:Money=minor=>formatter.format(decimalAmount(minor));
  const open=(id:string)=>{const state=useKachamak.getState();state.select(id);state.setRightPanelOpen(true);};
  const reset=()=>{const state=useKachamak.getState();state.setTab('finance');state.select(null);};
  return <section aria-label="Finance workspace" className="@container mx-auto w-full max-w-[100rem] p-4 md:p-6">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">{scope&&<button className="mb-1 text-xs text-amber-300 hover:underline" onClick={reset}>All finances</button>}
        <h2 className="break-words text-2xl font-semibold">{scope?.title??(list?'Finance list':'Finance dashboard')}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Project currency" title="Project currency" className="rounded-md border border-border bg-background px-2 text-sm" value={currency} onChange={e=>{if(validCurrency(e.target.value))useKachamak.getState().updateNovelSettings(novel.id,{financeCurrency:e.target.value});}}>{FINANCE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select>
        <button className={button} onClick={()=>addFinanceNote(parentId,'folder')}><FolderPlus size={15}/>Folder</button>
        {(['income','expense'] as const).map(type=><button key={type} className={button+' '+typeColor[type]} onClick={()=>addFinanceNote(parentId,type)}><Plus size={15}/>{typeLabel[type]}</button>)}
      </div>
    </header>
    {selected?.transaction && <div className={panel+' mb-4 lg:hidden'}><FinanceEditor key={selected.id} node={selected} currency={currency}/></div>}
    <div className="space-y-4">{!list&&<>
      <div className="grid gap-3 @sm:grid-cols-2 @4xl:grid-cols-4">
        {([['Total income',overview.income,incomeAmountColor],['Total expenses',overview.expense,expenseAmountColor],['Net result',overview.net,netColor]] as const).map(([title,value,color])=><section key={title} className={panel}>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3><strong className={'mt-2 block break-words text-2xl font-semibold tabular-nums '+color}>{money(value)}</strong>
        </section>)}
        <section className="min-w-0 rounded-xl border border-amber-400/35 bg-amber-400/5 p-4"><h3 className="text-xs font-medium uppercase tracking-wide text-amber-300">Break-even</h3>
          <strong className="mt-2 block text-2xl font-semibold tabular-nums">{noExpenses?'No expenses recorded':overview.reached?'Reached':overview.entries.length?overview.progress+'%':'—'}</strong>
          <span role="progressbar" aria-label="Break-even progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overview.progress} className="my-1 inline-block h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <span className={'block h-full '+(overview.reached?'bg-emerald-400':'bg-amber-400')} style={{width:overview.progress+'%'}}/>
          </span>
          {!noExpenses && <p className="text-xs text-muted-foreground">{!overview.entries.length?'No transactions yet':overview.reached?'Break-even reached':money(overview.remaining)+' remaining to break even'}</p>}
        </section>
      </div>
      <MonthlyChart months={overview.months} money={money}/>
      <div className="grid gap-4 @xl:grid-cols-2">{(['expense','income'] as const).map(type=><FolderTotals key={type} type={type} groups={overview.groups} money={money} open={open}/>)}</div>
    </>}
    <Transactions entries={overview.entries} money={money} open={open} selected={selected?.id} full={list}/>
    </div>
  </section>;
}
