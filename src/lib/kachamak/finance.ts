import {findNode} from './utils';
import type {NoteNode} from './types';

export const FINANCE_CURRENCIES = ['EUR','USD','RSD','GBP','CHF','CAD','AUD','BAM','PLN'] as const;
export type FinanceCurrency = typeof FINANCE_CURRENCIES[number];
export type TransactionType = 'income' | 'expense';
export interface Transaction {
  type: TransactionType;
  amountMinor: number;
  date: string;
  description: string;
}
export type TransactionNode = NoteNode & {transaction: Transaction};
export type FinanceSort = 'title' | 'amount' | 'date';

export function validCurrency(value: unknown): value is FinanceCurrency {
  return FINANCE_CURRENCIES.some(currency => currency === value);
}

export function parseAmount(input: string) {
  const match = /^(\d{1,11})(?:[.,](\d{0,2}))?$/.exec(input.trim());
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2,'0')) : null;
}

export function validTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') return false;
  const t = value as Transaction;
  if (!['income','expense'].includes(t.type) || !Number.isSafeInteger(t.amountMinor) || t.amountMinor < 0 ||
    t.amountMinor > 9999999999999 || typeof t.description !== 'string' || typeof t.date !== 'string' ||
    !/^\d{4}-\d\d-\d\d$/.test(t.date)) return false;
  const day = new Date(t.date+'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0,10) === t.date;
}

export function newTransaction(type: TransactionType, now = new Date()): Transaction {
  const date = [String(now.getFullYear()).padStart(4,'0'), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  return {type, amountMinor: 0, date, description: ''};
}

export function financeScope(roots: NoteNode[], selectedId?: string | null, rootId?: string) {
  const base = rootId ? findNode(roots,rootId) ?? undefined : undefined;
  const visit = (nodes:NoteNode[], parent?:NoteNode):NoteNode | undefined => {
    for (const node of nodes) {
      const folder = node.transaction ? parent : node;
      if (node.id===selectedId) return folder;
      const found = visit(node.children,folder);
      if (found) return found;
    }
  };
  return selectedId ? visit(base?[base]:roots) ?? base : base;
}

// Persist JSON-safe integers per note and sum in integer minor units at every scale.
const zero = BigInt(0);
const hundred = BigInt(100);
type Totals = {income: bigint; expense: bigint};
export function decimalAmount(minor:bigint | number): Intl.StringNumericLiteral {
  const amount=BigInt(minor);
  const digits=(amount<zero?-amount:amount).toString().padStart(3,'0');
  return ((amount<zero?'-':'')+digits.slice(0,-2)+'.'+digits.slice(-2)) as Intl.StringNumericLiteral;
}
export function financeOverview(nodes: NoteNode[]) {
  const entries: TransactionNode[] = [];
  const months = new Map<string, Totals>();
  const groups = new Map<string, Totals & {id:string; title:string}>();
  const totals = {income:zero, expense:zero};
  function visit(node:NoteNode, group:NoteNode | undefined) {
    if (node.transaction) {
      const {type,amountMinor,date} = node.transaction;
      const amount = BigInt(amountMinor);
      entries.push(node as TransactionNode);
      totals[type] += amount;
      const month = date.slice(0,7);
      const monthly = months.get(month) ?? {income:zero,expense:zero};
      monthly[type] += amount;
      months.set(month,monthly);
      const key = group?.id ?? '';
      const row = groups.get(key) ?? {id:key,title:group?.title ?? 'Direct entries',income:zero,expense:zero};
      row[type] += amount;
      groups.set(key,row);
    }
    for (const child of node.children) visit(child,group);
  }
  for (const node of nodes) visit(node,node.transaction ? undefined : node);
  const {income, expense} = totals;
  const reached = income > 0 && income >= expense;
  const progress = reached ? 100 : expense ? Number(income * hundred / expense) : 0;
  return {...totals, net:income-expense, remaining:expense>income?expense-income:zero, reached, progress, entries,
    months:[...months].sort(([a],[b])=>a.localeCompare(b)), groups:[...groups.values()]};
}

export function sortedTransactions(entries: TransactionNode[], key: FinanceSort, ascending: boolean) {
  return [...entries].sort((a,b)=>{
    const comparison = key==='amount' ? a.transaction.amountMinor-b.transaction.amountMinor :
      key==='title' ? a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'}) : a.transaction.date.localeCompare(b.transaction.date);
    return (ascending ? comparison : -comparison) || b.createdAt-a.createdAt || a.id.localeCompare(b.id);
  });
}

export function transactionText(t:Transaction,currency:FinanceCurrency='EUR') {
  return [t.type==='income'?'Income':'Expense', decimalAmount(t.amountMinor)+' '+currency, t.date].join(' · ') + (t.description ? '\n\n'+t.description : '');
}
